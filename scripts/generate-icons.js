import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

const iconSvgPath = path.resolve('public/icon.svg');
const publicDir = path.resolve('public');

async function generateIcons() {
  const svgBuffer = fs.readFileSync(iconSvgPath);

  // 1. Standard 192x192 PNG
  await sharp(svgBuffer)
    .resize(192, 192)
    .png()
    .toFile(path.join(publicDir, 'icon-192.png'));
  console.log('Generated icon-192.png');

  // 2. Standard 512x512 PNG
  await sharp(svgBuffer)
    .resize(512, 512)
    .png()
    .toFile(path.join(publicDir, 'icon-512.png'));
  console.log('Generated icon-512.png');

  // 3. Apple Touch Icon 180x180 PNG
  await sharp(svgBuffer)
    .resize(180, 180)
    .png()
    .toFile(path.join(publicDir, 'apple-touch-icon.png'));
  console.log('Generated apple-touch-icon.png');

  // 4. Favicon 64x64 PNG
  await sharp(svgBuffer)
    .resize(64, 64)
    .png()
    .toFile(path.join(publicDir, 'favicon-64.png'));
  console.log('Generated favicon-64.png');

  // 5. Maskable 512x512 with safe-zone margin (scale badge to ~400px centered in 512x512 dark slate or themed background)
  const resizedBadge = await sharp(svgBuffer)
    .resize(410, 410)
    .toBuffer();

  await sharp({
    create: {
      width: 512,
      height: 512,
      channels: 4,
      background: { r: 15, g: 23, b: 42, alpha: 1 }, // #0F172A slate-900 tactical
    },
  })
    .composite([{ input: resizedBadge, gravity: 'center' }])
    .png()
    .toFile(path.join(publicDir, 'icon-maskable-512.png'));
  console.log('Generated icon-maskable-512.png');

  // 6. Also generate maskable 192x192
  const resizedBadge192 = await sharp(svgBuffer)
    .resize(154, 154)
    .toBuffer();

  await sharp({
    create: {
      width: 192,
      height: 192,
      channels: 4,
      background: { r: 15, g: 23, b: 42, alpha: 1 },
    },
  })
    .composite([{ input: resizedBadge192, gravity: 'center' }])
    .png()
    .toFile(path.join(publicDir, 'icon-maskable-192.png'));
  console.log('Generated icon-maskable-192.png');
}

generateIcons().catch((err) => {
  console.error('Error generating icons:', err);
  process.exit(1);
});
