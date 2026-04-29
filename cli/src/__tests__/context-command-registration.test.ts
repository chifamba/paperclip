import { Command } from "commander";
import { describe, expect, it } from "vitest";
import { registerContextCommands } from "../commands/client/context.js";

describe("registerContextCommands", () => {
  it("registers the context command and its subcommands", () => {
    const program = new Command();

    expect(() => registerContextCommands(program)).not.toThrow();

    const context = program.commands.find((command) => command.name() === "context");
    expect(context).toBeDefined();

    const subcommands = context?.commands.map((command) => command.name());
    expect(subcommands).toEqual(expect.arrayContaining(["show", "list", "use", "set"]));

    // Also verify options
    const showCommand = context?.commands.find((c) => c.name() === "show");
    expect(showCommand?.options.some((o) => o.long === "--profile")).toBe(true);

    const setCommand = context?.commands.find((c) => c.name() === "set");
    expect(setCommand?.options.some((o) => o.long === "--api-base")).toBe(true);
  });
});
