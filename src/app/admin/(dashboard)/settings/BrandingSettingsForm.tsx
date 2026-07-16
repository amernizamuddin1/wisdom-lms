"use client";

import { useActionState } from "react";
import { saveBrandingSettings, type SettingsActionState } from "./actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useActionToast } from "@/hooks/use-action-toast";
import type { Branding } from "@/lib/branding";

const initialState: SettingsActionState = {};

export default function BrandingSettingsForm({
  branding,
  faviconUrl,
}: {
  branding: Branding;
  faviconUrl: string | null;
}) {
  const [state, formAction, pending] = useActionState(saveBrandingSettings, initialState);
  useActionToast(state, "Branding settings saved.");

  return (
    <Card>
      <CardHeader>
        <CardTitle>Branding</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="platformName">Platform Name</Label>
              <Input
                id="platformName"
                name="platformName"
                defaultValue={branding.platformName}
                placeholder="Wisdom LMS"
              />
              <p className="text-xs text-muted-foreground">
                Shown across the learner and auth experience — headers, sidebars, browser title,
                emails.
              </p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="shortName">Short Name</Label>
              <Input id="shortName" name="shortName" defaultValue={branding.shortName} placeholder="Wisdom" />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="adminPanelName">Admin Panel Name</Label>
            <Input
              id="adminPanelName"
              name="adminPanelName"
              defaultValue={branding.adminPanelName}
              placeholder="Wisdom LMS Admin"
            />
            <p className="text-xs text-muted-foreground">Shown in the admin dashboard header.</p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="favicon">Favicon</Label>
            {faviconUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={faviconUrl} alt="Current favicon" className="size-8 rounded border bg-card p-1" />
            )}
            <input
              type="file"
              id="favicon"
              name="favicon"
              accept="image/*"
              className="cursor-pointer text-sm text-foreground file:mr-3 file:cursor-pointer file:rounded-md file:border file:border-input file:bg-transparent file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-foreground hover:file:bg-muted"
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="primaryColor">Primary Brand Color</Label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  aria-label="Primary brand color picker"
                  defaultValue={branding.primaryColor}
                  onChange={(e) => {
                    const input = document.getElementById("primaryColor") as HTMLInputElement | null;
                    if (input) input.value = e.target.value;
                  }}
                  className="size-9 cursor-pointer rounded-md border border-input bg-transparent"
                />
                <Input id="primaryColor" name="primaryColor" defaultValue={branding.primaryColor} />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="darkPrimaryColor">Dark Mode Brand Color</Label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  aria-label="Dark mode brand color picker"
                  defaultValue={branding.darkPrimaryColor}
                  onChange={(e) => {
                    const input = document.getElementById("darkPrimaryColor") as HTMLInputElement | null;
                    if (input) input.value = e.target.value;
                  }}
                  className="size-9 cursor-pointer rounded-md border border-input bg-transparent"
                />
                <Input
                  id="darkPrimaryColor"
                  name="darkPrimaryColor"
                  defaultValue={branding.darkPrimaryColor}
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="supportEmail">Support Email</Label>
              <Input
                id="supportEmail"
                name="supportEmail"
                type="email"
                defaultValue={branding.supportEmail ?? ""}
                placeholder="support@yourdomain.com"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="footerText">Footer Text</Label>
              <Input
                id="footerText"
                name="footerText"
                defaultValue={branding.footerText ?? ""}
                placeholder={`© ${new Date().getFullYear()} ${branding.platformName}. All rights reserved.`}
              />
            </div>
          </div>

          {state.error && <p className="text-sm text-destructive">{state.error}</p>}

          <Button type="submit" disabled={pending}>
            {pending ? "Saving..." : "Save Branding"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
