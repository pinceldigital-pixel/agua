// main.js
const store = {
  get(){ return JSON.parse(localStorage.getItem('agua:data')||'{}'); },
  set(v){ localStorage.setItem('agua:data', JSON.stringify(v)); }
};
const todayKey = () => new Date().toISOString().slice(0,10);

const state = (()=> {
  const d = store.get();
  return {
    goal: d.goal ?? 2000,
    unit: d.unit ?? 'ml',
    logs: d.logs ?? {},
    reminders: d.reminders ?? { enabled:true, intervalMin:90, start:'09:00', end:'20:00' },
    lastNotifyAt: d.lastNotifyAt ?? 0
  };
})();
function persist(){ store.set(state); }
const mlToUnit = (ml) => state.unit === 'oz' ? Math.round((ml/29.5735)*10)/10 : ml;
const unitLabel = () => state.unit === 'oz' ? 'oz' : 'ml';
const parseTime = (hhmm) => { const [h,m]=hhmm.split(':').map(Number); const d=new Date(); d.setHours(h,m,0,0); return d; };

const els = {
  progress: document.getElementById('progressCircle'),
  cap: document.getElementById('cap'),
  todayTotal: document.getElementById('todayTotal'),
  targetMl: document.getElementById('targetMl'),
  activity: document.getElementById('activity'),
  goal: document.getElementById('goal'),
  unit: document.getElementById('unit'),
  avgWeek: document.getElementById('avgWeek'),
  bestDay: document.getElementById('bestDay'),
  chart: document.getElementById('chart'),
  remindersEnabled: document.getElementById('remindersEnabled'),
  intervalMin: document.getElementById('intervalMin'),
  startTime: document.getElementById('startTime'),
  endTime: document.getElementById('endTime'),
  permNote: document.getElementById('permNote'),
};

// HOME RENDER
function todayTotalMl(){
  const list = state.logs[todayKey()] || [];
  return list.reduce((a,b)=>a + b.ml, 0);
}
function renderRing(pct){
  pct = Math.max(0, Math.min(100, pct));
  els.progress.style.setProperty('--p', pct);
  // mover la "cap" en el borde
  const angle = pct/100*360 - 90;
  els.cap.style.transform = `translate(-50%,-50%) rotate(${angle}deg) translate(100px) rotate(${-angle}deg)`;
  // color meta cumplida
  if(pct >= 100){ els.progress.style.setProperty('--c1', '#22c55e'); els.progress.style.setProperty('--c2', '#86efac'); }
  else{ els.progress.style.setProperty('--c1', '#2f7ef7'); els.progress.style.setProperty('--c2', '#64b5f6'); }
}
function renderHome(){
  const total = todayTotalMl();
  els.todayTotal.textContent = mlToUnit(total);
  els.targetMl.textContent = mlToUnit(state.goal);
  const pct = Math.round((total/state.goal)*100);
  renderRing(pct);
  const list = (state.logs[todayKey()]||[]).slice().reverse();
  els.activity.innerHTML = list.map(l=>{
    const h = new Date(l.t).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'});
    return `<li><span>${l.ml} ml</span><span class="muted">${h}</span></li>`;
  }).join('') || `<li><span class="muted">Sin registros hoy. ¡A darle a la botellita!</span></li>`;
}

// SETTINGS RENDER
function renderSettings(){
  els.goal.value = state.goal;
  els.unit.value = state.unit;
  els.remindersEnabled.checked = state.reminders.enabled;
  els.intervalMin.value = state.reminders.intervalMin;
  els.startTime.value = state.reminders.start;
  els.endTime.value = state.reminders.end;
  // permiso notif
  els.permNote.textContent = Notification && Notification.permission ? `Permiso de notificaciones: ${Notification.permission}` : '';
}

// STATS
function renderStats(){
  const ctx = els.chart.getContext('2d');
  ctx.clearRect(0,0,els.chart.width,els.chart.height);
  const days = [...Array(7)].map((_,i)=>{
    const d = new Date(); d.setDate(d.getDate()- (6-i));
    const key = d.toISOString().slice(0,10);
    const tot = (state.logs[key]||[]).reduce((a,b)=>a+b.ml,0);
    return { key, label: d.toLocaleDateString([], {weekday:'short'}), ml: tot };
  });
  const max = Math.max(state.goal, ...days.map(d=>d.ml)) || state.goal;
  const W = els.chart.width, H = els.chart.height;
  const barW = Math.floor(W/ (days.length*1.6));
  const gap = (W - (barW*days.length)) / (days.length+1);
  const baseY = H - 32;
  ctx.font = "12px system-ui";
  ctx.fillStyle = "#6b7280";
  ctx.fillText(`${mlToUnit(state.goal)} ${unitLabel()} (meta)`, 8, 14);
  ctx.strokeStyle = "#e5e7eb"; ctx.beginPath();
  ctx.moveTo(0, baseY); ctx.lineTo(W, baseY); ctx.stroke();
  days.forEach((d, i)=>{
    const x = gap + i*(barW+gap);
    const h = Math.round((d.ml/max) * (H-60));
    ctx.fillStyle = d.ml >= state.goal ? "#22c55e" : "#2f7ef7";
    ctx.fillRect(x, baseY - h, barW, h);
    ctx.fillStyle = "#111827";
    ctx.fillText(d.label, x, H-12);
  });
  const avg = Math.round(days.reduce((a,b)=>a+b.ml,0)/days.length);
  const best = Math.max(...days.map(d=>d.ml),0);
  els.avgWeek.textContent = mlToUnit(avg);
  els.bestDay.textContent = mlToUnit(best);
}

