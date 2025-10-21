const STORAGE_KEY = 'aguapp:data';
function safeParse(j, fallback) { try { return JSON.parse(j); } catch { return fallback; } }
(function migrate() { const legacy = ['agua:min', 'agua:data']; if (!localStorage.getItem(STORAGE_KEY)) { for (const k of legacy) { const v = localStorage.getItem(k); if (v) { localStorage.setItem(STORAGE_KEY, v); break; } } } })();
const store = { get() { return safeParse(localStorage.getItem(STORAGE_KEY), '{}') || {}; }, set(v) { localStorage.setItem(STORAGE_KEY, JSON.stringify(v)); } };
if (navigator.storage && navigator.storage.persist) { navigator.storage.persist().catch(() => { }); }
const todayKey = () => new Date().toISOString().slice(0, 10);

// --- Elementos del DOM (Actualizado) ---
const els = {
    water: document.getElementById('water'), // Reemplaza 'arc'
    pct: document.getElementById('pct'),
    nowMl: document.getElementById('nowMl'),
    goalMl: document.getElementById('goalMl'),
    amountChips: document.getElementById('amount'), // Contenedor de chips
    add: document.getElementById('add'),
    undo: document.getElementById('undo'),
    settings: document.getElementById('settings'),
    overlay: document.getElementById('overlay'), // Para el panel
    openSettings: document.getElementById('openSettings'),
    goalInput: document.getElementById('goalInput'),
    intervalInput: document.getElementById('intervalInput'),
    startInput: document.getElementById('startInput'),
    endInput: document.getElementById('endInput'),
    save: document.getElementById('save'),
    close: document.getElementById('close'),
    testNotif: document.getElementById('testNotif'),
    permNote: document.getElementById('permNote')
};

// --- Estado de la App (Actualizado) ---
const state = (() => {
    const d = store.get();
    return {
        goal: d.goal ?? 2000,
        logs: d.logs ?? {},
        reminders: d.reminders ?? { intervalMin: 90, start: '09:00', end: '20:00' },
        lastNotifyAt: d.lastNotifyAt ?? 0,
        currentAmount: d.currentAmount ?? 250 // Guarda la última selección
    };
})();
function persist() { store.set(state); }

function total() { return (state.logs[todayKey()] || []).reduce((a, b) => a + b.ml, 0); }
function updateUndo() { els.undo.disabled = (state.logs[todayKey()] || []).length === 0; }

// --- Renderizado (Actualizado) ---
function render() {
    const t = total();
    els.nowMl.textContent = t;
    els.goalMl.textContent = state.goal;
    const pct = Math.min(100, Math.round(t / state.goal * 100));
    els.pct.textContent = pct + '%';
    
    // Animar el agua
    const waterPct = 100 - pct; // 100% = vacío, 0% = lleno
    els.water.style.transform = `translateY(${waterPct}%)`;

    updateUndo();
}

// --- Lógica de Chips (Nuevo) ---
function initChips() {
    const chips = els.amountChips.querySelectorAll('button');
    chips.forEach(chip => {
        if (parseInt(chip.value, 10) === state.currentAmount) {
            chip.classList.add('active');
        }
        chip.addEventListener('click', () => {
            chips.forEach(c => c.classList.remove('active'));
            chip.classList.add('active');
            state.currentAmount = parseInt(chip.value, 10);
            persist(); // Guarda la selección
        });
    });
}

function add(ml) {
    const k = todayKey();
    state.logs[k] = state.logs[k] || [];
    state.logs[k].push({ ml, t: Date.now() });
    persist();
    render();
    
    // Animación "Pop"
    els.nowMl.classList.add('pop');
    els.nowMl.addEventListener('animationend', () => els.nowMl.classList.remove('pop'), { once: true });
}
function undo() {
    const k = todayKey();
    const list = state.logs[k] || [];
    if (list.length > 0) { list.pop(); persist(); render(); }
}

// Eventos de botones (Actualizado)
els.add.addEventListener('click', () => add(state.currentAmount));
els.undo.addEventListener('click', undo);

let timer = null;
els.add.addEventListener('pointerdown', () => { timer = setInterval(() => add(state.currentAmount), 400); });
['pointerup', 'pointerleave', 'pointercancel'].forEach(e => els.add.addEventListener(e, () => { if (timer) clearInterval(timer); timer = null; }));

// --- Lógica del Panel de Ajustes (Actualizado) ---
function openSettingsPanel() {
    els.goalInput.value = state.goal;
    els.intervalInput.value = state.reminders.intervalMin;
    els.startInput.value = state.reminders.start;
    els.endInput.value = state.reminders.end;
    els.settings.classList.add('open');
    els.overlay.classList.add('open');
}
function closeSettingsPanel() {
    els.settings.classList.remove('open');
    els.overlay.classList.remove('open');
}

els.openSettings.addEventListener('click', openSettingsPanel);
els.close.addEventListener('click', closeSettingsPanel);
els.overlay.addEventListener('click', closeSettingsPanel);

els.save.addEventListener('click', async () => {
    state.goal = Math.max(200, parseInt(els.goalInput.value || '2000', 10));
    state.reminders.intervalMin = Math.max(5, parseInt(els.intervalInput.value || '90', 10));
    state.reminders.start = els.startInput.value || '09:00';