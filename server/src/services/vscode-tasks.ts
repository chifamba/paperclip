import fs from "node:fs/promises";
import path from "node:path";
import type { WorkspaceCommandDefinition } from "@paperclipai/shared";

interface VSCodeTaskOptions {
  cwd?: string;
  env?: Record<string, string>;
}

interface VSCodeTask {
  label?: string;
  type?: string;
  command?: string;
  args?: string[];
  options?: VSCodeTaskOptions;
  isBackground?: boolean;
  [key: string]: unknown;
}

interface VSCodeTasksJson {
  version?: string;
  tasks?: VSCodeTask[];
}

function slugify(value: string | null | undefined): string {
  return (value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function cleanCwd(rawCwd: string | null | undefined): string | null {
  if (!rawCwd) return null;
  // Replace VS Code workspace variables with relative path
  const cleaned = rawCwd
    .replace(/\${workspaceFolder}/g, "")
    .replace(/\${workspaceRoot}/g, "")
    .trim()
    .replace(/^\//, "");
  return cleaned.length > 0 ? cleaned : null;
}

export async function discoverVSCodeTasks(
  workspaceDir: string,
): Promise<WorkspaceCommandDefinition[]> {
  if (!workspaceDir) return [];

  const tasksJsonPath = path.join(workspaceDir, ".vscode", "tasks.json");
  try {
    const content = await fs.readFile(tasksJsonPath, "utf-8");
    // Strip comments from json if any (rudimentary JSONC support)
    const cleanJson = content.replace(/\/\*[\s\S]*?\*\/|([^\\:]|^)\/\/.*$/gm, "$1");
    const parsed = JSON.parse(cleanJson) as VSCodeTasksJson;
    const rawTasks = parsed.tasks;
    if (!Array.isArray(rawTasks)) return [];

    const definitions: WorkspaceCommandDefinition[] = [];
    let serviceIndex = 0;

    rawTasks.forEach((task, index) => {
      if (!task || typeof task !== "object") return;
      const type = task.type ?? "shell";
      if (type !== "shell" && type !== "process") return;

      const label = task.label ?? task.command;
      if (!label) return;

      const cmdArgs = Array.isArray(task.args) ? task.args : [];
      let fullCommand = task.command ?? "";
      if (fullCommand && cmdArgs.length > 0) {
        fullCommand += " " + cmdArgs.join(" ");
      }

      // Check if background service or contains watch/dev indicators
      const isBackground = Boolean(task.isBackground);
      const isServiceIndicator =
        isBackground ||
        /watch|dev|start|server|nodemon|live-reload/i.test(label) ||
        /watch|dev|start|server|nodemon|live-reload/i.test(fullCommand);

      const kind = isServiceIndicator ? "service" : "job";

      const cleanedCwd = cleanCwd(task.options?.cwd);
      const env = task.options?.env ?? null;

      definitions.push({
        id: `vscode_task:${slugify(label)}`,
        name: label,
        kind,
        command: fullCommand || null,
        cwd: cleanedCwd,
        lifecycle: kind === "service" ? "shared" : null,
        serviceIndex: kind === "service" ? serviceIndex++ : null,
        disabledReason: null,
        rawConfig: { ...task },
        source: {
          type: "vscode_task",
          index,
          taskLabel: task.label,
          taskPath: ".vscode/tasks.json",
        },
      });
    });

    return definitions;
  } catch {
    // If file doesn't exist or is invalid JSON, return empty array
    return [];
  }
}
