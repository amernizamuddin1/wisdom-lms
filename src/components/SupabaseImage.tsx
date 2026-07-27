"use client";

import Image, { type ImageLoaderProps, type ImageProps } from "next/image";

export function supabaseImageLoader({
  src,
  width,
  quality,
}: ImageLoaderProps): string {
  const url = new URL(src);

  url.pathname = url.pathname.replace(
    "/storage/v1/object/public/",
    "/storage/v1/render/image/public/",
  );
  url.searchParams.set("width", String(width));
  url.searchParams.set("height", String(Math.round(width * 9 / 16)));
  url.searchParams.set("resize", "cover");
  url.searchParams.set("quality", String(quality ?? 75));

  return url.href;
}

export default function SupabaseImage(
  { alt, ...props }: Omit<ImageProps, "loader">,
) {
  return <Image {...props} alt={alt} loader={supabaseImageLoader} />;
}
