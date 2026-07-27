"use client";

import { useState } from "react";
import Image from "next/image";
import { PlayIcon } from "lucide-react";
import { getEmbedUrl } from "@/lib/video";

export default function CoursePreviewMedia({
  title,
  thumbnailUrl,
  previewVideoUrl,
}: {
  title: string;
  thumbnailUrl: string | null;
  previewVideoUrl: string | null;
}) {
  const [playing, setPlaying] = useState(false);
  const embedUrl = previewVideoUrl ? getEmbedUrl(previewVideoUrl) : null;

  if (embedUrl && playing) {
    return (
      <div className="aspect-video w-full overflow-hidden rounded-xl border bg-black">
        <iframe
          src={embedUrl}
          title={`${title} preview`}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          className="size-full"
        />
      </div>
    );
  }

  if (thumbnailUrl || embedUrl) {
    return (
      <div className="relative aspect-video w-full overflow-hidden rounded-xl border">
        {thumbnailUrl ? (
          <Image
            src={thumbnailUrl}
            alt={title}
            fill
            sizes="(min-width: 1024px) 810px, 100vw"
            className="object-cover"
            preload
          />
        ) : (
          <div className="absolute inset-0 bg-black" />
        )}
        {embedUrl && (
          <button
            type="button"
            onClick={() => setPlaying(true)}
            className="absolute inset-0 flex items-center justify-center bg-black/15 transition-colors hover:bg-black/25 focus-visible:outline-2 focus-visible:outline-offset-[-4px] focus-visible:outline-white"
            aria-label={`Play ${title} preview`}
          >
            <span className="flex size-16 items-center justify-center rounded-full bg-white/95 text-foreground shadow-lg">
              <PlayIcon className="ml-1 size-7 fill-current" />
            </span>
          </button>
        )}
      </div>
    );
  }

  return null;
}
