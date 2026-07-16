"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import AddToCartButtons from "../../courses/[courseId]/AddToCartButtons";

export default function BundleEnrollSection({
  bundleId,
  slug,
  isFree,
  isLoggedIn,
}: {
  bundleId: string;
  slug: string;
  isFree: boolean;
  isLoggedIn: boolean;
}) {
  if (!isLoggedIn) {
    return (
      <div className="space-y-2">
        <Button asChild className="w-full">
          <Link href={`/login?next=${encodeURIComponent(`/bundles/${slug}`)}`}>
            Log In to {isFree ? "Enroll" : "Buy"}
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <AddToCartButtons
      target={{ itemType: "BUNDLE", bundleId }}
      isLoggedIn={isLoggedIn}
      loginReturnPath={`/bundles/${slug}`}
    />
  );
}
