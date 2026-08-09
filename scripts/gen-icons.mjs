import sharp from "sharp";
import { readFileSync } from "fs";

const svg = readFileSync("public/icon.svg");

const maskableSvg = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#2c2138"/>
      <stop offset="50%" stop-color="#4b3560"/>
      <stop offset="100%" stop-color="#5b3b6e"/>
    </linearGradient>
    <linearGradient id="accent" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#b9895a"/>
      <stop offset="100%" stop-color="#d4a96a"/>
    </linearGradient>
  </defs>
  <rect width="512" height="512" fill="url(#bg)"/>
  <text x="256" y="290" text-anchor="middle" font-family="Georgia,serif" font-size="160" font-weight="bold" fill="url(#accent)">RG</text>
  <rect x="156" y="340" width="200" height="4" rx="2" fill="url(#accent)" opacity="0.6"/>
</svg>`);

const sizes = [192, 512];

for (const size of sizes) {
  await sharp(svg).resize(size, size).png().toFile(`public/icon-${size}.png`);
  await sharp(maskableSvg).resize(size, size).png().toFile(`public/icon-maskable-${size}.png`);
  console.log(`Generated ${size}x${size} icons`);
}

await sharp(svg).resize(180, 180).png().toFile("public/apple-touch-icon.png");
console.log("Generated apple-touch-icon.png (180x180)");

await sharp(svg).resize(32, 32).png().toFile("public/favicon-32x32.png");
await sharp(svg).resize(16, 16).png().toFile("public/favicon-16x16.png");
console.log("Generated favicons");
