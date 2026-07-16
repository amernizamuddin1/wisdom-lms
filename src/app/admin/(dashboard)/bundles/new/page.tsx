import { requireAdmin } from "@/lib/auth";
import NewBundleForm from "./NewBundleForm";

export default async function NewBundlePage() {
  await requireAdmin();

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-foreground">New Bundle</h2>
      <NewBundleForm />
    </div>
  );
}