function renderAll(){ renderHome(); renderSettings(); renderStats(); }

// EVENTS
document.querySelectorAll('[data-add]').forEach(b=>{
  b.addEventListener('click', ()=> addEntry(parseInt(b.dataset.add,10)));
});
document.getElementById('fabAdd').addEventListener('click', ()=>{
  const v = prompt('¿Cuánto agregamos? (en ml)');
  const ml = Math.max(0, parseInt(v||'0',10));
  if(ml>0) addEntry(ml);
});
function addEntry(ml){
  const key = todayKey();
  state.logs[key] = state.logs[key] || [];
  state.logs[key].push({ ml, t: Date.now() });
  persist(); renderAll();
}

// SAVE SETTINGS
document.getElementById('saveSettings').addEventListener('click', async ()=>{
  state.goal = Math.max(200, parseInt(els.goal.value||'2000',10));
  state.unit = els.unit.value;
  state.reminders = {
    enabled: els.remindersEnabled.checked,
    intervalMin: Math.max(5, parseInt(els.intervalMin.value||'90',10)),
    start: els.startTime.value || '09:00',
    end: els.endTime.value || '20:00',
  };
  persist(); renderAll();
  if(state.reminders.enabled){
    await ensureNotificationPermission();
    scheduleReminders();
  }
  alert('Guardado. Recordatorios configurados.');
});

document.getElementById('resetToday').addEventListener('click', ()=>{
  if(confirm('¿Borramos los registros de hoy?')){
    delete state.logs[todayKey()];
    persist(); renderAll();
  }
});

document.getElementById('testNotif').addEventListener('click', ()=> {
  sendNotification('Hey! 💧 es hora de tomar agua');
});

// Tabs
document.querySelectorAll('nav.tabbar button').forEach(btn=>{
  btn.addEventListener('click', ()=>{
    document.querySelectorAll('nav.tabbar button').forEach(b=>b.classList.remove('active'));
    btn.classList.add('active');
    ['home','stats','settings'].forEach(id=>{
      document.getElementById(id).classList.toggle('hide', id!==btn.dataset.tab);
    });
    if(btn.dataset.tab==='stats'){ renderStats(); }
  });
});

// NOTIFICATIONS -------------------------------------
async function ensureNotificationPermission(){
  if(!('Notification' in window)) return;
  if(Notification.permission === 'default'){
    await Notification.requestPermission();
  }
  const reg = await navigator.serviceWorker.getRegistration();
  if(!reg) await navigator.serviceWorker.register('./sw.js'); // asegurar SW
}

function withinWindow(now, start, end){
  const s = new Date(now); s.setHours(start.getHours(), start.getMinutes(),0,0);
  const e = new Date(now); e.setHours(end.getHours(), end.getMinutes(),0,0);
  return now >= s && now <= e;
}

function sendNotification(body){
  if(!('Notification' in window)) return;
  navigator.serviceWorker.getRegistration().then(reg=>{
    if(reg && Notification.permission === 'granted'){
      reg.showNotification('AguApp', {
        body,
        icon: 'icons/icon-192.png',
        badge: 'icons/icon-192.png',
        tag: 'agua-reminder',
        renotify: true
      });
      state.lastNotifyAt = Date.now();
      persist();
    }
  });
}

let reminderTimer = null;
function scheduleReminders(){
  if(reminderTimer) clearInterval(reminderTimer);
  reminderTimer = setInterval(checkReminder, 60*1000); // chequeo cada minuto
  checkReminder();
}
function minutesSince(ts){ return (Date.now()-ts)/60000; }
function checkReminder(){
  if(!state.reminders.enabled) return;
  const now = new Date();
  const total = todayTotalMl();
  if(total >= state.goal) return; // no molestamos si ya se cumplió
  const start = parseTime(state.reminders.start);
  const end = parseTime(state.reminders.end);
  if(!withinWindow(now, start, end)) return;
  const due = minutesSince(state.lastNotifyAt) >= state.reminders.intervalMin;
  if(due){ sendNotification('Hey! 💧 es hora de tomar agua'); }
}

// INIT
renderAll();
if('serviceWorker' in navigator){
  window.addEventListener('load', async ()=>{
    await navigator.serviceWorker.register('./sw.js').catch(()=>{});
    if(state.reminders.enabled){ await ensureNotificationPermission(); scheduleReminders(); }
  });
}
