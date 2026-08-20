import Image from "next/image";
import Link from "next/link";
import { PackageIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cardVariants } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import PriceDisplay from "./PriceDisplay";

type BundleCardData = {
  slug: string;
  name: string;
  shortDescription: string | null;
  thumbnailUrl: string | null;
  isFree: boolean;
  tags: string[];
  courseCount: number;
  prices: {
    currency: string;
    amount: unknown;
    discountedPrice: unknown;
    discountStartAt: Date | null;
    discountEndAt: Date | null;
    maxDiscountedEnrollments: number | null;
    discountedEnrollmentsUsed: number;
  }[];
};

export default function BundleCard({
  bundle,
  preloadImage = false,
}: {
  bundle: BundleCardData;
  preloadImage?: boolean;
}) {
  return (
    <Link
      href={`/bundles/${bundle.slug}`}
      className={cn("group flex flex-col overflow-hidden", cardVariants({ variant: "course" }))}
    >
      {bundle.thumbnailUrl ? (
        <div className="relative h-40 w-full overflow-hidden">
          <Image
            src={bundle.thumbnailUrl}
            alt={bundle.name}
            fill
            sizes="(min-width: 1024px) 25vw, (min-width: 768px) 33vw, (min-width: 640px) 50vw, 100vw"
            className="object-cover transition-transform duration-[350ms] [transition-timing-function:cubic-bezier(0.2,0.8,0.2,1)] motion-safe:group-hover:scale-[1.04]"
            preload={preloadImage}
          />
        </div>
      ) : (
        <div className="flex h-40 w-full items-center justify-center bg-muted text-sm text-muted-foreground">
          No thumbnail
        </div>
      )}
      <div className="flex flex-1 flex-col gap-3 p-4">
        <div className="flex items-center gap-2">
          <PackageIcon className="size-4 shrink-0 text-muted-foreground" />
          <h3 className="font-semibold text-foreground group-hover:text-primary">{bundle.name}</h3>
        </div>
        {bundle.shortDescription && (
          <p className="line-clamp-2 font-body text-sm text-muted-foreground">
            {bundle.shortDescription}
          </p>
        )}
        <p className="text-xs text-muted-foreground">{bundle.courseCount} courses included</p>
        {bundle.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {bundle.tags.slice(0, 3).map((tag) => (
              <Badge key={tag} variant="outline" className="border-indigo/30 text-indigo">
                {tag}
              </Badge>
            ))}
          </div>
        )}
        <div className="mt-auto pt-2">
          <PriceDisplay isFree={bundle.isFree} prices={bundle.prices} size="sm" />
        </div>
      </div>
    </Link>
  );
}
