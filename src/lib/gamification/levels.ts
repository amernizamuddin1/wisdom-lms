import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import { computeLevelForXp, computeLevelProgress, type LevelInfo, type LevelProgress } from "./levels-pure";

export type { LevelInfo, LevelProgress };

import type { PrismaTransaction } from "@/lib/prisma";

type Tx = PrismaTransaction;

// Levels are never stored on a user — always derived from cached totalXp
// against this admin-managed list, so editing a threshold later can't leave
// a user's level stale. The list is short (8 rows by default) so a fresh
// query per call is cheap; no caching needed at this scale.
async function getActiveLevels(tx: Tx): Promise<LevelInfo[]> {
  return tx.gamificationLevel.findMany({
    where: { isActive: true },
    orderBy: { order: "asc" },
  });
}

export async function getLevelForXp(tx: Tx, totalXp: number): Promise<LevelInfo | null> {
  const levels = await getActiveLevels(tx);
  return computeLevelForXp(levels, totalXp);
}

export async function getLevelProgress(tx: Tx, totalXp: number): Promise<LevelProgress | null> {
  const levels = await getActiveLevels(tx);
  return computeLevelProgress(levels, totalXp);
}
