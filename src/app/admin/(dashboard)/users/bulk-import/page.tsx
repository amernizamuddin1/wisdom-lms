import { requireAdmin } from "@/lib/auth";
import BulkImportWizard from "./BulkImportWizard";

export default async function BulkImportPage() {
  await requireAdmin();

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Bulk Import Users</h1>
        <p className="text-sm text-muted-foreground">
          Upload a CSV of new users, optionally enrolling them in a course or bundle.
        </p>
      </div>
      <BulkImportWizard />
    </div>
  );
}
