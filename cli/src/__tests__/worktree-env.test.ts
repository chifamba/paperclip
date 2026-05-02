import { describe, expect, it, vi, afterEach, beforeEach } from "vitest";

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

vi.mock("picocolors", () => ({
  default: {
    green: vi.fn((s) => s),
    yellow: vi.fn((s) => s),
    red: vi.fn((s) => s),
  },
}));

vi.mock("@paperclipai/db", () => ({
  applyPendingMigrations: vi.fn(),
  agents: {},
  assets: {},
  companies: {},
  createDb: vi.fn(),
  documentRevisions: {},
  documents: {},
  ensurePostgresDatabase: vi.fn(),
  formatDatabaseBackupResult: vi.fn(),
  goals: {},
  heartbeatRuns: {},
  inspectMigrations: vi.fn(),
  issueAttachments: {},
  issueComments: {},
  issueDocuments: {},
  issues: {},
  projectWorkspaces: {},
  projects: {},
  routines: {},
  routineTriggers: {},
  runDatabaseBackup: vi.fn(),
  runDatabaseRestore: vi.fn(),
  createEmbeddedPostgresLogBuffer: vi.fn(),
  formatEmbeddedPostgresError: vi.fn(),
}));

vi.mock("drizzle-orm", () => ({
  and: vi.fn(),
  eq: vi.fn(),
  inArray: vi.fn(),
  sql: vi.fn(),
}));

vi.mock("../commands/worktree-lib.js", () => ({
  formatShellExports: vi.fn(),
  buildWorktreeConfig: vi.fn(),
  buildWorktreeEnvEntries: vi.fn(),
  generateWorktreeColor: vi.fn(),
  isWorktreeSeedMode: vi.fn(),
  resolveSuggestedWorktreeName: vi.fn(),
  resolveWorktreeSeedPlan: vi.fn(),
  resolveWorktreeLocalPaths: vi.fn(),
  sanitizeWorktreeInstanceId: vi.fn(),
}));

vi.mock("../config/env.js", () => ({
  resolvePaperclipEnvFile: vi.fn(),
  readPaperclipEnvEntries: vi.fn(),
  ensureAgentJwtSecret: vi.fn(),
  loadPaperclipEnvFile: vi.fn(),
  mergePaperclipEnvEntries: vi.fn(),
}));

vi.mock("../config/store.js", () => ({
  resolveConfigPath: vi.fn(),
  readConfig: vi.fn(),
  writeConfig: vi.fn(),
}));

import { worktreeEnvCommand } from "../commands/worktree.js";
import { formatShellExports } from "../commands/worktree-lib.js";
import {
  resolvePaperclipEnvFile,
  readPaperclipEnvEntries,
} from "../config/env.js";
import { resolveConfigPath } from "../config/store.js";

describe("worktreeEnvCommand", () => {
  let consoleLogSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleLogSpy = vi.spyOn(console, "log").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should merge env entries with default variables and format as shell exports", async () => {
    vi.mocked(resolveConfigPath).mockReturnValue("/mock/path/paperclip.json");
    vi.mocked(resolvePaperclipEnvFile).mockReturnValue("/mock/path/.env");
    vi.mocked(readPaperclipEnvEntries).mockReturnValue({
      SOME_CUSTOM_VAR: "custom_value",
      PAPERCLIP_HOME: "/custom/home",
    });
    vi.mocked(formatShellExports).mockReturnValue(
      "export PAPERCLIP_CONFIG='/mock/path/paperclip.json'\nexport PAPERCLIP_HOME='/custom/home'\nexport SOME_CUSTOM_VAR='custom_value'",
    );

    await worktreeEnvCommand({});

    expect(resolveConfigPath).toHaveBeenCalledWith(undefined);
    expect(resolvePaperclipEnvFile).toHaveBeenCalledWith(
      "/mock/path/paperclip.json",
    );
    expect(readPaperclipEnvEntries).toHaveBeenCalledWith("/mock/path/.env");

    expect(formatShellExports).toHaveBeenCalledWith({
      PAPERCLIP_CONFIG: "/mock/path/paperclip.json",
      PAPERCLIP_HOME: "/custom/home",
      SOME_CUSTOM_VAR: "custom_value",
    });

    expect(consoleLogSpy).toHaveBeenCalledWith(
      "export PAPERCLIP_CONFIG='/mock/path/paperclip.json'\nexport PAPERCLIP_HOME='/custom/home'\nexport SOME_CUSTOM_VAR='custom_value'",
    );
  });

  it("should output JSON if json option is provided", async () => {
    vi.mocked(resolveConfigPath).mockReturnValue("/mock/path/paperclip.json");
    vi.mocked(resolvePaperclipEnvFile).mockReturnValue("/mock/path/.env");
    vi.mocked(readPaperclipEnvEntries).mockReturnValue({
      SOME_CUSTOM_VAR: "custom_value",
    });

    await worktreeEnvCommand({ json: true });

    expect(formatShellExports).not.toHaveBeenCalled();
    expect(consoleLogSpy).toHaveBeenCalledWith(
      JSON.stringify(
        {
          PAPERCLIP_CONFIG: "/mock/path/paperclip.json",
          SOME_CUSTOM_VAR: "custom_value",
        },
        null,
        2,
      ),
    );
  });

  it("should add optional environment entries if present in envEntries", async () => {
    vi.mocked(resolveConfigPath).mockReturnValue("/mock/path/paperclip.json");
    vi.mocked(resolvePaperclipEnvFile).mockReturnValue("/mock/path/.env");
    vi.mocked(readPaperclipEnvEntries).mockReturnValue({
      PAPERCLIP_INSTANCE_ID: "instance-123",
      PAPERCLIP_CONTEXT: "context-456",
    });

    await worktreeEnvCommand({ json: true });

    expect(consoleLogSpy).toHaveBeenCalledWith(
      JSON.stringify(
        {
          PAPERCLIP_CONFIG: "/mock/path/paperclip.json",
          PAPERCLIP_INSTANCE_ID: "instance-123",
          PAPERCLIP_CONTEXT: "context-456",
        },
        null,
        2,
      ),
    );
  });

  it("should use passed config option if provided", async () => {
    vi.mocked(resolveConfigPath).mockReturnValue(
      "/explicit/path/paperclip.json",
    );
    vi.mocked(resolvePaperclipEnvFile).mockReturnValue("/explicit/path/.env");
    vi.mocked(readPaperclipEnvEntries).mockReturnValue({});

    await worktreeEnvCommand({
      config: "/explicit/path/paperclip.json",
      json: true,
    });

    expect(resolveConfigPath).toHaveBeenCalledWith(
      "/explicit/path/paperclip.json",
    );

    expect(consoleLogSpy).toHaveBeenCalledWith(
      JSON.stringify(
        {
          PAPERCLIP_CONFIG: "/explicit/path/paperclip.json",
        },
        null,
        2,
      ),
    );
  });
});
