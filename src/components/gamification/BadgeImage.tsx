"use client";

import { useState } from "react";
import Image from "next/image";
import { AwardIcon } from "lucide-react";
import { cn } from "@/lib/utils";

// Badge artwork is provided separately later (see plan's Part 9). Every
// badge already has a stable asset path seeded in the database — this
// component just needs to degrade gracefully today, without any structural
// change required once real files land at those paths.
export default function BadgeImage({
  assetPath,
  alt,
  size = 64,
  locked,
  className,
}: {
  assetPath: string;
  alt: string;
  size?: number;
  locked: boolean;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <div
        className={cn(
          "flex items-center justify-center rounded-full border bg-muted text-muted-foreground",
          locked && "opacity-40 grayscale",
          className,
        )}
        style={{ width: size, height: size }}
      >
        <AwardIcon style={{ width: size * 0.5, height: size * 0.5 }} />
      </div>
    );
  }

  return (
    <Image
      src={assetPath}
      alt={alt}
      width={size}
      height={size}
      onError={() => setFailed(true)}
      className={cn("rounded-full object-contain", locked && "opacity-40 grayscale", className)}
    />
  );
}
