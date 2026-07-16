import { requireAdmin } from "@/lib/auth";
import NewCouponForm from "./NewCouponForm";

export default async function NewCouponPage() {
  await requireAdmin();

  return (
    <div className="max-w-2xl space-y-6">
      <h2 className="text-xl font-semibold text-foreground">New Coupon</h2>
      <NewCouponForm />
    </div>
  );
}
