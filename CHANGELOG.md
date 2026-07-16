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
- CI `render-smoke` matrix runs both `stable` and `bleeding-edge` stack channels.
- Stable pins use AGP 9–compatible tooling (Hilt 2.59.2+) with compileSdk/targetSdk 35.

## [0.1.0]

### Added
- Initial scaffolder with `multi` and `single` arch templates.
- Pinned stack snapshot: AGP 9.1.1, Kotlin 2.4.0, Gradle 9.5.1, compileSdk 37, NDK 29.0.14206865.
- Per-platform Bun-compiled binaries (darwin-arm64/x64, linux-x64/arm64, windows-x64).
- Node 18+ shim in the main package that dispatches to the matching optional dep.
