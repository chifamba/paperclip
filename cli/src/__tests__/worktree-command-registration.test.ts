import { Command } from "commander";
import { describe, expect, it } from "vitest";
import { registerWorktreeCommands } from "../commands/worktree.js";

describe("registerWorktreeCommands", () => {
  it("registers worktree commands correctly", () => {
    const program = new Command();

    expect(() => registerWorktreeCommands(program)).not.toThrow();

    const commands = program.commands.map(c => c.name());

    // Check main worktree command and its subcommands
    const worktreeCmd = program.commands.find(c => c.name() === "worktree");
    expect(worktreeCmd).toBeDefined();

    // Check standalone aliases
    expect(commands).toContain("worktree:make");
    expect(commands).toContain("worktree:list");
    expect(commands).toContain("worktree:merge-history");
    expect(commands).toContain("worktree:cleanup");

    if (worktreeCmd) {
      const subcommands = worktreeCmd.commands.map(c => c.name());
      expect(subcommands).toContain("init");
      expect(subcommands).toContain("env");
      expect(subcommands).toContain("reseed");
      expect(subcommands).toContain("repair");
    }
  });

  it("registers specific options for worktree:make", () => {
    const program = new Command();
    registerWorktreeCommands(program);

    const makeCmd = program.commands.find(c => c.name() === "worktree:make");
    expect(makeCmd).toBeDefined();
    if (makeCmd) {
      const options = makeCmd.options.map(o => o.long);
      expect(options).toContain("--start-point");
      expect(options).toContain("--instance");
      expect(options).toContain("--home");
      expect(options).toContain("--from-config");
      expect(options).toContain("--from-data-dir");
      expect(options).toContain("--from-instance");
      expect(options).toContain("--server-port");
      expect(options).toContain("--db-port");
      expect(options).toContain("--seed-mode");
      expect(options).toContain("--no-seed");
      expect(options).toContain("--force");
    }
  });
});
