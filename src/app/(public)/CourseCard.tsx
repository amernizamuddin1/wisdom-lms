import Image from "next/image";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { cardVariants } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import PriceDisplay from "./PriceDisplay";

type CourseCardData = {
  id: string;
  title: string;
  description: string | null;
  thumbnailUrl: string | null;
  isFree: boolean;
  tags: string[];
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

export default function CourseCard({
  course,
  preloadImage = false,
}: {
  course: CourseCardData;
  preloadImage?: boolean;
}) {
  return (
    <Link
      href={`/courses/${course.id}`}
      className={cn(
        "group flex w-full flex-col overflow-hidden",
        cardVariants({ variant: "course" }),
      )}
    >
      <div className="relative aspect-video w-full overflow-hidden">
        {course.thumbnailUrl ? (
          <Image
            src={course.thumbnailUrl}
            alt={course.title}
            fill
            sizes="(min-width: 1024px) 420px, (min-width: 640px) 50vw, 100vw"
            className="object-cover transition-transform duration-[350ms] [transition-timing-function:cubic-bezier(0.2,0.8,0.2,1)] motion-safe:group-hover:scale-[1.04]"
            preload={preloadImage}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-muted text-sm text-muted-foreground">
            No thumbnail
          </div>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-2 p-3">
        <h3 className="line-clamp-2 text-sm font-semibold leading-snug text-foreground group-hover:text-primary">
          {course.title}
        </h3>
        {course.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {course.tags.slice(0, 2).map((tag) => (
              <Badge
                key={tag}
                variant="outline"
                className="border-indigo/30 px-1.5 py-0 text-[10px] text-indigo"
              >
                {tag}
              </Badge>
            ))}
          </div>
        )}
        <div className="mt-auto pt-1">
          <PriceDisplay isFree={course.isFree} prices={course.prices} size="sm" />
        </div>
      </div>
    </Link>
  );
}
