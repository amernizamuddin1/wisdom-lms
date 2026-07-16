import Link from "next/link";
import { MessageSquareIcon } from "lucide-react";
import { CardContent, cardVariants } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export default function CategoryCard({
  slug,
  name,
  description,
  threadCount,
}: {
  slug: string;
  name: string;
  description?: string | null;
  threadCount: number;
}) {
  return (
    <Link
      href={`/community/category/${slug}`}
      className={cn("group flex h-full flex-col py-6", cardVariants({ variant: "interactive" }))}
    >
      <CardContent className="flex flex-col gap-2">
        <h3 className="font-semibold text-foreground">{name}</h3>
        {description && <p className="line-clamp-2 text-sm text-muted-foreground">{description}</p>}
        <div className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
          <MessageSquareIcon className="size-3.5" />
          {threadCount} {threadCount === 1 ? "thread" : "threads"}
        </div>
      </CardContent>
    </Link>
  );
}
