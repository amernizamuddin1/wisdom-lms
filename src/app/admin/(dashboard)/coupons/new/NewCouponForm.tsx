"use client";

import { useActionState, useState } from "react";
import { createCoupon, type ActionState } from "../actions";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useActionToast } from "@/hooks/use-action-toast";

const initialState: ActionState = {};

export default function NewCouponForm() {
  const [state, formAction, pending] = useActionState(createCoupon, initialState);
  useActionToast(state, "Coupon created.");
  const [type, setType] = useState<"PERCENTAGE" | "FIXED_AMOUNT">("PERCENTAGE");
  const [scope, setScope] = useState<"ALL" | "SPECIFIC">("ALL");
  const [isActive, setIsActive] = useState(true);

  return (
    <Card>
      <CardContent>
        <form action={formAction} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="code">Coupon code</Label>
            <Input id="code" name="code" required placeholder="e.g. SAVE20" className="uppercase" />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="description">Description (admin note, optional)</Label>
            <Textarea id="description" name="description" rows={2} />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="type">Discount type</Label>
              <Select name="type" value={type} onValueChange={(v) => setType(v as typeof type)}>
                <SelectTrigger id="type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PERCENTAGE">Percentage off</SelectItem>
                  <SelectItem value="FIXED_AMOUNT">Fixed amount off (₹)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="value">{type === "PERCENTAGE" ? "Percent off" : "Amount off (₹)"}</Label>
              <Input
                id="value"
                name="value"
                type="number"
                min="0"
                step="0.01"
                max={type === "PERCENTAGE" ? 100 : undefined}
                required
              />
            </div>
          </div>

          {type === "PERCENTAGE" && (
            <div className="space-y-1.5">
              <Label htmlFor="maxDiscountAmount">Max discount cap (₹, optional)</Label>
              <Input id="maxDiscountAmount" name="maxDiscountAmount" type="number" min="0" step="0.01" />
              <p className="text-xs text-muted-foreground">e.g. &ldquo;20% off, up to ₹500&rdquo;.</p>
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="minOrderAmount">Minimum order amount (₹, optional)</Label>
            <Input id="minOrderAmount" name="minOrderAmount" type="number" min="0" step="0.01" />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="validFrom">Valid from (optional)</Label>
              <Input id="validFrom" name="validFrom" type="date" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="validUntil">Valid until (optional)</Label>
              <Input id="validUntil" name="validUntil" type="date" />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="maxRedemptions">Total use limit (optional)</Label>
              <Input id="maxRedemptions" name="maxRedemptions" type="number" min="0" step="1" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="maxRedemptionsPerUser">Per-user limit (optional)</Label>
              <Input
                id="maxRedemptionsPerUser"
                name="maxRedemptionsPerUser"
                type="number"
                min="0"
                step="1"
                placeholder="e.g. 1"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="scope">Applies to</Label>
            <Select name="scope" value={scope} onValueChange={(v) => setScope(v as typeof scope)}>
              <SelectTrigger id="scope">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Whole cart</SelectItem>
                <SelectItem value="SPECIFIC">Specific courses/bundles</SelectItem>
              </SelectContent>
            </Select>
            {scope === "SPECIFIC" && (
              <p className="text-xs text-muted-foreground">
                You&apos;ll pick which courses/bundles after creating the coupon.
              </p>
            )}
          </div>

          <label className="flex items-center gap-2 text-sm text-foreground">
            <Checkbox
              name="isActive"
              checked={isActive}
              onCheckedChange={(checked) => setIsActive(checked === true)}
            />
            Active
          </label>

          {state.error && <p className="text-sm text-destructive">{state.error}</p>}

          <Button type="submit" disabled={pending}>
            {pending ? "Creating..." : "Create Coupon"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
