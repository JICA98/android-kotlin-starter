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
