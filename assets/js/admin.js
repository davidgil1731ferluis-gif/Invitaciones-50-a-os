(function () {
  const config = window.INVITATION_CONFIG;
  const state = {
    token: sessionStorage.getItem("birthday-admin-token") || null,
    dashboard: null,
    dashboardPromise: null
  };
  const loginSection = document.getElementById("admin-login");
  const dashboard = document.getElementById("admin-dashboard");
  const loginForm = document.getElementById("admin-login-form");
  const invitationForm = document.getElementById("create-invitation-form");
  const tableBody = document.getElementById("invitation-table-body");
  const salutationSelect = document.getElementById("salutation-detail");
  const customSalutationField = document.getElementById("custom-salutation-field");
  const customSalutation = document.getElementById("custom-salutation");
  const liveRegion = document.getElementById("admin-live-region");
  const predefinedSalutations = [...salutationSelect.options]
    .map((option) => option.value)
    .filter((value) => value && value !== "__otro__");

  function announce(message) { liveRegion.textContent = message; }

  function setLoading(form, loading) {
    form.classList.toggle("is-loading", loading);
    [...form.elements].forEach((element) => { element.disabled = loading; });
  }

  function buildStars() {
    const container = document.getElementById("stars");
    for (let index = 0; index < 44; index += 1) {
      const star = document.createElement("i");
      const size = Math.random() * 2.4 + 1;
      star.style.cssText = `left:${Math.random() * 100}%;top:${Math.random() * 75}%;width:${size}px;height:${size}px;animation-delay:${Math.random() * 4}s`;
      container.appendChild(star);
    }
  }

  function showDashboard(show) {
    loginSection.hidden = show;
    dashboard.hidden = !show;
  }

  function statusLabel(status) {
    return status === "SI" ? "Confirmó" : status === "NO" ? "No asistirá" : "Pendiente";
  }

  function responseLabel(status) {
    return status === "SI" ? "Sí" : status === "NO" ? "No" : "Pendiente";
  }

  function formatDate(value) {
    if (!value) return "—";
    return new Intl.DateTimeFormat("es-CO", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
  }

  function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>'"]/g, (character) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;"
    })[character]);
  }

  function attendeeMarkup(attendee) {
    const status = String(attendee.response || "PENDIENTE").toLowerCase();
    const principal = attendee.type === "PRINCIPAL" ? " · principal" : "";
    return `<li><span>${escapeHtml(attendee.name)}${principal}</span><b class="mini-status mini-status-${status}">${responseLabel(attendee.response)}</b></li>`;
  }

  function invitationRow(item) {
    const treatment = item.salutationDetail ? `<span class="treatment">${escapeHtml(item.salutationDetail)}</span>` : "";
    const counts = item.counts || { yes: 0, no: 0, pending: 0 };
    return `
      <tr>
        <td>
          <details class="guest-details">
            <summary><span>${escapeHtml(item.primaryName)}</span>${treatment}</summary>
            <ul>${(item.attendees || []).map(attendeeMarkup).join("")}</ul>
          </details>
        </td>
        <td><code>${escapeHtml(item.code)}</code></td>
        <td>${item.tableName ? `<span class="table-badge">${escapeHtml(item.tableName)}</span>` : '<span class="muted">Sin asignar</span>'}</td>
        <td><div class="count-chips"><span class="yes">Sí ${Number(counts.yes || 0)}</span><span class="no">No ${Number(counts.no || 0)}</span><span>Pend. ${Number(counts.pending || 0)}</span></div></td>
        <td><span class="status status-${String(item.status).toLowerCase()}">${statusLabel(item.status)}</span></td>
        <td>${formatDate(item.respondedAt)}</td>
        <td>
          <div class="row-actions">
            <button class="icon-button" type="button" data-action="copy" data-id="${escapeHtml(item.id)}" title="Copiar código">Copiar</button>
            <button class="icon-button" type="button" data-action="edit" data-id="${escapeHtml(item.id)}">Editar</button>
            <button class="icon-button icon-button-danger" type="button" data-action="delete" data-id="${escapeHtml(item.id)}">Eliminar</button>
          </div>
        </td>
      </tr>`;
  }

  async function loadDashboard() {
    if (state.dashboardPromise) return state.dashboardPromise;
    const error = document.getElementById("dashboard-error");
    const refresh = document.getElementById("refresh-dashboard");
    error.textContent = "";
    refresh.disabled = true;
    tableBody.setAttribute("aria-busy", "true");
    state.dashboardPromise = (async () => {
      try {
        const data = await window.InvitationApi.request("adminDashboard", { token: state.token });
        state.dashboard = data;
        document.getElementById("metric-invitations").textContent = data.invitationTotal;
        document.getElementById("metric-total").textContent = data.attendeeTotal;
        document.getElementById("metric-confirmed").textContent = data.confirmed;
        document.getElementById("metric-declined").textContent = data.declined;
        document.getElementById("metric-pending").textContent = data.pending;
        tableBody.innerHTML = data.invitations.length
          ? data.invitations.map(invitationRow).join("")
          : '<tr class="empty-row"><td colspan="7">Aún no hay invitaciones registradas.</td></tr>';
      } catch (requestError) {
        error.textContent = requestError.message;
        if (/sesión|session/i.test(requestError.message)) logout();
      } finally {
        refresh.disabled = false;
        tableBody.removeAttribute("aria-busy");
        state.dashboardPromise = null;
      }
    })();
    return state.dashboardPromise;
  }

  function logout() {
    state.token = null;
    state.dashboard = null;
    sessionStorage.removeItem("birthday-admin-token");
    showDashboard(false);
  }

  function updateCustomSalutationVisibility() {
    const custom = salutationSelect.value === "__otro__";
    customSalutationField.hidden = !custom;
    customSalutation.required = custom;
  }

  function selectedSalutation() {
    return salutationSelect.value === "__otro__" ? customSalutation.value.trim() : salutationSelect.value;
  }

  function setSalutation(value) {
    if (!value) {
      salutationSelect.value = "";
      customSalutation.value = "";
    } else if (predefinedSalutations.includes(value)) {
      salutationSelect.value = value;
      customSalutation.value = "";
    } else {
      salutationSelect.value = "__otro__";
      customSalutation.value = value;
    }
    updateCustomSalutationVisibility();
  }

  function resetInvitationForm() {
    invitationForm.reset();
    invitationForm.invitationId.value = "";
    document.getElementById("form-eyebrow").textContent = "Nueva invitación";
    document.getElementById("create-title").textContent = "Registrar invitado";
    document.querySelector("#save-invitation .button-label").textContent = "Registrar y generar código";
    document.getElementById("cancel-edit").hidden = true;
    document.getElementById("create-error").textContent = "";
    setSalutation("");
  }

  function startEdit(id) {
    const item = state.dashboard?.invitations.find((invitation) => invitation.id === id);
    if (!item) return;
    invitationForm.invitationId.value = item.id;
    invitationForm.primaryName.value = item.primaryName || "";
    invitationForm.email.value = item.email || "";
    invitationForm.phone.value = item.phone || "";
    invitationForm.tableName.value = item.tableName || "";
    invitationForm.companions.value = (item.attendees || [])
      .filter((attendee) => attendee.type !== "PRINCIPAL")
      .map((attendee) => attendee.name)
      .join("\n");
    setSalutation(item.salutationDetail || "");
    document.getElementById("form-eyebrow").textContent = "Editar invitación";
    document.getElementById("create-title").textContent = item.primaryName;
    document.querySelector("#save-invitation .button-label").textContent = "Guardar cambios";
    document.getElementById("cancel-edit").hidden = false;
    document.querySelector(".create-panel").scrollIntoView({ behavior: "smooth", block: "start" });
    invitationForm.primaryName.focus({ preventScroll: true });
  }

  async function copyText(text) {
    if (navigator.clipboard?.writeText) await navigator.clipboard.writeText(text);
    else {
      const area = document.createElement("textarea");
      area.value = text;
      document.body.appendChild(area);
      area.select();
      document.execCommand("copy");
      area.remove();
    }
  }

  buildStars();
  if (config.apiMode !== "mock") document.querySelectorAll(".demo-only").forEach((element) => { element.hidden = true; });

  salutationSelect.addEventListener("change", updateCustomSalutationVisibility);

  loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const error = document.getElementById("login-error");
    error.textContent = "";
    setLoading(loginForm, true);
    try {
      const result = await window.InvitationApi.request("adminLogin", {
        username: loginForm.username.value.trim(),
        password: loginForm.password.value
      });
      state.token = result.token;
      sessionStorage.setItem("birthday-admin-token", result.token);
      loginForm.password.value = "";
      showDashboard(true);
      await loadDashboard();
      announce("Sesión administrativa iniciada.");
    } catch (requestError) {
      error.textContent = requestError.message;
    } finally {
      setLoading(loginForm, false);
    }
  });

  invitationForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const error = document.getElementById("create-error");
    const invitationId = invitationForm.invitationId.value;
    const companions = invitationForm.companions.value.split(/\r?\n/).map((name) => name.trim()).filter(Boolean);
    error.textContent = "";
    setLoading(invitationForm, true);
    try {
      const action = invitationId ? "adminUpdateInvitation" : "adminCreateInvitation";
      const result = await window.InvitationApi.request(action, {
        token: state.token,
        invitationId,
        primaryName: invitationForm.primaryName.value.trim(),
        email: invitationForm.email.value.trim(),
        phone: invitationForm.phone.value.trim(),
        salutationDetail: selectedSalutation(),
        tableName: invitationForm.tableName.value.trim(),
        companions
      });
      const code = result.code;
      document.getElementById("generated-code-value").textContent = code;
      document.getElementById("generated-code").hidden = false;
      resetInvitationForm();
      await loadDashboard();
      announce(invitationId ? "Invitación actualizada correctamente." : `Invitación creada. Código ${code}.`);
    } catch (requestError) {
      error.textContent = requestError.message;
    } finally {
      setLoading(invitationForm, false);
    }
  });

  tableBody.addEventListener("click", async (event) => {
    const button = event.target.closest("button[data-action]");
    if (!button) return;
    const item = state.dashboard?.invitations.find((invitation) => invitation.id === button.dataset.id);
    if (!item) return;
    if (button.dataset.action === "edit") {
      startEdit(item.id);
      return;
    }
    if (button.dataset.action === "copy") {
      await copyText(item.code);
      announce(`Código ${item.code} copiado.`);
      return;
    }
    if (button.dataset.action === "delete") {
      const accepted = window.confirm(`¿Eliminar la invitación de ${item.primaryName} y sus acompañantes? Esta acción la ocultará del panel y desactivará su clave.`);
      if (!accepted) return;
      button.disabled = true;
      try {
        await window.InvitationApi.request("adminDeleteInvitation", { token: state.token, invitationId: item.id });
        if (invitationForm.invitationId.value === item.id) resetInvitationForm();
        await loadDashboard();
        announce("Invitación eliminada y clave desactivada.");
      } catch (requestError) {
        document.getElementById("dashboard-error").textContent = requestError.message;
        button.disabled = false;
      }
    }
  });

  document.getElementById("copy-code").addEventListener("click", async () => {
    const code = document.getElementById("generated-code-value").textContent;
    await copyText(code);
    announce("Código copiado.");
  });
  document.getElementById("cancel-edit").addEventListener("click", resetInvitationForm);
  document.getElementById("refresh-dashboard").addEventListener("click", loadDashboard);
  document.getElementById("admin-logout").addEventListener("click", logout);

  if (state.token) {
    showDashboard(true);
    loadDashboard();
  }
})();
