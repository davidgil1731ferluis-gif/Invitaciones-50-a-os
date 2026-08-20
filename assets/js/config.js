window.INVITATION_CONFIG = Object.freeze({
  // La página está conectada con la implementación publicada de Google Apps Script.
  apiMode: "apps-script",
  appsScriptUrl: "https://script.google.com/macros/s/AKfycbzf_p4vVsbgpn0B-yzUV6qjbEaZ7o0jdJ5ItDNFACmMNP0zvSf6pS32svO0o6w1lUanlg/exec",

  event: {
    title: "Celebrando mis 50 años",
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
  },

  session: {
    // Durante este tiempo el invitado podrá cerrar y volver a abrir la página
    // sin escribir de nuevo su clave. Cambia 12 por el número de horas deseado.
    guestAccessHours: 12
  },

  whatsapp: {
    // Estos valores se pueden ajustar también desde el panel administrador.
    publicUrl: "https://davidgil1731ferluis-gif.github.io/Invitaciones-50-a-os/",
    imageUrl: "assets/images/invitacion-whatsapp.jpg",
    defaultCountryCode: "57",
    messageTemplate: `✨🌙 *¡Tenemos algo muy especial para ti!* 🌙✨

Con mucha alegría queremos compartirte el enlace de tu *tarjeta de invitación*. Hemos preparado esta experiencia con mucho cariño para que desde el primer momento puedas disfrutar de un pequeño toque de magia. 💌⭐

🔗 *Link de la tarjeta:*
{{LINK}}

Para ingresar necesitarás una *clave secreta*, que encontrarás a continuación. 🔐✨

🌟 *Tu clave secreta es:*
*{{CLAVE}}*

Te recomendamos guardar esta información y escribir la clave exactamente como aparece para poder acceder sin inconvenientes.

Esperamos que disfrutes cada detalle de esta invitación y que te dejes sorprender por la experiencia que hemos preparado para ti. ✨💜

*Nos encantará contar contigo para celebrar este momento tan especial.* 🥂🌙⭐

Con cariño,`
  }
});
