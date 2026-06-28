// Convert the AWS-proof SVGs to PNG (Devpost image uploads accept PNG, not always SVG).
import sharp from "sharp";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const dir = dirname(fileURLToPath(import.meta.url));
const pairs = [
  ["../docs/aws-proof.svg", "../docs/aws-proof.png"],
  ["../docs/aws-proof-receipts.svg", "../docs/aws-proof-receipts.png"],
];
for (const [s, d] of pairs) {
  const png = await sharp(readFileSync(resolve(dir, s)), { density: 200 }).png().toBuffer();
  writeFileSync(resolve(dir, d), png);
  // also copy into /public so it is URL-accessible on Vercel
  const pub = resolve(dir, "../public", s.split("/").pop().replace(".svg", ".png"));
  mkdirSync(dirname(pub), { recursive: true });
  writeFileSync(pub, png);
  console.log(d, png.length, "bytes (+ public copy)");
}
