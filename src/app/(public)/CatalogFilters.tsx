import Link from "next/link";
import { XIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function CatalogFilters({
  tags,
  defaults,
  action = "/courses",
  searchPlaceholder = "Search courses...",
}: {
  tags: string[];
  defaults: { q: string; price: string; tag: string };
  action?: string;
  searchPlaceholder?: string;
}) {
  const hasActiveFilters =
    defaults.q !== "" || defaults.price !== "all" || defaults.tag !== "all";

  return (
    <form
      method="get"
      action={action}
      className="flex flex-col gap-3 rounded-xl border bg-card p-4 sm:flex-row sm:items-center"
    >
      <Input
        name="q"
        placeholder={searchPlaceholder}
        defaultValue={defaults.q}
        className="sm:max-w-xs"
      />
      <Select name="price" defaultValue={defaults.price}>
        <SelectTrigger className="sm:w-40">
          <SelectValue placeholder="Price" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All prices</SelectItem>
          <SelectItem value="free">Free</SelectItem>
          <SelectItem value="paid">Paid</SelectItem>
        </SelectContent>
      </Select>
      {tags.length > 0 && (
        <Select name="tag" defaultValue={defaults.tag}>
          <SelectTrigger className="sm:w-40">
            <SelectValue placeholder="Tag" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All tags</SelectItem>
            {tags.map((tag) => (
              <SelectItem key={tag} value={tag}>
                {tag}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
      <Button type="submit" variant="default">
        Search
      </Button>
      {hasActiveFilters && (
        <Button type="button" variant="ghost" asChild>
          <Link href={action}>
            <XIcon />
            Clear
          </Link>
        </Button>
      )}
    </form>
  );
}
