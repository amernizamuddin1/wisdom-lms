"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

const COLLAPSED_HEIGHT = 168; // px, roughly 7 lines of body text
const LONG_DESCRIPTION_THRESHOLD = 420; // chars, above which collapsing is worthwhile

export default function CourseDescription({ description }: { description: string }) {
  const [expanded, setExpanded] = useState(false);
  const isLong = description.length > LONG_DESCRIPTION_THRESHOLD;

  return (
    <div className="space-y-2">
      <div
        className="overflow-hidden font-body text-sm whitespace-pre-line text-muted-foreground transition-[max-height] duration-300"
        style={{ maxHeight: !isLong || expanded ? undefined : COLLAPSED_HEIGHT }}
      >
        {description}
      </div>
      {isLong && (
        <Button
          type="button"
          variant="link"
          className="h-auto p-0"
          onClick={() => setExpanded((v) => !v)}
        >
          {expanded ? "Show Less" : "Show More"}
        </Button>
      )}
    </div>
  );
}
