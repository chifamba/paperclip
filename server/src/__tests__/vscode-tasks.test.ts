import { describe, expect, it } from "vitest";
import fs from "node:fs/promises";
import path from "node:path";
import { discoverVSCodeTasks } from "../services/vscode-tasks.js";

describe("discoverVSCodeTasks", () => {
  it("returns empty list if .vscode/tasks.json does not exist", async () => {
    const tasks = await discoverVSCodeTasks("/nonexistent-dir");
    expect(tasks).toEqual([]);
  });

  it("parses valid tasks.json and classifies jobs and services correctly", async () => {
    // Create a temporary workspace directory structure
    const tempDir = path.join(process.cwd(), "scratch", `test-workspace-${Date.now()}`);
    await fs.mkdir(path.join(tempDir, ".vscode"), { recursive: true });

    const tasksJson = {
      version: "2.0.0",
      tasks: [
        {
          label: "Run Build",
          type: "shell",
          command: "npm run build",
          options: {
            cwd: "${workspaceFolder}/sub-dir",
          },
        },
        {
          label: "Start Dev Server",
          type: "process",
          command: "node server.js",
          args: ["--port", "3000"],
          isBackground: true,
        },
        {
          label: "Unsupported Task Type",
          type: "unsupported",
          command: "echo 123",
        },
      ],
    };

    // Write file with comments to test rudimentary JSONC stripping
    const contentWithComments = `
      // This is a comment at the top
      {
        "version": "2.0.0",
        /* block comment */
        "tasks": ${JSON.stringify(tasksJson.tasks, null, 2)}
      }
    `;

    await fs.writeFile(path.join(tempDir, ".vscode", "tasks.json"), contentWithComments, "utf-8");

    try {
      const discovered = await discoverVSCodeTasks(tempDir);
      expect(discovered).toHaveLength(2);

      // Verify the Job task
      const job = discovered.find((t) => t.id === "vscode_task:run-build");
      expect(job).toBeDefined();
      expect(job?.name).toBe("Run Build");
      expect(job?.kind).toBe("job");
      expect(job?.command).toBe("npm run build");
      expect(job?.cwd).toBe("sub-dir");

      // Verify the Service task
      const service = discovered.find((t) => t.id === "vscode_task:start-dev-server");
      expect(service).toBeDefined();
      expect(service?.name).toBe("Start Dev Server");
      expect(service?.kind).toBe("service");
      expect(service?.command).toBe("node server.js --port 3000");
      expect(service?.lifecycle).toBe("shared");
    } finally {
      // Clean up temp dir
      await fs.rm(tempDir, { recursive: true, force: true });
    }
  });
});
