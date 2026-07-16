# `create-android` v0.2.0 — Design

**Date:** 2026-07-16  
**Status:** Approved (pending user spec review)  
**Author:** Brainstorming session  
**Package version:** `0.2.0` (from `0.1.0`)

## 1. Purpose

Ship a minor release of `create-android` that:

1. Supports **two pinned Android stack channels** (`stable` and `bleeding-edge`).
2. Optionally installs **Android agent skills** into the scaffolded project.
3. Ships a **proper Android `.gitignore`** in both template arches.
4. Updates **README** and **CHANGELOG** with `@0.2.0` examples and the new flags.

This release does **not** expand generated app feature code (Navigation, Room, etc.) beyond what templates already include. Focus is stack selection, DX, agent readiness, and docs.

## 2. Goals & non-goals

### Goals

| Goal | Success criteria |
|---|---|
| Dual stack | User can select `stable` or `bleeding-edge`; tokens come from the matching snapshot file |
| Optional agents | Yes/no TTY prompt; `--with-agents` / `--no-agents`; when on, all bundled skills land under `.agents/skills/` |
| Gitignore | Multi + single templates include a full Android-oriented `.gitignore` |
| Docs | README flags, stack table for both channels, agent examples pinned to `create-android@0.2.0` |
| Version | `package.json` and platform packages aligned to `0.2.0` |

### Non-goals

- Multi-select individual skills in this release (all-or-nothing when agents enabled).
- Separate template trees per channel.
- Auto-upgrade of already-scaffolded projects.
- New Android app features (Room, Navigation3 screens, Detekt, etc.).
- Changing the Bun compile / optionalDependencies distribution model.

## 3. High-level decisions

| Decision | Choice | Rationale |
|---|---|---|
| Approach | Dual stack snapshots + single template tree | Tokens already drive versions; avoids duplicated multi/single trees |
| Default channel | `stable` | Safer for first-time and production-minded users |
| Default agents | Off | Skills add package size to the project; opt-in only |
| Agents UX | Yes/no + `--with-agents` / `--no-agents` | Simple; matches user choice for 0.2.0 |
| Skills content | All three Android skills, vendored in-repo | Self-contained `npx` install; no dependency on developer home |
| Skills path in project | `.agents/skills/<skill-name>/` | Matches common agent skill layout |
| `snapshot.json` | Remove; replace with `stable.json` + `bleeding-edge.json` | Clear channel names; no ambiguous “default snapshot” |
| Gitignore | Expand existing files in both arches | Templates already have minimal ignores |

## 4. CLI surface

### New / changed flags

| Flag | Type | Default | Description |
|---|---|---|---|
| `--stack-channel <stable\|bleeding-edge>` | value | `stable` when non-TTY or after prompt default | Which stack snapshot to use |
| `--with-agents` | boolean | unset | Install all bundled agent skills |
| `--no-agents` | boolean | unset | Explicitly skip agent skills |
| `--stack` | boolean | — | Print stack banner(s) and exit |

### `--stack` behavior

- If `--stack-channel` is set: print that channel’s banner only.
- If not set: print both channels, each on its own line, prefixed with the channel name:

```
stable: AGP … · Kotlin … · …
bleeding-edge: AGP … · Kotlin … · …
```

### Mutual exclusion

- `--with-agents` and `--no-agents` together → parse error (exit 2).
- Invalid `--stack-channel` value → parse error (exit 2).

### Interactive prompts (TTY only)

Prompt only for values not already set by flags. Core prompts (projectDir, name, package, arch) keep current behavior.

**Channel and agents prompts run independently of whether core flags were all supplied.** Even if the user passes `--name`, `--package`, `--arch`, and a projectDir, a TTY session still asks for stack channel and agents unless those flags were provided.

1. Existing prompts: projectDir, name, package, arch (unchanged rules for when each appears).
2. **Stack channel?** — only if `--stack-channel` absent: select `stable` (hint: production-safe pins) / `bleeding-edge` (hint: latest edge pins). Default: `stable`.
3. **Install Android agent skills?** — only if neither `--with-agents` nor `--no-agents`: confirm yes/no. Default: no.

### Non-interactive (non-TTY)

| Input | Behavior |
|---|---|
| Missing name/package/arch/projectDir | Error (unchanged) |
| Missing `--stack-channel` | Default `stable` |
| Missing agent flags | Default **no** agents |
| `--with-agents` / `--no-agents` | Honored as given |

