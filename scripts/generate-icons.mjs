/**
 * Genera los iconos de la app Shotra a partir del logo, centrado sobre un
 * cuadrado de color de marca (#990000).
 *
 * Produce:
 *   assets/icon.png            (1024x1024) — icono general iOS/base
 *   assets/adaptive-icon.png   (1024x1024) — foreground Android (con mas padding
 *                              porque Android recorta en circulo/squircle)
 *   assets/favicon.png         (48x48)     — favicon web (pestana del navegador)
 *   assets/splash.png          (1284x2778) — pantalla de carga
 *
 * Uso:  node scripts/generate-icons.mjs
 */
import sharp from 'sharp';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const assets = path.join(__dirname, '..', 'assets');

const BRAND = '#990000';           // fondo de marca
const LOGO = path.join(assets, 'logo_gris.png'); // logo con buen contraste sobre rojo

/** Compone el logo centrado sobre un cuadrado de color, con un padding relativo. */
async function makeIcon(outName, size, { paddingRatio = 0.18, bg = BRAND, transparent = false } = {}) {
  const logoTargetW = Math.round(size * (1 - paddingRatio * 2));
  const logo = await sharp(LOGO)
    .resize({ width: logoTargetW, fit: 'inside' })
    .toBuffer();
  const logoMeta = await sharp(logo).metadata();

  const canvas = sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: transparent ? { r: 0, g: 0, b: 0, alpha: 0 } : bg,
    },
  });

  const top = Math.round((size - (logoMeta.height ?? 0)) / 2);
  const left = Math.round((size - (logoMeta.width ?? 0)) / 2);

  await canvas
    .composite([{ input: logo, top, left }])
    .png()
    .toFile(path.join(assets, outName));
  console.log(`  ✅ ${outName} (${size}x${size})`);
}

/** Splash: logo centrado sobre lienzo vertical de marca. */
async function makeSplash() {
  const W = 1284, H = 2778;
  const logoTargetW = Math.round(W * 0.6);
  const logo = await sharp(LOGO).resize({ width: logoTargetW, fit: 'inside' }).toBuffer();
  const logoMeta = await sharp(logo).metadata();

  await sharp({
    create: { width: W, height: H, channels: 4, background: BRAND },
  })
    .composite([{ input: logo, top: Math.round((H - (logoMeta.height ?? 0)) / 2), left: Math.round((W - (logoMeta.width ?? 0)) / 2) }])
    .png()
    .toFile(path.join(assets, 'splash.png'));
  console.log('  ✅ splash.png (1284x2778)');
}

async function main() {
  console.log('🎨 Generando iconos de Shotra...');
  // icon.png: logo ancho para que la placa se lea bien en tamano pequeno.
  await makeIcon('icon.png', 1024, { paddingRatio: 0.06 });
  // adaptive-icon.png: mas padding, Android recorta los bordes (circulo/squircle).
  await makeIcon('adaptive-icon.png', 1024, { paddingRatio: 0.14 });
  // favicon: padding minimo para que la placa se lea en la pestana del navegador.
  await makeIcon('favicon.png', 64, { paddingRatio: 0.04 });
  await makeSplash();
  console.log('✨ Iconos generados en assets/');
}

main().catch((e) => { console.error(e); process.exit(1); });
