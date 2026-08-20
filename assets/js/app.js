(function () {
  const config = window.INVITATION_CONFIG;
  const screens = [...document.querySelectorAll(".screen")];
  const liveRegion = document.getElementById("live-region");
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const state = { invitation: null, mainResponse: null, constellation: null, accessCode: "" };

  const elements = {
    openLetter: document.getElementById("open-letter"),
    secretForm: document.getElementById("secret-form"),
    secretCode: document.getElementById("secret-code"),
    secretError: document.getElementById("secret-error"),
    invitationCard: document.getElementById("invitation-card"),
    eventTitleMain: document.getElementById("event-title-main"),
    eventTitleName: document.getElementById("event-title"),
    heroOverline: document.getElementById("hero-overline"),
    invitationKicker: document.getElementById("invitation-kicker"),
    milestoneNote: document.getElementById("milestone-note"),
    birthdayCardBadge: document.getElementById("birthday-card-badge"),
    birthdaySpecialMessage: document.getElementById("birthday-special-message"),
    guestHonorific: document.getElementById("guest-honorific"),
    guestName: document.getElementById("guest-name"),
    guestTreatment: document.getElementById("guest-treatment"),
    responseName: document.getElementById("response-name"),
    goToResponse: document.getElementById("go-to-response"),
    accept: document.getElementById("accept-invitation"),
    decline: document.getElementById("decline-invitation"),
    responseError: document.getElementById("response-error"),
    attendeesForm: document.getElementById("attendees-form"),
    attendeesList: document.getElementById("attendees-list"),
    attendeesError: document.getElementById("attendees-error"),
    balloons: document.getElementById("balloons"),
    farewellTitle: document.getElementById("farewell-title"),
    farewellMessage: document.getElementById("farewell-message"),
    tableReveal: document.getElementById("table-reveal"),
    revealedTable: document.getElementById("revealed-table"),
    guestConstellation: document.getElementById("guest-constellation"),
    constellationSky: document.getElementById("constellation-sky"),
    constellationCount: document.getElementById("constellation-count"),
    constellationExplanation: document.getElementById("constellation-explanation"),
    addToCalendar: document.getElementById("add-to-calendar"),
    openLocation: document.getElementById("open-location"),
    downloadPdf: document.getElementById("download-card-pdf"),
    downloadError: document.getElementById("download-error")
  };

  function announce(message) {
    liveRegion.textContent = "";
    requestAnimationFrame(() => { liveRegion.textContent = message; });
  }

  function showScreen(id) {
    const next = document.getElementById(id);
    screens.forEach((screen) => {
      const active = screen === next;
      screen.classList.toggle("is-active", active);
      screen.hidden = !active;
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
    const heading = next.querySelector("h1, h2");
    if (heading) {
      heading.setAttribute("tabindex", "-1");
      setTimeout(() => heading.focus({ preventScroll: true }), 80);
    }
  }

  function setLoading(form, loading) {
    form.classList.toggle("is-loading", loading);
    [...form.elements].forEach((control) => { control.disabled = loading; });
  }

  function guestSessionDurationMs() {
    const hours = Number(config.session?.guestAccessHours || 12);
    return Math.max(1, Math.min(hours, 168)) * 60 * 60 * 1000;
  }

  function saveGuestSession() {
    if (!state.accessCode || !state.invitation) return;
    window.GuestSessionStore.save(state.accessCode, state.invitation, guestSessionDurationMs());
  }

  function clearGuestSession() {
    window.GuestSessionStore.clearActive(state.accessCode);
  }

  function readGuestSession() {
    return window.GuestSessionStore.readActive();
  }

  function normalizeCardType(value) {
    const normalized = String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toUpperCase();
    return ["BIRTHDAY_GIRL", "CUMPLEANERA", "ESPECIAL", "SI", "TRUE"].includes(normalized) ? "BIRTHDAY_GIRL" : "GUEST";
  }

  function setEventTitle(fullTitle) {
    const value = String(fullTitle || "Celebrando mis 50 años").trim();
    const titleParts = value.match(/^(celebrando|celebración de|hoy celebramos)\s+(.+)$/i);
    elements.eventTitleMain.textContent = titleParts ? titleParts[1] : value;
    elements.eventTitleName.hidden = !(titleParts && titleParts[2]);
    elements.eventTitleName.textContent = titleParts ? titleParts[2] : "";
    document.getElementById("invitation-title").setAttribute("aria-label", value);
  }

  function applyInvitation(invitation, code, options = {}) {
    state.invitation = invitation;
    state.accessCode = code || state.accessCode;
    const birthdayCard = normalizeCardType(invitation.cardType || invitation.tipoTarjeta) === "BIRTHDAY_GIRL";
    state.invitation.cardType = birthdayCard ? "BIRTHDAY_GIRL" : "GUEST";
    const honorific = String(invitation.honorific ?? invitation.saludo ?? "Sr/a").trim();
    state.invitation.honorific = honorific;
    elements.invitationCard.classList.toggle("is-birthday-card", birthdayCard);
    elements.birthdayCardBadge.hidden = !birthdayCard;
    elements.birthdaySpecialMessage.hidden = !birthdayCard;
    elements.invitationKicker.textContent = birthdayCard ? "Hoy celebramos a quien hace brillar esta historia" : "Estás cordialmente invitado a celebrar";
    elements.heroOverline.textContent = birthdayCard ? "La protagonista de nuestra noche más especial" : "Una noche escrita en las estrellas";
    setEventTitle(birthdayCard ? "Hoy celebramos tu vida y tus 50 años" : config.event.title);
    elements.milestoneNote.textContent = birthdayCard
      ? "Tus 50 años: una vida de recuerdos, afecto y luz compartida."
      : "Medio siglo de historias, afecto y momentos inolvidables.";
    elements.guestHonorific.textContent = birthdayCard ? ["Para ti,", honorific].filter(Boolean).join(" ") : honorific;
    elements.guestHonorific.hidden = !birthdayCard && !honorific;
    elements.guestName.textContent = invitation.primaryName;
    elements.guestTreatment.textContent = invitation.salutationDetail || "";
    const fullGreeting = [honorific, invitation.primaryName, invitation.salutationDetail].filter(Boolean).join(" ");
    elements.responseName.textContent = `${fullGreeting}, ¿nos acompañan?`;
    if (options.persist !== false) saveGuestSession();
  }

  async function restoreGuestSession() {
    const session = readGuestSession();
    if (!session) return;
    applyInvitation(session.invitation, session.code, { persist: false });
    document.body.classList.add("guest-session-restored");
    revealInvitation();
    announce(`Tu invitación sigue abierta durante ${config.session?.guestAccessHours || 12} horas.`);
    try {
      const refreshed = await window.InvitationApi.request("getInvitation", { code: session.code });
      const privateState = { tableName: session.invitation.tableName || "" };
      applyInvitation({ ...refreshed, ...privateState }, session.code);
    } catch (_) {
      clearGuestSession();
      state.invitation = null;
      state.accessCode = "";
      showScreen("screen-access");
      elements.secretError.textContent = "La sesión guardada venció o la invitación ya no está activa. Ingresa nuevamente tu clave.";
    }
  }

  function applyEventContent() {
    const event = config.event;
    setEventTitle(event.title);
    document.getElementById("event-message").textContent = event.message;
    document.getElementById("event-date").textContent = event.date;
    document.getElementById("event-time").textContent = event.time;
    document.getElementById("event-place").textContent = event.place;
    document.getElementById("event-address").textContent = event.address;
    document.getElementById("dress-code").textContent = event.dressCode;
    document.getElementById("dress-code-wrap").hidden = !event.dressCode;
  }

  function validEventDate(value) {
    return value && !Number.isNaN(new Date(value).getTime());
  }

  function applyEventActions() {
    const event = config.event;
    const canAddCalendar = validEventDate(event.calendarStart) && validEventDate(event.calendarEnd);
    elements.addToCalendar.hidden = !canAddCalendar;

    const hasAddress = event.address && !/por confirmar/i.test(event.address);
    const hasPlace = event.place && !/por confirmar/i.test(event.place);
    const locationUrl = event.mapsUrl || ((hasAddress || hasPlace)
      ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent([event.place, event.address].filter(Boolean).join(", "))}`
      : "");
    elements.openLocation.hidden = !locationUrl;
    if (locationUrl) elements.openLocation.href = locationUrl;
  }

  function icsDate(value) {
    return new Date(value).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
  }

  function icsText(value) {
    return String(value || "").replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
  }

  function downloadCalendarEvent() {
    const event = config.event;
    if (!validEventDate(event.calendarStart) || !validEventDate(event.calendarEnd)) return;
    const location = [event.place, event.address].filter(Boolean).join(", ");
    const uid = `cumpleanos-${state.invitation?.id || "invitacion"}@invitacion-magica`;
    const content = [
      "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Invitacion Magica//ES", "CALSCALE:GREGORIAN",
      "BEGIN:VEVENT", `UID:${icsText(uid)}`, `DTSTAMP:${icsDate(new Date())}`,
      `DTSTART:${icsDate(event.calendarStart)}`, `DTEND:${icsDate(event.calendarEnd)}`,
      `SUMMARY:${icsText(event.title)}`, `DESCRIPTION:${icsText(event.message)}`,
      `LOCATION:${icsText(location)}`, "END:VEVENT", "END:VCALENDAR"
    ].join("\r\n");
    const url = URL.createObjectURL(new Blob([content], { type: "text/calendar;charset=utf-8" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "cumpleanos-invitacion.ics";
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
    announce("El evento fue preparado para agregarlo a tu calendario.");
  }

  function buildStars() {
    const container = document.getElementById("stars");
    for (let index = 0; index < 54; index += 1) {
      const star = document.createElement("i");
      const size = Math.random() * 2.6 + 1;
      star.style.cssText = `left:${Math.random() * 100}%;top:${Math.random() * 82}%;width:${size}px;height:${size}px;animation-delay:${Math.random() * 4}s`;
      container.appendChild(star);
    }
  }

  function initCursorStardust() {
    const container = document.getElementById("cursor-stardust");
    if (!container || reducedMotion || !window.matchMedia("(pointer: fine)").matches) return;

    let lastX = -100;
    let lastY = -100;
    let lastEmission = 0;
    let pendingPoint = null;
    let frameRequested = false;
    const symbols = ["✦", "✧", "·", "✦"];
    const colors = ["#f3dfa1", "#d8b86e", "#bda1e2", "#fff5d7"];

    function emitSpark(x, y) {
      const spark = document.createElement("span");
      const drift = Math.round(Math.random() * 26 - 13);
      spark.className = "cursor-spark";
      spark.textContent = symbols[Math.floor(Math.random() * symbols.length)];
      spark.style.setProperty("--spark-x", `${Math.round(x - 5)}px`);
      spark.style.setProperty("--spark-y", `${Math.round(y - 5)}px`);
      spark.style.setProperty("--spark-drift", `${drift}px`);
      spark.style.setProperty("--spark-rotate", `${Math.round(Math.random() * 90 - 45)}deg`);
      spark.style.setProperty("--spark-size", `${Math.round(Math.random() * 6 + 7)}px`);
      spark.style.setProperty("--spark-color", colors[Math.floor(Math.random() * colors.length)]);
      container.appendChild(spark);
      spark.addEventListener("animationend", () => spark.remove(), { once: true });
      while (container.childElementCount > 24) container.firstElementChild.remove();
    }

    window.addEventListener("pointermove", (event) => {
      pendingPoint = { x: event.clientX, y: event.clientY, time: performance.now() };
      if (frameRequested) return;
      frameRequested = true;
      requestAnimationFrame(() => {
        frameRequested = false;
        if (!pendingPoint) return;
        const distance = Math.hypot(pendingPoint.x - lastX, pendingPoint.y - lastY);
        if (distance >= 18 && pendingPoint.time - lastEmission >= 34) {
          emitSpark(pendingPoint.x, pendingPoint.y);
          lastX = pendingPoint.x;
          lastY = pendingPoint.y;
          lastEmission = pendingPoint.time;
        }
      });
    }, { passive: true });
  }

  function finishIntroAnimation() {
    document.body.classList.add("letter-delivered");
    elements.openLetter.disabled = false;
    announce("La carta llegó al buzón. Ya puedes visualizarla.");
  }

  function revealInvitation() {
    showScreen("screen-invitation");
    elements.invitationCard.classList.remove("assemble");
    requestAnimationFrame(() => elements.invitationCard.classList.add("assemble"));
    announce(`Invitación abierta para ${state.invitation.primaryName}.`);
  }

  function createBalloons() {
    elements.balloons.replaceChildren();
    const colors = ["#d9b86f", "#8f74c9", "#f0d89a", "#67509d", "#f5e9be"];
    for (let index = 0; index < 16; index += 1) {
      const balloon = document.createElement("span");
      balloon.style.setProperty("--balloon-color", colors[index % colors.length]);
      balloon.style.setProperty("--balloon-left", `${3 + Math.random() * 92}%`);
      balloon.style.setProperty("--balloon-delay", `${Math.random() * 1.4}s`);
      balloon.style.setProperty("--balloon-duration", `${4.5 + Math.random() * 2.5}s`);
      elements.balloons.appendChild(balloon);
    }
  }

  function attendeeRow(attendee) {
    const row = document.createElement("fieldset");
    row.className = "attendee-row";
    row.innerHTML = `
      <legend>${escapeHtml(attendee.name)}${attendee.type === "PRINCIPAL" ? " <small>Invitado principal</small>" : ""}</legend>
      <div class="attendance-options">
        <label><input type="radio" name="attendee-${attendee.id}" value="SI" ${attendee.response === "SI" ? "checked" : ""} required><span>Sí asiste</span></label>
        <label><input type="radio" name="attendee-${attendee.id}" value="NO" ${attendee.response === "NO" ? "checked" : ""} required><span>No asiste</span></label>
      </div>`;
    row.dataset.attendeeId = attendee.id;
    return row;
  }

  function escapeHtml(value) {
    return String(value).replace(/[&<>'"]/g, (character) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;"
    })[character]);
  }

  function showAttendees() {
    elements.attendeesList.replaceChildren();
    state.invitation.attendees.forEach((attendee) => elements.attendeesList.appendChild(attendeeRow(attendee)));
    createBalloons();
    showScreen("screen-attendees");
    announce("Asistencia principal confirmada. Ahora confirma las personas de tu grupo.");
  }

  function seededRandom(seed) {
    let value = seed % 2147483647;
    if (value <= 0) value += 2147483646;
    return () => {
      value = value * 16807 % 2147483647;
      return (value - 1) / 2147483646;
    };
  }

  function currentGroupConstellation(attendeeResponses) {
    const responseById = new Map((attendeeResponses || []).map((item) => [String(item.id), item.response]));
    const group = state.invitation?.attendees || [];
    let confirmedCount = group.reduce((total, attendee) => {
      const response = responseById.get(String(attendee.id)) || attendee.response;
      return total + (response === "SI" ? 1 : 0);
    }, 0);
    if (!group.length && state.mainResponse === "SI") confirmedCount = 1;
    const secretVioletStar = group.some((attendee) => {
      const response = responseById.get(String(attendee.id)) || attendee.response;
      const name = String(attendee.name || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase().trim();
      return response === "SI" && (name === "LINA SOFIA" || name.startsWith("LINA SOFIA "));
    });
    return { confirmedCount, visibleStars: Math.min(confirmedCount, 64), secretVioletStar };
  }

  function reliableConstellation(serverModel, attendeeResponses) {
    const localModel = currentGroupConstellation(attendeeResponses);
    const serverCount = Number(serverModel?.confirmedCount);
    if (Number.isFinite(serverCount) && serverCount >= localModel.confirmedCount) {
      return {
        confirmedCount: serverCount,
        visibleStars: Math.min(Number(serverModel?.visibleStars || serverCount), 64),
        secretVioletStar: Boolean(serverModel?.secretVioletStar || serverModel?.highlightedGuestConfirmed || localModel.secretVioletStar)
      };
    }
    return localModel;
  }

  function renderConstellation(model) {
    const confirmedCount = Number(model?.confirmedCount || 0);
    const visibleStars = Math.min(Number(model?.visibleStars || confirmedCount), 64);
    const random = seededRandom(confirmedCount * 7919 + 2026);
    const points = [];
    const highlightedIndex = model?.secretVioletStar && visibleStars ? Math.min(2, visibleStars - 1) : -1;
    elements.constellationSky.replaceChildren();

    const lines = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    lines.setAttribute("class", "constellation-lines");
    lines.setAttribute("viewBox", "0 0 100 100");
    lines.setAttribute("preserveAspectRatio", "none");

    for (let index = 0; index < visibleStars; index += 1) {
      const point = { x: 6 + random() * 88, y: 9 + random() * 81 };
      points.push(point);
      const star = document.createElement("span");
      star.className = `constellation-star${index % 7 === 0 ? " is-accent" : ""}${index === highlightedIndex ? " is-secret-violet" : ""}`;
      star.style.setProperty("--star-x", `${point.x}%`);
      star.style.setProperty("--star-y", `${point.y}%`);
      star.style.setProperty("--star-size", `${index % 7 === 0 ? 6 : 3 + Math.round(random() * 2)}px`);
      star.style.setProperty("--star-delay", `${Math.min(index * .045, 1.4)}s`);
      elements.constellationSky.appendChild(star);
    }

    points.slice(1, 18).forEach((point, index) => {
      if (index % 4 === 3) return;
      const previous = points[index];
      const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
      line.setAttribute("x1", previous.x);
      line.setAttribute("y1", previous.y);
      line.setAttribute("x2", point.x);
      line.setAttribute("y2", point.y);
      lines.appendChild(line);
    });
    elements.constellationSky.prepend(lines);
    const capped = confirmedCount > visibleStars;
    elements.constellationExplanation.textContent = capped
      ? `Cada destello representa la celebración. Mostramos ${visibleStars} estrellas para mantener el cielo legible, pero el contador incluye a todas las personas confirmadas. Nunca se muestran nombres.`
      : "Cada estrella representa a una persona que confirmó su asistencia. Se suman el invitado principal y sus acompañantes, sin mostrar ningún nombre.";
    elements.constellationCount.innerHTML = confirmedCount
      ? `<strong>${confirmedCount}</strong> ${confirmedCount === 1 ? "persona confirmada ilumina" : "personas confirmadas iluminan"} esta celebración.`
      : "La primera estrella de esta celebración aún está por encenderse.";
    elements.guestConstellation.hidden = false;
  }

  function revealTable(attending) {
    const tableName = attending ? String(state.invitation?.tableName || "").trim() : "";
    elements.tableReveal.hidden = !tableName;
    elements.tableReveal.classList.remove("is-revealed");
    if (!tableName) return;
    elements.revealedTable.textContent = tableName;
    requestAnimationFrame(() => elements.tableReveal.classList.add("is-revealed"));
  }

  function showFarewell(attending, constellation) {
    if (attending) {
      elements.farewellTitle.textContent = "¡Gracias por confirmar!";
      elements.farewellMessage.textContent = "Tu respuesta y la de tu grupo quedaron guardadas. Será maravilloso celebrar juntos. Ya puedes cerrar este enlace.";
    } else {
      elements.farewellTitle.textContent = "Gracias por responder";
      elements.farewellMessage.textContent = "Registramos que no podrás acompañarnos. Agradecemos mucho que nos hayas avisado. Ya puedes cerrar este enlace.";
    }
    state.constellation = reliableConstellation(constellation);
    revealTable(attending);
    renderConstellation(state.constellation);
    showScreen("screen-farewell");
    announce("Tu respuesta quedó registrada correctamente.");
  }

  async function downloadInvitationPdf() {
    elements.downloadError.textContent = "";
    if (!state.invitation || !window.InvitationPdf) {
      elements.downloadError.textContent = "La invitación todavía no está lista para descargar.";
      return;
    }
    elements.downloadPdf.disabled = true;
    elements.downloadPdf.classList.add("is-loading");
    try {
      await window.InvitationPdf.download({
        invitation: state.invitation,
        event: config.event,
        imageUrl: "assets/images/retrato-cumpleanos.webp"
      });
      announce("El PDF de tu invitación fue generado correctamente.");
    } catch (error) {
      elements.downloadError.textContent = error.message || "No fue posible generar el PDF. Intenta nuevamente.";
    } finally {
      elements.downloadPdf.disabled = false;
      elements.downloadPdf.classList.remove("is-loading");
    }
  }

  async function saveMainResponse(response) {
    elements.responseError.textContent = "";
    elements.accept.disabled = true;
    elements.decline.disabled = true;
    try {
      const result = await window.InvitationApi.request("saveMainResponse", {
        invitationId: state.invitation.id,
        code: state.accessCode,
        response
      });
      state.mainResponse = response;
      if (result.invitation) state.invitation = { ...state.invitation, ...result.invitation };
      saveGuestSession();
      if (response === "SI") showAttendees();
      else showFarewell(false, result.constellation);
    } catch (error) {
      elements.responseError.textContent = error.message;
    } finally {
      elements.accept.disabled = false;
      elements.decline.disabled = false;
    }
  }

  applyEventContent();
  applyEventActions();
  buildStars();
  initCursorStardust();
  setTimeout(finishIntroAnimation, reducedMotion ? config.animation.reducedMotionDurationMs : config.animation.introDurationMs);

  if (config.apiMode !== "mock") {
    document.querySelectorAll(".demo-only").forEach((element) => { element.hidden = true; });
  }

  elements.openLetter.addEventListener("click", () => showScreen("screen-access"));

  elements.secretCode.addEventListener("input", () => {
    elements.secretCode.value = elements.secretCode.value.toUpperCase().replace(/[^A-Z0-9]/g, "");
    elements.secretError.textContent = "";
  });

  elements.secretForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const code = elements.secretCode.value.trim();
    if (!code) {
      elements.secretError.textContent = "Ingresa la clave que recibiste con tu invitación.";
      elements.secretCode.focus();
      return;
    }

    setLoading(elements.secretForm, true);
    elements.secretError.textContent = "";
    try {
      const invitation = await window.InvitationApi.request("getInvitation", { code });
      applyInvitation(invitation, code);
      revealInvitation();
    } catch (error) {
      elements.secretError.textContent = error.message;
    } finally {
      setLoading(elements.secretForm, false);
    }
  });

  elements.goToResponse.addEventListener("click", () => showScreen("screen-response"));
  elements.accept.addEventListener("click", () => saveMainResponse("SI"));
  elements.decline.addEventListener("click", () => saveMainResponse("NO"));
  elements.addToCalendar.addEventListener("click", downloadCalendarEvent);
  elements.downloadPdf.addEventListener("click", downloadInvitationPdf);

  elements.attendeesForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    elements.attendeesError.textContent = "";
    const attendees = state.invitation.attendees.map((attendee) => {
      const checked = elements.attendeesForm.querySelector(`[name="attendee-${CSS.escape(attendee.id)}"]:checked`);
      return checked ? { id: attendee.id, response: checked.value } : null;
    });

    if (attendees.some((item) => item === null)) {
      elements.attendeesError.textContent = "Indica si cada persona asistirá o no.";
      return;
    }

    setLoading(elements.attendeesForm, true);
    try {
      const result = await window.InvitationApi.request("saveAttendees", {
        invitationId: state.invitation.id,
        code: state.accessCode,
        attendees
      });
      if (result.invitation) state.invitation = { ...state.invitation, ...result.invitation };
      state.invitation.tableName = result.tableName || state.invitation.tableName || "";
      state.invitation.attendees = state.invitation.attendees.map((attendee) => {
        const saved = attendees.find((item) => String(item.id) === String(attendee.id));
        return saved ? { ...attendee, response: saved.response } : attendee;
      });
      saveGuestSession();
      showFarewell(true, reliableConstellation(result.constellation, attendees));
    } catch (error) {
      elements.attendeesError.textContent = error.message;
    } finally {
      setLoading(elements.attendeesForm, false);
    }
  });

  function closeGuestInvitation() {
    clearGuestSession();
    state.invitation = null;
    state.mainResponse = null;
    state.constellation = null;
    state.accessCode = "";
    elements.secretCode.value = "";
    elements.secretError.textContent = "";
    document.body.classList.remove("guest-session-restored");
    elements.invitationCard.classList.remove("is-birthday-card");
    applyEventContent();
    showScreen("screen-access");
    announce("La invitación se cerró de forma segura. Puedes ingresar otra clave.");
    setTimeout(() => elements.secretCode.focus({ preventScroll: true }), 120);
  }

  document.querySelectorAll("[data-guest-logout]").forEach((button) => button.addEventListener("click", closeGuestInvitation));

  restoreGuestSession();
})();
