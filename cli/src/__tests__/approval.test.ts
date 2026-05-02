import { beforeEach, describe, expect, it, vi, type Mock } from "vitest";
import { Command } from "commander";
import { registerApprovalCommands } from "../commands/client/approval.js";
import { resolveCommandContext, printOutput, handleCommandError } from "../commands/client/common.js";
import type { PaperclipApiClient } from "../client/http.js";

vi.mock("../commands/client/common.js", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../commands/client/common.js")>();
  return {
    ...actual,
    resolveCommandContext: vi.fn(),
    printOutput: vi.fn(),
    handleCommandError: vi.fn(),
  };
});

describe("registerApprovalCommands", () => {
  let program: Command;
  let mockApi: { get: Mock; post: Mock };

  beforeEach(() => {
    vi.resetAllMocks();
    program = new Command();
    program.exitOverride(); // Prevent process.exit

    // Silence console out
    program.configureOutput({
        writeOut: () => {},
        writeErr: () => {},
    });

    registerApprovalCommands(program);

    mockApi = {
      get: vi.fn(),
      post: vi.fn(),
    };

    (resolveCommandContext as Mock).mockReturnValue({
      api: mockApi as unknown as PaperclipApiClient,
      companyId: "company-123",
      json: true,
    });
  });

  it("registers the top-level approval command and its subcommands", () => {
    const approval = program.commands.find((command) => command.name() === "approval");
    expect(approval).toBeDefined();

    const subcommands = approval?.commands.map((cmd) => cmd.name());
    expect(subcommands).toEqual([
      "list",
      "get",
      "create",
      "approve",
      "reject",
      "request-revision",
      "resubmit",
      "comment",
    ]);
  });

  describe("list command", () => {
    it("calls API to list approvals and prints them", async () => {
      mockApi.get.mockResolvedValue([{ id: "app-1", type: "hire_agent", status: "pending" }]);

      await program.parseAsync(["node", "test", "approval", "list", "-C", "company-123"]);

      expect(resolveCommandContext).toHaveBeenCalledWith(
        expect.objectContaining({ companyId: "company-123" }),
        { requireCompany: true }
      );
      expect(mockApi.get).toHaveBeenCalledWith("/api/companies/company-123/approvals");
      expect(printOutput).toHaveBeenCalledWith(
        [{ id: "app-1", type: "hire_agent", status: "pending" }],
        { json: true }
      );
    });

    it("includes status filter in query", async () => {
      mockApi.get.mockResolvedValue([]);
      await program.parseAsync(["node", "test", "approval", "list", "-C", "company-123", "--status", "approved"]);

      expect(mockApi.get).toHaveBeenCalledWith("/api/companies/company-123/approvals?status=approved");
    });
  });

  describe("get command", () => {
    it("calls API to get a specific approval", async () => {
      mockApi.get.mockResolvedValue({ id: "app-123", status: "pending" });
      await program.parseAsync(["node", "test", "approval", "get", "app-123"]);

      expect(mockApi.get).toHaveBeenCalledWith("/api/approvals/app-123");
      expect(printOutput).toHaveBeenCalledWith(
        { id: "app-123", status: "pending" },
        { json: true }
      );
    });
  });

  describe("create command", () => {
    it("creates an approval with parsed JSON payload and CSV issue IDs", async () => {
      mockApi.post.mockResolvedValue({ id: "app-new" });
      const uuid = "123e4567-e89b-12d3-a456-426614174000";
      await program.parseAsync([
        "node", "test", "approval", "create",
        "-C", "company-123",
        "--type", "hire_agent",
        "--payload", '{"role":"engineer"}',
        "--issue-ids", `${uuid}, ${uuid}`
      ]);

      expect(mockApi.post).toHaveBeenCalledWith(
        "/api/companies/company-123/approvals",
        expect.objectContaining({
          type: "hire_agent",
          payload: { role: "engineer" },
          issueIds: [uuid, uuid]
        })
      );
    });

    it("handles invalid JSON payload", async () => {
      await program.parseAsync([
          "node", "test", "approval", "create",
          "-C", "company-123",
          "--type", "hire_agent",
          "--payload", 'invalid json'
      ]);

      expect(handleCommandError).toHaveBeenCalledWith(
        expect.objectContaining({ message: expect.stringContaining("Invalid payload JSON") })
      );
    });
  });

  describe("approve command", () => {
    it("approves an approval request with decision note", async () => {
      mockApi.post.mockResolvedValue({ id: "app-123", status: "approved" });
      await program.parseAsync([
        "node", "test", "approval", "approve", "app-123",
        "--decision-note", "Looks good"
      ]);

      expect(mockApi.post).toHaveBeenCalledWith(
        "/api/approvals/app-123/approve",
        { decisionNote: "Looks good" }
      );
    });
  });

  describe("reject command", () => {
    it("rejects an approval request with decision note", async () => {
      mockApi.post.mockResolvedValue({ id: "app-123", status: "rejected" });
      await program.parseAsync([
        "node", "test", "approval", "reject", "app-123",
        "--decision-note", "Needs work"
      ]);

      expect(mockApi.post).toHaveBeenCalledWith(
        "/api/approvals/app-123/reject",
        { decisionNote: "Needs work" }
      );
    });
  });

  describe("request-revision command", () => {
    it("requests revision for an approval request", async () => {
      mockApi.post.mockResolvedValue({ id: "app-123", status: "revision_requested" });
      await program.parseAsync([
        "node", "test", "approval", "request-revision", "app-123",
        "--decision-note", "Please revise"
      ]);

      expect(mockApi.post).toHaveBeenCalledWith(
        "/api/approvals/app-123/request-revision",
        { decisionNote: "Please revise" }
      );
    });
  });

  describe("resubmit command", () => {
    it("resubmits an approval request with parsed payload", async () => {
      mockApi.post.mockResolvedValue({ id: "app-123", status: "pending" });
      await program.parseAsync([
        "node", "test", "approval", "resubmit", "app-123",
        "--payload", '{"fixed":true}'
      ]);

      expect(mockApi.post).toHaveBeenCalledWith(
        "/api/approvals/app-123/resubmit",
        { payload: { fixed: true } }
      );
    });
  });

  describe("comment command", () => {
    it("adds a comment to an approval", async () => {
      mockApi.post.mockResolvedValue({ id: "comment-1", body: "Hello" });
      await program.parseAsync([
        "node", "test", "approval", "comment", "app-123",
        "--body", "Hello"
      ]);

      expect(mockApi.post).toHaveBeenCalledWith(
        "/api/approvals/app-123/comments",
        { body: "Hello" }
      );
    });
  });
});
