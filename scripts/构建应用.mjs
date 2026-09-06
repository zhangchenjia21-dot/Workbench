import { build } from "esbuild";
import { mkdirSync, writeFileSync } from "node:fs";
mkdirSync("dist", { recursive: true });
await build({
  entryPoints: ["src/Bootstrap/桌面入口.ts"],
  bundle: true,
  platform: "node",
  format: "cjs",
  external: ["electron"],
  outfile: "dist/main.cjs",
});
await build({
  entryPoints: ["src/Bootstrap/预加载入口.ts"],
  bundle: true,
  platform: "node",
  format: "cjs",
  external: ["electron"],
  outfile: "dist/preload.cjs",
});
await build({
  entryPoints: ["src/Bootstrap/界面入口.tsx"],
  bundle: true,
  platform: "browser",
  format: "iife",
  outfile: "dist/renderer.js",
  minify: true,
});
writeFileSync(
  "dist/index.html",
  '<!doctype html><html lang="zh-CN"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src \'self\'; script-src \'self\'; style-src \'self\'; img-src \'self\' data:; connect-src \'none\'"><title>Workbench</title><link rel="stylesheet" href="renderer.css"></head><body><div id="root"></div><script src="renderer.js"></script></body></html>',
);
