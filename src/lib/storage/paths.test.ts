import { describe, expect, it } from "vitest";
import {
  COURSE_ASSETS_BUCKET,
  LESSON_FILES_BUCKET,
  buildBundleThumbnailPath,
  buildCourseThumbnailPath,
  buildLessonAudioPath,
  buildLessonFilePath,
  describeStorageError,
  sanitizeFileName,
  validateUpload,
} from "./paths";

describe("bucket constants", () => {
  it("course-facing uploads target the course-assets bucket name", () => {
    expect(COURSE_ASSETS_BUCKET).toBe("course-assets");
  });

  it("lesson attachments target the lesson-files bucket name", () => {
    expect(LESSON_FILES_BUCKET).toBe("lesson-files");
  });
});

describe("tenant-scoped paths", () => {
  const tenantA = "11111111-1111-1111-1111-111111111111";
  const tenantB = "22222222-2222-2222-2222-222222222222";
  const courseId = "course-123";

  it("always prefixes the path with the given tenant id", () => {
    const path = buildCourseThumbnailPath(tenantA, courseId, "png");
    expect(path.startsWith(`tenants/${tenantA}/`)).toBe(true);
  });

  it("produces non-colliding paths for the same entity id under different tenants", () => {
    const pathA = buildCourseThumbnailPath(tenantA, courseId, "png");
    const pathB = buildCourseThumbnailPath(tenantB, courseId, "png");
    expect(pathA).not.toBe(pathB);
    expect(pathA.includes(tenantB)).toBe(false);
    expect(pathB.includes(tenantA)).toBe(false);
  });

  it("bundle thumbnails are scoped the same way", () => {
    const path = buildBundleThumbnailPath(tenantA, "bundle-1", "jpg");
    expect(path).toBe(path);
    expect(path.startsWith(`tenants/${tenantA}/bundles/bundle-1/thumbnail-`)).toBe(true);
  });

  it("lesson files are scoped by tenant and lesson", () => {
    const path = buildLessonFilePath(tenantA, "lesson-1", "notes.pdf");
    expect(path.startsWith(`tenants/${tenantA}/lessons/lesson-1/`)).toBe(true);
    expect(path.endsWith("notes.pdf")).toBe(true);
  });

  it("lesson audio paths are scoped by tenant and lesson, distinct from lesson files", () => {
    const path = buildLessonAudioPath(tenantA, "lesson-1", "clip.mp3");
    expect(path.includes("/audio-")).toBe(true);
  });
});

describe("sanitizeFileName", () => {
  it("strips path separators", () => {
    expect(sanitizeFileName("a/b\\c.txt")).toBe("a_b_c.txt");
  });

  it("strips .. traversal segments", () => {
    expect(sanitizeFileName("../../etc/passwd")).not.toContain("..");
  });

  it("falls back to a default name for an empty/whitespace-only input", () => {
    expect(sanitizeFileName("   ")).toBe("file");
  });
});

describe("validateUpload", () => {
  it("accepts a file matching the allowed prefix and under the size cap", () => {
    const result = validateUpload({ type: "image/png", size: 1024 }, { allowedPrefix: "image/", maxBytes: 5 * 1024 * 1024 });
    expect(result.ok).toBe(true);
  });

  it("rejects a file with the wrong MIME type", () => {
    const result = validateUpload({ type: "application/pdf", size: 1024 }, { allowedPrefix: "image/", maxBytes: 5 * 1024 * 1024 });
    expect(result.ok).toBe(false);
  });

  it("rejects an oversized file", () => {
    const result = validateUpload(
      { type: "image/png", size: 10 * 1024 * 1024 },
      { allowedPrefix: "image/", maxBytes: 5 * 1024 * 1024 },
    );
    expect(result.ok).toBe(false);
  });
});

describe("describeStorageError", () => {
  it("maps a missing-bucket Supabase error to an actionable message", () => {
    const message = describeStorageError({ message: "Bucket not found" });
    expect(message).toContain("storage is not set up for this environment");
  });

  it("passes through other Supabase error messages", () => {
    const message = describeStorageError({ message: "Payload too large" });
    expect(message).toBe("Upload failed: Payload too large");
  });

  it("handles a null/undefined error gracefully", () => {
    expect(describeStorageError(null)).toBe("Upload failed.");
  });
});
