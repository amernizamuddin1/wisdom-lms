import { requireAdmin } from "@/lib/auth";
import CategoryForm from "../CategoryForm";

export default async function NewCategoryPage() {
  await requireAdmin();

  return (
    <div className="max-w-2xl space-y-6">
      <h2 className="text-xl font-semibold text-foreground">New Category</h2>
      <CategoryForm />
    </div>
  );
}
