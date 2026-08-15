window.INVITATION_CONFIG = Object.freeze({
  // La página está conectada con la implementación publicada de Google Apps Script.
  apiMode: "apps-script",
  appsScriptUrl: "https://script.google.com/macros/s/AKfycbzf_p4vVsbgpn0B-yzUV6qjbEaZ7o0jdJ5ItDNFACmMNP0zvSf6pS32svO0o6w1lUanlg/exec",

  event: {
    title: "Cumpleaños de Blanca Yaneth Gil Vanegas",
    message: "La compañía de ustedes hará que esta celebración sea aún más inolvidable.",
    date: "5/09/2026",
    time: "5:00 pm",
    place: "Rancho Gran Gil´s",
    address: "Samacá, Boyaca. Via Sáchica-Samacá",
    dressCode: "Elegante",

    // Formato ISO con zona horaria. Ejemplo Colombia: 2026-09-12T19:00:00-05:00
    calendarStart: "",
    calendarEnd: "",

    // Es opcional. Si se deja vacío se buscará automáticamente la dirección en Google Maps.
    mapsUrl: "https://www.google.com/maps/place/Eventos+Rancho+Gran+Gil%C2%B4s/@5.5347268,-73.5039765,17z/data=!3m1!4b1!4m6!3m5!1s0x8e41d5cefa34d1ad:0x72a406c862986092!8m2!3d5.5347268!4d-73.5039765!16s%2Fg%2F11sthkl44s?entry=ttu&g_ep=EgoyMDI2MDgxMi4wIKXMDSoASAFQAw%3D%3D"
  },

  animation: {
    introDurationMs: 3900,
    reducedMotionDurationMs: 250
  }
});
