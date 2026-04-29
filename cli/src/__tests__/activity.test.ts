import { Command } from "commander";
import { describe, expect, it } from "vitest";
import { registerActivityCommands } from "../commands/client/activity.js";

describe("registerActivityCommands", () => {
  it("registers the activity command with its subcommands", () => {
    const program = new Command();
    expect(() => registerActivityCommands(program)).not.toThrow();

    const activityCmd = program.commands.find((c) => c.name() === "activity");
    expect(activityCmd).toBeDefined();

    if (activityCmd) {
      expect(activityCmd.commands.map((c) => c.name())).toEqual(["list"]);

      const listCmd = activityCmd.commands.find((c) => c.name() === "list");
      expect(listCmd).toBeDefined();
      expect(listCmd?.options.find((o) => o.long === "--company-id")).toBeDefined();
      expect(listCmd?.options.find((o) => o.long === "--agent-id")).toBeDefined();
      expect(listCmd?.options.find((o) => o.long === "--entity-type")).toBeDefined();
      expect(listCmd?.options.find((o) => o.long === "--entity-id")).toBeDefined();
    }
  });
});
