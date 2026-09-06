import { readdirSync, readFileSync } from "node:fs";
import { join, resolve, relative } from "node:path";
function files(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? files(join(dir, e.name)) : [join(dir, e.name)],
  );
}
for (const file of files("src").filter((f) => /\.tsx?$/.test(f))) {
  const parts = relative("src", file).split(/[\\/]/);
  for (const match of readFileSync(file, "utf8").matchAll(
    /(?:from\s+|import\s*)['"](\.[^'"]+)['"]/g,
  )) {
    const target = relative(
      resolve("src"),
      resolve(file, "..", match[1]),
    ).split(/[\\/]/);
    if (/^L[0-3]_/.test(parts[1])) {
      if (parts[0] === target[0] && target[1]?.[1] > parts[1][1])
        throw Error(`向上依赖: ${file} -> ${match[1]}`);
      if (
        parts[0] !== target[0] &&
        (!parts[1].startsWith("L3_") || !target[1]?.startsWith("L3_"))
      )
        throw Error(`跨模块内部依赖: ${file} -> ${match[1]}`);
    }
  }
}
console.log("Architecture dependencies PASS");