### Usage text

Update `USAGE` in `src/cli.ts` to document the new flags.

### Agent / CI example

```sh
npx create-android@0.2.0 my-app \
  --name=MyApp \
  --package=com.example.myapp \
  --arch=single \
  --stack-channel=stable \
  --with-agents \
  --no-install
```

## 5. Stack snapshots

### Layout

```
stack/
  stable.json
  bleeding-edge.json
```

Remove `stack/snapshot.json`. All loaders and tests reference channel files.

### Schema (unchanged fields)

```json
{
  "agp": "string",
  "kotlin": "string",
  "gradle": "string",
  "compileSdk": 0,
  "targetSdk": 0,
  "minSdk": 0,
  "ndk": "string",
  "composeBom": "string",
  "hilt": "string",
  "notes": "optional string"
}
```

### Channel policy

| Channel | Policy |
|---|---|
| `bleeding-edge` | Migrate current `snapshot.json` content as the starting point (AGP 9.1.1, Kotlin 2.4.0, Gradle 9.5.1, compileSdk/targetSdk 37, etc.). May be refreshed at release time if newer edge pins are verified. |
| `stable` | A deliberately conservative, mutually compatible matrix suitable for production starters. Prefer widely adopted stable AGP/Kotlin/Gradle and a fully released `compileSdk`/`targetSdk` (e.g. 35 if that is still the safe default at implement time). Exact numbers chosen during implementation after compatibility check; recorded in the files and README. |

Both files must remain valid for the **same** template tree (same placeholders, same plugin IDs). Templates must not branch on channel.

### Loader API

```ts
export type StackChannel = "stable" | "bleeding-edge";

export async function loadSnapshot(
  repoRoot: string,
  channel: StackChannel,
): Promise<Snapshot>;

export function formatSnapshotBanner(
  s: Snapshot,
  channel?: StackChannel,
): string;
```

Banner when channel is provided:

```
stable · AGP 8.x.x · Kotlin … · …
```

`runCreate` and `--stack` use this API.

### check-snapshot

`scripts/check-snapshot.ts` must:

1. Load both `stable.json` and `bleeding-edge.json`.
2. Assert required keys exist and types are correct on both.
3. Walk templates and ensure every `{{placeholder}}` is in the known key set (unchanged keys).
4. Fail if either snapshot file is missing.

Optional later: assert no hard-coded AGP/Kotlin versions in templates (not required for 0.2.0 if not already present).

## 6. Agent skills

### Source (vendored in this repo)

```
assets/agents/skills/
  android-development/
  android-kotlin-compose/
  modern-jetpack-compose/
```

Each directory is a full skill tree (`SKILL.md` plus references/assets as in the upstream skill). Content is **copied into this repository** at implement time from the available local skill sources, then maintained as part of this package. Runtime does **not** read `~/.agents` or any user machine path.

### Install destination

When agents are enabled, after successful template render:

```
<targetDir>/<name>/.agents/skills/android-development/
<targetDir>/<name>/.agents/skills/android-kotlin-compose/
<targetDir>/<name>/.agents/skills/modern-jetpack-compose/
```

Copy is recursive, binary-safe, **no** `{{token}}` substitution inside skill files.

### Dry-run

`--dry-run` does not write template or agents. Summary may mention whether agents would be installed.

### Package publish

`package.json` `files` array includes `assets` (or the path used for agents) so npm packages ship the skills.

### Size note

Full skill trees increase package size. Acceptable for 0.2.0. If size becomes a problem later, a follow-up may slim to `SKILL.md` + selected references only.

## 7. Gitignore

Update both:

- `templates/multi/__name__/.gitignore`
- `templates/single/__name__/.gitignore`

### Required patterns (minimum)

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

Both arches currently ship `keystore/test.jks`; the `!keystore/test.jks` exception preserves that.

## 8. Data flow

```
argv → parseArgs
     → validate flags (name, package, arch, stack-channel, agents mutex)
     → collectInteractiveInputs (+ channel, withAgents)
     → runCreate
          → loadSnapshot(repoRoot, channel)
          → buildTokens(snapshot, inputs)
          → renderTemplate(templates/<arch>, out, tokens)
          → if withAgents: copyDir(assets/agents/skills → out/<name>/.agents/skills)
          → print success + stack banner (with channel) + optional next steps
```

### Create inputs extension

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

## 9. Error handling

