"use client";

import { useActionState } from "react";
import { upsertBundlePrices, type ActionState } from "../actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CurrencyPriceFields, type CurrencyPrice } from "@/components/CurrencyPriceFields";
import { useActionToast } from "@/hooks/use-action-toast";

const initialState: ActionState = {};

export default function BundlePricingForm({
  bundleId,
  inr,
  usd,
  eur,
}: {
  bundleId: string;
  inr: CurrencyPrice;
  usd: CurrencyPrice;
  eur: CurrencyPrice;
}) {
  const action = upsertBundlePrices.bind(null, bundleId);
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
