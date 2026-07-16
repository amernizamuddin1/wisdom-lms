"use client";

import { useActionState, useState } from "react";
import { updateCourseDetails, upsertCoursePrices, type ActionState } from "../actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { CurrencyPriceFields, type CurrencyPrice } from "@/components/CurrencyPriceFields";
import { useActionToast } from "@/hooks/use-action-toast";

const initialState: ActionState = {};

export function CourseDetailsForm({
  courseId,
  title,
  shortDescription,
  description,
  isFree,
  tags,
}: {
  courseId: string;
  title: string;
  shortDescription: string;
  description: string;
  isFree: boolean;
  tags: string[];
}) {
  const action = updateCourseDetails.bind(null, courseId);
  const [state, formAction, pending] = useActionState(action, initialState);
  useActionToast(state, "Course details saved.");
  const [free, setFree] = useState(isFree);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Basic Information</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="space-y-4">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="title">Title</Label>
              <Input id="title" name="title" defaultValue={title} required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="tags">Tags</Label>
              <Input
                id="tags"
                name="tags"
                defaultValue={tags.join(", ")}
                placeholder="e.g. python, backend, beginner"
              />
              <p className="text-xs text-muted-foreground">
                Comma-separated. Used for search, filtering, and SEO.
              </p>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="shortDescription">Short description</Label>
            <Textarea
              id="shortDescription"
              name="shortDescription"
              defaultValue={shortDescription}
              rows={2}
              placeholder="A one-line summary shown on course cards and previews"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="description">Description</Label>
            <Textarea id="description" name="description" defaultValue={description} rows={6} />
          </div>

          <label className="flex items-center gap-2 text-sm text-foreground">
            <Checkbox
              name="isFree"
              checked={free}
              onCheckedChange={(checked) => setFree(checked === true)}
            />
            This course is free
          </label>

          {state.error && <p className="text-sm text-destructive">{state.error}</p>}

          <Button type="submit" disabled={pending}>
            {pending ? "Saving..." : "Save Details"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

export function CoursePricingForm({
  courseId,
  inr,
  usd,
  eur,
}: {
  courseId: string;
  inr: CurrencyPrice;
  usd: CurrencyPrice;
  eur: CurrencyPrice;
}) {
  const action = upsertCoursePrices.bind(null, courseId);
  const [state, formAction, pending] = useActionState(action, initialState);
  useActionToast(state, "Pricing saved.");

  return (
    <Card>
      <CardHeader>
        <CardTitle>Pricing &amp; Discounts</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <CurrencyPriceFields suffix="Inr" currencyLabel="INR" price={inr} required />
            <CurrencyPriceFields suffix="Usd" currencyLabel="USD" price={usd} required />
            <CurrencyPriceFields suffix="Eur" currencyLabel="EUR" price={eur} required={false} />
          </div>

          {state.error && <p className="text-sm text-destructive">{state.error}</p>}

          <Button type="submit" disabled={pending}>
            {pending ? "Saving..." : "Save Pricing"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
