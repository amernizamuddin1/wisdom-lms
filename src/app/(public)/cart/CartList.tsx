"use client";

import Image from "next/image";
import { useTransition } from "react";
import { XIcon } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { removeFromCartAction } from "./actions";
import type { CartItemView } from "@/lib/cart";

export default function CartList({
  items,
  currencySymbol,
}: {
  items: CartItemView[];
  currencySymbol: string;
}) {
  const [pending, startTransition] = useTransition();

  function handleRemove(cartItemId: string) {
    startTransition(async () => {
      const result = await removeFromCartAction(cartItemId);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success("Removed from cart");
    });
  }

  return (
    <div className="space-y-3">
      {items.map((item) => (
        <div
          key={item.id}
          className="flex items-center gap-4 rounded-xl border bg-card p-3"
        >
          {item.thumbnailUrl ? (
            <Image
              src={item.thumbnailUrl}
              alt={item.title}
              width={96}
              height={64}
              className="h-16 w-24 shrink-0 rounded-lg object-cover"
              unoptimized
            />
          ) : (
            <div className="flex h-16 w-24 shrink-0 items-center justify-center rounded-lg bg-muted text-xs text-muted-foreground">
              No image
            </div>
          )}

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <p className="truncate font-medium text-foreground">{item.title}</p>
              <Badge variant="outline" className="shrink-0 text-xs">
                {item.itemType === "BUNDLE" ? "Bundle" : "Course"}
              </Badge>
            </div>
            <div className="mt-1 flex items-baseline gap-2">
              {item.effectivePrice === 0 ? (
                <span className="text-sm font-semibold text-foreground">Free</span>
              ) : (
                <>
                  <span className="text-sm font-semibold text-foreground">
                    {currencySymbol}
                    {item.effectivePrice.toLocaleString()}
                  </span>
                  {item.discountedPrice != null && (
                    <>
                      <span className="text-xs text-muted-foreground line-through">
                        {currencySymbol}
                        {item.originalPrice.toLocaleString()}
                      </span>
                      <span className="text-xs text-success">
                        {item.discountPct}% off
                      </span>
                    </>
                  )}
                </>
              )}
            </div>
          </div>

          <Button
            type="button"
            variant="ghost"
            size="icon"
            disabled={pending}
            onClick={() => handleRemove(item.id)}
            aria-label="Remove from cart"
          >
            <XIcon className="size-4" />
          </Button>
        </div>
      ))}
    </div>
  );
}
