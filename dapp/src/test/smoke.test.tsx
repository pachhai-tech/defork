// dapp/src/test/smoke.test.tsx
import { describe, it, expect } from "vitest";

describe("env", () => {
  it("has import.meta.env", () => {
    expect(import.meta.env).toBeDefined();
  });
});
