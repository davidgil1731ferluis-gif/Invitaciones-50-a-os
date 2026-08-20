(function () {
  const STORAGE_KEY = "birthday-guest-sessions-v2";
  const ACTIVE_KEY = "birthday-active-guest-code-v2";

  function normalizeCode(value) {
    return String(value || "").trim().toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 12);
  }

  function readSessions() {
    try {
      const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY));
      return parsed && typeof parsed === "object" ? parsed : {};
    } catch (_) {
      return {};
    }
  }

  function writeSessions(sessions) {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions)); } catch (_) { /* Almacenamiento bloqueado. */ }
  }

  function validSessions() {
    const sessions = readSessions();
    const now = Date.now();
    let changed = false;
    Object.keys(sessions).forEach((code) => {
      if (!sessions[code]?.invitation || Number(sessions[code]?.expiresAt) <= now) {
        delete sessions[code];
        changed = true;
      }
    });
    if (changed) writeSessions(sessions);
    return sessions;
  }

  function save(code, invitation, durationMs) {
    const normalized = normalizeCode(code);
    if (!normalized || !invitation?.id) return;
    const sessions = validSessions();
    sessions[normalized] = {
      code: normalized,
      invitation,
      updatedAt: Date.now(),
      expiresAt: Date.now() + durationMs
    };
    const ordered = Object.entries(sessions).sort((left, right) => Number(right[1].updatedAt) - Number(left[1].updatedAt));
    writeSessions(Object.fromEntries(ordered.slice(0, 20)));
    try { sessionStorage.setItem(ACTIVE_KEY, normalized); } catch (_) { /* La pestaña sigue funcionando sin persistencia. */ }
  }

  function readActive() {
    const sessions = validSessions();
    let activeCode = "";
    try { activeCode = normalizeCode(sessionStorage.getItem(ACTIVE_KEY)); } catch (_) { /* Sin sessionStorage. */ }
    if (activeCode && sessions[activeCode]) return sessions[activeCode];
    const mostRecent = Object.values(sessions).sort((left, right) => Number(right.updatedAt) - Number(left.updatedAt))[0] || null;
    if (mostRecent) {
      try { sessionStorage.setItem(ACTIVE_KEY, mostRecent.code); } catch (_) { /* Sin sessionStorage. */ }
    }
    return mostRecent;
  }

  function clearActive(code) {
    const normalized = normalizeCode(code);
    const sessions = validSessions();
    if (normalized) delete sessions[normalized];
    writeSessions(sessions);
    try { sessionStorage.removeItem(ACTIVE_KEY); } catch (_) { /* Sin sessionStorage. */ }
  }

  function activate(code) {
    const normalized = normalizeCode(code);
    if (!normalized) return;
    try { sessionStorage.setItem(ACTIVE_KEY, normalized); } catch (_) { /* Sin sessionStorage. */ }
  }

  window.GuestSessionStore = Object.freeze({ save, readActive, clearActive, activate, normalizeCode });
})();
