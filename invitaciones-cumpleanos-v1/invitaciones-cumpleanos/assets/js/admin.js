(function () {
  const config = window.INVITATION_CONFIG;
  const state = { token: sessionStorage.getItem("birthday-admin-token") || null };
  const loginSection = document.getElementById("admin-login");
  const dashboard = document.getElementById("admin-dashboard");
  const loginForm = document.getElementById("admin-login-form");
  const createForm = document.getElementById("create-invitation-form");
  const liveRegion = document.getElementById("admin-live-region");

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
    return status === "SI" ? "Confirmada" : status === "NO" ? "No asistirá" : "Pendiente";
  }
  function formatDate(value) {
    if (!value) return "—";
    return new Intl.DateTimeFormat("es-CO", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
  }
  function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>'"]/g, (character) => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", "'":"&#39;", '"':"&quot;" })[character]);
  }

  async function loadDashboard() {
    const error = document.getElementById("dashboard-error");
    error.textContent = "";
    try {
      const data = await window.InvitationApi.request("adminDashboard", { token: state.token });
      document.getElementById("metric-total").textContent = data.total;
      document.getElementById("metric-confirmed").textContent = data.confirmed;
      document.getElementById("metric-declined").textContent = data.declined;
      document.getElementById("metric-pending").textContent = data.pending;
      const tbody = document.getElementById("invitation-table-body");
      if (!data.invitations.length) {
        tbody.innerHTML = '<tr class="empty-row"><td colspan="5">Aún no hay invitaciones registradas.</td></tr>';
      } else {
        tbody.innerHTML = data.invitations.map((item) => `
          <tr>
            <td>${escapeHtml(item.primaryName)}</td>
            <td><code>${escapeHtml(item.code)}</code></td>
            <td>${Number(item.attendeeCount || 0)}</td>
            <td><span class="status status-${String(item.status).toLowerCase()}">${statusLabel(item.status)}</span></td>
            <td>${formatDate(item.respondedAt)}</td>
          </tr>`).join("");
      }
    } catch (requestError) {
      error.textContent = requestError.message;
      if (/sesión|session/i.test(requestError.message)) logout();
    }
  }

  function logout() {
    state.token = null;
    sessionStorage.removeItem("birthday-admin-token");
    showDashboard(false);
  }

  buildStars();
  if (config.apiMode !== "mock") document.querySelectorAll(".demo-only").forEach((element) => { element.hidden = true; });

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

  createForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const error = document.getElementById("create-error");
    error.textContent = "";
    const companions = createForm.companions.value.split(/\r?\n/).map((name) => name.trim()).filter(Boolean);
    setLoading(createForm, true);
    try {
      const result = await window.InvitationApi.request("adminCreateInvitation", {
        token: state.token,
        primaryName: createForm.primaryName.value.trim(),
        email: createForm.email.value.trim(),
        phone: createForm.phone.value.trim(),
        companions
      });
      document.getElementById("generated-code-value").textContent = result.code;
      document.getElementById("generated-code").hidden = false;
      createForm.reset();
      await loadDashboard();
      announce(`Invitación creada. Código ${result.code}.`);
    } catch (requestError) {
      error.textContent = requestError.message;
    } finally {
      setLoading(createForm, false);
    }
  });

  document.getElementById("copy-code").addEventListener("click", async () => {
    const code = document.getElementById("generated-code-value").textContent;
    await navigator.clipboard.writeText(code);
    announce("Código copiado.");
  });
  document.getElementById("refresh-dashboard").addEventListener("click", loadDashboard);
  document.getElementById("admin-logout").addEventListener("click", logout);

  if (state.token) {
    showDashboard(true);
    loadDashboard();
  }
})();
