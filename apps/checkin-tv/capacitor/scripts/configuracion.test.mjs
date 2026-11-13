import test from "node:test";
import assert from "node:assert/strict";
import { construirConfiguracion } from "./configuracion.mjs";

const CLAVE = "k".repeat(16);

test("sin CHECKIN_API_URL falla", () => {
  assert.throws(() => construirConfiguracion({ CHECKIN_CLAVE: CLAVE }), /CHECKIN_API_URL/);
});

test("sin CHECKIN_CLAVE falla", () => {
  assert.throws(() => construirConfiguracion({ CHECKIN_API_URL: "https://admin.test" }), /CHECKIN_CLAVE/);
});

test("una clave de menos de 16 caracteres falla", () => {
  assert.throws(() => construirConfiguracion({ CHECKIN_API_URL: "https://admin.test", CHECKIN_CLAVE: "corta" }), /16/);
});

test("la URL debe empezar por https://", () => {
  assert.throws(() => construirConfiguracion({ CHECKIN_API_URL: "http://admin.test", CHECKIN_CLAVE: CLAVE }), /https:\/\//);
  assert.throws(() => construirConfiguracion({ CHECKIN_API_URL: "admin.test", CHECKIN_CLAVE: CLAVE }), /https:\/\//);
});

test("quita las barras finales y devuelve la configuración del check-in", () => {
  const { checkin } = construirConfiguracion({ CHECKIN_API_URL: "https://admin.test///", CHECKIN_CLAVE: CLAVE });
  assert.deepEqual(checkin, { apiUrl: "https://admin.test", clave: CLAVE });
});

test("el APK empaqueta la app: sin server.url, sin logs y sin WebView inspeccionable", () => {
  const { capacitor } = construirConfiguracion({ CHECKIN_API_URL: "https://admin.test", CHECKIN_CLAVE: CLAVE });
  assert.equal(capacitor.server, undefined);
  assert.equal(capacitor.webDir, "www");
  assert.equal(capacitor.appId, "pe.adharafit.checkin");
  assert.equal(capacitor.appName, "Adhara Check-in");
  assert.equal(capacitor.loggingBehavior, "none");
  assert.deepEqual(capacitor.android, { allowMixedContent: false, webContentsDebuggingEnabled: false });
});
