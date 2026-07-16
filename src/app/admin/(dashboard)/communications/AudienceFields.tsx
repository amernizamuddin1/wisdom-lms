"use client";

import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export type AudienceOption = { id: string; label: string };
export type AudienceUser = { id: string; name: string; email: string };

export interface AudienceDefaults {
  audienceType: string;
  selectedCourseIds: string[];
  selectedBundleIds: string[];
  manuallySelectedUserIds: string[];
  excludedUserIds: string[];
}

export interface RecipientPreview {
  id: string;
  name: string;
  email: string;
}

export default function AudienceFields({
  courses,
  bundles,
  users,
  defaults,
  onPreview,
}: {
  courses: AudienceOption[];
  bundles: AudienceOption[];
  users: AudienceUser[];
  defaults: AudienceDefaults;
  onPreview: () => Promise<RecipientPreview[]>;
}) {
  const [audienceType, setAudienceType] = useState(defaults.audienceType);
  const [courseIds, setCourseIds] = useState(new Set(defaults.selectedCourseIds));
  const [bundleIds, setBundleIds] = useState(new Set(defaults.selectedBundleIds));
  const [manualIds, setManualIds] = useState(new Set(defaults.manuallySelectedUserIds));
  const [excludedIds, setExcludedIds] = useState(new Set(defaults.excludedUserIds));
  const [userSearch, setUserSearch] = useState("");
  const [preview, setPreview] = useState<RecipientPreview[] | null>(null);
  const [previewPending, setPreviewPending] = useState(false);

  const filteredUsers = useMemo(() => {
    const q = userSearch.trim().toLowerCase();
    if (!q) return users.slice(0, 50);
    return users.filter((u) => u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)).slice(0, 50);
  }, [users, userSearch]);

  function toggle(set: Set<string>, setter: (s: Set<string>) => void, id: string) {
    const next = new Set(set);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setter(next);
  }

  async function handlePreview() {
    setPreviewPending(true);
    try {
      const result = await onPreview();
      setPreview(result);
    } finally {
      setPreviewPending(false);
    }
  }

  function toggleExcludeFromPreview(userId: string) {
    toggle(excludedIds, setExcludedIds, userId);
  }

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="audienceType">Audience</Label>
        <Select name="audienceType" value={audienceType} onValueChange={setAudienceType}>
          <SelectTrigger id="audienceType">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL_USERS">All registered users</SelectItem>
            <SelectItem value="ALL_ENROLLED">All enrolled users</SelectItem>
            <SelectItem value="MIXED">Courses / Bundles / Manual (combine below)</SelectItem>
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">
          Choosing courses, bundles, or individual users below always combines them — pick
          &ldquo;Courses / Bundles / Manual&rdquo; to target a specific mix.
        </p>
      </div>

      {(audienceType === "MIXED" || audienceType === "COURSES" || audienceType === "BUNDLES" || audienceType === "MANUAL") && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="space-y-1.5 rounded-lg border p-3">
            <Label>Courses</Label>
            <div className="max-h-48 space-y-1 overflow-y-auto">
              {courses.map((c) => (
                <label key={c.id} className="flex items-center gap-2 text-sm text-foreground">
                  <input
                    type="checkbox"
                    name="selectedCourseIds"
                    value={c.id}
                    checked={courseIds.has(c.id)}
                    onChange={() => toggle(courseIds, setCourseIds, c.id)}
                    className="size-4 rounded border-input"
                  />
                  <span className="truncate">{c.label}</span>
                </label>
              ))}
              {courses.length === 0 && <p className="text-xs text-muted-foreground">No courses.</p>}
            </div>
          </div>

          <div className="space-y-1.5 rounded-lg border p-3">
            <Label>Bundles</Label>
            <div className="max-h-48 space-y-1 overflow-y-auto">
              {bundles.map((b) => (
                <label key={b.id} className="flex items-center gap-2 text-sm text-foreground">
                  <input
                    type="checkbox"
                    name="selectedBundleIds"
                    value={b.id}
                    checked={bundleIds.has(b.id)}
                    onChange={() => toggle(bundleIds, setBundleIds, b.id)}
                    className="size-4 rounded border-input"
                  />
                  <span className="truncate">{b.label}</span>
                </label>
              ))}
              {bundles.length === 0 && <p className="text-xs text-muted-foreground">No bundles.</p>}
            </div>
          </div>

          <div className="space-y-1.5 rounded-lg border p-3">
            <Label>Individual users</Label>
            <Input
              value={userSearch}
              onChange={(e) => setUserSearch(e.target.value)}
              placeholder="Search name or email..."
              className="h-8 text-xs"
            />
            <div className="max-h-40 space-y-1 overflow-y-auto">
              {filteredUsers.map((u) => (
                <label key={u.id} className="flex items-center gap-2 text-sm text-foreground">
                  <input
                    type="checkbox"
                    name="manuallySelectedUserIds"
                    value={u.id}
                    checked={manualIds.has(u.id)}
                    onChange={() => toggle(manualIds, setManualIds, u.id)}
                    className="size-4 rounded border-input"
                  />
                  <span className="truncate text-xs">
                    {u.name} <span className="text-muted-foreground">({u.email})</span>
                  </span>
                </label>
              ))}
            </div>
          </div>
        </div>
      )}

      {Array.from(excludedIds).map((id) => (
        <input key={id} type="hidden" name="excludedUserIds" value={id} />
      ))}

      <div className="rounded-lg border p-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-sm font-medium text-foreground">Recipient preview</p>
            <p className="text-xs text-muted-foreground">
              Deduplicated, valid-email recipients for the audience selected above.
            </p>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={handlePreview} disabled={previewPending}>
            {previewPending ? "Loading..." : "Preview Recipients"}
          </Button>
        </div>

        {preview && (
          <div className="mt-3 space-y-2">
            <Badge variant="secondary">{preview.length} unique recipient{preview.length === 1 ? "" : "s"}</Badge>
            <div className="max-h-56 space-y-1 overflow-y-auto rounded-md border">
              {preview.map((r) => (
                <div key={r.id} className="flex items-center justify-between gap-2 px-3 py-1.5 text-sm">
                  <span className={excludedIds.has(r.id) ? "text-muted-foreground line-through" : "text-foreground"}>
                    {r.name} <span className="text-xs text-muted-foreground">({r.email})</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => toggleExcludeFromPreview(r.id)}
                    className="text-xs text-destructive hover:underline"
                  >
                    {excludedIds.has(r.id) ? "Include" : "Exclude"}
                  </button>
                </div>
              ))}
              {preview.length === 0 && (
                <p className="px-3 py-4 text-center text-xs text-muted-foreground">
                  No recipients match this audience.
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
