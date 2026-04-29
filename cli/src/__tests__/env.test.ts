import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { envCommand } from "../commands/env.js";
import { writeConfig } from "../config/store.js";
import type { PaperclipConfig } from "../config/schema.js";
import * as p from "@clack/prompts";

vi.mock("@clack/prompts", () => ({
  intro: vi.fn(),
  outro: vi.fn(),
  note: vi.fn(),
  log: {
    message: vi.fn(),
    error: vi.fn(),
  },
}));

const ORIGINAL_ENV = { ...process.env };

function createTempConfig(overrides?: Partial<PaperclipConfig>): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "paperclip-env-"));
  const configPath = path.join(root, ".paperclip", "config.json");
  const runtimeRoot = path.join(root, "runtime");

  const config: PaperclipConfig = {
    $meta: {
      version: 1,
      updatedAt: "2026-03-10T00:00:00.000Z",
      source: "configure",
    },
    database: {
      mode: "embedded-postgres",
      embeddedPostgresDataDir: path.join(runtimeRoot, "db"),
      embeddedPostgresPort: 55432,
      backup: {
        enabled: true,
        intervalMinutes: 60,
        retentionDays: 30,
        dir: path.join(runtimeRoot, "backups"),
      },
    },
    logging: {
      mode: "file",
      logDir: path.join(runtimeRoot, "logs"),
    },
    server: {
      deploymentMode: "local_trusted",
      exposure: "private",
      host: "127.0.0.1",
      port: 3199,
      allowedHostnames: [],
      serveUi: true,
    },
    auth: {
      baseUrlMode: "auto",
      disableSignUp: false,
    },
    telemetry: {
      enabled: true,
    },
    storage: {
      provider: "local_disk",
      localDisk: {
        baseDir: path.join(runtimeRoot, "storage"),
      },
      s3: {
        bucket: "paperclip",
        region: "us-east-1",
        prefix: "",
        forcePathStyle: false,
      },
    },
    secrets: {
      provider: "local_encrypted",
      strictMode: false,
      localEncrypted: {
        keyFilePath: path.join(runtimeRoot, "secrets", "master.key"),
      },
    },
    ...overrides,
  };

  writeConfig(config, configPath);
  return configPath;
}

describe("envCommand", () => {
  beforeEach(() => {
    process.env = { ...ORIGINAL_ENV };
    vi.clearAllMocks();
  });

  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
  });

  it("handles missing config file gracefully", async () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "paperclip-env-"));
    const configPath = path.join(root, ".paperclip", "config.json");

    await envCommand({ config: configPath });

    expect(p.log.message).toHaveBeenCalledWith(expect.stringContaining("Config file missing:"));
    expect(p.note).toHaveBeenCalled();
    const noteCall = vi.mocked(p.note).mock.calls[0];
    expect(noteCall[0]).toContain("export PORT=");
  });

  it("generates correct environment exports based on existing config", async () => {
    const configPath = createTempConfig();

    await envCommand({ config: configPath });

    expect(p.log.message).toHaveBeenCalledWith(expect.stringContaining("Config file:"));
    expect(p.note).toHaveBeenCalled();
    const noteCall = vi.mocked(p.note).mock.calls[0];
    const exports = noteCall[0] as string;

    // Check a few config properties to ensure they propagate
    expect(exports).toContain("export PORT='3199'");
    expect(exports).toContain("export PAPERCLIP_STORAGE_PROVIDER='local_disk'");
    expect(exports).toContain("export DATABASE_URL='<set-this-value>'");
  });

  it("prioritizes environment variables over config", async () => {
    const configPath = createTempConfig();
    process.env.PORT = "8080";
    process.env.DATABASE_URL = "postgres://test:test@localhost/test";

    await envCommand({ config: configPath });

    const noteCall = vi.mocked(p.note).mock.calls[0];
    const exports = noteCall[0] as string;

    expect(exports).toContain("export PORT='8080'");
    expect(exports).toContain("export DATABASE_URL='postgres://test:test@localhost/test'");
    // Verify that the environment variable override doesn't erase other config properties
    expect(exports).toContain("export PAPERCLIP_STORAGE_PROVIDER='local_disk'");
  });
});
