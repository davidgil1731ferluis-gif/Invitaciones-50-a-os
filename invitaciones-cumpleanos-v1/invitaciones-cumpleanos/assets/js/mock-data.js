(function () {
  const STORAGE_KEY = "birthday-invitation-demo";
  const seed = {
    invitations: [
      {
        id: "inv-demo-1",
        code: "MAGIA26",
        primaryName: "Valentina",
        email: "",
        phone: "",
        status: "PENDIENTE",
        active: true,
        accessedAt: null,
        respondedAt: null,
        attendees: [
          { id: "att-1", name: "Valentina", type: "PRINCIPAL", response: "PENDIENTE" },
          { id: "att-2", name: "Andrea", type: "ACOMPANANTE", response: "PENDIENTE" },
          { id: "att-3", name: "Mateo", type: "ACOMPANANTE", response: "PENDIENTE" }
        ]
      }
    ]
  };

  function read() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
      return saved && Array.isArray(saved.invitations) ? saved : structuredClone(seed);
    } catch (_) {
      return structuredClone(seed);
    }
  }

  function write(data) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }

  function normalizeCode(value) {
    return String(value || "").trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
  }

  function publicInvitation(invitation) {
    return {
      id: invitation.id,
      primaryName: invitation.primaryName,
      status: invitation.status,
      attendees: invitation.attendees.map(({ id, name, type, response }) => ({ id, name, type, response }))
    };
  }

  window.MockInvitationApi = {
    async request(action, payload) {
      await new Promise((resolve) => setTimeout(resolve, 420));
      const database = read();

      if (action === "getInvitation") {
        const code = normalizeCode(payload.code);
        const invitation = database.invitations.find((item) => item.code === code && item.active);
        if (!invitation) throw new Error("No encontramos una invitación activa con esa clave.");
        invitation.accessedAt = new Date().toISOString();
        write(database);
        return publicInvitation(invitation);
      }

      if (action === "saveMainResponse") {
        const invitation = database.invitations.find((item) => item.id === payload.invitationId && item.active);
        if (!invitation) throw new Error("La invitación ya no se encuentra disponible.");
        invitation.status = payload.response;
        invitation.respondedAt = new Date().toISOString();
        const principal = invitation.attendees.find((item) => item.type === "PRINCIPAL");
        if (principal) principal.response = payload.response;
        if (payload.response === "NO") {
          invitation.attendees.forEach((item) => { item.response = "NO"; });
        }
        write(database);
        return { saved: true, invitation: publicInvitation(invitation) };
      }

      if (action === "saveAttendees") {
        const invitation = database.invitations.find((item) => item.id === payload.invitationId && item.active);
        if (!invitation) throw new Error("La invitación ya no se encuentra disponible.");
        payload.attendees.forEach((selection) => {
          const attendee = invitation.attendees.find((item) => item.id === selection.id);
          if (attendee) attendee.response = selection.response;
        });
        invitation.status = "SI";
        invitation.respondedAt = new Date().toISOString();
        write(database);
        return { saved: true };
      }

      if (action === "adminLogin") {
        if (payload.username !== "admin" || payload.password !== "Cumple2026!") {
          throw new Error("Usuario o contraseña incorrectos.");
        }
        return { token: "demo-admin-token", username: "admin" };
      }

      if (action === "adminDashboard") {
        if (payload.token !== "demo-admin-token") throw new Error("La sesión administrativa no es válida.");
        const invitations = database.invitations;
        return {
          total: invitations.length,
          confirmed: invitations.filter((item) => item.status === "SI").length,
          declined: invitations.filter((item) => item.status === "NO").length,
          pending: invitations.filter((item) => item.status === "PENDIENTE").length,
          invitations: invitations.map((item) => ({
            id: item.id,
            code: item.code,
            primaryName: item.primaryName,
            status: item.status,
            active: item.active,
            attendeeCount: item.attendees.length,
            respondedAt: item.respondedAt
          }))
        };
      }

      if (action === "adminCreateInvitation") {
        if (payload.token !== "demo-admin-token") throw new Error("La sesión administrativa no es válida.");
        const code = Math.random().toString(36).slice(2, 10).toUpperCase();
        const invitationId = crypto.randomUUID();
        const names = [payload.primaryName, ...(payload.companions || [])].filter(Boolean);
        const invitation = {
          id: invitationId,
          code,
          primaryName: payload.primaryName,
          email: payload.email || "",
          phone: payload.phone || "",
          status: "PENDIENTE",
          active: true,
          accessedAt: null,
          respondedAt: null,
          attendees: names.map((name, index) => ({
            id: crypto.randomUUID(),
            name,
            type: index === 0 ? "PRINCIPAL" : "ACOMPANANTE",
            response: "PENDIENTE"
          }))
        };
        database.invitations.push(invitation);
        write(database);
        return { code, invitation: publicInvitation(invitation) };
      }

      throw new Error("Acción no disponible en el modo de demostración.");
    }
  };
})();
