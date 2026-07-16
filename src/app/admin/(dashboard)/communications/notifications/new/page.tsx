import { requireAdmin } from "@/lib/auth";
import NewNotificationTrigger from "./NewNotificationTrigger";

export default async function NewNotificationPage() {
  await requireAdmin();
  return <NewNotificationTrigger />;
}
