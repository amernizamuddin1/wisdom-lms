"use client";

import { useRouter } from "next/navigation";
import { LogOutIcon } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { SidebarMenuButton } from "@/components/ui/sidebar";

export function useLogout() {
  const router = useRouter();

  return async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };
}

export default function LogoutButton() {
  const handleLogout = useLogout();

  return (
    <SidebarMenuButton onClick={handleLogout} tooltip="Log out">
      <LogOutIcon />
      <span>Log out</span>
    </SidebarMenuButton>
  );
}
