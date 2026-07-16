"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export type CurrencyPrice = {
  amount: string;
  discountedPrice: string;
  discountStartAt: string;
  discountEndAt: string;
  maxDiscountedEnrollments: string;
  discountedEnrollmentsUsed: number;
};

export function useDiscountSync(initialAmount: string, initialDiscounted: string) {
  const [amount, setAmount] = useState(initialAmount);
  const [discountedPrice, setDiscountedPrice] = useState(initialDiscounted);

  const amountNum = Number(amount) || 0;
  const discountedNum = Number(discountedPrice) || 0;
  const hasDiscount = discountedPrice.trim() !== "" && amountNum > 0;
  const discountAmount = hasDiscount ? Math.max(0, amountNum - discountedNum) : 0;
  const discountPercent = hasDiscount ? Math.max(0, ((amountNum - discountedNum) / amountNum) * 100) : 0;

  function handleDiscountAmountChange(value: string) {
    if (value.trim() === "") {
      setDiscountedPrice("");
      return;
    }
    const v = Number(value) || 0;
    setDiscountedPrice(amountNum > 0 ? Math.max(0, amountNum - v).toFixed(2) : "0.00");
  }

  function handleDiscountPercentChange(value: string) {
    if (value.trim() === "") {
      setDiscountedPrice("");
      return;
    }
    const v = Number(value) || 0;
    setDiscountedPrice(amountNum > 0 ? Math.max(0, amountNum * (1 - v / 100)).toFixed(2) : "0.00");
  }

  return {
    amount,
    setAmount,
    discountedPrice,
    setDiscountedPrice,
    discountAmount,
    discountPercent,
    handleDiscountAmountChange,
    handleDiscountPercentChange,
  };
}

export function CurrencyPriceFields({
  suffix,
  currencyLabel,
  price,
  required,
}: {
  suffix: "Inr" | "Usd" | "Eur";
  currencyLabel: string;
  price: CurrencyPrice;
  required: boolean;
}) {
  const sync = useDiscountSync(price.amount, price.discountedPrice);
  const priceFieldName = `price${suffix}`;

  return (
    <div className="space-y-3 rounded-lg border p-3">
      <div className="space-y-1.5">
        <Label htmlFor={priceFieldName}>
          {currencyLabel}
          {!required && " (optional)"}
        </Label>
        <Input
          id={priceFieldName}
          name={priceFieldName}
          type="number"
          min="0"
          step="0.01"
          value={sync.amount}
          onChange={(e) => sync.setAmount(e.target.value)}
        />
      </div>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        <div className="space-y-1.5">
          <Label htmlFor={`discountedPrice${suffix}`} className="text-xs">
            Discounted price
          </Label>
          <Input
            id={`discountedPrice${suffix}`}
            name={`discountedPrice${suffix}`}
            type="number"
            min="0"
            step="0.01"
            value={sync.discountedPrice}
            onChange={(e) => sync.setDiscountedPrice(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Discount amount</Label>
          <Input
            type="number"
            min="0"
            step="0.01"
            value={sync.discountAmount ? sync.discountAmount.toFixed(2) : ""}
            onChange={(e) => sync.handleDiscountAmountChange(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Discount %</Label>
          <Input
            type="number"
            min="0"
            max="100"
            step="0.01"
            value={sync.discountPercent ? sync.discountPercent.toFixed(2) : ""}
            onChange={(e) => sync.handleDiscountPercentChange(e.target.value)}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor={`discountStartAt${suffix}`} className="text-xs">
            Discount start (optional)
          </Label>
          <Input
            id={`discountStartAt${suffix}`}
            name={`discountStartAt${suffix}`}
            type="date"
            defaultValue={price.discountStartAt}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={`discountEndAt${suffix}`} className="text-xs">
            Discount end (optional)
          </Label>
          <Input
            id={`discountEndAt${suffix}`}
            name={`discountEndAt${suffix}`}
            type="date"
            defaultValue={price.discountEndAt}
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor={`maxDiscountedEnrollments${suffix}`} className="text-xs">
          Max discounted enrolments (optional)
        </Label>
        <Input
          id={`maxDiscountedEnrollments${suffix}`}
          name={`maxDiscountedEnrollments${suffix}`}
          type="number"
          min="0"
          step="1"
          defaultValue={price.maxDiscountedEnrollments}
        />
        <p className="text-xs text-muted-foreground">
          {price.discountedEnrollmentsUsed} used so far.
        </p>
      </div>
    </div>
  );
}
