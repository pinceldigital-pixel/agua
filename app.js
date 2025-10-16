// Registro del Service Worker en /water/
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/water/service-worker.js')
    .then(() => console.log('SW registrado en /water/ 🧼'))
    .catch(err => console.log('Fallo al registrar SW:', err));
}

let deferredPrompt;
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  const btn = document.getElementById('install-btn');
  if (btn) btn.style.display = 'block';
});

document.getElementById('install-btn')?.addEventListener('click', async () => {
  if (!deferredPrompt) return;
  deferredPrompt.prompt();
  const choice = await deferredPrompt.userChoice;
  console.log('Resultado instalación:', choice.outcome);
  deferredPrompt = null;
});

document.addEventListener('DOMContentLoaded', () => {
    // Registra el Service Worker
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('./service-worker.js')
            .then(reg => console.log('Service Worker registrado con éxito', reg))
            .catch(err => console.error('Error al registrar Service Worker', err));
    }

    // --- Selectores del DOM ---
    const progressBar = document.getElementById('progress-bar');
    const percentageText = document.getElementById('percentage-text');
    const currentAmountText = document.getElementById('current-amount-text');
    const goalText = document.getElementById('goal-text');
    const undoBtn = document.getElementById('undo-btn');
    const installBtn = document.getElementById('install-btn');
    const settingsBtn = document.getElementById('settings-btn');
    const settingsModal = document.getElementById('settings-modal');
    const closeSettingsBtn = document.getElementById('close-settings-btn');
    const saveSettingsBtn = document.getElementById('save-settings-btn');
    const goalInput = document.getElementById('goal-input');
    const notificationsToggle = document.getElementById('notifications-toggle');
    const timeRangeSettings = document.getElementById('time-range-settings');
    const startTimeInput = document.getElementById('start-time-input');
    const endTimeInput = document.getElementById('end-time-input');
    const canvas = document.getElementById('bubbles-canvas');
    const ctx = canvas.getContext('2d');

    // --- Variables de Estado ---
    let goal, currentAmount, history, goalReachedToday, notificationsEnabled, notificationStartTime, notificationEndTime;
    let deferredPrompt;
    let bubbles = [];

    // --- Lógica de la App ---
    const radius = progressBar.r.baseVal.value;
    const circumference = 2 * Math.PI * radius;
    progressBar.style.strokeDasharray = circumference;

    const getTodayKey = () => `waterData_${new Date().toISOString().split('T')[0]}`;

    const loadData = () => {
        const settings = JSON.parse(localStorage.getItem('waterSettings')) || {};
        goal = settings.goal || 2000;
        notificationsEnabled = settings.notificationsEnabled || false;
        notificationStartTime = settings.notificationStartTime || '09:00';
        notificationEndTime = settings.notificationEndTime || '20:00';

        const todayKey = getTodayKey();
        const data = JSON.parse(localStorage.getItem(todayKey)) || {};
        currentAmount = data.currentAmount || 0;
        history = data.history || [];
        goalReachedToday = data.goalReachedToday || false;
        
        updateSettingsUI();
        updateUI();
    };

    const saveData = () => {
        const settings = { goal, notificationsEnabled, notificationStartTime, notificationEndTime };
        localStorage.setItem('waterSettings', JSON.stringify(settings));

        const todayKey = getTodayKey();
        const data = { currentAmount, history, goalReachedToday };
        localStorage.setItem(todayKey, JSON.stringify(data));
    };

    const updateSettingsUI = () => {
        goalInput.value = goal;
        notificationsToggle.checked = notificationsEnabled;
        startTimeInput.value = notificationStartTime;
        endTimeInput.value = notificationEndTime;
        timeRangeSettings.style.display = notificationsEnabled ? 'block' : 'none';
    };

    const updateUI = () => {
        const percentage = Math.min(100, (currentAmount / goal) * 100);
        const offset = circumference - (percentage / 100) * circumference;
        
        progressBar.style.strokeDashoffset = offset;
        percentageText.textContent = `${Math.round(percentage)}%`;
        currentAmountText.textContent = `${currentAmount} / ${goal} ml`;
        goalText.textContent = `${goal} ML`;

        undoBtn.disabled = history.length === 0;

        if (percentage >= 100 && !goalReachedToday) {
            triggerGoalAnimation();
            goalReachedToday = true;
            saveData();
        }
    };

    const addWater = (amount) => {
        currentAmount += amount;
        history.push(amount);

        percentageText.classList.add('pop-effect');
        percentageText.addEventListener('animationend', () => {
            percentageText.classList.remove('pop-effect');
        }, { once: true });
        
        updateUI();
        saveData();
    };

    const undoLast = () => {
        if (history.length > 0) {
            const lastAmount = history.pop();
            currentAmount -= lastAmount;
            if (currentAmount < goal) goalReachedToday = false;
            
            percentageText.classList.add('pop-effect');
            percentageText.addEventListener('animationend', () => {
                percentageText.classList.remove('pop-effect');
            }, { once: true });

            updateUI();
            saveData();
        }
    };

    const openSettings = () => {
        updateSettingsUI();
        settingsModal.classList.remove('hidden');
    };
    const closeSettings = () => settingsModal.classList.add('hidden');
    
    const saveSettings = async () => {
        goal = parseInt(goalInput.value) || 2000;
        notificationsEnabled = notificationsToggle.checked;
        notificationStartTime = startTimeInput.value;
        notificationEndTime = endTimeInput.value;
        
        saveData();
        updateUI();
        closeSettings();

        if (!('Notification' in window) || !navigator.serviceWorker || !navigator.serviceWorker.ready) return;

        navigator.serviceWorker.ready.then(reg => {
            if (notificationsEnabled) {
                Notification.requestPermission().then(permission => {
                    if (permission === 'granted') {
                        reg.active.postMessage({ 
                            action: 'scheduleNotifications',
                            settings: {
                                start: parseInt(notificationStartTime.split(':')[0]),
                                end: parseInt(notificationEndTime.split(':')[0])
                            }
                        });
                        console.log("Notificaciones programadas.");
                    }
                });
            } else {
                reg.active.postMessage({ action: 'stopNotifications' });
                console.log("Notificaciones detenidas.");
            }
        });
    };

    // --- Animación de Burbujas ---
    const resizeCanvas = () => {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    };
    const triggerGoalAnimation = () => {
        canvas.style.display = 'block';
        resizeCanvas();
        bubbles = [];
        for (let i = 0; i < 50; i++) {
            bubbles.push({
                x: Math.random() * canvas.width,
                y: canvas.height + Math.random() * 100,
                radius: Math.random() * 5 + 2,
                speed: Math.random() * 3 + 1,
                opacity: Math.random() * 0.5 + 0.5
            });
        }
        animateBubbles();
        setTimeout(() => {
            canvas.style.display = 'none';
        }, 5000);
    };
    const animateBubbles = () => {
        if (!canvas) return;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        bubbles.forEach(bubble => {
            bubble.y -= bubble.speed;
            ctx.beginPath();
            ctx.arc(bubble.x, bubble.y, bubble.radius, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(255, 255, 255, ${bubble.opacity})`;
            ctx.fill();
        });

        bubbles = bubbles.filter(b => b.y > -10);
        if (bubbles.length > 0) {
            requestAnimationFrame(animateBubbles);
        }
    };
    
    // --- Lógica de Instalación ---
    window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        deferredPrompt = e;
        installBtn.style.display = 'block';
        console.log('`beforeinstallprompt` fue disparado.');
    });

    installBtn.addEventListener('click', async () => {
        if (deferredPrompt) {
            deferredPrompt.prompt();
            const { outcome } = await deferredPrompt.userChoice;
            if (outcome === 'accepted') {
                console.log('El usuario aceptó instalar la PWA');
            }
            deferredPrompt = null;
            installBtn.style.display = 'none';
        }
    });

    window.addEventListener('appinstalled', () => {
        console.log('PWA fue instalada');
        installBtn.style.display = 'none';
        deferredPrompt = null;
    });

    // --- Event Listeners ---
    document.querySelectorAll('.add-water-btn').forEach(b => b.addEventListener('click', () => addWater(parseInt(b.dataset.amount))));
    undoBtn.addEventListener('click', undoLast);
    settingsBtn.addEventListener('click', openSettings);
    closeSettingsBtn.addEventListener('click', closeSettings);
    settingsModal.addEventListener('click', (e) => { if (e.target === settingsModal) closeSettings(); });
    saveSettingsBtn.addEventListener('click', saveSettings);
    notificationsToggle.addEventListener('change', () => {
        timeRangeSettings.style.display = notificationsToggle.checked ? 'block' : 'none';
    });
    window.addEventListener('resize', resizeCanvas);

    // --- Inicialización ---
    loadData();
});
