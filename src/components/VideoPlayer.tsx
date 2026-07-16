"use client";

import { useEffect, useRef, useState } from "react";
import { getEmbedUrl, getVideoId, type VideoSource } from "@/lib/video";

// A lesson video counts as "watched" once this much of it has played —
// accounts for outros/credits without requiring every last second.
const COMPLETE_THRESHOLD = 0.9;

// Minimal surface of the YouTube IFrame Player API that we actually call —
// the full type is not published by YouTube.
interface YouTubePlayer {
  playVideo(): void;
  pauseVideo(): void;
  seekTo(seconds: number, allowSeekAhead: boolean): void;
  getCurrentTime(): number;
  getDuration(): number;
  setVolume(volume: number): void;
  mute(): void;
  unMute(): void;
  setPlaybackRate(rate: number): void;
  destroy(): void;
}

interface YouTubePlayerEvent {
  data: number;
  target: YouTubePlayer;
}

interface YouTubeNamespace {
  Player: new (
    el: HTMLElement,
    options: {
      videoId: string;
      playerVars?: Record<string, number>;
      events?: {
        onReady?: (e: YouTubePlayerEvent) => void;
        onStateChange?: (e: YouTubePlayerEvent) => void;
      };
    },
  ) => YouTubePlayer;
  PlayerState: { PLAYING: number; PAUSED: number; ENDED: number };
}

declare global {
  interface Window {
    YT?: YouTubeNamespace;
    onYouTubeIframeAPIReady?: () => void;
  }
}

const PLAYBACK_RATES = [0.5, 0.75, 1, 1.25, 1.5, 2];

let youtubeApiPromise: Promise<void> | null = null;
function loadYouTubeApi(): Promise<void> {
  if (window.YT?.Player) return Promise.resolve();
  if (youtubeApiPromise) return youtubeApiPromise;
  youtubeApiPromise = new Promise((resolve) => {
    const previous = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      previous?.();
      resolve();
    };
    const script = document.createElement("script");
    script.src = "https://www.youtube.com/iframe_api";
    document.head.appendChild(script);
  });
  return youtubeApiPromise;
}

function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60)
    .toString()
    .padStart(2, "0");
  return `${m}:${s}`;
}

export default function VideoPlayer({
  videoUrl,
  sourceType,
  onComplete,
}: {
  videoUrl: string;
  sourceType: VideoSource;
  onComplete?: () => void;
}) {
  if (sourceType === "VIMEO") {
    return <VimeoEmbed videoUrl={videoUrl} onComplete={onComplete} />;
  }
  return <YouTubePlayerView videoUrl={videoUrl} onComplete={onComplete} />;
}

// Plain embed — no custom controls. Vimeo's own player already provides a
// full control bar (speed, captions, quality) without the issues YouTube's
// bare embed has. We still attach the Vimeo Player SDK to the existing
// iframe purely to listen for progress/ended events for completion tracking
// — it doesn't touch the visible UI at all.
function VimeoEmbed({
  videoUrl,
  onComplete,
}: {
  videoUrl: string;
  onComplete?: () => void;
}) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const firedRef = useRef(false);
  const embedUrl = getEmbedUrl(videoUrl);

  useEffect(() => {
    if (!embedUrl || !iframeRef.current || !onComplete) return;

    let destroyed = false;
    let player: import("@vimeo/player").default | undefined;

    import("@vimeo/player").then(({ default: Player }) => {
      if (destroyed || !iframeRef.current) return;
      player = new Player(iframeRef.current);
      player.on("timeupdate", (data: { seconds: number; duration: number }) => {
        if (!firedRef.current && data.duration > 0 && data.seconds / data.duration >= COMPLETE_THRESHOLD) {
          firedRef.current = true;
          onComplete();
        }
      });
      player.on("ended", () => {
        if (!firedRef.current) {
          firedRef.current = true;
          onComplete();
        }
      });
    });

    return () => {
      destroyed = true;
      player?.destroy?.().catch(() => {});
    };
  }, [embedUrl, onComplete]);

  if (!embedUrl) return null;

  return (
    <div className="aspect-video w-full overflow-hidden rounded-md bg-black">
      <iframe
        ref={iframeRef}
        src={embedUrl}
        className="h-full w-full"
        allow="autoplay; fullscreen; picture-in-picture; clipboard-write; encrypted-media"
        allowFullScreen
      />
    </div>
  );
}

