// Runs the tests, packages/*/test/*.test.mjs, with node --test. Each test is bundled with esbuild
// first, so it can import the TypeScript sources of its package; nothing else is installed.
//   npm test
import { spawnSync } from "node:child_process";
import { mkdtempSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { build } from "esbuild";

const entryPoints = readdirSync("packages").flatMap((name) => {
  const dir = join("packages", name, "test");
  try {
    return readdirSync(dir).filter((file) => file.endsWith(".test.mjs")).map((file) => join(dir, file));
  } catch {
    return [];
  }
});
if (entryPoints.length === 0) {
  console.error("no tests found in packages/*/test");
  process.exit(1);
}

const outdir = mkdtempSync(join(tmpdir(), "wau-sdk-test-"));
try {
  await build({ entryPoints, outdir, outbase: "packages", bundle: true, platform: "node", format: "esm", target: "node18", logLevel: "warning" });
  const files = entryPoints.map((entry) => join(outdir, entry.slice("packages/".length).replace(/\.mjs$/, ".js")));
  const run = spawnSync(process.execPath, ["--test", ...files], { stdio: "inherit" });
  process.exitCode = run.status ?? 1;
} finally {
  rmSync(outdir, { recursive: true, force: true });
}
