"use client";

import { LogOutIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLogout } from "@/components/LogoutButton";

export default function GroupsLogoutButton() {
  const handleLogout = useLogout();

  return (
    <Button variant="ghost" size="sm" onClick={handleLogout}>
      <LogOutIcon className="size-4" />
      Log out
    </Button>
  );
}
