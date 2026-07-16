"use client";

import { useActionState, useState } from "react";
import { updateBundleDetails, type ActionState } from "../actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { useActionToast } from "@/hooks/use-action-toast";

const initialState: ActionState = {};

export default function BundleDetailsForm({
  bundleId,
  name,
  slug,
  shortDescription,
  description,
  isFree,
  tags,
  launchDate,
}: {
  bundleId: string;
  name: string;
  slug: string;
  shortDescription: string;
  description: string;
  isFree: boolean;
  tags: string[];
  launchDate: string;
}) {
  const action = updateBundleDetails.bind(null, bundleId);
  const [state, formAction, pending] = useActionState(action, initialState);
  useActionToast(state, "Bundle details saved.");
  const [free, setFree] = useState(isFree);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Details</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="space-y-4">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="name">Bundle name</Label>
              <Input id="name" name="name" defaultValue={name} required />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="slug">Slug</Label>
              <Input id="slug" name="slug" defaultValue={slug} required />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="shortDescription">Short description</Label>
            <Textarea
              id="shortDescription"
              name="shortDescription"
              defaultValue={shortDescription}
              rows={2}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="description">Full description</Label>
            <Textarea id="description" name="description" defaultValue={description} rows={4} />
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="tags">Tags</Label>
              <Input
                id="tags"
                name="tags"
                defaultValue={tags.join(", ")}
                placeholder="e.g. ai, career, bestseller"
              />
              <p className="text-xs text-muted-foreground">Comma-separated.</p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="launchDate">Bundle launch date</Label>
              <Input id="launchDate" name="launchDate" type="date" defaultValue={launchDate} />
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm text-foreground">
            <Checkbox
              name="isFree"
              checked={free}
              onCheckedChange={(checked) => setFree(checked === true)}
            />
            This bundle is free
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
