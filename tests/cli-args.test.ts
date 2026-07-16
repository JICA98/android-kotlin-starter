import { describe, expect, test } from "bun:test";
import { parseArgs, type ParsedArgs } from "../src/cli-args";

function ok<T>(v: { ok: true; value: T } | { ok: false; error: string }) {
  if (!v.ok) throw new Error(v.error);
  return v.value;
}

describe("parseArgs", () => {
  test("parses a project dir positional", () => {
    const v = ok(parseArgs(["MyApp"]));
    expect(v.projectDir).toBe("MyApp");
  });

  test("parses --name, --package, --arch flags", () => {
    const v = ok(parseArgs([
      "MyApp",
      "--name", "DemoApp",
      "--package", "com.x.y",
      "--arch", "multi",
    ]));
    expect(v.flags.name).toBe("DemoApp");
    expect(v.flags.package).toBe("com.x.y");
    expect(v.flags.arch).toBe("multi");
  });

  test("parses --stack", () => {
    const v = ok(parseArgs(["--stack"]));
    expect(v.flags.stack).toBe(true);
  });

  test("parses --version and --help", () => {
    const v = ok(parseArgs(["--version"]));
    expect(v.flags.version).toBe(true);
  });

  test("rejects unknown flag", () => {
    const v = parseArgs(["--foo"]);
    expect(v.ok).toBe(false);
  });

  test("parses --dry-run and --force", () => {
    const v = ok(parseArgs(["--dry-run", "--force"]));
    expect(v.flags.dryRun).toBe(true);
    expect(v.flags.force).toBe(true);
  });

  test("parses --stack-channel", () => {
    const v = ok(parseArgs(["--stack-channel", "bleeding-edge"]));
    expect(v.flags.stackChannel).toBe("bleeding-edge");
  });

  test("parses --stack-channel=stable equals form", () => {
    const v = ok(parseArgs(["--stack-channel=stable"]));
    expect(v.flags.stackChannel).toBe("stable");
  });

  test("rejects invalid --stack-channel", () => {
    const v = parseArgs(["--stack-channel", "nightly"]);
    expect(v.ok).toBe(false);
    if (!v.ok) expect(v.error).toMatch(/stack-channel/);
  });

  test("parses --with-agents and --no-agents", () => {
    expect(ok(parseArgs(["--with-agents"])).flags.withAgents).toBe(true);
    expect(ok(parseArgs(["--no-agents"])).flags.noAgents).toBe(true);
  });

  test("rejects --with-agents and --no-agents together", () => {
    const v = parseArgs(["--with-agents", "--no-agents"]);
    expect(v.ok).toBe(false);
    if (!v.ok) expect(v.error).toMatch(/with-agents|no-agents/);
  });
});
