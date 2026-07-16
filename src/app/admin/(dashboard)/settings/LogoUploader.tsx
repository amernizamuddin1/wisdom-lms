"use client";

import { useActionState } from "react";
import Image from "next/image";
import { uploadLogo, type SettingsActionState } from "./actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useActionToast } from "@/hooks/use-action-toast";

const initialState: SettingsActionState = {};

export default function LogoUploader({ logoUrl }: { logoUrl: string | null }) {
  const [state, formAction, pending] = useActionState(uploadLogo, initialState);
  useActionToast(state, "Logo updated.");

  return (
    <Card>
      <CardHeader>
        <CardTitle>Logo</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {logoUrl ? (
          <Image
            src={logoUrl}
            alt="Site logo"
            width={160}
            height={160}
            className="rounded-md border bg-card object-contain p-2"
            unoptimized
          />
        ) : (
          <p className="text-sm text-muted-foreground">No logo uploaded yet.</p>
        )}

        <form action={formAction} className="flex items-center gap-3">
          <input
            type="file"
            name="logo"
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
