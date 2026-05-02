import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { Command } from "commander";
import { registerDashboardCommands } from "../commands/client/dashboard.js";
import * as commonMod from "../commands/client/common.js";
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

describe("registerDashboardCommands", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("registers the dashboard command and its get sub-command", () => {
    const program = new Command();
    registerDashboardCommands(program);

    const dashboard = program.commands.find((cmd) => cmd.name() === "dashboard");
    expect(dashboard).toBeDefined();

    const getCmd = dashboard?.commands.find((cmd) => cmd.name() === "get");
    expect(getCmd).toBeDefined();
    expect(getCmd?.description()).toBe("Get dashboard summary for a company");
    expect(getCmd?.options.find((opt) => opt.long === "--company-id")).toBeDefined();
  });

  it("successfully retrieves and prints the dashboard summary", async () => {
    const program = new Command();
    registerDashboardCommands(program);

    const mockApiGet = vi.fn().mockResolvedValue({ totalAgents: 5 });

    vi.mocked(commonMod.resolveCommandContext).mockReturnValue({
      companyId: "company-123",
      json: true,
      api: {
        get: mockApiGet,
      } as unknown as PaperclipApiClient,
      profileName: "test-profile",
      profile: { apiBase: "test" },
    });

    // Run the command
    await program.parseAsync(["node", "test", "dashboard", "get", "--company-id", "company-123"]);

    expect(commonMod.resolveCommandContext).toHaveBeenCalledWith(
      expect.objectContaining({ companyId: "company-123" }),
      { requireCompany: true }
    );

    expect(mockApiGet).toHaveBeenCalledWith("/api/companies/company-123/dashboard");

    expect(commonMod.printOutput).toHaveBeenCalledWith(
      { totalAgents: 5 },
      { json: true }
    );
  });

  it("handles errors during command execution", async () => {
    const program = new Command();
    // commander exits on error by default in action handlers unless we catch, wait we need to prevent process.exit
    // actually, handleCommandError handles exiting or printing.
    // Let's just suppress process exit and console error for this test if commander throws
    program.exitOverride();

    registerDashboardCommands(program);

    const error = new Error("API Failure");
    const mockApiGet = vi.fn().mockRejectedValue(error);

    vi.mocked(commonMod.resolveCommandContext).mockReturnValue({
      companyId: "company-123",
      json: false,
      api: {
        get: mockApiGet,
      } as unknown as PaperclipApiClient,
      profileName: "test-profile",
      profile: { apiBase: "test" },
    });

    // handleCommandError is expected to be called with the error.
    await program.parseAsync(["node", "test", "dashboard", "get", "--company-id", "company-123"]);

    expect(commonMod.handleCommandError).toHaveBeenCalledWith(error);
  });
});
