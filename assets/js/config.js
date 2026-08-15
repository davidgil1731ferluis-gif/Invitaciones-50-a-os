window.INVITATION_CONFIG = Object.freeze({
  // La página está conectada con la implementación publicada de Google Apps Script.
  apiMode: "apps-script",
  appsScriptUrl: "https://script.google.com/macros/s/AKfycbzf_p4vVsbgpn0B-yzUV6qjbEaZ7o0jdJ5ItDNFACmMNP0zvSf6pS32svO0o6w1lUanlg/exec",

  event: {
    title: "Cumpleaños de [NOMBRE]",
    message: "La compañía de ustedes hará que esta celebración sea aún más inolvidable.",
    date: "Fecha por confirmar",
    time: "Hora por confirmar",
    place: "Lugar por confirmar",
    address: "Dirección por confirmar",
    dressCode: "Elegante",

    // Formato ISO con zona horaria. Ejemplo Colombia: 2026-09-12T19:00:00-05:00
    calendarStart: "",
    calendarEnd: "",

    // Es opcional. Si se deja vacío se buscará automáticamente la dirección en Google Maps.
    mapsUrl: ""
  },

  animation: {
    introDurationMs: 3900,
    reducedMotionDurationMs: 250
  }
});