function YouTubePlayerView({
  videoUrl,
  onComplete,
}: {
  videoUrl: string;
  onComplete?: () => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mountRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<YouTubePlayer | null>(null);
  const firedRef = useRef(false);

  const [ready, setReady] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [ended, setEnded] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [rate, setRate] = useState(1);
  const [fullscreen, setFullscreen] = useState(false);

  const videoId = getVideoId(videoUrl);

  useEffect(() => {
    if (!videoId || !mountRef.current) return;

    let destroyed = false;
    let pollHandle: ReturnType<typeof setInterval> | undefined;

    loadYouTubeApi().then(() => {
      if (destroyed || !mountRef.current || !window.YT) return;
      new window.YT.Player(mountRef.current, {
        videoId,
        playerVars: {
          controls: 0,
          rel: 0,
          modestbranding: 1,
          fs: 0,
          iv_load_policy: 3,
          disablekb: 1,
          playsinline: 1,
        },
        events: {
          // The object returned by `new YT.Player(...)` is a placeholder —
          // its real methods only exist on `e.target`, delivered here once
          // the underlying iframe has actually loaded.
          onReady: (e) => {
            playerRef.current = e.target;
            setDuration(e.target.getDuration());
            setReady(true);
          },
          onStateChange: (e) => {
            const YT = window.YT!;
            setPlaying(e.data === YT.PlayerState.PLAYING);
            setEnded(e.data === YT.PlayerState.ENDED);
            setDuration(e.target.getDuration());
            if (e.data === YT.PlayerState.ENDED && !firedRef.current) {
              firedRef.current = true;
              onComplete?.();
            }
          },
        },
      });
      pollHandle = setInterval(() => {
        const current = playerRef.current;
        if (!current) return;
        const time = current.getCurrentTime();
        setCurrentTime(time);
        const total = current.getDuration();
        if (!firedRef.current && total > 0 && time / total >= COMPLETE_THRESHOLD) {
          firedRef.current = true;
          onComplete?.();
        }
      }, 250);
    });

    return () => {
      destroyed = true;
      if (pollHandle) clearInterval(pollHandle);
      playerRef.current?.destroy?.();
      playerRef.current = null;
    };
  }, [videoId, onComplete]);

  useEffect(() => {
    function onFsChange() {
      setFullscreen(document.fullscreenElement === containerRef.current);
    }
    document.addEventListener("fullscreenchange", onFsChange);
    return () => document.removeEventListener("fullscreenchange", onFsChange);
  }, []);

  if (!videoId) return null;

  function togglePlay() {
    const player = playerRef.current;
    if (!player) return;
    setEnded(false);
    if (playing) player.pauseVideo();
    else player.playVideo();
  }

  function replay() {
    seek(0);
    setEnded(false);
    playerRef.current?.playVideo();
  }

  function seek(seconds: number) {
    const player = playerRef.current;
    setCurrentTime(seconds);
    setEnded(false);
    player?.seekTo(seconds, true);
  }

  function changeVolume(v: number) {
    setVolume(v);
    const player = playerRef.current;
    if (!player) return;
    player.setVolume(v * 100);
    if (v === 0) player.mute();
    else player.unMute();
  }

  function changeRate(r: number) {
    setRate(r);
    playerRef.current?.setPlaybackRate(r);
  }

  function toggleFullscreen() {
    if (!containerRef.current) return;
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      containerRef.current.requestFullscreen();
    }
  }

  return (
    <div
      ref={containerRef}
      className="group relative aspect-video w-full overflow-hidden rounded-md bg-black"
    >
      <div ref={mountRef} className="absolute inset-0 h-full w-full" />

      {!ready && (
        <div className="absolute inset-0 flex items-center justify-center text-sm text-gray-400">
          Loading video…
        </div>
      )}

      {ready && !playing && !ended && (
        <button
          type="button"
          onClick={togglePlay}
          aria-label="Play"
          className="absolute inset-0 flex items-center justify-center bg-black/20 transition hover:bg-black/30"
        >
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-white/90 text-2xl text-gray-900">
            ▶
          </span>
        </button>
      )}

      {ended && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black">
          <p className="text-sm text-gray-300">Video finished</p>
          <button
            type="button"
            onClick={replay}
            className="rounded-md bg-white/90 px-4 py-2 text-sm font-medium text-gray-900 hover:bg-white"
          >
            ↺ Replay
          </button>
        </div>
      )}

      {!ended && (
        <div className="absolute inset-x-0 bottom-0 flex items-center gap-3 bg-gradient-to-t from-black/80 to-transparent px-3 py-2 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
          <button
            type="button"
            onClick={togglePlay}
            aria-label={playing ? "Pause" : "Play"}
            className="text-white"
          >
            {playing ? "❙❙" : "▶"}
          </button>

          <span className="text-xs tabular-nums text-white">
            {formatTime(currentTime)} / {formatTime(duration)}
          </span>

          <input
            type="range"
            min={0}
            max={duration || 0}
            step={0.1}
            value={currentTime}
            onChange={(e) => seek(Number(e.target.value))}
            className="flex-1 accent-white"
            aria-label="Seek"
          />

          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={volume}
            onChange={(e) => changeVolume(Number(e.target.value))}
            className="w-16 accent-white"
            aria-label="Volume"
          />

          <select
            value={rate}
            onChange={(e) => changeRate(Number(e.target.value))}
            className="rounded bg-transparent text-xs text-white"
            aria-label="Playback speed"
          >
            {PLAYBACK_RATES.map((r) => (
              <option key={r} value={r} className="text-gray-900">
                {r}x
              </option>
            ))}
          </select>

          <button type="button" onClick={toggleFullscreen} aria-label="Fullscreen" className="text-white">
            {fullscreen ? "⤢" : "⤡"}
          </button>
        </div>
      )}
    </div>
  );
}
