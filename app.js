
// ===== PWA bootstrap =====
let deferredPrompt = null;

if ('serviceWorker' in navigator) {
  // Usa la ruta relativa tal como está en index.html
  navigator.serviceWorker.register('./service-worker.js')
    .then(reg => console.log('[SW] registrado:', reg.scope))
    .catch(err => console.error('[SW] error:', err));
}

// Manejo del botón "INSTALAR APP"
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  const btn = document.getElementById('install-btn');
  if (btn) btn.style.display = 'block';
});

document.addEventListener('click', async (ev) => {
  const target = ev.target;
  if (!(target instanceof HTMLElement)) return;
  if (target.id === 'install-btn' && deferredPrompt) {
    deferredPrompt.prompt();
    try {
      const choice = await deferredPrompt.userChoice;
      console.log('Resultado instalación:', choice.outcome);
    } finally {
      deferredPrompt = null;
      target.style.display = 'none';
    }
  }
});

document.addEventListener('DOMContentLoaded', () => {
  // --- Selectores del DOM ---
  const progressBar = document.getElementById('progress-bar');
  const percentageText = document.getElementById('percentage-text');
  const currentAmountText = document.getElementById('current-amount-text');
  const goalText = document.getElementById('goal-text');
  const undoBtn = document.getElementById('undo-btn');
  const settingsBtn = document.getElementById('settings-btn');
  const settingsModal = document.getElementById('settings-modal');
  const closeSettingsBtn = document.getElementById('close-settings-btn');
  const saveSettingsBtn = document.getElementById('save-settings-btn');
  const goalInput = document.getElementById('goal-input');
  const notificationsToggle = document.getElementById('notifications-toggle');
  const timeRangeSettings = document.getElementById('time-range-settings');
  const startTimeInput = document.getElementById('start-time-input');
  const endTimeInput = document.getElementById('end-time-input');

  // --- Estado ---
  let goal = 2000;
  let currentAmount = 0;
  let history = []; // pila de sumas para "deshacer"
  let notificationsEnabled = false;
  let notificationStartTime = '09:00';
  let notificationEndTime = '20:00';

  // --- Utilidades de almacenamiento (por día) ---
  const todayKey = () => `waterData_${new Date().toISOString().split('T')[0]}`;

  function loadData() {
    // Ajustes persistentes
    const settings = JSON.parse(localStorage.getItem('waterSettings') || '{}');
    goal = Number(settings.goal || 2000);
    notificationsEnabled = Boolean(settings.notificationsEnabled || false);
    notificationStartTime = settings.notificationStartTime || '09:00';
    notificationEndTime = settings.notificationEndTime || '20:00';

    // Datos del día
    const data = JSON.parse(localStorage.getItem(todayKey()) || '{}');
    currentAmount = Number(data.currentAmount || 0);
    history = Array.isArray(data.history) ? data.history : [];

    updateSettingsUI();
    updateUI();
  }

  function saveData() {
    localStorage.setItem('waterSettings', JSON.stringify({
      goal, notificationsEnabled, notificationStartTime, notificationEndTime
    }));
    localStorage.setItem(todayKey(), JSON.stringify({
      currentAmount, history
    }));
  }

  // --- UI ---
  function updateUI() {
    // Texto
    goalText.textContent = `${goal} ML`;
    currentAmountText.textContent = `${currentAmount} / ${goal} ml`;

    const pct = Math.max(0, Math.min(100, Math.round((currentAmount / goal) * 100 || 0)));
    percentageText.textContent = `${pct}%`;

    // Círculo de progreso
    const r = Number(progressBar.getAttribute('r') || 45);
    const circumference = 2 * Math.PI * r;
    progressBar.style.strokeDasharray = `${circumference}`;
    const offset = circumference * (1 - pct / 100);
    progressBar.style.strokeDashoffset = `${offset}`;
  }

  function updateSettingsUI() {
    goalInput.value = String(goal);
    notificationsToggle.checked = notificationsEnabled;
    timeRangeSettings.classList.toggle('hidden', !notificationsEnabled);
    startTimeInput.value = notificationStartTime;
    endTimeInput.value = notificationEndTime;
  }

  // --- Lógica ---
  function addWater(amount) {
    if (!Number.isFinite(amount)) return;
    currentAmount += amount;
    history.push(amount);
    saveData();
    updateUI();
    // mini pop en el porcentaje
    percentageText.classList.add('pop-effect');
    setTimeout(() => percentageText.classList.remove('pop-effect'), 350);
  }

  function undoLast() {
    if (history.length === 0) return;
    const last = history.pop();
    currentAmount = Math.max(0, currentAmount - last);
    saveData();
    updateUI();
  }

  function openSettings() {
    settingsModal.classList.remove('hidden');
  }
  function closeSettings() {
    settingsModal.classList.add('hidden');
  }

  function saveSettings() {
    const newGoal = Number(goalInput.value || 0);
    goal = newGoal > 0 ? newGoal : goal;
    notificationsEnabled = Boolean(notificationsToggle.checked);
    notificationStartTime = startTimeInput.value || '09:00';
    notificationEndTime = endTimeInput.value || '20:00';
    saveData();
    updateSettingsUI();
    closeSettings();
  }

  // --- Eventos ---
  document.querySelectorAll('.add-water-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const amt = Number(btn.dataset.amount);
      addWater(amt);
    });
  });
  undoBtn.addEventListener('click', undoLast);
  settingsBtn.addEventListener('click', openSettings);
  closeSettingsBtn.addEventListener('click', closeSettings);
  settingsModal.addEventListener('click', (e) => {
    if (e.target === settingsModal) closeSettings();
  });
  saveSettingsBtn.addEventListener('click', saveSettings);

  notificationsToggle.addEventListener('change', () => {
    timeRangeSettings.classList.toggle('hidden', !notificationsToggle.checked);
  });

  // --- Inicialización ---
  loadData();
});
