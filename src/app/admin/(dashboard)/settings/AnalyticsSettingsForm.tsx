"use client";

import { useActionState } from "react";
import { saveAnalyticsSettings, type SettingsActionState } from "./actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useActionToast } from "@/hooks/use-action-toast";
import type { AnalyticsSettings } from "@/lib/analytics/settings";

const initialState: SettingsActionState = {};

export default function AnalyticsSettingsForm({ settings }: { settings: AnalyticsSettings }) {
  const [state, formAction, pending] = useActionState(saveAnalyticsSettings, initialState);
  useActionToast(state, "Analytics thresholds saved.");

  return (
    <Card>
      <CardHeader>
        <CardTitle>Analytics — Engagement Thresholds</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Controls how the Learner Analytics engagement segments (Active, Slowing Down, At Risk,
            Dormant) classify learners. Changes apply immediately across all analytics pages.
          </p>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="activeWindowDays">Active window (days)</Label>
              <Input id="activeWindowDays" name="activeWindowDays" type="number" min={1} defaultValue={settings.activeWindowDays} />
              <p className="text-xs text-muted-foreground">A learner is &quot;Active&quot; if they have qualifying activity within this many days.</p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="slowingDownDays">Slowing-down comparison window (days)</Label>
              <Input id="slowingDownDays" name="slowingDownDays" type="number" min={1} defaultValue={settings.slowingDownDays} />
              <p className="text-xs text-muted-foreground">Length of the two windows compared to detect a drop in activity.</p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="atRiskDays">At-risk window (days)</Label>
              <Input id="atRiskDays" name="atRiskDays" type="number" min={1} defaultValue={settings.atRiskDays} />
              <p className="text-xs text-muted-foreground">No activity for this many days, with an incomplete course, flags a learner &quot;At Risk.&quot;</p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="dormantDays">Dormant window (days)</Label>
              <Input id="dormantDays" name="dormantDays" type="number" min={1} defaultValue={settings.dormantDays} />
              <p className="text-xs text-muted-foreground">No activity for this many days marks a learner &quot;Dormant.&quot;</p>
            </div>
          </div>

          {state.error && <p className="text-sm text-destructive">{state.error}</p>}

          <Button type="submit" disabled={pending}>
            {pending ? "Saving..." : "Save Thresholds"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
