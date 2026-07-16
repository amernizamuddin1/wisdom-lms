"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import {
  getUnviewedAchievements,
  markAchievementViewed,
  type UnviewedAchievement,
} from "@/app/dashboard/gamification-actions";
import AchievementUnlockModal from "./AchievementUnlockModal";

// Mounted once in the dashboard layout. Checks for unacknowledged unlocks on
// every navigation (not just once) since an unlock can land from a server
// action anywhere in the app (lesson complete, quiz pass, a streak/learning-
// time heartbeat crossing a badge threshold) — polling on route change is
// simpler and more robust than threading unlock state through every action's
// return value, and it naturally covers the quiz-submit flow, which redirects
// to a results page rather than returning to its caller.
export default function UnlockWatcher() {
  const [queue, setQueue] = useState<UnviewedAchievement[]>([]);
  const pathname = usePathname();

  useEffect(() => {
    let cancelled = false;
    getUnviewedAchievements().then((unviewed) => {
      if (cancelled || unviewed.length === 0) return;
      setQueue((prev) => (prev.length > 0 ? prev : unviewed));
    });
    return () => {
      cancelled = true;
    };
  }, [pathname]);

  if (queue.length === 0) return null;

  const current = queue[0];

  function handleAcknowledge() {
    void markAchievementViewed(current.id);
    setQueue((prev) => prev.slice(1));
  }

  return <AchievementUnlockModal achievement={current} onAcknowledge={handleAcknowledge} />;
}
