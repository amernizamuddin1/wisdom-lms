import { describe, it, expect } from "vitest";
import { applyTenantScope } from "@/lib/tenant-scoping";

const TENANT_ID = "tenant-123";

describe("applyTenantScope", () => {
  it("injects tenantId into where for a read operation on a scoped model", () => {
    const result = applyTenantScope("Course", "findMany", { where: { status: "PUBLISHED" } }, TENANT_ID);
    expect(result.where).toEqual({ status: "PUBLISHED", tenantId: TENANT_ID });
  });

  it("injects tenantId into where even when no where clause was given", () => {
    const result = applyTenantScope("Course", "findMany", {}, TENANT_ID);
    expect(result.where).toEqual({ tenantId: TENANT_ID });
  });

  it("injects tenantId into where for update/delete operations", () => {
    for (const operation of ["update", "updateMany", "delete", "deleteMany"]) {
      const result = applyTenantScope("Enrollment", operation, { where: { id: "e1" } }, TENANT_ID);
      expect(result.where).toEqual({ id: "e1", tenantId: TENANT_ID });
    }
  });

  it("injects tenantId into data for create", () => {
    const result = applyTenantScope("Course", "create", { data: { title: "New course" } }, TENANT_ID);
    expect(result.data).toEqual({ title: "New course", tenantId: TENANT_ID });
  });

  it("injects tenantId into every row for createMany", () => {
    const result = applyTenantScope(
      "Course",
      "createMany",
      { data: [{ title: "A" }, { title: "B" }] },
      TENANT_ID,
    );
    expect(result.data).toEqual([
      { title: "A", tenantId: TENANT_ID },
      { title: "B", tenantId: TENANT_ID },
    ]);
  });

  it("injects tenantId into both where and create for upsert", () => {
    const result = applyTenantScope(
      "Course",
      "upsert",
      { where: { id: "c1" }, create: { title: "New" }, update: { title: "Updated" } },
      TENANT_ID,
    );
    expect(result.where).toEqual({ id: "c1", tenantId: TENANT_ID });
    expect(result.create).toEqual({ title: "New", tenantId: TENANT_ID });
    // update data doesn't need tenantId — the row is already scoped by `where`.
    expect(result.update).toEqual({ title: "Updated" });
  });

  it("leaves args completely untouched for a model that isn't tenant-scoped", () => {
    const args = { where: { id: "u1" } };
    const result = applyTenantScope("User", "findUnique", args, TENANT_ID);
    expect(result).toBe(args);
  });

  it("leaves args untouched when model is undefined (raw queries etc.)", () => {
    const args = { where: { id: "x" } };
    const result = applyTenantScope(undefined, "findMany", args, TENANT_ID);
    expect(result).toBe(args);
  });

  it("never mutates the original args object", () => {
    const original = { where: { status: "PUBLISHED" } };
    const result = applyTenantScope("Course", "findMany", original, TENANT_ID);
    expect(original.where).toEqual({ status: "PUBLISHED" });
    expect(result).not.toBe(original);
  });
});
