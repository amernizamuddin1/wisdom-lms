import Image from "next/image";
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
  const embedUrl = previewVideoUrl ? getEmbedUrl(previewVideoUrl) : null;

  if (embedUrl) {
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

  if (thumbnailUrl) {
    return (
      <div className="relative aspect-video w-full overflow-hidden rounded-xl border">
        <Image src={thumbnailUrl} alt={title} fill unoptimized className="object-cover" />
      </div>
    );
  }

  return null;
}
