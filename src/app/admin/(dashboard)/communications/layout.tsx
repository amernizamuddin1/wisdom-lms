import { requireAdmin } from "@/lib/auth";
import CommunicationsTabs from "./CommunicationsTabs";

export default async function CommunicationsLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Communications</h1>
        <p className="text-sm text-muted-foreground">
          Send HTML email campaigns and in-app notifications to your users.
        </p>
      </div>
      <CommunicationsTabs />
      {children}
    </div>
  );
}
