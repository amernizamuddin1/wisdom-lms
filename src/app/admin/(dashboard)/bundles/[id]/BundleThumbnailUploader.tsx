"use client";

import { useActionState } from "react";
import Image from "next/image";
import { uploadBundleThumbnail, type ActionState } from "../actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useActionToast } from "@/hooks/use-action-toast";

const initialState: ActionState = {};

export default function BundleThumbnailUploader({
  bundleId,
  thumbnailUrl,
}: {
  bundleId: string;
  thumbnailUrl: string | null;
}) {
  const action = uploadBundleThumbnail.bind(null, bundleId);
  const [state, formAction, pending] = useActionState(action, initialState);
  useActionToast(state, "Thumbnail updated.");

  return (
    <Card>
      <CardHeader>
        <CardTitle>Thumbnail</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {thumbnailUrl && (
          <Image
            src={thumbnailUrl}
            alt="Bundle thumbnail"
            width={320}
            height={180}
            className="rounded-md border object-cover"
            unoptimized
          />
        )}

        <form action={formAction} className="flex items-center gap-3">
          <input
            type="file"
            name="thumbnail"
            accept="image/*"
            required
            className="cursor-pointer text-sm text-foreground file:mr-3 file:cursor-pointer file:rounded-md file:border file:border-input file:bg-transparent file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-foreground hover:file:bg-muted"
          />
          <Button type="submit" variant="outline" disabled={pending}>
            {pending ? "Uploading..." : "Upload"}
          </Button>
        </form>

      </CardContent>
    </Card>
  );
}
