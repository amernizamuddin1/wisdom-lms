import { requireAdmin } from "@/lib/auth";
import NewGroupForm from "./NewGroupForm";

export default async function NewGroupPage() {
  await requireAdmin();

  return (
    <div className="max-w-lg space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">New Institution</h1>
        <p className="text-sm text-muted-foreground">
          Create a school or company record. You can assign a sub-admin and import its members afterward.
        </p>
      </div>
      <NewGroupForm />
    </div>
  );
}
