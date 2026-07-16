import { describe, expect, test } from "bun:test";
import { loadSnapshot, formatSnapshotBanner } from "../src/stack/snapshot";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");

describe("snapshot", () => {
  test("loadSnapshot reads stable channel", async () => {
    const snap = await loadSnapshot(repoRoot, "stable");
    expect(snap.agp).toBe("9.1.1");
    expect(snap.kotlin).toBe("2.4.0");
    expect(snap.gradle).toBe("9.5.1");
    expect(snap.compileSdk).toBe(35);
    expect(snap.targetSdk).toBe(35);
    expect(snap.minSdk).toBe(24);
    expect(snap.composeBom).toBe("2025.12.01");
    expect(snap.hilt).toBe("2.59.2");
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
      agp: "9.1.1",
      kotlin: "2.4.0",
      gradle: "9.5.1",
      compileSdk: 35,
      targetSdk: 35,
      minSdk: 24,
      ndk: "28.2.13676358",
      composeBom: "2025.12.01",
      hilt: "2.59.2",
    };
    const banner = formatSnapshotBanner(snap, "stable");
    expect(banner.startsWith("stable · ")).toBe(true);
    expect(banner).toContain("AGP 9.1.1");
    expect(banner).toContain("compileSdk 35");
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
