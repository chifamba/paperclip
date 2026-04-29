import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi, type MockInstance } from "vitest";
import { writeContext } from "../client/context.js";
import { resolveCommandContext, handleCommandError } from "../commands/client/common.js";
import { ApiRequestError } from "../client/http.js";
import pc from "picocolors";

const ORIGINAL_ENV = { ...process.env };

function createTempPath(name: string): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "paperclip-cli-common-"));
  return path.join(dir, name);
}

describe("resolveCommandContext", () => {
  beforeEach(() => {
    process.env = { ...ORIGINAL_ENV };
    delete process.env.PAPERCLIP_API_URL;
    delete process.env.PAPERCLIP_API_KEY;
    delete process.env.PAPERCLIP_COMPANY_ID;
  });

  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
  });

  it("uses profile defaults when options/env are not provided", () => {
    const contextPath = createTempPath("context.json");

    writeContext(
      {
        version: 1,
        currentProfile: "ops",
        profiles: {
          ops: {
            apiBase: "http://127.0.0.1:9999",
            companyId: "company-profile",
            apiKeyEnvVarName: "AGENT_KEY",
          },
        },
      },
      contextPath,
    );
    process.env.AGENT_KEY = "key-from-env";

    const resolved = resolveCommandContext({ context: contextPath }, { requireCompany: true });
    expect(resolved.api.apiBase).toBe("http://127.0.0.1:9999");
    expect(resolved.companyId).toBe("company-profile");
    expect(resolved.api.apiKey).toBe("key-from-env");
  });

  it("prefers explicit options over profile values", () => {
    const contextPath = createTempPath("context.json");
    writeContext(
      {
        version: 1,
        currentProfile: "default",
        profiles: {
          default: {
            apiBase: "http://profile:3100",
            companyId: "company-profile",
          },
        },
      },
      contextPath,
    );

    const resolved = resolveCommandContext(
      {
        context: contextPath,
        apiBase: "http://override:3200",
        apiKey: "direct-token",
        companyId: "company-override",
      },
      { requireCompany: true },
    );

    expect(resolved.api.apiBase).toBe("http://override:3200");
    expect(resolved.companyId).toBe("company-override");
    expect(resolved.api.apiKey).toBe("direct-token");
  });

  it("throws when company is required but unresolved", () => {
    const contextPath = createTempPath("context.json");
    writeContext(
      {
        version: 1,
        currentProfile: "default",
        profiles: { default: {} },
      },
      contextPath,
    );

    expect(() =>
      resolveCommandContext({ context: contextPath, apiBase: "http://localhost:3100" }, { requireCompany: true }),
    ).toThrow(/Company ID is required/);
  });
});

describe("handleCommandError", () => {
  let exitMock: MockInstance;
  let errorMock: MockInstance;

  beforeEach(() => {
    exitMock = vi.spyOn(process, "exit").mockImplementation(() => undefined as never);
    errorMock = vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("handles ApiRequestError without details", () => {
    const error = new ApiRequestError(404, "Not Found");
    handleCommandError(error);

    expect(errorMock).toHaveBeenCalledWith(pc.red("API error 404: Not Found"));
    expect(exitMock).toHaveBeenCalledWith(1);
  });

  it("handles ApiRequestError with details", () => {
    const details = { field: "name", error: "Required" };
    const error = new ApiRequestError(400, "Bad Request", details);
    handleCommandError(error);

    expect(errorMock).toHaveBeenCalledWith(
      pc.red(`API error 400: Bad Request details=${JSON.stringify(details)}`)
    );
    expect(exitMock).toHaveBeenCalledWith(1);
  });

  it("handles generic Error", () => {
    const error = new Error("Something went wrong");
    handleCommandError(error);

    expect(errorMock).toHaveBeenCalledWith(pc.red("Something went wrong"));
    expect(exitMock).toHaveBeenCalledWith(1);
  });

  it("handles non-error objects", () => {
    handleCommandError({ code: 123, message: "Custom error" });

    expect(errorMock).toHaveBeenCalledWith(pc.red("[object Object]"));
    expect(exitMock).toHaveBeenCalledWith(1);
  });

  it("handles primitive strings", () => {
    handleCommandError("A string error");

    expect(errorMock).toHaveBeenCalledWith(pc.red("A string error"));
    expect(exitMock).toHaveBeenCalledWith(1);
  });
});
