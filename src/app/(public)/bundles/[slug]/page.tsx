import { cache, Suspense } from "react";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getOptionalUser } from "@/lib/auth";
import { getBranding } from "@/lib/branding";
import { logCommerceEvent } from "@/lib/commerce-events";
import { getActiveBundle } from "@/lib/public-data";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import PriceDisplay from "../../PriceDisplay";
import BundleEnrollSection from "./BundleEnrollSection";

type ActiveBundle = NonNullable<Awaited<ReturnType<typeof getActiveBundle>>>;

const getBundleEnrollmentState = cache(async function getBundleEnrollmentState(
  bundleId: string,
) {
  const user = await getOptionalUser();
  const enrollment = user
    ? await prisma.bundleEnrollment.findUnique({
        where: { userId_bundleId: { userId: user.id, bundleId } },
        select: { status: true },
      })
    : null;

  return { user, isEnrolled: enrollment?.status === "ACTIVE" };
});

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const [bundle, branding] = await Promise.all([getActiveBundle(slug), getBranding()]);
  if (!bundle) return { title: `Bundle not found | ${branding.platformName}` };
  return {
    title: `${bundle.name} | ${branding.platformName}`,
    description: bundle.shortDescription ?? undefined,
  };
}

export default async function BundleDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const bundle = await getActiveBundle(slug);

  if (!bundle) notFound();

  return (
    <div className="mx-auto grid max-w-(--content-width) gap-8 px-4 py-10 sm:px-6 lg:grid-cols-[1fr_340px]">
      <div className="space-y-8">
        <div className="space-y-3">
          {bundle.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {bundle.tags.map((tag) => (
                <Badge key={tag} variant="outline" className="border-indigo/30 text-indigo">
                  {tag}
                </Badge>
              ))}
            </div>
          )}
          <h1 className="text-3xl font-bold text-foreground">{bundle.name}</h1>
          {bundle.description && (
            <p className="font-body text-muted-foreground">{bundle.description}</p>
          )}
        </div>

        {bundle.thumbnailUrl && (
          <Image
            src={bundle.thumbnailUrl}
            alt={bundle.name}
            width={800}
            height={400}
            sizes="(min-width: 1024px) 810px, 100vw"
            className="w-full rounded-xl border object-cover"
            preload
          />
        )}

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-foreground">
            {bundle.courses.length} courses included
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {bundle.courses.map(({ course }) => (
              <Link key={course.id} href={`/courses/${course.id}`}>
                <Card className="transition-shadow hover:shadow-md">
                  <CardContent className="flex items-center gap-3">
                    {course.thumbnailUrl ? (
                      <Image
                        src={course.thumbnailUrl}
                        alt={course.title}
                        width={64}
                        height={48}
                        className="h-12 w-16 shrink-0 rounded-md object-cover"
                      />
                    ) : (
                      <div className="flex h-12 w-16 shrink-0 items-center justify-center rounded-md bg-muted text-xs text-muted-foreground">
                        —
                      </div>
                    )}
                    <span className="font-medium text-foreground">{course.title}</span>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </section>
      </div>

      <aside className="h-fit space-y-4 lg:sticky lg:top-6">
        <Card>
          <CardContent className="space-y-4">
            <PriceDisplay isFree={bundle.isFree} prices={bundle.prices} />
            <Suspense fallback={<div className="h-10 animate-pulse rounded-md bg-muted" />}>
              <BundleEnrollmentControls bundle={bundle} />
            </Suspense>
          </CardContent>
        </Card>
      </aside>
      <Suspense fallback={null}>
        <BundleViewLogger bundleId={bundle.id} />
      </Suspense>
    </div>
  );
}

async function BundleEnrollmentControls({ bundle }: { bundle: ActiveBundle }) {
  const { user, isEnrolled } = await getBundleEnrollmentState(bundle.id);

  return isEnrolled ? (
    <Button asChild className="w-full">
      <Link href="/dashboard">Go to Dashboard</Link>
    </Button>
  ) : (
    <BundleEnrollSection
      bundleId={bundle.id}
      slug={bundle.slug}
      isFree={bundle.isFree}
      isLoggedIn={Boolean(user)}
    />
  );
}

async function BundleViewLogger({ bundleId }: { bundleId: string }) {
  const user = await getOptionalUser();
  if (user) {
    logCommerceEvent({ userId: user.id, type: "PRODUCT_VIEWED", bundleId });
  }
  return null;
}
