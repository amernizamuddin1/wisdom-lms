"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { XIcon } from "lucide-react";

// Renders a labelled list of add/remove text rows, all sharing the same
// `name` so a server action can read the values via `formData.getAll(name)`.
export function ArrayListInput({
  name,
  label,
  initialValues,
  placeholder,
  helperText,
}: {
  name: string;
  label: string;
  initialValues: string[];
  placeholder?: string;
  helperText?: string;
}) {
  const [values, setValues] = useState<string[]>(initialValues.length > 0 ? initialValues : [""]);

  function update(index: number, value: string) {
    setValues((prev) => prev.map((v, i) => (i === index ? value : v)));
  }

  function add() {
    setValues((prev) => [...prev, ""]);
  }

  function remove(index: number) {
    setValues((prev) => (prev.length > 1 ? prev.filter((_, i) => i !== index) : [""]));
  }

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="space-y-2">
        {values.map((value, i) => (
          <div key={i} className="flex items-center gap-2">
            <Input
              name={name}
              value={value}
              onChange={(e) => update(i, e.target.value)}
              placeholder={placeholder}
              className="flex-1"
            />
            {values.length > 1 && (
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                onClick={() => remove(i)}
                aria-label={`Remove ${label} item`}
              >
                <XIcon />
              </Button>
            )}
          </div>
        ))}
      </div>
      <Button type="button" variant="link" className="h-auto p-0" onClick={add}>
        Add item
      </Button>
      {helperText && <p className="text-xs text-muted-foreground">{helperText}</p>}
    </div>
  );
}
