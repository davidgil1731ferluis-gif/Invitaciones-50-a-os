(function () {
  const STORAGE_KEY = "birthday-invitation-demo-v2";
  const seed = {
    invitations: [{
      id: "inv-demo-1",
      code: "MAGIA26",
      primaryName: "Valentina",
      email: "",
      phone: "",
      honorific: "Sra.",
      salutationDetail: "Esposo e hijos",
      tableName: "Mesa 4",
      cardType: "GUEST",
      status: "PENDIENTE",
      active: true,
      respondedAt: null,
      attendees: [
        { id: "att-1", name: "Valentina", type: "PRINCIPAL", response: "PENDIENTE", active: true },
        { id: "att-2", name: "Andrea", type: "ACOMPANANTE", response: "PENDIENTE", active: true },
        { id: "att-3", name: "Mateo", type: "ACOMPANANTE", response: "PENDIENTE", active: true }
      ]
    }]
  };

  function read() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
      return saved && Array.isArray(saved.invitations) ? saved : structuredClone(seed);
    } catch (_) {
      return structuredClone(seed);
    }
  }

  function write(data) { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); }
  function normalizeCode(value) { return String(value || "").trim().toUpperCase().replace(/[^A-Z0-9]/g, ""); }
  function activeAttendees(invitation) { return (invitation.attendees || []).filter((item) => item.active !== false); }

  function publicInvitation(invitation) {
    return {
      id: invitation.id,
      primaryName: invitation.primaryName,
      honorific: invitation.honorific === "SIN_TRATAMIENTO" ? "" : (invitation.honorific || "Sr/a"),
      salutationDetail: invitation.salutationDetail || "",
      cardType: cardTypeModel(invitation.cardType),
      status: invitation.status,
      attendees: activeAttendees(invitation).map(({ id, name, type, response }) => ({
        id, name, type, response
      }))
    };
  }

  function counts(attendees) {
    return attendees.reduce((result, item) => {
      if (item.response === "SI") result.yes += 1;
      else if (item.response === "NO") result.no += 1;
      else result.pending += 1;
      return result;
    }, { yes: 0, no: 0, pending: 0 });
  }

  function requireAdmin(payload) {
    if (payload.token !== "demo-admin-token") throw new Error("La sesión administrativa no es válida.");
  }

  function constellation(database) {
    const confirmedCount = database.invitations
      .filter((invitation) => invitation.active)
      .flatMap(activeAttendees)
      .filter((attendee) => attendee.response === "SI").length;
    const secretVioletStar = database.invitations
      .filter((invitation) => invitation.active)
      .flatMap(activeAttendees)
      .some((attendee) => attendee.response === "SI" && normalizeName(attendee.name).startsWith("LINA SOFIA"));
    return { confirmedCount, visibleStars: Math.min(confirmedCount, 64), secretVioletStar };
  }

  function normalizeName(value) {
    return String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase().trim().replace(/\s+/g, " ");
  }

  function cardTypeModel(value) {
    const normalized = String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toUpperCase();
    return ["BIRTHDAY_GIRL", "CUMPLEANERA", "ESPECIAL", "SI", "TRUE"].includes(normalized) ? "BIRTHDAY_GIRL" : "GUEST";
  }

  function normalizeInvitationPayload(payload) {
    const companions = [...new Set((payload.companions || []).map((name) => String(name).trim()).filter(Boolean))];
    return {
      primaryName: String(payload.primaryName || "").trim(),
      email: String(payload.email || "").trim(),
      phone: String(payload.phone || "").trim(),
      honorific: String(payload.honorific || "").trim(),
      salutationDetail: String(payload.salutationDetail || "").trim(),
      tableName: String(payload.tableName || "").trim(),
      cardType: cardTypeModel(payload.cardType),
      companions
    };
  }

  window.MockInvitationApi = {
    async request(action, payload) {
      await new Promise((resolve) => setTimeout(resolve, 180));
      const database = read();

      if (action === "getInvitation") {
        const code = normalizeCode(payload.code);
        const invitation = database.invitations.find((item) => item.code === code && item.active);
        if (!invitation) throw new Error("No encontramos una invitación activa con esa clave.");
        return publicInvitation(invitation);
      }

      if (action === "saveMainResponse") {
        const invitation = database.invitations.find((item) => item.id === payload.invitationId && item.active);
        if (!invitation) throw new Error("La invitación ya no se encuentra disponible.");
        if (normalizeCode(payload.code) !== normalizeCode(invitation.code)) throw new Error("La sesión no corresponde con esta invitación.");
        invitation.status = payload.response;
        invitation.respondedAt = new Date().toISOString();
        activeAttendees(invitation).forEach((item) => {
          if (item.type === "PRINCIPAL" || payload.response === "NO") item.response = payload.response;
        });
        write(database);
        return { saved: true, invitation: publicInvitation(invitation), constellation: constellation(database) };
      }

      if (action === "saveAttendees") {
        const invitation = database.invitations.find((item) => item.id === payload.invitationId && item.active);
        if (!invitation) throw new Error("La invitación ya no se encuentra disponible.");
        if (normalizeCode(payload.code) !== normalizeCode(invitation.code)) throw new Error("La sesión no corresponde con esta invitación.");
        payload.attendees.forEach((selection) => {
          const attendee = activeAttendees(invitation).find((item) => item.id === selection.id);
          if (attendee) attendee.response = selection.response;
        });
        invitation.status = "SI";
        invitation.respondedAt = new Date().toISOString();
        write(database);
        const model = publicInvitation(invitation);
        model.tableName = invitation.tableName || "";
        return { saved: true, tableName: invitation.tableName || "", invitation: model, constellation: constellation(database) };
      }

      if (action === "adminLogin") {
        if (payload.username !== "admin" || payload.password !== "Cumple2026!") throw new Error("Usuario o contraseña incorrectos.");
        return { token: "demo-admin-token", username: "admin" };
      }

      if (action === "adminDashboard") {
        requireAdmin(payload);
        const invitations = database.invitations.filter((item) => item.active);
        const allAttendees = invitations.flatMap(activeAttendees);
        const totals = counts(allAttendees);
        return {
          invitationTotal: invitations.length,
          attendeeTotal: allAttendees.length,
          confirmed: totals.yes,
          declined: totals.no,
          pending: totals.pending,
          invitations: invitations.map((item) => {
            const group = activeAttendees(item);
            return {
              id: item.id,
              code: item.code,
              primaryName: item.primaryName,
              email: item.email || "",
              phone: item.phone || "",
              salutationDetail: item.salutationDetail || "",
              tableName: item.tableName || "",
              status: item.status,
              attendeeCount: group.length,
              counts: counts(group),
              attendees: group.map((attendee) => ({ ...attendee, tableName: item.tableName || "" })),
              respondedAt: item.respondedAt
            };
          }).reverse()
        };
      }

      if (action === "adminCreateInvitation") {
        requireAdmin(payload);
        const input = normalizeInvitationPayload(payload);
        const code = Math.random().toString(36).slice(2, 10).toUpperCase();
        const invitationId = crypto.randomUUID();
        const names = [input.primaryName, ...input.companions];
        const invitation = {
          id: invitationId,
          code,
          ...input,
          status: "PENDIENTE",
          active: true,
          respondedAt: null,
          attendees: names.map((name, index) => ({
            id: crypto.randomUUID(), name,
            type: index === 0 ? "PRINCIPAL" : "ACOMPANANTE",
            response: "PENDIENTE", active: true
          }))
        };
        database.invitations.push(invitation);
        write(database);
        return { code, invitation: publicInvitation(invitation) };
      }

      if (action === "adminUpdateInvitation") {
        requireAdmin(payload);
        const invitation = database.invitations.find((item) => item.id === payload.invitationId && item.active);
        if (!invitation) throw new Error("La invitación ya no existe o fue eliminada.");
        const input = normalizeInvitationPayload(payload);
        Object.assign(invitation, input);
        const principal = activeAttendees(invitation).find((item) => item.type === "PRINCIPAL");
        if (principal) principal.name = input.primaryName;
        const oldCompanions = activeAttendees(invitation).filter((item) => item.type !== "PRINCIPAL");
        input.companions.forEach((name, index) => {
          if (oldCompanions[index]) oldCompanions[index].name = name;
          else invitation.attendees.push({ id: crypto.randomUUID(), name, type: "ACOMPANANTE", response: "PENDIENTE", active: true });
        });
        oldCompanions.slice(input.companions.length).forEach((item) => { item.active = false; });
        write(database);
        return { updated: true, code: invitation.code };
      }

      if (action === "adminDeleteInvitation") {
        requireAdmin(payload);
        const invitation = database.invitations.find((item) => item.id === payload.invitationId && item.active);
        if (!invitation) throw new Error("La invitación ya fue eliminada.");
        invitation.active = false;
        activeAttendees(invitation).forEach((attendee) => { attendee.active = false; });
        write(database);
        return { deleted: true };
      }

      throw new Error("Acción no disponible en el modo de demostración.");
    }
  };
})();
