// Shared FormData parsing helpers for admin server actions (courses, bundles).

export function parseDecimal(value: FormDataEntryValue | null): string | null {
  if (typeof value !== "string" || value.trim() === "") return null;
  const n = Number(value);
  if (Number.isNaN(n) || n < 0) return null;
  return n.toFixed(2);
}

export function splitCommaList(value: FormDataEntryValue | null): string[] {
  if (typeof value !== "string") return [];
  return value
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);
}

export function splitLines(value: FormDataEntryValue | null): string[] {
  if (typeof value !== "string") return [];
  return value
    .split("\n")
    .map((v) => v.trim())
    .filter(Boolean);
}

// Reads all values for a repeated-name field (e.g. from ArrayListInput rows),
// trimming and dropping blanks.
export function getAllNonEmpty(formData: FormData, name: string): string[] {
  return formData
    .getAll(name)
    .map((v) => (typeof v === "string" ? v.trim() : ""))
    .filter(Boolean);
}

export function parseDate(value: FormDataEntryValue | null): Date | null {
  if (typeof value !== "string" || value.trim() === "") return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

export type DiscountFields = {
  discountedPrice: string | null;
  discountStartAt: Date | null;
  discountEndAt: Date | null;
  maxDiscountedEnrollments: number | null;
};

export function parseDiscountFields(
  formData: FormData,
  suffix: string,
  amount: string | null,
): DiscountFields | { error: string } {
  const discountedPrice = parseDecimal(formData.get(`discountedPrice${suffix}`));
  const discountStartAt = parseDate(formData.get(`discountStartAt${suffix}`));
  const discountEndAt = parseDate(formData.get(`discountEndAt${suffix}`));
  const maxRaw = formData.get(`maxDiscountedEnrollments${suffix}`);
  const maxDiscountedEnrollments =
    typeof maxRaw === "string" && maxRaw.trim() !== "" ? Number(maxRaw) : null;

  if (discountedPrice && amount && Number(discountedPrice) >= Number(amount)) {
    return { error: `Discounted price (${suffix}) must be less than the regular price.` };
  }
  if (discountStartAt && discountEndAt && discountStartAt > discountEndAt) {
    return { error: `Discount start date (${suffix}) must be before the end date.` };
  }
  if (maxDiscountedEnrollments != null && (Number.isNaN(maxDiscountedEnrollments) || maxDiscountedEnrollments < 0)) {
    return { error: `Max discounted enrolments (${suffix}) must be a positive number.` };
  }

  return { discountedPrice, discountStartAt, discountEndAt, maxDiscountedEnrollments };
}
