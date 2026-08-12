(function () {
  const config = window.INVITATION_CONFIG;
  const pending = new Map();
  let bridgeReady = false;
  let bridgeOrigin = null;
  let requestSequence = 0;

  function appsScriptConfigured() {
    return config.appsScriptUrl && !config.appsScriptUrl.includes("PEGA_AQUI");
  }

  function allowedBridgeOrigin(origin) {
    try {
      const host = new URL(origin).hostname;
      return host === "script.google.com" || host.endsWith(".googleusercontent.com");
    } catch (_) {
      return false;
    }
  }

  function setupBridge() {
    if (config.apiMode !== "apps-script") return;
    if (!appsScriptConfigured()) throw new Error("Debes configurar la URL del Apps Script antes de activar la integración.");

    const iframe = document.getElementById("api-bridge");
    iframe.src = config.appsScriptUrl;

    window.addEventListener("message", (event) => {
      if (event.source !== iframe.contentWindow || !allowedBridgeOrigin(event.origin)) return;
      const message = event.data || {};

      if (message.type === "bridge-ready") {
        bridgeOrigin = event.origin;
        bridgeReady = true;
        window.dispatchEvent(new CustomEvent("invitation-api-ready"));
        return;
      }

      if (message.type !== "api-response" || !message.id || !pending.has(message.id)) return;
      const request = pending.get(message.id);
      pending.delete(message.id);
      clearTimeout(request.timeout);
      if (message.ok) request.resolve(message.data);
      else request.reject(new Error(message.error || "No fue posible completar la solicitud."));
    });
  }

  function waitForBridge() {
    if (bridgeReady) return Promise.resolve();
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error("No fue posible conectar con el registro de invitaciones.")), 12000);
      window.addEventListener("invitation-api-ready", () => {
        clearTimeout(timeout);
        resolve();
      }, { once: true });
    });
  }

  async function bridgeRequest(action, payload) {
    await waitForBridge();
    const iframe = document.getElementById("api-bridge");
    const id = `request-${Date.now()}-${++requestSequence}`;

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        pending.delete(id);
        reject(new Error("La solicitud tardó demasiado. Intenta nuevamente."));
      }, 15000);

      pending.set(id, { resolve, reject, timeout });
      iframe.contentWindow.postMessage({ type: "api-request", id, action, payload }, bridgeOrigin);
    });
  }

  setupBridge();

  window.InvitationApi = {
    request(action, payload = {}) {
      if (config.apiMode === "mock") return window.MockInvitationApi.request(action, payload);
      return bridgeRequest(action, payload);
    }
  };
})();
