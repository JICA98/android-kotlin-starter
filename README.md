# `create-android`

Scaffold a new Android project from a versioned, pinned template snapshot.
Works with `npx` and `bunx`.

## Quick start

```sh
npx create-android@0.2.0 my-app
```

Or pin a specific scaffolder version:

```sh
npx create-android@0.2.0 my-app
```

## Flags

| Flag | Description |
|---|---|
| `-n, --name <name>` | App name (PascalCase). |
| `-p, --package <id>` | Android application id (e.g. `com.example.myapp`). |
| `-a, --arch <multi\|single>` | `multi` (NowInAndroid-style) or `single` (single module with feature folders). |
| `--stack-channel <stable\|bleeding-edge>` | Stack pins. Default: `stable`. |
| `--with-agents` | Install Android agent skills into `.agents/skills/`. |
| `--no-agents` | Skip agent skills (default when non-interactive). |
| `--stack` | Print the pinned stack snapshot(s). With `--stack-channel`, print that channel only. |
| `--force` | Overwrite a non-empty target directory. |
| `--dry-run` | Render to a temp dir, print summary, do not write. |
| `--no-install` | Skip the "Next steps" printout (for CI). |

## Pinned stack

Each scaffolder release ships two pinned Android stacks. Run
`npx create-android@0.2.0 --stack` to print both.

| Channel | AGP | Kotlin | Gradle | compileSdk |
|---|---|---|---|---|
| stable | 9.0.0 | 2.2.10 | 9.0.0 | 35 |
| bleeding-edge | 9.1.1 | 2.4.0 | 9.5.1 | 37 |

Default channel is **stable**. Use `--stack-channel=bleeding-edge` for the latest edge pins.

## Agents

### Scaffolding for an AI agent

When an AI agent (Claude, Cursor, Copilot, etc.) is asked to build or set up
an Android project, run the scaffolder with all flags provided to avoid
interactive prompts:

```sh
npx create-android@0.2.0 /path/to/project \
  --name=MyApp \
  --package=com.example.myapp \
  --arch=single \
  --stack-channel=stable \
  --with-agents \
  --no-install
```

### Required flags for non-interactive use

| Flag | Why |
|---|---|
| `--name` | App name (PascalCase). Without it the agent gets a prompt. |
| `--package` | Android application id. Without it the agent gets a prompt. |
| `--arch` | `single` or `multi`. Without it the agent gets a prompt. |
| `--no-install` | Suppresses the "Next steps" printout. |

Optional: `--stack-channel` (defaults to `stable`), `--with-agents` / `--no-agents`
(defaults to no agents when non-interactive).

### Agent skills install

With `--with-agents` (or answering yes to the TTY prompt), the scaffold copies
these skills into `<app>/.agents/skills/`:

- `android-development`
- `android-kotlin-compose`
- `modern-jetpack-compose`

### Typical workflows

**Start a new single-module feature project:**
```sh
npx create-android@0.2.0 my-app \
  --name=MyApp \
  --package=com.mycompany.myapp \
  --arch=single \
  --stack-channel=stable \
  --no-install
```

**Start a multi-module (NowInAndroid-style) project on the edge stack:**
```sh
npx create-android@0.2.0 my-app \
  --name=MyApp \
  --package=com.mycompany.myapp \
  --arch=multi \
  --stack-channel=bleeding-edge \
  --no-install
```

**Add a composable screen to a scaffolded project:**
```sh
# After scaffolding, the project has feature/ modules (multi) or
# app/src/main/kotlin/<packagePath>/feature/ directories (single).
# Add new screens by creating a composable function in the correct
# package and registering it in the navigation graph.
```

### Checking the stack version

```sh
npx create-android@0.2.0 --stack
```

Returns the pinned AGP, Kotlin, Gradle, compileSdk, etc. for both channels —
useful when the agent needs to know the exact versions before writing additional
build logic.

### Notes for agents

- The `--force` flag overwrites non-empty directories (use cautiously).
- The `--dry-run` flag renders to a temp dir and prints a summary without
  writing files — useful for previewing what would be generated.
- After scaffolding, run `./gradlew :app:assembleDebug` to verify the project
  compiles.
- All templates ship with a test keystore so release builds work out of the
  box, but **replace `keystore/test.jks` before publishing to any store**.

## How it works

- The npm package is a tiny Node 18+ shim that dispatches to a per-platform
  Bun-compiled binary via `optionalDependencies`.
- The binary is `bun build --compile` output; it contains the template
  content and the render engine.
- Templates live under `templates/<arch>/__name__/`. Path tokens
  (`__name__`) rename to your app name; content tokens (`{{var}}`) are
  replaced with their values from your inputs plus the pinned stack.
- Stack pins live in `stack/stable.json` and `stack/bleeding-edge.json`.
- Optional agent skills ship under `assets/agents/skills/` and are copied
  into the project when requested.

## Development

```sh
bun install
bun test
bun run scripts/check-snapshot.ts
bun run src/cli.ts /tmp/out \
  --name=Smoke \
  --package=com.example.smoke \
  --arch=multi \
  --stack-channel=stable \
  --with-agents \
  --no-install
```

## Publish

Push a version tag to trigger the CI publish workflow:

```sh
git tag v0.2.0
git push origin v0.2.0
```

The CI workflow builds per-platform binaries, runs tests, and publishes all
packages to npm. The npm token is configured as a repo secret (`NPM_TOKEN`).

## License

MIT.
