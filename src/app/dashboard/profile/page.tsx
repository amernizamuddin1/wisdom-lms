import { requireUser } from "@/lib/auth";
import ProfileForm from "./ProfileForm";
import PhotoUploader from "./PhotoUploader";
import ChangePasswordForm from "./ChangePasswordForm";

export default async function ProfilePage() {
  const user = await requireUser();

  return (
    <div className="max-w-2xl space-y-6">
      <h2 className="text-xl font-semibold text-foreground">Profile</h2>

      <PhotoUploader photoUrl={user.profilePhotoUrl} />
      <ProfileForm name={user.name} email={user.email} phone={user.phone ?? ""} />
      <ChangePasswordForm />
    </div>
  );
}
