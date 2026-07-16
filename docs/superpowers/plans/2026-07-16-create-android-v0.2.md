# create-android v0.2.0 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship `create-android@0.2.0` with dual stack channels (`stable` / `bleeding-edge`), optional vendored Android agent skills, expanded Android `.gitignore`, and updated README/CHANGELOG.

**Architecture:** One multi/single template tree keeps using `{{version}}` tokens. Two snapshot files under `stack/` supply pins per channel. After render, an optional recursive copy installs skills from `assets/agents/skills/` into `<project>/.agents/skills/`. CLI gains `--stack-channel`, `--with-agents`, and `--no-agents`.

**Tech Stack:** Bun, TypeScript, `@clack/prompts`, existing custom template renderer, `bun:test`.

**Spec:** `docs/superpowers/specs/2026-07-16-create-android-v0.2-design.md`

---

## File map

| Path | Responsibility |
|---|---|
| `stack/stable.json` | Production-safe AGP 9–compatible pins |
| `stack/bleeding-edge.json` | Current edge pins (from today's `snapshot.json`) |
| `stack/snapshot.json` | **Delete** after dual files exist |
| `src/stack/snapshot.ts` | `StackChannel`, `loadSnapshot(root, channel)`, channel-aware banner |
| `src/cli-args.ts` | Parse new flags; reject agents mutex / bad channel |
| `src/prompts.ts` | Prompt for channel + agents when unset (TTY) |
| `src/commands/create.ts` | Load channel snapshot; optional agents copy |
| `src/scaffold/copy-agents.ts` | Recursive binary-safe copy of skills tree |
| `src/cli.ts` | USAGE, `--stack` both channels, wire new inputs |
| `scripts/check-snapshot.ts` | Validate both JSON files + placeholders |
| `templates/*/__name__/.gitignore` | Full Android ignore lists |
| `assets/agents/skills/**` | Vendored skill trees |
| `package.json` | Version `0.2.0`; `files` includes `assets` |
| `README.md`, `CHANGELOG.md` | Docs for 0.2.0 |
| `tests/*.test.ts` | Cover new behavior; update `loadSnapshot` call sites |

### Stable vs bleeding-edge pins (lock for this plan)

Templates require **AGP 9** (built-in Kotlin / no separate `kotlin-android` plugin). Both channels stay on AGP 9.

**`stack/bleeding-edge.json`** (migrate current `snapshot.json`):

```json
{
  "agp": "9.1.1",
  "kotlin": "2.4.0",
  "gradle": "9.5.1",
  "compileSdk": 37,
  "targetSdk": 37,
  "minSdk": 24,
  "ndk": "29.0.14206865",
  "composeBom": "2026.05.00",
  "hilt": "2.59.2",
  "notes": "Edge pins for 0.2.0. Android 17 (API 37)."
}
```

**`stack/stable.json`** (conservative within AGP 9 + same template tree):

```json
{
  "agp": "9.0.0",
  "kotlin": "2.2.10",
  "gradle": "9.0.0",
  "compileSdk": 35,
  "targetSdk": 35,
  "minSdk": 24,
  "ndk": "28.2.13676358",
  "composeBom": "2025.12.01",
  "hilt": "2.56.2",
  "notes": "Conservative AGP 9–compatible matrix for production starters (0.2.0)."
}
```

If a later smoke build proves a pin incompatible, adjust **only** `stable.json` values in the same PR; keep field names and dual-file layout.

---

### Task 1: Dual stack snapshot files + channel-aware loader

**Files:**
- Create: `stack/stable.json`
- Create: `stack/bleeding-edge.json`
- Delete: `stack/snapshot.json`
- Modify: `src/stack/snapshot.ts`
- Modify: `tests/stack-snapshot.test.ts`
- Modify: `tests/integration-render.test.ts` (any `loadSnapshot(repoRoot)` call)
- Modify: `scripts/check-snapshot.ts` (minimal: both files exist — full validation in Task 1 steps)

- [ ] **Step 1: Write failing tests for channel-aware load**

Replace `tests/stack-snapshot.test.ts` with:

```ts
import { describe, expect, test } from "bun:test";
import { loadSnapshot, formatSnapshotBanner, type StackChannel } from "../src/stack/snapshot";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");

describe("snapshot", () => {
  test("loadSnapshot reads stable channel", async () => {
    const snap = await loadSnapshot(repoRoot, "stable");
    expect(snap.agp).toBe("9.0.0");
    expect(snap.kotlin).toBe("2.2.10");
    expect(snap.compileSdk).toBe(35);
    expect(snap.targetSdk).toBe(35);
    expect(snap.minSdk).toBe(24);
    expect(snap.composeBom).toBe("2025.12.01");
    expect(snap.hilt).toBe("2.56.2");
  });

  test("loadSnapshot reads bleeding-edge channel", async () => {
    const snap = await loadSnapshot(repoRoot, "bleeding-edge");
    expect(snap.agp).toBe("9.1.1");
    expect(snap.kotlin).toBe("2.4.0");
    expect(snap.compileSdk).toBe(37);
    expect(snap.targetSdk).toBe(37);
    expect(snap.ndk).toBe("29.0.14206865");
    expect(snap.composeBom).toBe("2026.05.00");
    expect(snap.hilt).toBe("2.59.2");
  });

  test("formatSnapshotBanner contains all version fields", () => {
    const snap = {
      agp: "9.1.1",
      kotlin: "2.4.0",
      gradle: "9.5.1",
      compileSdk: 37,
      targetSdk: 37,
      minSdk: 24,
      ndk: "29.0.14206865",
      composeBom: "2026.05.00",
      hilt: "2.59.2",
    };
    const banner = formatSnapshotBanner(snap);
    expect(banner).toContain("AGP 9.1.1");
    expect(banner).toContain("Kotlin 2.4.0");
    expect(banner).toContain("Gradle 9.5.1");
    expect(banner).toContain("compileSdk 37");
    expect(banner).toContain("targetSdk 37");
  });

  test("formatSnapshotBanner prefixes channel when provided", () => {
    const snap = {
      agp: "9.0.0",
      kotlin: "2.2.10",
      gradle: "9.0.0",
      compileSdk: 35,
      targetSdk: 35,
      minSdk: 24,
      ndk: "28.2.13676358",
      composeBom: "2025.12.01",
      hilt: "2.56.2",
    };
    const banner = formatSnapshotBanner(snap, "stable");
    expect(banner.startsWith("stable · ")).toBe(true);
    expect(banner).toContain("AGP 9.0.0");
  });

  test("formatSnapshotBanner is stable (deterministic ordering)", () => {
    const snap = {
      agp: "9.1.1",
      kotlin: "2.4.0",
      gradle: "9.5.1",
      compileSdk: 37,
      targetSdk: 37,
      minSdk: 24,
      ndk: "29.0.14206865",
      composeBom: "2026.05.00",
      hilt: "2.59.2",
    };
    expect(formatSnapshotBanner(snap)).toBe(formatSnapshotBanner(snap));
  });
});
```

- [ ] **Step 2: Run tests — expect fail**

```sh
bun test tests/stack-snapshot.test.ts
```

Expected: FAIL (e.g. `loadSnapshot` arity / missing `stable.json`).

- [ ] **Step 3: Create snapshot JSON files**

Write `stack/stable.json` and `stack/bleeding-edge.json` with the exact JSON from the File map section above. Delete `stack/snapshot.json`.

- [ ] **Step 4: Implement channel-aware loader**

Replace `src/stack/snapshot.ts` with:

```ts
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

export type StackChannel = "stable" | "bleeding-edge";

export type Snapshot = {
  agp: string;
  kotlin: string;
  gradle: string;
  compileSdk: number;
  targetSdk: number;
  minSdk: number;
  ndk: string;
  composeBom: string;
  hilt: string;
  notes?: string;
};

export async function loadSnapshot(
  repoRoot: string,
  channel: StackChannel,
): Promise<Snapshot> {
  const path = resolve(repoRoot, "stack", `${channel}.json`);
  const raw = await readFile(path, "utf8");
  return JSON.parse(raw) as Snapshot;
}

export function formatSnapshotBanner(s: Snapshot, channel?: StackChannel): string {
  const parts = [
    `AGP ${s.agp}`,
    `Kotlin ${s.kotlin}`,
    `Gradle ${s.gradle}`,
    `compileSdk ${s.compileSdk}`,
    `targetSdk ${s.targetSdk}`,
    `minSdk ${s.minSdk}`,
    `NDK ${s.ndk}`,
  ];
  const body = parts.join(" · ");
  return channel ? `${channel} · ${body}` : body;
}
```

- [ ] **Step 5: Fix all `loadSnapshot` call sites to pass a channel**

Update every call:

- `src/commands/create.ts` — use `inputs.stackChannel` (temporarily hardcode `"bleeding-edge"` only if Task 3 not done yet; prefer doing Task 1 call sites with `"stable"` default in create until Task 3 adds the field — see Step 5b).

**Step 5b — temporary create.ts until Task 3:**

If `CreateInputs` does not yet have `stackChannel`, update `runCreate` to:

```ts
const snap = await loadSnapshot(repoRoot, "stable");
```

and update `src/cli.ts` `--stack` handler to print both channels (see Task 4). For this task only, minimal fix:

```ts
// cli.ts stack branch
const stable = await loadSnapshot(repoRoot, "stable");
const edge = await loadSnapshot(repoRoot, "bleeding-edge");
log(`stable: ${formatSnapshotBanner(stable)}`);
log(`bleeding-edge: ${formatSnapshotBanner(edge)}`);
```

Update `tests/integration-render.test.ts`:

```ts
const snap = await loadSnapshot(repoRoot, "stable");
```

(both single and multi describes).

Update `tests/create.test.ts` only after Task 3 adds `stackChannel` to inputs — for now if create still compiles with hardcoded channel inside `runCreate`, leave create tests as-is.

- [ ] **Step 6: Update check-snapshot to require both files**

In `scripts/check-snapshot.ts`, after placeholder walk, add:

```ts
async function checkSnapshots(): Promise<string[]> {
  const errors: string[] = [];
  const required = [
    "agp", "kotlin", "gradle", "compileSdk", "targetSdk", "minSdk",
    "ndk", "composeBom", "hilt",
  ] as const;
  for (const channel of ["stable", "bleeding-edge"] as const) {
    const path = join(ROOT, "stack", `${channel}.json`);
    try {
      const raw = await readFile(path, "utf8");
      const snap = JSON.parse(raw) as Record<string, unknown>;
      for (const k of required) {
        if (snap[k] === undefined || snap[k] === null || snap[k] === "") {
          errors.push(`${path}: missing or empty key ${k}`);
        }
      }
    } catch (e) {
      errors.push(`${path}: ${(e as Error).message}`);
    }
  }
  return errors;
}
```

Call `errors.push(...(await checkSnapshots()))` in `main` before exit.

- [ ] **Step 7: Run tests**

```sh
bun test tests/stack-snapshot.test.ts tests/integration-render.test.ts
bun run scripts/check-snapshot.ts
```

Expected: PASS / `check-snapshot: OK`

- [ ] **Step 8: Commit**

```bash
git add stack/ src/stack/snapshot.ts src/commands/create.ts src/cli.ts \
  scripts/check-snapshot.ts tests/stack-snapshot.test.ts tests/integration-render.test.ts
git add -u stack/snapshot.json
git commit -m "feat(stack): dual stable and bleeding-edge snapshots"
```

---

### Task 2: CLI flags for stack channel and agents

**Files:**
- Modify: `src/cli-args.ts`
- Modify: `tests/cli-args.test.ts`

- [ ] **Step 1: Write failing flag tests**

Append to `tests/cli-args.test.ts`:

```ts
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
```

- [ ] **Step 2: Run tests — expect fail**

```sh
bun test tests/cli-args.test.ts
```

Expected: FAIL on unknown flag / missing properties.

- [ ] **Step 3: Extend Flags and parseArgs**

Update `src/cli-args.ts`:

```ts
export type Flags = {
  name?: string;
  package?: string;
  arch?: "multi" | "single";
  stackChannel?: "stable" | "bleeding-edge";
  withAgents?: boolean;
  noAgents?: boolean;
  stack?: boolean;
  version?: boolean;
  help?: boolean;
  force?: boolean;
  dryRun?: boolean;
  noInstall?: boolean;
};
```

In the `--` branch, treat boolean flags including new ones:

```ts
if (
  rawKey === "stack" ||
  rawKey === "version" ||
  rawKey === "help" ||
  rawKey === "force" ||
  rawKey === "dry-run" ||
  rawKey === "no-install" ||
  rawKey === "with-agents" ||
  rawKey === "no-agents"
) {
  if (inlineVal !== undefined) return { ok: false, error: `flag --${rawKey} does not accept a value` };
  if (rawKey === "dry-run") flags.dryRun = true;
  else if (rawKey === "no-install") flags.noInstall = true;
  else if (rawKey === "with-agents") flags.withAgents = true;
  else if (rawKey === "no-agents") flags.noAgents = true;
  else (flags as Record<string, unknown>)[rawKey] = true;
  i++;
  continue;
}
```

For valued flags, accept `stack-channel` (map to `stackChannel`):

```ts
if (rawKey === "stack-channel") {
  let value: string | undefined = inlineVal;
  if (value === undefined) {
    value = argv[i + 1];
    if (value === undefined) return { ok: false, error: `flag --stack-channel requires a value` };
    if (value.startsWith("-")) return { ok: false, error: `flag --stack-channel requires a value (got ${value})` };
    i++;
  }
  if (value !== "stable" && value !== "bleeding-edge") {
    return { ok: false, error: `--stack-channel must be "stable" or "bleeding-edge"` };
  }
  flags.stackChannel = value;
  i++;
  continue;
}

if (key === "name" || key === "package" || key === "arch") {
  // existing
}
```

Before success return:

```ts
if (flags.withAgents && flags.noAgents) {
  return { ok: false, error: "flags --with-agents and --no-agents are mutually exclusive" };
}
if (flags.arch && flags.arch !== "multi" && flags.arch !== "single") {
  return { ok: false, error: `--arch must be "multi" or "single"` };
}
return { ok: true, value: { projectDir, flags } };
```

- [ ] **Step 4: Run tests — expect pass**

```sh
bun test tests/cli-args.test.ts
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/cli-args.ts tests/cli-args.test.ts
git commit -m "feat(cli): add stack-channel and agents flags"
```

---

### Task 3: Prompts + create wiring for channel and agents flag

**Files:**
- Modify: `src/prompts.ts`
- Modify: `src/commands/create.ts`
- Modify: `src/cli.ts`
- Modify: `tests/prompts.test.ts`
- Modify: `tests/create.test.ts`

- [ ] **Step 1: Update prompt types and tests**

`InteractiveAnswers` becomes:

```ts
export type InteractiveAnswers = {
  projectDir: string;
  name: string;
  package: string;
  arch: "multi" | "single";
  stackChannel: "stable" | "bleeding-edge";
  withAgents: boolean;
};
```

`CollectOpts.provided` is `Partial<InteractiveAnswers>` but `withAgents` may also come from flags separately — keep as partial of answers.

Rewrite `tests/prompts.test.ts`:

```ts
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
```

- [ ] **Step 2: Run prompt tests — expect fail**

```sh
bun test tests/prompts.test.ts
```

Expected: FAIL (missing fields / defaults).

- [ ] **Step 3: Implement prompts**

Update `src/prompts.ts` to import `confirm` from `@clack/prompts` and implement:

```ts
import { text, select, confirm, isCancel } from "@clack/prompts";
import { resolve } from "node:path";

export type InteractiveAnswers = {
  projectDir: string;
  name: string;
  package: string;
  arch: "multi" | "single";
  stackChannel: "stable" | "bleeding-edge";
  withAgents: boolean;
};

export type CollectOpts = {
  provided: Partial<InteractiveAnswers>;
  isTTY: boolean;
  cwd?: string;
};

export async function collectInteractiveInputs(
  opts: CollectOpts,
): Promise<InteractiveAnswers> {
  const { provided, isTTY } = opts;
  const cwd = opts.cwd ?? process.cwd();

  const missingCore: string[] = [];
  if (provided.projectDir === undefined) missingCore.push("projectDir");
  if (provided.name === undefined) missingCore.push("--name");
  if (provided.package === undefined) missingCore.push("--package");
  if (provided.arch === undefined) missingCore.push("--arch");

  if (missingCore.length > 0) {
    if (!isTTY) {
      throw new Error(
        `Missing required input: ${missingCore.join(", ")}. Re-run in a TTY or pass them as flags.`,
      );
    }
    // existing projectDir / name / package / arch prompt blocks (unchanged logic)
    if (provided.projectDir === undefined) {
      const def = "./" + (provided.name ?? "MyApp");
      const v = await text({ message: "Where should we create the project?", defaultValue: def });
      if (isCancel(v)) throw new Error("aborted");
      provided.projectDir = v as string;
    }
    if (provided.name === undefined) {
      const defaultName = provided.projectDir!.split("/").filter(Boolean).pop() ?? "MyApp";
      const pascal = defaultName.charAt(0).toUpperCase() + defaultName.slice(1);
      const v = await text({ message: "App name?", defaultValue: pascal });
      if (isCancel(v)) throw new Error("aborted");
      provided.name = v as string;
    }
    if (provided.package === undefined) {
      const guess = "com.example." + (provided.name!.toLowerCase().replace(/[^a-z0-9]/g, ""));
      const v = await text({ message: "Android application id?", defaultValue: guess });
      if (isCancel(v)) throw new Error("aborted");
      provided.package = v as string;
    }
    if (provided.arch === undefined) {
      const v = await select({
        message: "Architecture?",
        options: [
          { value: "multi", label: "multi", hint: "NowInAndroid-style multi-module project" },
          { value: "single", label: "single", hint: "Single module with feature folders" },
        ],
      });
      if (isCancel(v)) throw new Error("aborted");
      provided.arch = v as "multi" | "single";
    }
  }

  // Channel + agents: independent of core flags
  if (provided.stackChannel === undefined) {
    if (!isTTY) {
      provided.stackChannel = "stable";
    } else {
      const v = await select({
        message: "Stack channel?",
        options: [
          { value: "stable", label: "stable", hint: "production-safe pins" },
          { value: "bleeding-edge", label: "bleeding-edge", hint: "latest edge pins" },
        ],
        initialValue: "stable",
      });
      if (isCancel(v)) throw new Error("aborted");
      provided.stackChannel = v as "stable" | "bleeding-edge";
    }
  }

  if (provided.withAgents === undefined) {
    if (!isTTY) {
      provided.withAgents = false;
    } else {
      const v = await confirm({
        message: "Install Android agent skills into .agents/skills?",
        initialValue: false,
      });
      if (isCancel(v)) throw new Error("aborted");
      provided.withAgents = Boolean(v);
    }
  }

  const projectDir = resolve(cwd, provided.projectDir!);
  return {
    projectDir,
    name: provided.name!,
    package: provided.package!,
    arch: provided.arch!,
    stackChannel: provided.stackChannel!,
    withAgents: provided.withAgents!,
  };
}
```

- [ ] **Step 4: Extend CreateInputs and runCreate**

In `src/commands/create.ts`:

```ts
export type CreateInputs = {
  projectDir: string;
  name: string;
  package: string;
  arch: "multi" | "single";
  stackChannel: "stable" | "bleeding-edge";
  withAgents: boolean;
};
```

Change load + banner:

```ts
const snap = await loadSnapshot(repoRoot, inputs.stackChannel);
// ...
header(`Stack: ${formatSnapshotBanner(snap, inputs.stackChannel)}`);
```

(Agents copy is Task 5 — for now ignore `withAgents` or no-op.)

- [ ] **Step 5: Wire cli.ts**

Update USAGE:

```ts
const USAGE = `Usage: create-android [projectDir] [flags]

Flags:
  -n, --name <string>       App name
  -p, --package <string>    Android application id (e.g. com.example.app)
  -a, --arch <multi|single> Project shape
      --stack-channel <stable|bleeding-edge>
                            Stack pins (default: stable)
      --with-agents         Install Android agent skills under .agents/skills
      --no-agents           Skip agent skills (default when non-interactive)
      --stack               Print pinned stack snapshot(s) and exit
  -v, --version             Print scaffolder version and exit
  -h, --help                Print this message and exit
      --force               Overwrite a non-empty target directory
      --dry-run             Render to a temp dir, print summary, do not write
      --no-install          Skip the "Next steps" printout
`;
```

`--stack` branch:

```ts
if (flags.stack) {
  const repoRoot = repoRootFromHere();
  if (flags.stackChannel) {
    const snap = await loadSnapshot(repoRoot, flags.stackChannel);
    log(formatSnapshotBanner(snap, flags.stackChannel));
  } else {
    for (const ch of ["stable", "bleeding-edge"] as const) {
      const snap = await loadSnapshot(repoRoot, ch);
      log(`${ch}: ${formatSnapshotBanner(snap)}`);
    }
  }
  return 0;
}
```

Pass into `collectInteractiveInputs`:

```ts
const withAgentsProvided =
  flags.withAgents === true ? true : flags.noAgents === true ? false : undefined;

inputs = await collectInteractiveInputs({
  provided: {
    projectDir: projectDir,
    name: flags.name,
    package: flags.package,
    arch: flags.arch,
    stackChannel: flags.stackChannel,
    withAgents: withAgentsProvided,
  },
  isTTY,
});
```

`runCreate` receives full `inputs` (including `stackChannel` and `withAgents`).

- [ ] **Step 6: Update create tests**

Every `inputs: { ... }` in `tests/create.test.ts` must include:

```ts
stackChannel: "stable",
withAgents: false,
```

- [ ] **Step 7: Run tests**

```sh
bun test tests/prompts.test.ts tests/create.test.ts tests/cli-args.test.ts tests/stack-snapshot.test.ts
```

Expected: PASS

- [ ] **Step 8: Commit**

```bash
git add src/prompts.ts src/commands/create.ts src/cli.ts tests/prompts.test.ts tests/create.test.ts
git commit -m "feat: wire stack channel and agents prompts into create"
```

---

### Task 4: Expanded Android `.gitignore`

**Files:**
- Modify: `templates/multi/__name__/.gitignore`
- Modify: `templates/single/__name__/.gitignore`
- Modify: `tests/create.test.ts` (assert gitignore content)

- [ ] **Step 1: Add failing assertion in create test**

In `tests/create.test.ts` single-arch scaffold test, after success:

```ts
const gi = await readFile(join(out, "Demo", ".gitignore"), "utf8");
expect(gi).toContain("local.properties");
expect(gi).toContain("*.apk");
expect(gi).toContain(".cxx/");
expect(gi).toContain("!keystore/test.jks");
```

- [ ] **Step 2: Run test — expect fail** if current gitignore lacks markers

```sh
bun test tests/create.test.ts
```

- [ ] **Step 3: Write identical content to both template gitignores**

```
# Gradle
.gradle/
build/
**/build/

# Local config
local.properties

# Android Studio / IntelliJ
.idea/
*.iml
*.ipr
*.iws
.navigation/
captures/
.externalNativeBuild/
.cxx/
*.hprof
*.apk
*.aab
*.ap_
*.dex

# Keystores (keep test keystore trackable)
*.jks
*.keystore
!keystore/test.jks

# OS
.DS_Store
Thumbs.db

# Kotlin / misc
*.class
*.log
.kotlin/
```

- [ ] **Step 4: Run test — expect pass**

```sh
bun test tests/create.test.ts
```

- [ ] **Step 5: Commit**

```bash
git add templates/multi/__name__/.gitignore templates/single/__name__/.gitignore tests/create.test.ts
git commit -m "feat(templates): expand Android gitignore for multi and single"
```

---

### Task 5: Vendor agent skills + copy on scaffold

**Files:**
- Create: `assets/agents/skills/android-development/**` (copy)
- Create: `assets/agents/skills/android-kotlin-compose/**` (copy)
- Create: `assets/agents/skills/modern-jetpack-compose/**` (copy)
- Create: `src/scaffold/copy-agents.ts`
- Modify: `src/commands/create.ts`
- Modify: `package.json` (`files` includes `assets`)
- Modify: `tests/create.test.ts`

- [ ] **Step 1: Write failing create tests for agents**

Append to `tests/create.test.ts`:

```ts
  test("withAgents copies all three skills under .agents/skills", async () => {
    const out = join(cwd, "AgentsApp");
    const res = await runCreate({
      repoRoot,
      inputs: {
        projectDir: out,
        name: "AgentsApp",
        package: "com.example.agents",
        arch: "single",
        stackChannel: "stable",
        withAgents: true,
      },
      isTTY: false,
      noInstall: true,
    });
    expect(res.exitCode).toBe(0);
    for (const skill of [
      "android-development",
      "android-kotlin-compose",
      "modern-jetpack-compose",
    ]) {
      const skillMd = join(out, "AgentsApp", ".agents", "skills", skill, "SKILL.md");
      const st = await stat(skillMd);
      expect(st.isFile()).toBe(true);
    }
  });

  test("withAgents false does not create .agents", async () => {
    const out = join(cwd, "NoAgents");
    const res = await runCreate({
      repoRoot,
      inputs: {
        projectDir: out,
        name: "NoAgents",
        package: "com.example.noagents",
        arch: "single",
        stackChannel: "stable",
        withAgents: false,
      },
      isTTY: false,
      noInstall: true,
    });
    expect(res.exitCode).toBe(0);
    await expect(stat(join(out, "NoAgents", ".agents"))).rejects.toBeDefined();
  });
```

- [ ] **Step 2: Run tests — expect fail**

```sh
bun test tests/create.test.ts
```

Expected: FAIL missing skills / `.agents`.

- [ ] **Step 3: Vendor skills into the repo**

```sh
mkdir -p assets/agents/skills
cp -a /home/flux/.agents/skills/android-development assets/agents/skills/
cp -a /home/flux/.agents/skills/android-kotlin-compose assets/agents/skills/
cp -a /home/flux/.agents/skills/modern-jetpack-compose assets/agents/skills/
# Drop huge binary noise if any (none expected). Verify SKILL.md exists:
test -f assets/agents/skills/android-development/SKILL.md
test -f assets/agents/skills/android-kotlin-compose/SKILL.md
test -f assets/agents/skills/modern-jetpack-compose/SKILL.md
```

If the implementer machine has skills at a different path, use the paths from the design session environment or re-fetch the same three skill packages. Do **not** read skills at runtime from home.

- [ ] **Step 4: Implement `src/scaffold/copy-agents.ts`**

```ts
import { readdir, readFile, stat } from "node:fs/promises";
import { join } from "node:path";
import { writeBinaryFile, writeFile, ensureDir } from "./write";

export async function copyAgentsSkills(opts: {
  skillsRoot: string;
  destSkillsDir: string;
}): Promise<void> {
  const { skillsRoot, destSkillsDir } = opts;
  await ensureDir(destSkillsDir);
  await copyTree(skillsRoot, destSkillsDir);
}

async function copyTree(srcDir: string, destDir: string): Promise<void> {
  await ensureDir(destDir);
  for (const name of await readdir(srcDir)) {
    if (name === ".DS_Store" || name === ".git") continue;
    const from = join(srcDir, name);
    const to = join(destDir, name);
    const s = await stat(from);
    if (s.isDirectory()) {
      await copyTree(from, to);
    } else {
      const buf = await readFile(from);
      // Treat as binary if NUL present; otherwise write as utf8 text
      let binary = false;
      const sample = buf.subarray(0, Math.min(buf.length, 8192));
      for (let i = 0; i < sample.length; i++) {
        if (sample[i] === 0) {
          binary = true;
          break;
        }
      }
      if (binary) await writeBinaryFile(to, buf);
      else await writeFile(to, buf.toString("utf8"));
    }
  }
}
```

- [ ] **Step 5: Call copy from runCreate after render**

In `src/commands/create.ts` after `renderTemplate(...)`:

```ts
import { copyAgentsSkills } from "../scaffold/copy-agents";

// after successful renderTemplate:
if (inputs.withAgents) {
  const skillsRoot = join(repoRoot, "assets", "agents", "skills");
  try {
    await stat(skillsRoot);
  } catch {
    err(`agent skills missing at ${skillsRoot}; reinstall create-android`);
    return { exitCode: 1, stdout: "", stderr: "missing agents assets" };
  }
  const dest = join(targetDir, inputs.name, ".agents", "skills");
  await copyAgentsSkills({ skillsRoot, destSkillsDir: dest });
  ok(`Installed agent skills → ${inputs.name}/.agents/skills`);
}
```

On dry-run, do not copy (existing early return already skips writes).

- [ ] **Step 6: package.json files array**

```json
"files": ["bin", "templates", "stack", "assets", "README.md", "LICENSE"],
```

Do **not** bump version here (Task 6).

- [ ] **Step 7: Run tests**

```sh
bun test tests/create.test.ts
```

Expected: PASS

- [ ] **Step 8: Commit**

```bash
git add assets/agents/skills src/scaffold/copy-agents.ts src/commands/create.ts \
  package.json tests/create.test.ts
git commit -m "feat: optional Android agent skills install into .agents/skills"
```

---

### Task 6: Version bump + README + CHANGELOG

**Files:**
- Modify: `package.json` (`version`: `0.2.0`)
- Modify: `README.md`
- Modify: `CHANGELOG.md`

- [ ] **Step 1: Bump package version**

In `package.json`:

```json
"version": "0.2.0",
```

Leave platform `optionalDependencies` as `0.0.0-dev` (publish script rewrites on release).

- [ ] **Step 2: Update CHANGELOG.md**

```md
# Changelog

All notable changes to `create-android` are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/),
and this project adheres to [Semantic Versioning](https://semver.org/).

## [Unreleased]

## [0.2.0] - 2026-07-16

### Added
- `--stack-channel=stable|bleeding-edge` with dual stack snapshots (`stack/stable.json`, `stack/bleeding-edge.json`).
- Optional Android agent skills via TTY confirm / `--with-agents` / `--no-agents` (installs under `.agents/skills/`).
- Expanded Android `.gitignore` in multi and single templates.

### Changed
- Default stack channel is `stable`.
- Replaced `stack/snapshot.json` with channel-specific snapshot files.
- README examples pin `create-android@0.2.0`.

## [0.1.0]

### Added
- Initial scaffolder with `multi` and `single` arch templates.
- Pinned stack snapshot: AGP 9.1.1, Kotlin 2.4.0, Gradle 9.5.1, compileSdk 37, NDK 29.0.14206865.
- Per-platform Bun-compiled binaries (darwin-arm64/x64, linux-x64/arm64, windows-x64).
- Node 18+ shim in the main package that dispatches to the matching optional dep.
```

- [ ] **Step 3: Update README.md**

Key edits (apply throughout the file):

1. Quick start:

```sh
npx create-android@0.2.0 my-app
```

2. Flags table — add:

| Flag | Description |
|---|---|
| `--stack-channel <stable\|bleeding-edge>` | Stack pins. Default: `stable`. |
| `--with-agents` | Install Android agent skills into `.agents/skills/`. |
| `--no-agents` | Skip agent skills (default when non-interactive). |

3. Replace single pinned stack table with both channels using actual numbers from the JSON files:

| Channel | AGP | Kotlin | Gradle | compileSdk |
|---|---|---|---|---|
| stable | 9.0.0 | 2.2.10 | 9.0.0 | 35 |
| bleeding-edge | 9.1.1 | 2.4.0 | 9.5.1 | 37 |

4. Agents section — non-interactive example:

```sh
npx create-android@0.2.0 /path/to/project \
  --name=MyApp \
  --package=com.example.myapp \
  --arch=single \
  --stack-channel=stable \
  --with-agents \
  --no-install
```

5. Document that `--with-agents` installs:

- `android-development`
- `android-kotlin-compose`
- `modern-jetpack-compose`

into `<app>/.agents/skills/`.

6. Publish section: tag example `v0.2.0`.

- [ ] **Step 4: Commit**

```bash
git add package.json README.md CHANGELOG.md
git commit -m "docs: release notes and README for create-android 0.2.0"
```

---

### Task 7: Full verification

**Files:** none new (fixes only if green fails)

- [ ] **Step 1: Run full check**

```sh
bun test
bun run scripts/check-snapshot.ts
bun run typecheck
```

Expected: all PASS / OK / no TS errors.

- [ ] **Step 2: Smoke scaffold both channels**

```sh
rm -rf /tmp/ca-stable /tmp/ca-edge
bun run src/cli.ts /tmp/ca-stable --name=StableApp --package=com.example.stable --arch=single --stack-channel=stable --with-agents --no-install
bun run src/cli.ts /tmp/ca-edge --name=EdgeApp --package=com.example.edge --arch=multi --stack-channel=bleeding-edge --no-agents --no-install
test -f /tmp/ca-stable/StableApp/.agents/skills/android-kotlin-compose/SKILL.md
test -f /tmp/ca-stable/StableApp/.gitignore
grep -q '9.0.0\|compileSdk = 35' /tmp/ca-stable/StableApp/app/build.gradle.kts || true
# multi uses version catalog:
grep -q '9.1.1\|{{' /tmp/ca-edge/EdgeApp/gradle/libs.versions.toml
# after render tokens should be substituted:
grep '9.1.1' /tmp/ca-edge/EdgeApp/gradle/libs.versions.toml
test ! -e /tmp/ca-edge/EdgeApp/.agents
bun run src/cli.ts --stack
```

Expected: exit 0; skills only on stable run; both channels print from `--stack`.

- [ ] **Step 3: Fix any failures, re-run Step 1–2**

- [ ] **Step 4: Final commit if fixes needed**

```bash
git add -A
git status
# only if there are fix files:
git commit -m "fix: address v0.2.0 verification failures"
```

---

## Spec coverage checklist

| Spec requirement | Task |
|---|---|
| Dual stack JSON files | Task 1 |
| Remove `snapshot.json` | Task 1 |
| Channel-aware `loadSnapshot` / banner | Task 1 |
| `check-snapshot` both files | Task 1 |
| `--stack-channel` | Task 2 |
| `--with-agents` / `--no-agents` + mutex | Task 2 |
| TTY prompts independent of core flags | Task 3 |
| Non-TTY defaults stable / no agents | Task 3 |
| `--stack` both channels | Task 3 |
| Expanded gitignore both arches | Task 4 |
| Vendor 3 skills under `assets/agents/skills` | Task 5 |
| Copy to `.agents/skills` when enabled | Task 5 |
| package `files` includes assets | Task 5 |
| Version 0.2.0 + README + CHANGELOG | Task 6 |
| Full test + smoke | Task 7 |

## Self-review notes

- No TBD steps; stable pin numbers are fixed in the File map (adjust only if build-incompatible).
- `CreateInputs` and `InteractiveAnswers` use the same field names (`stackChannel`, `withAgents`) across tasks.
- Agents copy is Task 5 so Task 3 can ship channel wiring first without requiring assets.
- Skill source path uses the design machine location; alternate machines must supply the same three skills.
