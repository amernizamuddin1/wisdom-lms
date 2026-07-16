"use client";

import { useActionState, useState } from "react";
import { createBundle, type ActionState } from "../actions";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { useActionToast } from "@/hooks/use-action-toast";

const initialState: ActionState = {};

function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export default function NewBundleForm() {
  const [state, formAction, pending] = useActionState(createBundle, initialState);
  useActionToast(state, "Bundle created.");
  const [isFree, setIsFree] = useState(false);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);

  return (
    <Card className="max-w-3xl">
      <CardContent>
        <form action={formAction} className="space-y-4">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="name">Bundle name</Label>
              <Input
                id="name"
                name="name"
                required
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (!slugTouched) setSlug(slugify(e.target.value));
                }}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="slug">Slug</Label>
              <Input
                id="slug"
                name="slug"
                required
                value={slug}
                onChange={(e) => {
                  setSlugTouched(true);
                  setSlug(e.target.value);
                }}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="shortDescription">Short description</Label>
            <Textarea id="shortDescription" name="shortDescription" rows={2} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="description">Full description</Label>
            <Textarea id="description" name="description" rows={4} />
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="tags">Tags</Label>
              <Input id="tags" name="tags" placeholder="e.g. ai, career, bestseller" />
              <p className="text-xs text-muted-foreground">Comma-separated.</p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="launchDate">Bundle launch date</Label>
              <Input id="launchDate" name="launchDate" type="date" />
            </div>
          </div>

          <p className="text-xs text-muted-foreground">
            The bundle starts as a Draft. Add at least 2 courses on the next screen, then
            activate it whenever you&apos;re ready.
          </p>

          <label className="flex items-center gap-2 text-sm text-foreground">
            <Checkbox
              name="isFree"
              checked={isFree}
              onCheckedChange={(checked) => setIsFree(checked === true)}
            />
            This bundle is free
          </label>

          {!isFree && (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="space-y-1.5">
                <Label htmlFor="priceInr">Price (INR)</Label>
                <Input id="priceInr" name="priceInr" type="number" min="0" step="0.01" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="priceUsd">Price (USD)</Label>
                <Input id="priceUsd" name="priceUsd" type="number" min="0" step="0.01" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="priceEur">Price (EUR, optional)</Label>
                <Input id="priceEur" name="priceEur" type="number" min="0" step="0.01" />
              </div>
            </div>
          )}

          {state.error && <p className="text-sm text-destructive">{state.error}</p>}

          <Button type="submit" disabled={pending}>
            {pending ? "Creating..." : "Create Bundle"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
