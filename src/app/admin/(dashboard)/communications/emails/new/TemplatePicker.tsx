"use client";

import { useTransition } from "react";
import { createDraftCampaign } from "../actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { StarterTemplateId } from "@/lib/email-templates/starters";

export default function TemplatePicker({
  templates,
}: {
  templates: { id: StarterTemplateId; label: string }[];
}) {
  const [pending, startTransition] = useTransition();

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {templates.map((t) => (
        <Card
          key={t.id}
          role="button"
          onClick={() => !pending && startTransition(() => createDraftCampaign(t.id))}
          className="cursor-pointer transition-colors hover:border-primary"
        >
          <CardHeader>
            <CardTitle className="text-base">{t.label}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              {pending ? "Creating..." : "Click to start a draft from this template."}
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
