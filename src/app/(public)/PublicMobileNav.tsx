"use client";

import { useState } from "react";
import Link from "next/link";
import { MenuIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

export default function PublicMobileNav({
  isWisdomQuant,
  wisdomQuantSiteUrl,
}: {
  isWisdomQuant: boolean;
  wisdomQuantSiteUrl: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="sm:hidden">
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <Button variant="outline" size="icon" aria-label="Open menu">
            <MenuIcon className="size-4" />
          </Button>
        </SheetTrigger>
        <SheetContent side="right" className="w-[75%] sm:max-w-sm">
          <SheetHeader>
            <SheetTitle>Menu</SheetTitle>
          </SheetHeader>
          <nav className="flex flex-col gap-1 px-4 pb-4">
            <Link
              href="/courses"
              onClick={() => setOpen(false)}
              className="rounded-md px-3 py-2 text-sm font-medium text-foreground hover:bg-muted"
            >
              Courses
            </Link>
            <Link
              href="/bundles"
              onClick={() => setOpen(false)}
              className="rounded-md px-3 py-2 text-sm font-medium text-foreground hover:bg-muted"
            >
              Bundles
            </Link>
            {isWisdomQuant && (
              <Link
                href={wisdomQuantSiteUrl}
                onClick={() => setOpen(false)}
                className="rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-muted"
              >
                ← wisdomquant.com
              </Link>
            )}
          </nav>
        </SheetContent>
      </Sheet>
    </div>
  );
}
