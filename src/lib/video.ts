export type VideoSource = "YOUTUBE" | "VIMEO";

export function detectVideoSource(url: string): VideoSource | null {
  const trimmed = url.trim();
  if (!trimmed) return null;

  if (/(?:youtube\.com\/(?:watch|embed|shorts)|youtu\.be\/)/i.test(trimmed)) {
    return "YOUTUBE";
  }

  if (/vimeo\.com\//i.test(trimmed)) {
    return "VIMEO";
  }

  return null;
}

export function getEmbedUrl(url: string): string | null {
  const trimmed = url.trim();
  const source = detectVideoSource(trimmed);
  if (!source) return null;

  if (source === "YOUTUBE") {
    const match = trimmed.match(
      /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]+)/i,
    );
    return match ? `https://www.youtube.com/embed/${match[1]}` : null;
  }

  const match = trimmed.match(/vimeo\.com\/(\d+)/i);
  // dnt=1 stops Vimeo from reading session/tracking cookies in the embed —
  // this is also what prevents the owner-only Like/Watch Later/Share controls
  // from appearing when the video owner views their own embed while logged in.
  return match
    ? `https://player.vimeo.com/video/${match[1]}?title=0&byline=0&portrait=0&dnt=1`
    : null;
}

// Raw platform video ID — used by the YouTube IFrame Player API, which
// takes an ID rather than an embed URL.
export function getVideoId(url: string): string | null {
  const trimmed = url.trim();
  const source = detectVideoSource(trimmed);
  if (!source) return null;

  if (source === "YOUTUBE") {
    const match = trimmed.match(
      /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]+)/i,
    );
    return match ? match[1] : null;
  }

  const match = trimmed.match(/vimeo\.com\/(\d+)/i);
  return match ? match[1] : null;
}
