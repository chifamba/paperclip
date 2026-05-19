import { afterEach, describe, expect, it, vi } from "vitest";
import { buildExecutionPolicy } from "./issue-execution-policy";

describe("issue execution policy", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("generates random IDs for new stages and participants", () => {
    const policy = buildExecutionPolicy({
      reviewerValues: ["user:user-1"],
      approverValues: ["agent:agent-1"],
    });

    expect(policy?.stages).toHaveLength(2);
    expect(policy?.stages[0]?.id).toMatch(/^stage-/);
    expect(policy?.stages[0]?.participants[0]?.id).toMatch(/^stage-/);
    expect(policy?.stages[1]?.id).toMatch(/^stage-/);
    expect(policy?.stages[1]?.participants[0]?.id).toMatch(/^stage-/);
  });

  it("uses crypto.randomUUID when available", () => {
    const mockUuid = "12345678-1234-1234-1234-123456789012";
    vi.stubGlobal("crypto", {
      randomUUID: () => mockUuid,
    });

    const policy = buildExecutionPolicy({
      reviewerValues: ["user:user-1"],
      approverValues: [],
    });

    expect(policy?.stages[0]?.id).toBe(`stage-${mockUuid}`);
  });

  it("falls back to crypto.getRandomValues when randomUUID is unavailable", () => {
    vi.stubGlobal("crypto", {
      getRandomValues: (array: Uint8Array) => {
        array.fill(0x42);
        return array;
      },
    });

    const policy = buildExecutionPolicy({
      reviewerValues: ["user:user-1"],
      approverValues: [],
    });

    // 16 bytes of 0x42 is "42424242424242424242424242424242"
    expect(policy?.stages[0]?.id).toBe("stage-42424242424242424242424242424242");
  });
});
