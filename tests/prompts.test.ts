import { describe, expect, test, mock } from "bun:test";
import { collectInteractiveInputs, type InteractiveAnswers } from "../src/prompts";

describe("collectInteractiveInputs", () => {
  test("uses all provided answers including channel and agents without prompting", async () => {
    const answers: Partial<InteractiveAnswers> = {
      projectDir: "./MyApp",
      name: "MyApp",
      package: "com.x",
      arch: "multi",
      stackChannel: "bleeding-edge",
      withAgents: true,
    };
    const out = await collectInteractiveInputs({
      provided: answers,
      isTTY: true,
    });
    expect(out.projectDir.endsWith("/MyApp")).toBe(true);
    expect(out.name).toBe("MyApp");
    expect(out.package).toBe("com.x");
    expect(out.arch).toBe("multi");
    expect(out.stackChannel).toBe("bleeding-edge");
    expect(out.withAgents).toBe(true);
  });

  test("non-TTY defaults stackChannel=stable and withAgents=false when omitted", async () => {
    const out = await collectInteractiveInputs({
      provided: {
        projectDir: "./MyApp",
        name: "MyApp",
        package: "com.x",
        arch: "single",
      },
      isTTY: false,
    });
    expect(out.stackChannel).toBe("stable");
    expect(out.withAgents).toBe(false);
  });

  test("throws when isTTY is false and a required input is missing", async () => {
    await expect(
      collectInteractiveInputs({ provided: { arch: "multi" }, isTTY: false }),
    ).rejects.toThrow(/--name|--package|--arch|projectDir/);
  });

  test("TTY prompts for channel and agents when core flags provided but channel/agents omitted", async () => {
    mock.module("@clack/prompts", () => ({
      text: async () => "unused",
      select: async () => "bleeding-edge",
      confirm: async () => true,
      isCancel: () => false,
    }));
    const { collectInteractiveInputs: run } = await import("../src/prompts");
    const out = await run({
      provided: {
        projectDir: "./P",
        name: "P",
        package: "com.p",
        arch: "multi",
      },
      isTTY: true,
      cwd: "/tmp",
    });
    expect(out.stackChannel).toBe("bleeding-edge");
    expect(out.withAgents).toBe(true);
  });
});
