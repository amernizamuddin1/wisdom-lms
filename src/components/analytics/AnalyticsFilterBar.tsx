"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { SlidersHorizontalIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { RANGE_OPTIONS } from "@/lib/analytics/date-range";

export type CourseOption = { id: string; title: string };
export type BundleOption = { id: string; name: string };

export default function AnalyticsFilterBar({
  courses,
  courseParam = "courseId",
  courseLabel = "Course",
  bundles,
  bundleParam = "bundleId",
  bundleLabel = "Bundle",
}: {
  courses?: CourseOption[];
  courseParam?: string;
  courseLabel?: string;
  bundles?: BundleOption[];
  bundleParam?: string;
  bundleLabel?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const range = searchParams.get("range") ?? "30d";
  const from = searchParams.get("from") ?? "";
  const to = searchParams.get("to") ?? "";
  const courseId = searchParams.get(courseParam) ?? "all";
  const bundleId = searchParams.get(bundleParam) ?? "all";

  function setParams(updates: Record<string, string | null>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(updates)) {
      if (value === null || value === "" || value === "all") params.delete(key);
      else params.set(key, value);
    }
    params.delete("page");
    router.push(`${pathname}?${params.toString()}`);
  }

  const controls = (
    <>
      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground">Date range</Label>
        <Select value={range} onValueChange={(v) => setParams({ range: v, ...(v !== "custom" ? { from: null, to: null } : {}) })}>
          <SelectTrigger className="w-full sm:w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {RANGE_OPTIONS.map((opt) => (
              <SelectItem key={opt.key} value={opt.key}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {range === "custom" && (
        <div className="flex gap-2">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">From</Label>
            <Input type="date" value={from} onChange={(e) => setParams({ from: e.target.value })} className="w-full sm:w-40" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">To</Label>
            <Input type="date" value={to} onChange={(e) => setParams({ to: e.target.value })} className="w-full sm:w-40" />
          </div>
        </div>
      )}

      {courses && (
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">{courseLabel}</Label>
          <Select value={courseId} onValueChange={(v) => setParams({ [courseParam]: v })}>
            <SelectTrigger className="w-full sm:w-56">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All courses</SelectItem>
              {courses.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {bundles && (
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">{bundleLabel}</Label>
          <Select value={bundleId} onValueChange={(v) => setParams({ [bundleParam]: v })}>
            <SelectTrigger className="w-full sm:w-56">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All bundles</SelectItem>
              {bundles.map((b) => (
                <SelectItem key={b.id} value={b.id}>
                  {b.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
    </>
  );

  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="hidden flex-wrap items-end gap-4 md:flex">{controls}</div>
      <div className="md:hidden">
        <Sheet>
          <SheetTrigger asChild>
            <Button type="button" variant="outline" className="w-full justify-center gap-2">
              <SlidersHorizontalIcon className="size-4" />
              Filters
            </Button>
          </SheetTrigger>
          <SheetContent side="bottom" className="max-h-[80vh] overflow-y-auto">
            <SheetHeader>
              <SheetTitle>Filters</SheetTitle>
            </SheetHeader>
            <div className="flex flex-col gap-4 px-4 pb-4">{controls}</div>
          </SheetContent>
        </Sheet>
      </div>
    </div>
  );
}
