import { requireAdmin } from "@/lib/auth";
import { getCommunitySettings } from "@/lib/community/access";
import CommunitySettingsForm from "./CommunitySettingsForm";

export default async function CommunitySettingsPage() {
  await requireAdmin();
  const settings = await getCommunitySettings();

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-foreground">Community Settings</h2>
        <p className="text-sm text-muted-foreground">
          Controls that govern discussion behavior across the platform.
        </p>
      </div>
      <CommunitySettingsForm settings={settings} />
    </div>
  );
}
