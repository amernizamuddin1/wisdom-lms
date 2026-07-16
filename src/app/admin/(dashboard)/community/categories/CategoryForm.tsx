"use client";

import { useActionState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createCategory, updateCategory, type ActionState } from "./actions";

const initialState: ActionState = {};

export default function CategoryForm({
  category,
}: {
  category?: {
    id: string;
    name: string;
    slug: string;
    description: string | null;
    displayOrder: number;
    isActive: boolean;
    visibilityType: string;
    postingPermission: string;
  };
}) {
  const router = useRouter();
  const action = category ? updateCategory.bind(null, category.id) : createCategory;
  const [state, formAction, pending] = useActionState(action, initialState);

  useEffect(() => {
    if (state.success) {
      toast.success("Category saved.");
      router.refresh();
    }
  }, [state.success, router]);

  return (
    <form action={formAction} className="space-y-4 rounded-lg border bg-card p-5">
      <div className="space-y-1.5">
        <Label htmlFor="name">Name</Label>
        <Input id="name" name="name" defaultValue={category?.name} required />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="slug">Slug</Label>
        <Input id="slug" name="slug" defaultValue={category?.slug} placeholder="auto-generated from name if left blank" />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="description">Description</Label>
        <Textarea id="description" name="description" defaultValue={category?.description ?? ""} rows={3} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="displayOrder">Display order</Label>
        <Input
          id="displayOrder"
          name="displayOrder"
          type="number"
          defaultValue={category?.displayOrder ?? 0}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="visibilityType">Visibility</Label>
        <Select name="visibilityType" defaultValue={category?.visibilityType ?? "PUBLIC"}>
          <SelectTrigger id="visibilityType">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="PUBLIC">Public</SelectItem>
            <SelectItem value="ENROLLED_ONLY">Enrolled only</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="postingPermission">Posting permission</Label>
        <Select name="postingPermission" defaultValue={category?.postingPermission ?? "ANYONE"}>
          <SelectTrigger id="postingPermission">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ANYONE">Anyone</SelectItem>
            <SelectItem value="RESTRICTED">Restricted</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="flex items-center gap-2">
        <Checkbox id="isActive" name="isActive" defaultChecked={category?.isActive ?? true} />
        <Label htmlFor="isActive" className="font-normal">
          Active
        </Label>
      </div>

      {state.error && <p className="text-sm text-destructive">{state.error}</p>}

      <Button type="submit" disabled={pending}>
        {pending ? "Saving..." : "Save"}
      </Button>
    </form>
  );
}
