import { describe, expect, it, vi } from "vitest";

vi.mock("@clack/prompts", () => ({
  default: {
    spinner: vi.fn(() => ({ start: vi.fn(), stop: vi.fn() })),
    log: { message: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
    outro: vi.fn(),
    select: vi.fn(),
    confirm: vi.fn(),
    isCancel: vi.fn(),
  },
}));

vi.mock("@paperclipai/db", () => ({
  agents: {},
  authUsers: {},
  companies: {},
  createDb: vi.fn(),
  projects: {},
  routines: {},
  routineTriggers: {},
  applyPendingMigrations: vi.fn(),
  ensurePostgresDatabase: vi.fn(),
  formatDatabaseBackupResult: vi.fn(),
  heartbeatRuns: {},
  inspectMigrations: vi.fn(),
  issueAttachments: {},
  issueComments: {},
  issueDocuments: {},
  issues: {},
  projectWorkspaces: {},
  runDatabaseBackup: vi.fn(),
  runDatabaseRestore: vi.fn(),
  createEmbeddedPostgresLogBuffer: vi.fn(() => ({ append: vi.fn(), getRecentLogs: vi.fn() })),
  formatEmbeddedPostgresError: vi.fn(),
}));

vi.mock("@paperclipai/shared", () => ({}));

import { isMissingStorageObjectError } from "../commands/worktree.js";

describe("isMissingStorageObjectError", () => {
  it("returns true for ENOENT code", () => {
    expect(isMissingStorageObjectError({ code: "ENOENT" })).toBe(true);
  });

  it("returns true for 404 status", () => {
    expect(isMissingStorageObjectError({ status: 404 })).toBe(true);
  });

  it("returns true for NoSuchKey name", () => {
    expect(isMissingStorageObjectError({ name: "NoSuchKey" })).toBe(true);
  });

  it("returns true for NotFound name", () => {
    expect(isMissingStorageObjectError({ name: "NotFound" })).toBe(true);
  });

  it("returns true for 'Object not found.' message", () => {
    expect(isMissingStorageObjectError({ message: "Object not found." })).toBe(true);
  });

  it("returns false for non-missing error codes", () => {
    expect(isMissingStorageObjectError({ code: "EISDIR" })).toBe(false);
    expect(isMissingStorageObjectError({ status: 500 })).toBe(false);
    expect(isMissingStorageObjectError({ name: "InternalError" })).toBe(false);
    expect(isMissingStorageObjectError({ message: "Internal Server Error" })).toBe(false);
  });

  it("returns false for non-objects or null/undefined", () => {
    expect(isMissingStorageObjectError(null)).toBe(false);
    expect(isMissingStorageObjectError(undefined)).toBe(false);
    expect(isMissingStorageObjectError("error")).toBe(false);
    expect(isMissingStorageObjectError(123)).toBe(false);
    expect(isMissingStorageObjectError({})).toBe(false);
  });
});
