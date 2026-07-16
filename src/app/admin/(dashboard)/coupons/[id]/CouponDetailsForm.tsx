"use client";

import { useActionState, useState } from "react";
import { updateCoupon, type ActionState } from "../actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import type { CouponType, CouponScope } from "@/generated/prisma/client";

const initialState: ActionState = {};

export default function CouponDetailsForm({
  couponId,
  code,
  description,
  type: initialType,
  value,
  maxDiscountAmount,
  minOrderAmount,
  validFrom,
  validUntil,
  maxRedemptions,
  maxRedemptionsPerUser,
  isActive: initialIsActive,
  scope: initialScope,
}: {
  couponId: string;
  code: string;
  description: string;
  type: CouponType;
  value: string;
  maxDiscountAmount: string;
  minOrderAmount: string;
  validFrom: string;
  validUntil: string;
  maxRedemptions: string;
  maxRedemptionsPerUser: string;
  isActive: boolean;
  scope: CouponScope;
}) {
  const action = updateCoupon.bind(null, couponId);
  const [state, formAction, pending] = useActionState(action, initialState);
  useActionToast(state, "Coupon saved.");
  const [type, setType] = useState<CouponType>(initialType);
  const [scope, setScope] = useState<CouponScope>(initialScope);
  const [isActive, setIsActive] = useState(initialIsActive);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Details</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="code">Coupon code</Label>
            <Input id="code" name="code" defaultValue={code} required className="uppercase" />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="description">Description (admin note, optional)</Label>
            <Textarea id="description" name="description" defaultValue={description} rows={2} />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="type">Discount type</Label>
              <Select name="type" value={type} onValueChange={(v) => setType(v as CouponType)}>
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
                defaultValue={value}
                required
              />
            </div>
          </div>

          {type === "PERCENTAGE" && (
            <div className="space-y-1.5">
              <Label htmlFor="maxDiscountAmount">Max discount cap (₹, optional)</Label>
              <Input
                id="maxDiscountAmount"
                name="maxDiscountAmount"
                type="number"
                min="0"
                step="0.01"
                defaultValue={maxDiscountAmount}
              />
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="minOrderAmount">Minimum order amount (₹, optional)</Label>
            <Input
              id="minOrderAmount"
              name="minOrderAmount"
              type="number"
              min="0"
              step="0.01"
              defaultValue={minOrderAmount}
            />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="validFrom">Valid from (optional)</Label>
              <Input id="validFrom" name="validFrom" type="date" defaultValue={validFrom} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="validUntil">Valid until (optional)</Label>
              <Input id="validUntil" name="validUntil" type="date" defaultValue={validUntil} />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="maxRedemptions">Total use limit (optional)</Label>
              <Input
                id="maxRedemptions"
                name="maxRedemptions"
                type="number"
                min="0"
                step="1"
                defaultValue={maxRedemptions}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="maxRedemptionsPerUser">Per-user limit (optional)</Label>
              <Input
                id="maxRedemptionsPerUser"
                name="maxRedemptionsPerUser"
                type="number"
                min="0"
                step="1"
                defaultValue={maxRedemptionsPerUser}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="scope">Applies to</Label>
            <Select name="scope" value={scope} onValueChange={(v) => setScope(v as CouponScope)}>
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
                Save, then use the section below to pick courses/bundles.
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
            {pending ? "Saving..." : "Save Details"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
