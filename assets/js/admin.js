(function () {
  const config = window.INVITATION_CONFIG;
  const state = {
    token: sessionStorage.getItem("birthday-admin-token") || null,
    dashboard: null,
    dashboardPromise: null,
    whatsappInvitation: null,
    shareImageFile: null,
    shareImageUrl: null
  };
  const loginSection = document.getElementById("admin-login");
  const dashboard = document.getElementById("admin-dashboard");
  const loginForm = document.getElementById("admin-login-form");
  const invitationForm = document.getElementById("create-invitation-form");
  const tableBody = document.getElementById("invitation-table-body");
  const salutationSelect = document.getElementById("salutation-detail");
  const honorificSelect = document.getElementById("honorific");
  const customSalutationField = document.getElementById("custom-salutation-field");
  const customSalutation = document.getElementById("custom-salutation");
  const customHonorificField = document.getElementById("custom-honorific-field");
  const customHonorific = document.getElementById("custom-honorific");
  const liveRegion = document.getElementById("admin-live-region");
  const whatsappDialog = document.getElementById("whatsapp-dialog");
  const whatsappSettingsForm = document.getElementById("whatsapp-settings");
  const whatsappStorageKey = "birthday-whatsapp-settings-v1";
  const whatsappImageDatabase = "birthday-whatsapp-assets-v1";
  const predefinedSalutations = [...salutationSelect.options]
    .map((option) => option.value)
    .filter((value) => value && value !== "__otro__");
  const predefinedHonorifics = [...honorificSelect.options]
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

  function defaultWhatsappSettings() {
    const settings = config.whatsapp || {};
    return {
      countryCode: String(settings.defaultCountryCode || "57").replace(/\D/g, ""),
      publicUrl: String(settings.publicUrl || new URL("./", window.location.href).href).trim(),
      messageTemplate: String(settings.messageTemplate || "{{LINK}}\n\nClave: {{CLAVE}}")
    };
  }

  function getWhatsappSettings() {
    try {
      const saved = JSON.parse(localStorage.getItem(whatsappStorageKey));
      return { ...defaultWhatsappSettings(), ...(saved || {}) };
    } catch (_) {
      return defaultWhatsappSettings();
    }
  }

  function fillWhatsappSettingsForm(settings = getWhatsappSettings()) {
    whatsappSettingsForm.countryCode.value = settings.countryCode;
    whatsappSettingsForm.publicUrl.value = settings.publicUrl;
    whatsappSettingsForm.messageTemplate.value = settings.messageTemplate;
  }

  function renderWhatsappMessage(item) {
    const settings = getWhatsappSettings();
    return settings.messageTemplate
      .replace(/{{\s*LINK\s*}}/gi, settings.publicUrl)
      .replace(/{{\s*CLAVE\s*}}/gi, item.code || "")
      .replace(/{{\s*NOMBRE\s*}}/gi, item.primaryName || "");
  }

  function normalizeWhatsappPhone(rawPhone) {
    const settings = getWhatsappSettings();
    let digits = String(rawPhone || "").replace(/\D/g, "");
    const country = String(settings.countryCode || "").replace(/\D/g, "");
    if (digits.startsWith("00")) digits = digits.slice(2);
    if (country === "57" && /^3\d{9}$/.test(digits)) digits = `57${digits}`;
    else if (country && digits && !digits.startsWith(country) && digits.length <= 10) digits = `${country}${digits}`;
    return digits;
  }

  function whatsappUrl(phone, message) {
    return `https://wa.me/${normalizeWhatsappPhone(phone)}?text=${encodeURIComponent(message)}`;
  }

  function attendeeMarkup(attendee) {
    const status = String(attendee.response || "PENDIENTE").toLowerCase();
    const principal = attendee.type === "PRINCIPAL" ? " · principal" : "";
    return `<li><span>${escapeHtml(attendee.name)}${principal}</span><b class="mini-status mini-status-${status}">${responseLabel(attendee.response)}</b></li>`;
  }

  function invitationRow(item) {
    const heading = [item.honorific, item.primaryName].filter(Boolean).join(" ");
    const treatment = item.salutationDetail ? `<span class="treatment">${escapeHtml(item.salutationDetail)}</span>` : "";
    const special = item.cardType === "BIRTHDAY_GIRL" ? '<span class="special-card-chip">Tarjeta cumpleañera</span>' : "";
    const counts = item.counts || { yes: 0, no: 0, pending: 0 };
    return `
      <tr>
        <td>
          <details class="guest-details">
            <summary><span>${escapeHtml(heading)}</span>${treatment}${special}</summary>
            ${item.phone ? `<small class="guest-phone">${escapeHtml(item.phone)}</small>` : '<small class="guest-phone muted">Sin teléfono</small>'}
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
            <button class="icon-button icon-button-whatsapp" type="button" data-action="whatsapp" data-id="${escapeHtml(item.id)}" ${item.phone ? "" : "disabled"} title="${item.phone ? "Preparar envío por WhatsApp" : "Agrega un teléfono para enviar"}">WhatsApp</button>
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

  function updateCustomHonorificVisibility() {
    const custom = honorificSelect.value === "__otro__";
    customHonorificField.hidden = !custom;
    customHonorific.required = custom;
  }

  function selectedSalutation() {
    return salutationSelect.value === "__otro__" ? customSalutation.value.trim() : salutationSelect.value;
  }

  function selectedHonorific() {
    return honorificSelect.value === "__otro__" ? customHonorific.value.trim() : honorificSelect.value;
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

  function setHonorific(value) {
    if (!value) {
      honorificSelect.value = "";
      customHonorific.value = "";
    } else if (predefinedHonorifics.includes(value)) {
      honorificSelect.value = value;
      customHonorific.value = "";
    } else {
      honorificSelect.value = "__otro__";
      customHonorific.value = value;
    }
    updateCustomHonorificVisibility();
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
    setHonorific("Sr/a");
  }

  function startEdit(id) {
    const item = state.dashboard?.invitations.find((invitation) => invitation.id === id);
    if (!item) return;
    invitationForm.invitationId.value = item.id;
    invitationForm.primaryName.value = item.primaryName || "";
    invitationForm.email.value = item.email || "";
    invitationForm.phone.value = item.phone || "";
    invitationForm.tableName.value = item.tableName || "";
    invitationForm.cardType.value = item.cardType || "GUEST";
    invitationForm.companions.value = (item.attendees || [])
      .filter((attendee) => attendee.type !== "PRINCIPAL")
      .map((attendee) => attendee.name)
      .join("\n");
    setSalutation(item.salutationDetail || "");
    setHonorific(item.honorific || "SIN_TRATAMIENTO");
    document.getElementById("form-eyebrow").textContent = "Editar invitación";
    document.getElementById("create-title").textContent = item.primaryName;
    document.querySelector("#save-invitation .button-label").textContent = "Guardar cambios";
    document.getElementById("cancel-edit").hidden = false;
    document.querySelector(".create-panel").scrollIntoView({ behavior: "smooth", block: "start" });
    invitationForm.primaryName.focus({ preventScroll: true });
  }

  async function copyText(text) {
    const value = String(text || "");
    if (navigator.clipboard?.write && window.ClipboardItem) {
      await navigator.clipboard.write([new ClipboardItem({ "text/plain": new Blob([value], { type: "text/plain;charset=utf-8" }) })]);
    } else if (navigator.clipboard?.writeText) await navigator.clipboard.writeText(value);
    else {
      const area = document.createElement("textarea");
      area.value = value;
      area.setAttribute("readonly", "");
      area.style.position = "fixed";
      area.style.opacity = "0";
      document.body.appendChild(area);
      area.select();
      document.execCommand("copy");
      area.remove();
    }
  }

  function openWhatsappImageDatabase() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(whatsappImageDatabase, 1);
      request.onupgradeneeded = () => request.result.createObjectStore("assets");
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async function imageStore(action, value) {
    const database = await openWhatsappImageDatabase();
    return new Promise((resolve, reject) => {
      const transaction = database.transaction("assets", action === "get" ? "readonly" : "readwrite");
      const store = transaction.objectStore("assets");
      const request = action === "get" ? store.get("whatsapp-image") : action === "delete" ? store.delete("whatsapp-image") : store.put(value, "whatsapp-image");
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
      transaction.oncomplete = () => database.close();
    });
  }

  async function optimizeWhatsappImage(file) {
    if (!file || !file.type.startsWith("image/")) throw new Error("Selecciona una imagen PNG, JPG o WebP.");
    let source;
    let temporaryUrl = "";
    if (typeof createImageBitmap === "function") source = await createImageBitmap(file);
    else {
      temporaryUrl = URL.createObjectURL(file);
      source = await new Promise((resolve, reject) => {
        const image = new Image();
        image.onload = () => resolve(image);
        image.onerror = () => reject(new Error("No fue posible leer la imagen seleccionada."));
        image.src = temporaryUrl;
      });
    }
    const scale = Math.min(1, 1600 / Math.max(source.width, source.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(source.width * scale));
    canvas.height = Math.max(1, Math.round(source.height * scale));
    const context = canvas.getContext("2d", { alpha: false });
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(source, 0, 0, canvas.width, canvas.height);
    if (typeof source.close === "function") source.close();
    if (temporaryUrl) URL.revokeObjectURL(temporaryUrl);
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", .9));
    if (!blob) throw new Error("No fue posible preparar la imagen.");
    return { blob, name: file.name.replace(/\.[^.]+$/, "") + ".jpg" };
  }

  function applyWhatsappImage(blob, name) {
    if (state.shareImageUrl) URL.revokeObjectURL(state.shareImageUrl);
    state.shareImageFile = new File([blob], name || "invitacion-50-anos.jpg", { type: blob.type || "image/jpeg" });
    state.shareImageUrl = URL.createObjectURL(blob);
    document.getElementById("whatsapp-preview-image").src = state.shareImageUrl;
    document.getElementById("whatsapp-settings-image-preview").src = state.shareImageUrl;
    const download = document.getElementById("download-whatsapp-image");
    download.href = state.shareImageUrl;
    download.download = state.shareImageFile.name;
  }

  async function loadWhatsappImage() {
    if (state.shareImageFile) return state.shareImageFile;
    try {
      const stored = await imageStore("get");
      if (stored?.blob) {
        applyWhatsappImage(stored.blob, stored.name);
        return state.shareImageFile;
      }
    } catch (_) { /* IndexedDB puede estar bloqueado en navegación privada. */ }
    const imageUrl = config.whatsapp?.imageUrl || "assets/images/invitacion-whatsapp.jpg";
    const response = await fetch(imageUrl, { cache: "force-cache" });
    if (!response.ok) throw new Error("No fue posible cargar la imagen de la invitación.");
    applyWhatsappImage(await response.blob(), "invitacion-50-anos.jpg");
    return state.shareImageFile;
  }

  async function getShareImageFile() {
    return loadWhatsappImage();
  }

  async function openWhatsappDialog(item) {
    state.whatsappInvitation = item;
    document.getElementById("whatsapp-recipient-name").textContent = `${item.primaryName} · clave ${item.code}`;
    document.getElementById("whatsapp-recipient-phone").value = item.phone || "";
    document.getElementById("whatsapp-message-preview").value = renderWhatsappMessage(item);
    document.getElementById("whatsapp-phone-help").textContent = `Se enviará a +${normalizeWhatsappPhone(item.phone)}. Puedes corregirlo antes de abrir el chat.`;
    document.getElementById("whatsapp-dialog-error").textContent = "";
    const shareButton = document.getElementById("share-whatsapp-package");
    shareButton.hidden = !(navigator.share && navigator.canShare);
    loadWhatsappImage().catch((error) => { document.getElementById("whatsapp-dialog-error").textContent = error.message; });
    if (typeof whatsappDialog.showModal === "function") whatsappDialog.showModal();
    else whatsappDialog.setAttribute("open", "");
  }

  function closeWhatsappDialog() {
    if (typeof whatsappDialog.close === "function") whatsappDialog.close();
    else whatsappDialog.removeAttribute("open");
    state.whatsappInvitation = null;
  }

  function currentWhatsappDraft() {
    const phoneInput = document.getElementById("whatsapp-recipient-phone");
    const phone = normalizeWhatsappPhone(phoneInput.value);
    const message = document.getElementById("whatsapp-message-preview").value.trim();
    if (phone.length < 10) throw new Error("Escribe un número válido con código de país.");
    if (!message) throw new Error("El mensaje no puede estar vacío.");
    document.getElementById("whatsapp-phone-help").textContent = `Destino final: +${phone}`;
    return { phone, message };
  }

  buildStars();
  if (config.apiMode !== "mock") document.querySelectorAll(".demo-only").forEach((element) => { element.hidden = true; });

  salutationSelect.addEventListener("change", updateCustomSalutationVisibility);
  honorificSelect.addEventListener("change", updateCustomHonorificVisibility);
  fillWhatsappSettingsForm();
  loadWhatsappImage().catch(() => {});

  document.getElementById("toggle-whatsapp-settings").addEventListener("click", (event) => {
    const opening = whatsappSettingsForm.hidden;
    whatsappSettingsForm.hidden = !opening;
    event.currentTarget.setAttribute("aria-expanded", String(opening));
    event.currentTarget.textContent = opening ? "Ocultar configuración" : "Configurar mensaje";
  });

  whatsappSettingsForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const settings = {
      countryCode: whatsappSettingsForm.countryCode.value.replace(/\D/g, ""),
      publicUrl: whatsappSettingsForm.publicUrl.value.trim(),
      messageTemplate: whatsappSettingsForm.messageTemplate.value
    };
    if (!settings.messageTemplate.includes("{{LINK}}") || !settings.messageTemplate.includes("{{CLAVE}}")) {
      document.getElementById("whatsapp-settings-status").textContent = "La plantilla debe conservar {{LINK}} y {{CLAVE}}.";
      return;
    }
    localStorage.setItem(whatsappStorageKey, JSON.stringify(settings));
    document.getElementById("whatsapp-settings-status").textContent = "Configuración guardada en este dispositivo.";
    announce("Configuración de WhatsApp guardada.");
  });

  document.getElementById("reset-whatsapp-settings").addEventListener("click", () => {
    localStorage.removeItem(whatsappStorageKey);
    fillWhatsappSettingsForm(defaultWhatsappSettings());
    document.getElementById("whatsapp-settings-status").textContent = "Se restauró el mensaje original.";
  });

  document.getElementById("whatsapp-image-picker").addEventListener("change", async (event) => {
    const file = event.currentTarget.files?.[0];
    if (!file) return;
    const status = document.getElementById("whatsapp-settings-status");
    status.textContent = "Preparando imagen…";
    try {
      const prepared = await optimizeWhatsappImage(file);
      await imageStore("put", prepared);
      applyWhatsappImage(prepared.blob, prepared.name);
      status.textContent = "Imagen guardada y optimizada en este dispositivo.";
      announce("Nueva imagen de WhatsApp seleccionada.");
    } catch (error) {
      status.textContent = error.message;
    } finally {
      event.currentTarget.value = "";
    }
  });

  document.getElementById("reset-whatsapp-image").addEventListener("click", async () => {
    try { await imageStore("delete"); } catch (_) { /* Puede estar bloqueado en modo privado. */ }
    if (state.shareImageUrl) URL.revokeObjectURL(state.shareImageUrl);
    state.shareImageFile = null;
    state.shareImageUrl = null;
    const defaultUrl = config.whatsapp?.imageUrl || "assets/images/invitacion-whatsapp.jpg";
    document.getElementById("whatsapp-preview-image").src = defaultUrl;
    document.getElementById("whatsapp-settings-image-preview").src = defaultUrl;
    document.getElementById("download-whatsapp-image").href = defaultUrl;
    await loadWhatsappImage();
    document.getElementById("whatsapp-settings-status").textContent = "Se restauró la imagen original.";
  });

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
        honorific: selectedHonorific(),
        salutationDetail: selectedSalutation(),
        tableName: invitationForm.tableName.value.trim(),
        cardType: invitationForm.cardType.value,
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
    if (button.dataset.action === "whatsapp") {
      openWhatsappDialog(item);
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
  document.getElementById("close-whatsapp-dialog").addEventListener("click", closeWhatsappDialog);
  whatsappDialog.addEventListener("click", (event) => {
    if (event.target === whatsappDialog) closeWhatsappDialog();
  });
  document.getElementById("whatsapp-recipient-phone").addEventListener("input", (event) => {
    const normalized = normalizeWhatsappPhone(event.currentTarget.value);
    document.getElementById("whatsapp-phone-help").textContent = normalized ? `Destino final: +${normalized}` : "Escribe el número del destinatario.";
  });
  document.getElementById("open-whatsapp-chat").addEventListener("click", () => {
    const error = document.getElementById("whatsapp-dialog-error");
    error.textContent = "";
    try {
      const draft = currentWhatsappDraft();
      window.open(whatsappUrl(draft.phone, draft.message), "_blank", "noopener,noreferrer");
      announce(`Chat de ${state.whatsappInvitation?.primaryName || "invitado"} preparado en WhatsApp.`);
    } catch (requestError) {
      error.textContent = requestError.message;
    }
  });
  document.getElementById("copy-whatsapp-message").addEventListener("click", async () => {
    const error = document.getElementById("whatsapp-dialog-error");
    error.textContent = "";
    try {
      const draft = currentWhatsappDraft();
      await copyText(draft.message);
      announce("Mensaje de WhatsApp copiado con sus emojis.");
    } catch (requestError) {
      error.textContent = requestError.message;
    }
  });
  document.getElementById("share-whatsapp-package").addEventListener("click", async () => {
    const error = document.getElementById("whatsapp-dialog-error");
    error.textContent = "";
    try {
      const draft = currentWhatsappDraft();
      const imageFile = await getShareImageFile();
      if (!navigator.canShare({ files: [imageFile] })) throw new Error("Este navegador no permite compartir archivos. Usa “Descargar imagen” y luego abre WhatsApp.");
      await navigator.share({ title: "Invitación · Celebrando mis 50 años", text: draft.message, files: [imageFile] });
      announce("Imagen y mensaje preparados para compartir.");
    } catch (requestError) {
      if (requestError.name !== "AbortError") error.textContent = requestError.message;
    }
  });
  document.getElementById("cancel-edit").addEventListener("click", resetInvitationForm);
  document.getElementById("refresh-dashboard").addEventListener("click", loadDashboard);
  document.getElementById("admin-logout").addEventListener("click", logout);

  if (state.token) {
    showDashboard(true);
    loadDashboard();
  }
})();
