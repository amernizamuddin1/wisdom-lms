// Pure, server-only-free helpers for building Supabase Storage bucket
// names/paths and validating uploads. Kept free of "server-only"/Prisma/
// Supabase imports so they can be unit-tested directly (see paths.test.ts).
//
// Every path is prefixed with the resolved tenant ID (never a client-supplied
// value — callers must pass the tenantId from src/lib/tenant-context.ts).
// This is what makes cross-tenant object overwrites structurally impossible:
// two tenants can never produce the same path even if they share the same
// courseId/bundleId/lessonId shape, and callers are expected to also verify
// (via a tenant-scoped Prisma lookup) that the entity id actually belongs to
// that tenant before calling any of these path builders.

export const COURSE_ASSETS_BUCKET = "course-assets";
export const LESSON_FILES_BUCKET = "lesson-files";
export const CERTIFICATES_BUCKET = "certificates";

// Strips path separators and ".." segments from a user-supplied file name so
// it can't be used to escape the intended object-key prefix.
export function sanitizeFileName(fileName: string): string {
  return fileName
    .replace(/[/\\]+/g, "_")
    .replace(/\.\./g, "_")
    .trim() || "file";
}

export function buildCourseThumbnailPath(tenantId: string, courseId: string, ext: string): string {
  return `tenants/${tenantId}/courses/${courseId}/thumbnail-${Date.now()}.${ext}`;
}

export function buildBundleThumbnailPath(tenantId: string, bundleId: string, ext: string): string {
  return `tenants/${tenantId}/bundles/${bundleId}/thumbnail-${Date.now()}.${ext}`;
}

export function buildLessonFilePath(tenantId: string, lessonId: string, fileName: string): string {
  return `tenants/${tenantId}/lessons/${lessonId}/${Date.now()}-${sanitizeFileName(fileName)}`;
}

export function buildLessonAudioPath(tenantId: string, lessonId: string, fileName: string): string {
  return `tenants/${tenantId}/lessons/${lessonId}/audio-${Date.now()}-${sanitizeFileName(fileName)}`;
}

export interface UploadValidationOptions {
  allowedPrefix: string; // e.g. "image/" or "audio/"
  maxBytes: number;
}

export type UploadValidationResult = { ok: true } | { ok: false; error: string };

export function validateUpload(
  file: { type: string; size: number },
  { allowedPrefix, maxBytes }: UploadValidationOptions,
): UploadValidationResult {
  if (!file.type.startsWith(allowedPrefix)) {
    return { ok: false, error: `Only ${allowedPrefix.replace("/", "")} files are allowed.` };
  }
  if (file.size > maxBytes) {
    return { ok: false, error: `File must be under ${Math.floor(maxBytes / (1024 * 1024))}MB.` };
  }
  return { ok: true };
}

// Supabase Storage returns a generic error when the target bucket doesn't
// exist yet (e.g. staging never had scripts/staging/setup-storage.ts run
// against it). Surface that as an actionable message instead of the raw
// Supabase text leaking to the UI.
export function describeStorageError(error: { message: string } | null | undefined): string {
  if (!error) return "Upload failed.";
  if (/bucket not found/i.test(error.message)) {
    return "Upload failed: storage is not set up for this environment yet. Contact an administrator.";
  }
  return `Upload failed: ${error.message}`;
}
