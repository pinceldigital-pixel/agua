// AguApp - lógica de UI
(() => {
  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => Array.from(document.querySelectorAll(sel));

  // --- Estado ---
  let state = {
    totalMl: parseInt(localStorage.getItem("totalMl") || "0", 10),
    goalMl: parseInt(localStorage.getItem("goalMl") || "2000", 10),
    selected: parseInt(localStorage.getItem("selected") || "250", 10),
    history: JSON.parse(localStorage.getItem("history") || "[]"),
    lastNotifyAt: parseInt(localStorage.getItem("lastNotifyAt") || "0", 10),
    reminders: JSON.parse(localStorage.getItem("reminders") || JSON.stringify({
      enabled: true,
      intervalMin: 90,
      start: "09:00",
      end: "20:00"
    }))
  };

  // --- Elementos ---
  const el = {
    water: $("#water"),
    pct: $("#pct"),
    nowMl: $("#nowMl"),
    goalMl: $("#goalMl"),
    add: $("#add"),
    undo: $("#undo"),
    chipsWrap: $("#amount"),
    openSettings: $("#openSettings"),
    overlay: $("#overlay"),
    panel: $("#settings"),
    goalInput: $("#goalInput"),
    intervalInput: $("#intervalInput"),
    startInput: $("#startInput"),
    endInput: $("#endInput"),
    saveBtn: $("#save"),
    closeBtn: $("#close"),
    testNotif: $("#testNotif"),
    permNote: $("#permNote")
  };

  // --- Util ---
  const clamp = (n, min, max) => Math.max(min, Math.min(max, n));

  function render() {
    el.nowMl.textContent = state.totalMl;
    el.goalMl.textContent = state.goalMl;

    const pct = clamp(Math.round((state.totalMl / state.goalMl) * 100), 0, 100);
    el.pct.textContent = `${pct}%`;

    // translateY(100%) = vacío, 0% = lleno
    el.water.style.transform = `translateY(${100 - pct}%)`;

    el.undo.disabled = state.history.length === 0;

    // chips active
    $$("#amount button").forEach(b => {
      b.classList.toggle("active", parseInt(b.value, 10) === state.selected);
    });
  }

  function persist() {
    localStorage.setItem("totalMl", String(state.totalMl));
    localStorage.setItem("goalMl", String(state.goalMl));
    localStorage.setItem("selected", String(state.selected));
    localStorage.setItem("history", JSON.stringify(state.history));
    localStorage.setItem("lastNotifyAt", String(state.lastNotifyAt || 0));
    localStorage.setItem("reminders", JSON.stringify(state.reminders));
    // avisar al SW
    swPostState();
  }

  // --- Interacciones ---
  el.chipsWrap.addEventListener("click", (e) => {
    const btn = e.target.closest("button");
    if (!btn) return;
    state.selected = parseInt(btn.value, 10);
    persist();
    render();
  });

  // Presión prolongada en "Agregar" para auto-repetir
  let holdTmr = null, repeatTmr = null;
  function startHold() {
    clearTimeout(holdTmr); clearInterval(repeatTmr);
    holdTmr = setTimeout(() => {
      repeatTmr = setInterval(() => addSelected(), 250);
    }, 350);
  }
  function endHold() {
    clearTimeout(holdTmr); clearInterval(repeatTmr);
  }

  function addSelected() {
    state.history.push(state.totalMl);
    state.totalMl += state.selected;
    const nowEl = el.nowMl;
    nowEl.classList.add("pop");
    setTimeout(() => nowEl.classList.remove("pop"), 300);
    persist();
    render();
  }

  el.add.addEventListener("click", () => {
    addSelected();
  });
  el.add.addEventListener("mousedown", startHold);
  el.add.addEventListener("touchstart", startHold, { passive: true });
  el.add.addEventListener("mouseup", endHold);
  el.add.addEventListener("mouseleave", endHold);
  el.add.addEventListener("touchend", endHold);

  el.undo.addEventListener("click", () => {
    if (!state.history.length) return;
    state.totalMl = state.history.pop();
    persist();
    render();
  });

  // --- Panel de ajustes ---
  function openPanel() {
    el.overlay.classList.add("open");
    el.panel.classList.add("open");
    // cargar valores actuales
    el.goalInput.value = state.goalMl;
    el.intervalInput.value = state.reminders.intervalMin;
    el.startInput.value = state.reminders.start;
    el.endInput.value = state.reminders.end;
  }
  function closePanel() {
    el.overlay.classList.remove("open");
    el.panel.classList.remove("open");
  }

  el.openSettings.addEventListener("click", openPanel);
  el.closeBtn.addEventListener("click", closePanel);
  el.overlay.addEventListener("click", closePanel);

  el.saveBtn.addEventListener("click", () => {
    state.goalMl = clamp(parseInt(el.goalInput.value || "2000", 10), 200, 100000);
    state.reminders.intervalMin = clamp(parseInt(el.intervalInput.value || "90", 10), 5, 1440);
    state.reminders.start = el.startInput.value || "09:00";
    state.reminders.end = el.endInput.value || "20:00";
    persist();
    render();
    closePanel();
  });

  // --- Notificaciones ---
  async function ensurePermission() {
    try {
      const p = await Notification.requestPermission();
      return p === "granted";
    } catch {
      return false;
    }
  }

  el.testNotif.addEventListener("click", async () => {
    const ok = await ensurePermission();
    if (!ok) {
      el.permNote.textContent = "Habilitá las notificaciones para recibir recordatorios 💧";
      return;
    }
    state.lastNotifyAt = Date.now();
    persist();
    navigator.serviceWorker?.controller?.postMessage({ type: "TRIGGER_TEST" });
  });

  // --- Service Worker ---
  let swReg = null;
  function swPostState() {
    if (!navigator.serviceWorker?.controller) return;
    navigator.serviceWorker.controller.postMessage({ type: "SET_STATE", state });
  }

  async function registerSW() {
    if (!("serviceWorker" in navigator)) return;
    try {
      swReg = await navigator.serviceWorker.register("sw.js");
      navigator.serviceWorker.addEventListener("message", (evt) => {
        if (evt.data?.type === "UPDATE_LAST_NOTIFY") {
          state.lastNotifyAt = evt.data.timestamp;
          persist();
        }
      });
      // enviar estado inicial
      swPostState();
    } catch (err) {
      console.error("SW error:", err);
    }
  }

  // Init
  render();
  registerSW();
})();