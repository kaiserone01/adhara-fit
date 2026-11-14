// Genera los recursos gráficos de los APK de Android TV (ícono del launcher clásico, redondo y adaptativo, banner de
// 320x180 dp y pantalla de arranque) y los íconos web de las apps, a partir de los íconos del kit de marca
// (docs/ADHARA_FIT_Logo_Kit/icon-checkin.png e icon-vitrina.png). Los PNG resultantes se versionan; esto solo se
// vuelve a ejecutar si cambia un ícono:  node tools/generar-iconos-apk.mjs
import { existsSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const raiz = join(dirname(fileURLToPath(import.meta.url)), "..");
const kit = join(raiz, "docs", "ADHARA_FIT_Logo_Kit");

const APPS = [
  { app: "checkin", etiqueta: "CHECK-IN", icono: "icon-checkin.png" },
  { app: "vitrina", etiqueta: "VITRINA", icono: "icon-vitrina.png" },
];

const DENSIDADES = { mdpi: 1, hdpi: 1.5, xhdpi: 2, xxhdpi: 3, xxxhdpi: 4 };
const AMARILLO = "#ffcb04";

const hex = (r, g, b) => `#${[r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("")}`;

// Color de fondo del ícono: un píxel de la zona oscura, lejos del dibujo.
async function colorFondo(ruta) {
  const { data, info } = await sharp(ruta).raw().toBuffer({ resolveWithObject: true });
  const i = (Math.round(info.height * 0.05) * info.width + Math.round(info.width * 0.5)) * info.channels;
  return { r: data[i], g: data[i + 1], b: data[i + 2] };
}

const cuadrado = (ruta, lado) => sharp(ruta).resize(lado, lado, { fit: "cover" });

// El ícono trae las esquinas en negro puro: se recortan con su mismo redondeo para que el fondo se vea limpio.
async function redondeado(ruta, lado) {
  const mascara = Buffer.from(
    `<svg width="${lado}" height="${lado}"><rect width="${lado}" height="${lado}" rx="${Math.round(lado * 0.165)}"/></svg>`
  );
  return sharp(await cuadrado(ruta, lado).png().toBuffer()).composite([{ input: mascara, blend: "dest-in" }]).png().toBuffer();
}

function circulo(lado) {
  return Buffer.from(`<svg width="${lado}" height="${lado}"><circle cx="${lado / 2}" cy="${lado / 2}" r="${lado / 2}"/></svg>`);
}

async function lienzo(ancho, alto, fondo, capas) {
  return sharp({ create: { width: ancho, height: alto, channels: 4, background: { ...fondo, alpha: 1 } } })
    .composite(capas)
    .png()
    .toBuffer();
}

async function generar({ app, etiqueta, icono }) {
  const ruta = join(kit, icono);
  if (!existsSync(ruta)) throw new Error(`Falta ${ruta}`);
  const res = join(raiz, "apps", `${app}-tv`, "capacitor", "android", "app", "src", "main", "res");
  const fondo = await colorFondo(ruta);
  const colorHex = hex(fondo.r, fondo.g, fondo.b);

  for (const [densidad, f] of Object.entries(DENSIDADES)) {
    const dir = join(res, `mipmap-${densidad}`);
    const lado = Math.round(48 * f);
    await cuadrado(ruta, lado).png().toFile(join(dir, "ic_launcher.png"));
    const redondo = await cuadrado(ruta, lado).png().toBuffer();
    await sharp(redondo).composite([{ input: circulo(lado), blend: "dest-in" }]).png().toFile(join(dir, "ic_launcher_round.png"));
    // Adaptativo: lienzo de 108 dp con el ícono dentro de la zona segura (66 dp) sobre el mismo fondo.
    const total = Math.round(108 * f);
    const interior = Math.round(66 * f);
    const icono66 = await redondeado(ruta, interior);
    await sharp({ create: { width: total, height: total, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
      .composite([{ input: icono66, left: Math.round((total - interior) / 2), top: Math.round((total - interior) / 2) }])
      .png()
      .toFile(join(dir, "ic_launcher_foreground.png"));
  }

  await writeColor(join(res, "values", "ic_launcher_background.xml"), colorHex);

  // Banner de Android TV: 320x180 dp (xhdpi = 640x360 px). Ícono a la izquierda y el nombre a la derecha.
  const alto = 360;
  const ancho = 640;
  const icono300 = await redondeado(ruta, 300);
  const texto = Buffer.from(
    `<svg width="270" height="300" xmlns="http://www.w3.org/2000/svg">
      <text x="0" y="120" font-family="Arial, Helvetica, sans-serif" font-size="58" font-weight="700" fill="#ffffff">ADHARA</text>
      <text x="0" y="185" font-family="Arial, Helvetica, sans-serif" font-size="58" font-weight="700" fill="#ffffff">FIT</text>
      <text x="0" y="245" font-family="Arial, Helvetica, sans-serif" font-size="36" font-weight="700" fill="${AMARILLO}" letter-spacing="3">${etiqueta}</text>
    </svg>`
  );
  const banner = await lienzo(ancho, alto, fondo, [
    { input: icono300, left: 30, top: 30 },
    { input: texto, left: 345, top: 30 },
  ]);
  await sharp(banner).toFile(join(res, "drawable-xhdpi", "banner.png"));

  // Pantalla de arranque: se regenera con el tamaño que ya tiene cada archivo.
  for (const carpeta of readdirSync(res).filter((c) => /^drawable(-(land|port))?(-[a-z]+dpi)?$/.test(c))) {
    const archivo = join(res, carpeta, "splash.png");
    if (!existsSync(archivo)) continue;
    const { width, height } = await sharp(archivo).metadata();
    const lado = Math.round(Math.min(width, height) * 0.45);
    const centro = await redondeado(ruta, lado);
    const nuevo = await lienzo(width, height, fondo, [
      { input: centro, left: Math.round((width - lado) / 2), top: Math.round((height - lado) / 2) },
    ]);
    await sharp(nuevo).toFile(archivo);
  }

  // Íconos de la interfaz web empaquetada (pestaña del navegador y acceso directo).
  await cuadrado(ruta, 512).png().toFile(join(raiz, "apps", app, "app", "icon.png"));
  await cuadrado(ruta, 180).png().toFile(join(raiz, "apps", app, "app", "apple-icon.png"));
  console.log(`${app}: listo (fondo ${colorHex})`);
}

import { writeFileSync } from "node:fs";
function writeColor(archivo, color) {
  writeFileSync(
    archivo,
    `<?xml version="1.0" encoding="utf-8"?>\n<resources>\n    <color name="ic_launcher_background">${color}</color>\n</resources>\n`
  );
}

for (const app of APPS) await generar(app);
