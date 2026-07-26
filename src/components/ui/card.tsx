import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const FOCUS_RING =
  "focus-visible:outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50";

const cardVariants = cva(
  cn(
    "rounded-xl border border-card-border bg-white text-card-foreground",
    "transition-[transform,box-shadow,border-color,background-color] duration-[240ms] ease-out [transform-origin:center]",
    "motion-safe:hover:-translate-y-0.5 odd:motion-safe:hover:rotate-[-0.35deg] even:motion-safe:hover:rotate-[0.35deg]",
    "dark:bg-card",
  ),
  {
    variants: {
      variant: {
        default: "dark:shadow-card",
        kpi: cn(
          "hover:bg-white motion-safe:hover:-translate-y-[5px]",
          "odd:motion-safe:hover:rotate-[-0.4deg] even:motion-safe:hover:rotate-[0.4deg]",
          "dark:shadow-card dark:hover:bg-indigo/10 dark:hover:border-indigo/30",
          "dark:hover:shadow-[0_16px_32px_-12px_color-mix(in_oklab,var(--color-indigo)_45%,transparent)]",
          FOCUS_RING,
        ),
        course: cn(
          "motion-safe:hover:-translate-y-[6px]",
          "odd:motion-safe:hover:rotate-[-0.5deg] even:motion-safe:hover:rotate-[0.5deg]",
          "dark:shadow-card dark:hover:border-indigo/30",
          "dark:hover:shadow-[0_16px_32px_-12px_color-mix(in_oklab,var(--color-indigo)_45%,transparent)]",
          FOCUS_RING,
        ),
        interactive: cn(
          "hover:bg-white motion-safe:hover:-translate-y-1",
          "dark:shadow-card dark:hover:border-indigo/30 dark:hover:bg-indigo/10 dark:hover:shadow-md",
          FOCUS_RING,
        ),
        subtle: cn(
          "hover:bg-white dark:shadow-card dark:hover:border-border-strong dark:hover:bg-muted/20 dark:hover:shadow-md",
          FOCUS_RING,
        ),
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

function Card({
  className,
  variant = "default",
  ...props
}: React.ComponentProps<"div"> & VariantProps<typeof cardVariants>) {
  return (
    <div
      data-slot="card"
      className={cn(
        "flex flex-col gap-6 py-6",
        cardVariants({ variant }),
        (variant === "kpi" || variant === "course" || variant === "interactive") && "group",
        className,
      )}
      {...props}
    />
  );
}

function CardHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-header"
      className={cn(
        "@container/card-header grid auto-rows-min grid-rows-[auto_auto] items-start gap-2 px-6 has-data-[slot=card-action]:grid-cols-[1fr_auto] [.border-b]:pb-6",
        className,
      )}
      {...props}
    />
  );
}

function CardTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-title"
      className={cn("leading-none font-semibold", className)}
      {...props}
    />
  );
}

function CardDescription({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-description"
      className={cn("text-sm text-muted-foreground", className)}
      {...props}
    />
  );
}

function CardAction({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-action"
      className={cn("col-start-2 row-span-2 row-start-1 self-start justify-self-end", className)}
      {...props}
    />
  );
}

function CardContent({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div data-slot="card-content" className={cn("px-6", className)} {...props} />
  );
}

function CardFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-footer"
      className={cn("flex items-center px-6 [.border-t]:pt-6", className)}
      {...props}
    />
  );
}

export { Card, CardHeader, CardFooter, CardTitle, CardAction, CardDescription, CardContent, cardVariants };
