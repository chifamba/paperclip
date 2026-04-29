import type { Request } from "express";
import { forbidden } from "../errors.js";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasOwn(value: Record<string, unknown>, key: string) {
  return Object.prototype.hasOwnProperty.call(value, key);
}

function prefixPath(prefix: string, key: string) {
  return prefix.length > 0 ? `${prefix}.${key}` : key;
}

function collectWorkspaceStrategyCommandPaths(raw: unknown, prefix: string): string[] {
  if (!isRecord(raw)) return [];
  const paths: string[] = [];
  if (hasOwn(raw, "provisionCommand")) {
    paths.push(prefixPath(prefix, "provisionCommand"));
  }
  if (hasOwn(raw, "teardownCommand")) {
    paths.push(prefixPath(prefix, "teardownCommand"));
  }
  return paths;
}

function collectWorkspaceRuntimeCommandPaths(raw: unknown, prefix: string): string[] {
  if (!isRecord(raw)) return [];
  const paths: string[] = [];
  const runtime = raw.workspaceRuntime;
  if (!isRecord(runtime)) return [];

  const keys: Array<"commands" | "services" | "jobs"> = ["commands", "services", "jobs"];
  for (const key of keys) {
    const entries = runtime[key];
    if (Array.isArray(entries)) {
      for (let i = 0; i < entries.length; i++) {
        const entry = entries[i];
        if (isRecord(entry) && hasOwn(entry, "command")) {
          paths.push(prefixPath(prefix, `workspaceRuntime.${key}.${i}.command`));
        }
      }
    }
  }
  return paths;
}

function collectExecutionWorkspaceConfigCommandPaths(raw: unknown, prefix: string): string[] {
  if (!isRecord(raw)) return [];
  const paths: string[] = [];
  if (hasOwn(raw, "provisionCommand")) {
    paths.push(prefixPath(prefix, "provisionCommand"));
  }
  if (hasOwn(raw, "teardownCommand")) {
    paths.push(prefixPath(prefix, "teardownCommand"));
  }
  if (hasOwn(raw, "cleanupCommand")) {
    paths.push(prefixPath(prefix, "cleanupCommand"));
  }
  paths.push(...collectWorkspaceRuntimeCommandPaths(raw, prefix));
  return paths;
}

export function assertNoAgentHostWorkspaceCommandMutation(req: Request, paths: string[]) {
  if (req.actor.type !== "agent" || paths.length === 0) return;
  throw forbidden(
    `Agent keys cannot modify host-executed workspace commands (${paths.join(", ")}).`,
  );
}

export function collectAgentAdapterWorkspaceCommandPaths(adapterConfig: unknown): string[] {
  if (!isRecord(adapterConfig)) return [];
  return collectWorkspaceStrategyCommandPaths(
    adapterConfig.workspaceStrategy,
    "adapterConfig.workspaceStrategy",
  );
}

export function collectProjectExecutionWorkspaceCommandPaths(policy: unknown): string[] {
  if (!isRecord(policy)) return [];
  const paths: string[] = [];
  paths.push(
    ...collectWorkspaceStrategyCommandPaths(
      policy.workspaceStrategy,
      "executionWorkspacePolicy.workspaceStrategy",
    ),
  );
  paths.push(...collectWorkspaceRuntimeCommandPaths(policy, "executionWorkspacePolicy"));
  return paths;
}

export function collectProjectWorkspaceCommandPaths(workspacePatch: unknown, prefix = ""): string[] {
  if (!isRecord(workspacePatch)) return [];
  const paths: string[] = [];
  if (hasOwn(workspacePatch, "cleanupCommand")) {
    paths.push(prefixPath(prefix, "cleanupCommand"));
  }
  if (hasOwn(workspacePatch, "runtimeConfig")) {
    paths.push(
      ...collectWorkspaceRuntimeCommandPaths(
        workspacePatch.runtimeConfig,
        prefixPath(prefix, "runtimeConfig"),
      ),
    );
  }
  return paths;
}

export function collectIssueWorkspaceCommandPaths(input: {
  executionWorkspaceSettings?: unknown;
  assigneeAdapterOverrides?: unknown;
}): string[] {
  const paths: string[] = [];
  if (isRecord(input.executionWorkspaceSettings)) {
    paths.push(
      ...collectWorkspaceStrategyCommandPaths(
        input.executionWorkspaceSettings.workspaceStrategy,
        "executionWorkspaceSettings.workspaceStrategy",
      ),
    );
    paths.push(
      ...collectWorkspaceRuntimeCommandPaths(
        input.executionWorkspaceSettings,
        "executionWorkspaceSettings",
      ),
    );
  }
  if (isRecord(input.assigneeAdapterOverrides)) {
    const adapterConfig = input.assigneeAdapterOverrides.adapterConfig;
    if (isRecord(adapterConfig)) {
      paths.push(
        ...collectWorkspaceStrategyCommandPaths(
          adapterConfig.workspaceStrategy,
          "assigneeAdapterOverrides.adapterConfig.workspaceStrategy",
        ),
      );
    }
  }
  return paths;
}

export function collectExecutionWorkspaceCommandPaths(input: {
  config?: unknown;
  metadata?: unknown;
}): string[] {
  const paths: string[] = [];
  if (input.config !== undefined) {
    paths.push(...collectExecutionWorkspaceConfigCommandPaths(input.config, "config"));
  }
  if (isRecord(input.metadata) && hasOwn(input.metadata, "config")) {
    paths.push(...collectExecutionWorkspaceConfigCommandPaths(input.metadata.config, "metadata.config"));
  }
  return paths;
}
