#!/usr/bin/env bun
import { readFile, readdir, stat } from "node:fs/promises";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

const KNOWN_KEYS = new Set([
  "name", "package", "packagePath", "packageNamespace", "packageName",
  "agp", "kotlin", "gradle", "compileSdk", "targetSdk", "minSdk", "ndk", "composeBom", "hilt",
]);

const PLACEHOLDER_RE = /\{\{(\w+)\}\}/g;

async function walk(dir: string): Promise<string[]> {
  const out: string[] = [];
  async function visit(d: string) {
    const entries = await readdir(d);
    for (const e of entries) {
      const abs = join(d, e);
      const s = await stat(abs);
      if (s.isDirectory()) await visit(abs);
      else out.push(abs);
    }
  }
  await visit(dir);
  return out;
}

async function checkArch(arch: "single" | "multi"): Promise<string[]> {
  const errors: string[] = [];
  const archRoot = join(ROOT, "templates", arch);
  const nameDir = join(archRoot, "__name__");
  const files = await walk(nameDir);
  for (const f of files) {
    const text = await readFile(f, "utf8");
    const matches = [...text.matchAll(PLACEHOLDER_RE)];
    if (matches.length === 0) continue;
    for (const m of matches) {
      const key = m[1]!;
      if (!KNOWN_KEYS.has(key)) {
        errors.push(`${f}: unknown placeholder {{${key}}}`);
      }
    }
  }
  return errors;
}

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

async function main() {
  const errors: string[] = [];
  for (const arch of ["single", "multi"] as const) {
    errors.push(...(await checkArch(arch)));
  }
  errors.push(...(await checkSnapshots()));
  if (errors.length > 0) {
    console.error("check-snapshot failed:");
    for (const e of errors) console.error(`  - ${e}`);
    process.exit(1);
  }
  console.log("check-snapshot: OK");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
