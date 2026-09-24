// Builds one package from its src/: ESM and CommonJS bundles that import their dependencies,
// type declarations from the package's tsconfig.json, and with --global <Name> a minified
// <script> build exposing window.<Name>. With --client-entry <name>, src/<name>.tsx, which starts
// with "use client", becomes a bundle of its own that index imports: React Server Components can
// then use the constants of index while the component renders on the client. Run it from the package
// directory: node ../../scripts/build-package.mjs [--global Name] [--platform node] [--client-entry name]
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
const clientEntry = option("--client-entry");

rmSync("dist", { recursive: true, force: true });

const shared = { bundle: true, packages: "external", target: "es2020", platform, logLevel: "warning" };
for (const [format, extension] of [["esm", ".js"], ["cjs", ".cjs"]]) {
  // index keeps importing the client entry, from the bundle of the same format.
  const importClientEntry = {
    name: "client-entry",
    setup(builder) {
      builder.onResolve({ filter: new RegExp(String.raw`^\./${clientEntry}\.js$`) }, () => ({ path: `./${clientEntry}${extension}`, external: true }));
    },
  };
  await build({
    ...shared,
    entryPoints: ["src/index.ts"],
    format,
    outfile: `dist/index${extension}`,
    plugins: clientEntry ? [importClientEntry] : [],
  });
  if (clientEntry) {
    await build({
      ...shared,
      entryPoints: [`src/${clientEntry}.tsx`],
      format,
      outfile: `dist/${clientEntry}${extension}`,
    });
  }
}

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
