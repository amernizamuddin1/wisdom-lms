"use client";

import { useEffect, useRef } from "react";
import { recordLearningTimeHeartbeat } from "@/app/dashboard/courses/[courseId]/actions";
import { GAMIFICATION_CONFIG } from "@/lib/gamification/config";

// Tracks "genuine active engagement" time with a lesson — tab visible AND a
// recent interaction (mouse/key/touch/scroll/click) within the inactivity
// threshold — and periodically flushes accumulated seconds to the server.
// Mount one instance per active lesson view (video, audio, or text); it
// renders nothing.
//
// Cross-tab dedup: each lesson gets its own BroadcastChannel. The first tab
// to mount is the "leader" and is the only one that sends heartbeats; a
// second tab for the same lesson detects the leader's presence and stays
// silent, so opening the same lesson in two tabs doesn't double-count time.
export default function LessonTimeTracker({
  courseId,
  lessonId,
  isVideo,
}: {
  courseId: string;
  lessonId: string;
  isVideo: boolean;
}) {
  const isLeaderRef = useRef(true);

  useEffect(() => {
    let accumulated = 0;
    let lastInteraction = Date.now();
    isLeaderRef.current = true;

    let channel: BroadcastChannel | null = null;
    if (typeof BroadcastChannel !== "undefined") {
      channel = new BroadcastChannel(`wq-learning-time:${lessonId}`);
      channel.postMessage({ type: "announce" });
      channel.onmessage = (e) => {
        if (e.data?.type === "announce" && isLeaderRef.current) {
          channel?.postMessage({ type: "leader-here" });
        } else if (e.data?.type === "leader-here") {
          isLeaderRef.current = false;
        }
      };
    }

    function markInteraction() {
      lastInteraction = Date.now();
    }
    const interactionEvents = ["mousemove", "keydown", "scroll", "touchstart", "click"] as const;
    interactionEvents.forEach((ev) => window.addEventListener(ev, markInteraction, { passive: true }));
    document.addEventListener("visibilitychange", markInteraction);

    const tickMs = 1000;
    const tickHandle = setInterval(() => {
      const idleMs = Date.now() - lastInteraction;
      const isActive =
        document.visibilityState === "visible" &&
        idleMs < GAMIFICATION_CONFIG.inactivityThresholdSeconds * 1000;
      if (isActive) accumulated += tickMs / 1000;
    }, tickMs);

    function flush() {
      if (!isLeaderRef.current) {
        accumulated = 0;
        return;
      }
      const seconds = Math.round(accumulated);
      accumulated = 0;
      if (seconds > 0) {
        void recordLearningTimeHeartbeat(courseId, lessonId, seconds, isVideo);
      }
    }

    const flushHandle = setInterval(flush, GAMIFICATION_CONFIG.heartbeatIntervalSeconds * 1000);
    window.addEventListener("beforeunload", flush);

    return () => {
      flush();
      clearInterval(tickHandle);
      clearInterval(flushHandle);
      interactionEvents.forEach((ev) => window.removeEventListener(ev, markInteraction));
      document.removeEventListener("visibilitychange", markInteraction);
      window.removeEventListener("beforeunload", flush);
      channel?.close();
    };
  }, [courseId, lessonId, isVideo]);

  return null;
}
