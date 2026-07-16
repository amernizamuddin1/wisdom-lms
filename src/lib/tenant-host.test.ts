import { describe, it, expect } from "vitest";
import { stripPort, extractSubdomain, isLocalDevHost } from "@/lib/tenant-host";

describe("stripPort", () => {
  it("removes a trailing port", () => {
    expect(stripPort("acme.wisdomlms.app:3000")).toBe("acme.wisdomlms.app");
  });

  it("leaves a host with no port unchanged", () => {
    expect(stripPort("acme.wisdomlms.app")).toBe("acme.wisdomlms.app");
  });
});

describe("extractSubdomain", () => {
  const ROOT = "wisdomlms.app";

  it("extracts a single-level subdomain", () => {
    expect(extractSubdomain("acme.wisdomlms.app", ROOT)).toBe("acme");
  });

  it("extracts a subdomain when the host carries a port", () => {
    expect(extractSubdomain("acme.wisdomlms.app:3000", ROOT)).toBe("acme");
  });

  it("returns null for the bare root domain itself", () => {
    expect(extractSubdomain("wisdomlms.app", ROOT)).toBeNull();
  });

  it("returns null for a nested/invalid multi-level subdomain", () => {
    expect(extractSubdomain("foo.acme.wisdomlms.app", ROOT)).toBeNull();
  });

  it("returns null for a completely unrelated host", () => {
    expect(extractSubdomain("example.com", ROOT)).toBeNull();
  });

  it("returns null when no root domain is configured", () => {
    expect(extractSubdomain("acme.wisdomlms.app", "")).toBeNull();
  });
});

describe("isLocalDevHost", () => {
  it("recognizes localhost with a port", () => {
    expect(isLocalDevHost("localhost:3000")).toBe(true);
  });

  it("recognizes 127.0.0.1", () => {
    expect(isLocalDevHost("127.0.0.1:3000")).toBe(true);
  });

  it("recognizes .local hosts", () => {
    expect(isLocalDevHost("my-machine.local")).toBe(true);
  });

  it("rejects a real tenant subdomain", () => {
    expect(isLocalDevHost("acme.wisdomlms.app")).toBe(false);
  });
});
