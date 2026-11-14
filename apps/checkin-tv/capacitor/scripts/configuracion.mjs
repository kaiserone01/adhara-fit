// De las variables de entorno al contenido de capacitor.config.json y de checkin-config.json.
// La app web (apps/checkin, export estático) va empaquetada en el APK: no hay server.url ni servicio web propio.
const CLAVE_MIN_LARGO = 16; // igual que CLAVE_CHECKIN_MIN_LARGO en packages/domain/utils/claveCheckin.ts

export function construirConfiguracion(env) {
  const apiUrl = (env.CHECKIN_API_URL || "").replace(/\/+$/, "");
  const clave = env.CHECKIN_CLAVE || "";
  if (!apiUrl) throw new Error("Falta CHECKIN_API_URL (URL base de web-admin).");
  if (!clave) throw new Error("Falta CHECKIN_CLAVE (la misma clave que tiene web-admin).");
  if (clave.length < CLAVE_MIN_LARGO) throw new Error(`CHECKIN_CLAVE debe tener al menos ${CLAVE_MIN_LARGO} caracteres.`);
  // La clave viaja en cada petición: solo https en el APK.
  if (!apiUrl.startsWith("https://")) throw new Error("CHECKIN_API_URL debe empezar por https://");

  // Autoactualización de la interfaz (packages/ota): modo manual y sin la nube de Capgo (URLs vacías = sin llamadas).
  // El bundle que no confirma arranque en 10 s se descarta y la app vuelve al anterior.
  const capacitorPlugins = {
    CapacitorUpdater: { autoUpdate: "off", appReadyTimeout: 10000, resetWhenUpdate: true, statsUrl: "", updateUrl: "", channelUrl: "" },
  };
  // Dirección donde el workflow publica latest.json y los zip de esta app; sin ella el APK no se actualiza solo.
  const actualizacionesUrl = (env.ACTUALIZACIONES_URL || "").replace(/\/+$/, "");
  if (actualizacionesUrl && !actualizacionesUrl.startsWith("https://")) throw new Error("ACTUALIZACIONES_URL debe empezar por https://");
  const versionCode = Number.parseInt(env.APK_VERSION_CODE || "1", 10) || 1;
  const actualizaciones = actualizacionesUrl ? { url: actualizacionesUrl, versionCode } : undefined;

  const capacitor = {
    appId: "pe.adharafit.checkin",
    appName: "Adhara Fit Check-in",
    webDir: "www",
    // El APK es de debug y lleva la clave en el bundle: sin logs y sin WebView inspeccionable.
    loggingBehavior: "none",
    android: { allowMixedContent: false, webContentsDebuggingEnabled: false },
    plugins: capacitorPlugins,
  };

  return { capacitor, checkin: { apiUrl, clave, ...(actualizaciones && { actualizaciones }) } };
}
