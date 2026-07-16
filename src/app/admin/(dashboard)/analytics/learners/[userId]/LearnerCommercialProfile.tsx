import { BanknoteIcon, ShoppingCartIcon, RepeatIcon, TagIcon, RotateCcwIcon, CalendarIcon } from "lucide-react";
import KpiCard from "@/components/analytics/KpiCard";
import type { LearnerCommercialProfile as LearnerCommercialProfileData } from "@/lib/analytics/commerce-learners";

export default function LearnerCommercialProfile({ profile }: { profile: LearnerCommercialProfileData }) {
  return (
    <div className="space-y-3">
      <h3 className="font-semibold text-foreground">Commercial Profile</h3>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Lifetime Net Spend" value={`₹${profile.lifetimeNetSpend.toLocaleString()}`} icon={BanknoteIcon} />
        <KpiCard label="Purchases" value={profile.purchaseCount} icon={ShoppingCartIcon} />
        <KpiCard label="Average Order Value" value={`₹${profile.averageOrderValue.toLocaleString()}`} icon={BanknoteIcon} />
        <KpiCard label="Repeat Buyer" value={profile.isRepeatBuyer ? "Yes" : "No"} icon={RepeatIcon} />
        <KpiCard label="Discounts Used" value={`₹${profile.discountsUsed.toLocaleString()}`} icon={TagIcon} />
        <KpiCard
          label="Refunds"
          value={profile.refundCount > 0 ? `${profile.refundCount} (₹${profile.refundAmount.toLocaleString()})` : "0"}
          icon={RotateCcwIcon}
        />
        <KpiCard
          label="Last Purchase"
          value={profile.lastPurchaseAt ? profile.lastPurchaseAt.toLocaleDateString() : "Never"}
          icon={CalendarIcon}
        />
        <KpiCard label="Completion Rate" value={`${profile.completionRate}%`} />
      </div>
    </div>
  );
}
