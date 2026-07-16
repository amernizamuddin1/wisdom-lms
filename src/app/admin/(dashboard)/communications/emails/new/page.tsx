import { requireAdmin } from "@/lib/auth";
import { STARTER_TEMPLATES } from "@/lib/email-templates/starters";
import TemplatePicker from "./TemplatePicker";

export default async function NewEmailCampaignPage() {
  await requireAdmin();

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">New Email Campaign</h1>
        <p className="text-sm text-muted-foreground">
          Start from a template — you can fully edit the content before sending.
        </p>
      </div>
      <TemplatePicker templates={STARTER_TEMPLATES} />
    </div>
  );
}