| Case | Exit | Behavior |
|---|---|---|
| Unknown / invalid flag | 2 | Message + usage |
| `--with-agents` + `--no-agents` | 2 | Clear conflict message |
| Invalid `--stack-channel` | 2 | Must be `stable` or `bleeding-edge` |
| Missing required inputs (non-TTY) | 1 | Unchanged |
| Missing snapshot file | 1 | Internal error message |
| Missing agents assets when `--with-agents` | 1 | Fail with message to reinstall package |
| Non-empty target without `--force` | 1 | Unchanged |
| Sensitive projectDir | 1 | Unchanged |

Partial writes: keep current behavior (render then agents). If agents copy fails after template write, exit 1 with error; user may re-run with `--force` or delete target. No transactional rollback required for 0.2.0.

## 10. Testing

| Area | Cases |
|---|---|
| `cli-args` | Parse `--stack-channel`, reject bad values; agents flags; mutex |
| `snapshot` | Load stable and bleeding-edge; missing file throws/fails |
| `create` | Agents on → skill dirs exist; agents off → no `.agents` |
| `create` | Channel selects different token versions when snapshots differ |
| `render` / integration | `.gitignore` present and contains expected markers (e.g. `local.properties`, `*.apk` or `.cxx`) |
| `check-snapshot` | Passes with both JSON files; fails if one missing (unit or script test if practical) |
| Existing tests | Update any path that assumed `stack/snapshot.json` |

## 11. Documentation & versioning

### package.json

- `version`: `0.2.0`
- Platform optionalDependencies versions updated by existing publish scripts as today

### README

- Quick start examples use `npx create-android@0.2.0` (and unscoped name as today).
- Flags table includes `--stack-channel`, `--with-agents`, `--no-agents`.
- Pinned stack table shows both channels (or two tables).
- Agents section documents opt-in and destination path.
- Non-interactive agent workflow example includes new flags.

### CHANGELOG

Move unreleased notes appropriately; add:

```md
## [0.2.0] - 2026-07-16

### Added
- `--stack-channel=stable|bleeding-edge` with dual stack snapshots.
- Optional Android agent skills via TTY confirm / `--with-agents` / `--no-agents`.
- Expanded Android `.gitignore` in multi and single templates.

### Changed
- Default stack channel is `stable`.
- `stack/snapshot.json` replaced by `stack/stable.json` and `stack/bleeding-edge.json`.
- README examples pin `create-android@0.2.0`.
```

### package platform packages

No API change beyond version bump on publish.

## 12. Files to touch (implementation map)

| Path | Action |
|---|---|
| `package.json` | Version `0.2.0`; ensure `files` includes agents assets |
| `stack/stable.json` | Create |
| `stack/bleeding-edge.json` | Create (from current snapshot) |
| `stack/snapshot.json` | Delete |
| `src/stack/snapshot.ts` | Channel-aware load + banner |
| `src/cli-args.ts` | New flags |
| `src/cli.ts` | USAGE, wiring, `--stack` both channels |
| `src/prompts.ts` | Channel select + agents confirm |
| `src/commands/create.ts` | Channel + agents copy |
| `src/scaffold/` (new helper if needed) | `copyAgents` or generic copyDir |
| `templates/*/__name__/.gitignore` | Expand |
| `assets/agents/skills/**` | Vendor three skills |
| `scripts/check-snapshot.ts` | Both snapshots |
| `tests/**` | Update + new cases |
| `README.md`, `CHANGELOG.md` | Docs for 0.2.0 |

## 13. Implementation order (guidance for plan)

1. Dual stack files + snapshot loader + check-snapshot + tests.
2. CLI flags + prompts + create wiring for channel.
3. Expand gitignore + tests.
4. Vendor skills + agents copy path + tests.
5. Version bump + README + CHANGELOG.
6. Full `bun test` + `check-snapshot` + dry-run smoke scaffold.

## 14. Open implementation details (resolved policy, numbers later)

- Exact **stable** version numbers are chosen during implementation after verifying a compatible AGP/Kotlin/Gradle/Compose BOM/Hilt matrix; they are written into `stable.json` and the README table in the same PR.
- **bleeding-edge** starts as a copy of today’s `snapshot.json` unless a quick verification finds a safer edge refresh.
- Skill vendoring: copy from local available skills (`android-development`, `android-kotlin-compose`, `modern-jetpack-compose`); do not rewrite skill content except if absolute paths or machine-specific content must be stripped (none expected).
