// Lógica con 'Deshacer', texto en español y notificaciones
const store = {
  get(){ return JSON.parse(localStorage.getItem('agua:min')||'{}'); },
  set(v){ localStorage.setItem('agua:min', JSON.stringify(v)); }
};
const todayKey = () => new Date().toISOString().slice(0,10);
const els = {
  arc: document.getElementById('arc'),
  pct: document.getElementById('pct'),
  nowMl: document.getElementById('nowMl'),
  goalMl: document.getElementById('goalMl'),
  amount: document.getElementById('amount'),
  add: document.getElementById('add'),
  undo: document.getElementById('undo'),
  settings: document.getElementById('settings'),
  openSettings: document.getElementById('openSettings'),
  goalInput: document.getElementById('goalInput'),
  intervalInput: document.getElementById('intervalInput'),
  startInput: document.getElementById('startInput'),
  endInput: document.getElementById('endInput'),
  save: document.getElementById('save'),
  close: document.getElementById('close'),
  testNotif: document.getElementById('testNotif'),
  permNote: document.getElementById('permNote'),
};

const state = (()=>{
  const d = store.get();
  return {
    goal: d.goal ?? 1800,
    logs: d.logs ?? {},
    reminders: d.reminders ?? { intervalMin:90, start:'09:00', end:'20:00', enabled:true },
    lastNotifyAt: d.lastNotifyAt ?? 0
  };
})();
function persist(){ store.set(state); }

const CIRC = 565.48;
els.arc.style.strokeDasharray = CIRC;
els.arc.style.strokeDashoffset = CIRC;

function todayTotalMl(){ return (state.logs[todayKey()]||[]).reduce((a,b)=>a+b.ml,0); }
function updateUndoState(){
  const list = state.logs[todayKey()]||[];
  els.undo.disabled = list.length === 0;
}
function render(){
  const total = todayTotalMl();
  els.nowMl.textContent = total;
  els.goalMl.textContent = state.goal;
  const pct = Math.min(100, Math.round(total / state.goal * 100));
  els.pct.textContent = pct + '%';
  els.arc.style.strokeDashoffset = (CIRC * (1 - pct/100)).toFixed(2);
  updateUndoState();
}
function add(ml){
  const key = todayKey();
  state.logs[key] = state.logs[key] || [];
  state.logs[key].push({ml, t: Date.now()});
  persist(); render();
}
function undo(){
  const key = todayKey();
  const list = state.logs[key] || [];
  if(list.length>0){ list.pop(); persist(); render(); }
}
els.add.addEventListener('click', ()=> add(parseInt(els.amount.value,10)));
els.undo.addEventListener('click', undo);

// Long press repeat en Agregar
let pressTimer=null;
els.add.addEventListener('pointerdown', ()=>{
  pressTimer = setInterval(()=> add(parseInt(els.amount.value,10)), 400);
});
['pointerup','pointerleave','pointercancel'].forEach(ev=>{
  els.add.addEventListener(ev, ()=>{ if(pressTimer) clearInterval(pressTimer); pressTimer=null; });
});

// Modal de Configuración
els.openSettings.addEventListener('click', ()=>{
  els.goalInput.value = state.goal;
  els.intervalInput.value = state.reminders.intervalMin;
  els.startInput.value = state.reminders.start;
  els.endInput.value = state.reminders.end;
  els.settings.showModal();
});
els.close.addEventListener('click', ()=> els.settings.close());
els.save.addEventListener('click', async ()=>{
  state.goal = Math.max(200, parseInt(els.goalInput.value||'1800',10));
  state.reminders.intervalMin = Math.max(5, parseInt(els.intervalInput.value||'90',10));
  state.reminders.start = els.startInput.value || '09:00';
  state.reminders.end = els.endInput.value || '20:00';
  persist(); render();
  await ensureNotificationPermission();
  scheduleReminders();
  els.settings.close();
});

// Notificaciones (PWA)
function parseTime(h){ const [hh,mm]=h.split(':').map(Number); const d=new Date(); d.setHours(hh,mm,0,0); return d; }
function minutesSince(ts){ return (Date.now()-ts)/60000; }
function within(now, start, end){
  const s=new Date(now); s.setHours(start.getHours(),start.getMinutes(),0,0);
  const e=new Date(now); e.setHours(end.getHours(),end.getMinutes(),0,0);
  return now>=s && now<=e;
}
async function ensureNotificationPermission(){
  if(!('Notification' in window)) return;
  if(Notification.permission === 'default'){ await Notification.requestPermission(); }
  const reg = await navigator.serviceWorker.getRegistration();
  if(!reg) await navigator.serviceWorker.register('./sw.js');
  els.permNote.textContent = 'Permiso de notificaciones: ' + Notification.permission;
}
function notify(body){
  navigator.serviceWorker.getRegistration().then(reg=>{
    if(reg && Notification.permission === 'granted'){
      reg.showNotification('AguApp', { body, icon:'icons/icon-192.png', badge:'icons/icon-192.png', tag:'agua-min', renotify:true });
      state.lastNotifyAt = Date.now(); persist();
    }
  });
}
let timer=null;
function scheduleReminders(){
  if(timer) clearInterval(timer);
  timer = setInterval(checkReminder, 60*1000);
  checkReminder();
}
function checkReminder(){
  const now = new Date();
  const start = parseTime(state.reminders.start);
  const end = parseTime(state.reminders.end);
  if(!within(now,start,end)) return;
  if(minutesSince(state.lastNotifyAt) >= state.reminders.intervalMin){
    notify('¡Hey! 💧 Es hora de tomar agua');
  }
}
els.testNotif.addEventListener('click', ()=> notify('¡Hey! 💧 Es hora de tomar agua'));

// INIT
render();
if('serviceWorker' in navigator){
  window.addEventListener('load', async ()=>{
    await navigator.serviceWorker.register('./sw.js').catch(()=>{});
    await ensureNotificationPermission();
    scheduleReminders();
  });
}
