// Builds one package from its src/: ESM and CommonJS bundles, type declarations from the
// package's tsconfig.json, and with --global <Name> a minified <script> build exposing window.<Name>.
// Run it from the package directory: node ../../scripts/build-package.mjs [--global Name] [--platform node]
import { execFileSync } from "node:child_process";
import { existsSync, rmSync } from "node:fs";
import { createRequire } from "node:module";
import { build } from "esbuild";

const args = process.argv.slice(2);
const option = (name) => {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : undefined;
};
const globalName = option("--global");
const platform = option("--platform") ?? "neutral";

rmSync("dist", { recursive: true, force: true });

const shared = { entryPoints: ["src/index.ts"], bundle: true, target: "es2020", platform, logLevel: "warning" };
await build({ ...shared, format: "esm", outfile: "dist/index.js" });
await build({ ...shared, format: "cjs", outfile: "dist/index.cjs" });

if (globalName && existsSync("src/global.ts")) {
  await build({
    entryPoints: ["src/global.ts"],
    bundle: true,
    target: "es2020",
    platform: "browser",
    format: "iife",
    globalName,
    minify: true,
    sourcemap: true,
    outfile: "dist/wau-captcha.global.js",
    logLevel: "warning",
  });
}

const tsc = createRequire(import.meta.url).resolve("typescript/bin/tsc");
execFileSync(process.execPath, [tsc, "-p", "tsconfig.json"], { stdio: "inherit" });
