"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  addCourseToCoupon,
  removeCourseFromCoupon,
  addBundleToCoupon,
  removeBundleFromCoupon,
} from "../actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

type CourseOption = { id: string; title: string };
type BundleOption = { id: string; name: string };

export default function CouponScopeSection({
  couponId,
  allCourses,
  allBundles,
  selectedCourses,
  selectedBundles,
}: {
  couponId: string;
  allCourses: CourseOption[];
  allBundles: BundleOption[];
  selectedCourses: CourseOption[];
  selectedBundles: BundleOption[];
}) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <CoursePicker couponId={couponId} allCourses={allCourses} selected={selectedCourses} />
      <BundlePicker couponId={couponId} allBundles={allBundles} selected={selectedBundles} />
    </div>
  );
}

function CoursePicker({
  couponId,
  allCourses,
  selected,
}: {
  couponId: string;
  allCourses: CourseOption[];
  selected: CourseOption[];
}) {
  const [query, setQuery] = useState("");
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const selectedIds = useMemo(() => new Set(selected.map((c) => c.id)), [selected]);
  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    return allCourses
      .filter((c) => !selectedIds.has(c.id))
      .filter((c) => (q ? c.title.toLowerCase().includes(q) : true));
  }, [allCourses, selectedIds, query]);

  function handleAdd(courseId: string) {
    startTransition(async () => {
      const result = await addCourseToCoupon(couponId, courseId);
      if (result?.error) toast.error(result.error);
      else toast.success("Course added.");
      router.refresh();
    });
  }

  function handleRemove(courseId: string) {
    startTransition(async () => {
      const result = await removeCourseFromCoupon(couponId, courseId);
      if (result?.error) toast.error(result.error);
      else toast.success("Course removed.");
      router.refresh();
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Courses ({selected.length})</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {selected.length === 0 ? (
          <p className="text-sm text-muted-foreground">No courses selected yet.</p>
        ) : (
          <ul className="space-y-1.5">
            {selected.map((course) => (
              <li key={course.id} className="flex items-center justify-between rounded-md border p-2">
                <span className="text-sm text-foreground">{course.title}</span>
                <Button variant="outline" size="sm" disabled={pending} onClick={() => handleRemove(course.id)}>
                  Remove
                </Button>
              </li>
            ))}
          </ul>
        )}

        <Input placeholder="Search courses..." value={query} onChange={(e) => setQuery(e.target.value)} />
        <ul className="max-h-64 space-y-1.5 overflow-y-auto">
          {results.map((course) => (
            <li key={course.id} className="flex items-center justify-between rounded-md border p-2">
              <span className="text-sm text-foreground">{course.title}</span>
              <Button size="sm" disabled={pending} onClick={() => handleAdd(course.id)}>
                Add
              </Button>
            </li>
          ))}
          {results.length === 0 && (
            <li className="py-4 text-center text-sm text-muted-foreground">No matching courses.</li>
          )}
        </ul>
      </CardContent>
    </Card>
  );
}

function BundlePicker({
  couponId,
  allBundles,
  selected,
}: {
  couponId: string;
  allBundles: BundleOption[];
  selected: BundleOption[];
}) {
  const [query, setQuery] = useState("");
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const selectedIds = useMemo(() => new Set(selected.map((b) => b.id)), [selected]);
  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    return allBundles
      .filter((b) => !selectedIds.has(b.id))
      .filter((b) => (q ? b.name.toLowerCase().includes(q) : true));
  }, [allBundles, selectedIds, query]);

  function handleAdd(bundleId: string) {
    startTransition(async () => {
      const result = await addBundleToCoupon(couponId, bundleId);
      if (result?.error) toast.error(result.error);
      else toast.success("Bundle added.");
      router.refresh();
    });
  }

  function handleRemove(bundleId: string) {
    startTransition(async () => {
      const result = await removeBundleFromCoupon(couponId, bundleId);
      if (result?.error) toast.error(result.error);
      else toast.success("Bundle removed.");
      router.refresh();
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Bundles ({selected.length})</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {selected.length === 0 ? (
          <p className="text-sm text-muted-foreground">No bundles selected yet.</p>
        ) : (
          <ul className="space-y-1.5">
            {selected.map((bundle) => (
              <li key={bundle.id} className="flex items-center justify-between rounded-md border p-2">
                <span className="text-sm text-foreground">{bundle.name}</span>
                <Button variant="outline" size="sm" disabled={pending} onClick={() => handleRemove(bundle.id)}>
                  Remove
                </Button>
              </li>
            ))}
          </ul>
        )}

        <Input placeholder="Search bundles..." value={query} onChange={(e) => setQuery(e.target.value)} />
        <ul className="max-h-64 space-y-1.5 overflow-y-auto">
          {results.map((bundle) => (
            <li key={bundle.id} className="flex items-center justify-between rounded-md border p-2">
              <span className="text-sm text-foreground">{bundle.name}</span>
              <Button size="sm" disabled={pending} onClick={() => handleAdd(bundle.id)}>
                Add
              </Button>
            </li>
          ))}
          {results.length === 0 && (
            <li className="py-4 text-center text-sm text-muted-foreground">No matching bundles.</li>
          )}
        </ul>
      </CardContent>
    </Card>
  );
}
