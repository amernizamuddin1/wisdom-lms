import { describe, expect, it } from "vitest";
import { supabaseImageLoader } from "./SupabaseImage";

describe("supabaseImageLoader", () => {
  it("routes a public Storage object through Supabase image rendering", () => {
    const result = supabaseImageLoader({
      src: "https://project.supabase.co/storage/v1/object/public/course-assets/course/thumbnail.png",
      width: 640,
      quality: 70,
    });

    expect(result).toBe(
      "https://project.supabase.co/storage/v1/render/image/public/course-assets/course/thumbnail.png?width=640&height=360&resize=cover&quality=70",
    );
  });
});
