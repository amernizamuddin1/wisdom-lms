"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import BadgeImage from "./BadgeImage";
import type { UnviewedAchievement } from "@/app/dashboard/gamification-actions";

export default function AchievementUnlockModal({
  achievement,
  onAcknowledge,
}: {
  achievement: UnviewedAchievement;
  onAcknowledge: () => void;
}) {
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onAcknowledge();
      }}
    >
      <DialogContent className="text-center sm:max-w-sm" showCloseButton={false}>
        <DialogHeader className="items-center">
          <p className="text-xs font-semibold tracking-wide text-primary uppercase">Achievement Unlocked</p>
          <div className="my-2">
            <BadgeImage assetPath={achievement.assetPath} alt={achievement.name} size={96} locked={false} />
          </div>
          <DialogTitle className="text-xl">{achievement.name}</DialogTitle>
          <DialogDescription>{achievement.description}</DialogDescription>
        </DialogHeader>

        {achievement.xpReward > 0 && (
          <p className="text-sm font-medium text-foreground">+{achievement.xpReward} XP</p>
        )}

        <DialogFooter className="sm:justify-center">
          <Button onClick={onAcknowledge}>Continue learning</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
