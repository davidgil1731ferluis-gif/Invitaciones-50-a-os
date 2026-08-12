window.INVITATION_CONFIG = Object.freeze({
  // Usa "mock" para probar sin Google Sheets. Cambia a "apps-script" al publicar el backend.
  apiMode: "mock",
  appsScriptUrl: "PEGA_AQUI_LA_URL_DEL_APPS_SCRIPT",

  event: {
    title: "Cumpleaños de [NOMBRE]",
    message: "Tu compañía hará que esta celebración sea todavía más inolvidable.",
    date: "Fecha por confirmar",
    time: "Hora por confirmar",
    place: "Lugar por confirmar",
    address: "Dirección por confirmar",
    dressCode: "Elegante"
  },

  animation: {
    introDurationMs: 3900,
    reducedMotionDurationMs: 250
  }
});
