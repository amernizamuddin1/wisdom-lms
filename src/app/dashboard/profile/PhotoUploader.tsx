"use client";

import { useActionState } from "react";
import Image from "next/image";
import { uploadProfilePhoto, type ActionState } from "./actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useActionToast } from "@/hooks/use-action-toast";

const initialState: ActionState = {};

export default function PhotoUploader({ photoUrl }: { photoUrl: string | null }) {
  const [state, formAction, pending] = useActionState(uploadProfilePhoto, initialState);
  useActionToast(state, "Profile photo updated.");

  return (
    <Card>
      <CardHeader>
        <CardTitle>Profile Photo</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {photoUrl && (
          <Image
            src={photoUrl}
            alt="Profile photo"
            width={96}
            height={96}
            className="rounded-full border object-cover"
            unoptimized
          />
        )}

        <form action={formAction} className="flex items-center gap-3">
          <input
            type="file"
            name="photo"
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
