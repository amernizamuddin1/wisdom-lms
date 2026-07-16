"use client";

import { useRouter } from "next/navigation";
import { LogOutIcon } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { SidebarMenuButton } from "@/components/ui/sidebar";

export default function LogoutButton() {
  const router = useRouter();

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <SidebarMenuButton onClick={handleLogout}>
      <LogOutIcon />
      <span>Log out</span>
    </SidebarMenuButton>
  );
}
