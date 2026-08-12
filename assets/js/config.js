window.INVITATION_CONFIG = Object.freeze({
  // Usa "mock" para probar sin Google Sheets. Cambia a "apps-script" al publicar el backend.
  apiMode: "apps-script",
appsScriptUrl: "https://script.google.com/macros/s/AKfycbzf_p4vVsbgpn0B-yzUV6qjbEaZ7o0jdJ5ItDNFACmMNP0zvSf6pS32svO0o6w1lUanlg/exec",
  
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
