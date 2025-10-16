const STORAGE_KEY='aguapp:data';
function safeParse(j,fallback){try{return JSON.parse(j);}catch{return fallback;}}
(function migrate(){const legacy=['agua:min','agua:data'];if(!localStorage.getItem(STORAGE_KEY)){for(const k of legacy){const v=localStorage.getItem(k);if(v){localStorage.setItem(STORAGE_KEY,v);break;}}}})();
const store={get(){return safeParse(localStorage.getItem(STORAGE_KEY),'{}')||{};},set(v){localStorage.setItem(STORAGE_KEY,JSON.stringify(v));}};
if(navigator.storage&&navigator.storage.persist){navigator.storage.persist().catch(()=>{});}
const todayKey=()=>new Date().toISOString().slice(0,10);
const els={arc:document.getElementById('arc'),pct:document.getElementById('pct'),nowMl:document.getElementById('nowMl'),goalMl:document.getElementById('goalMl'),
amount:document.getElementById('amount'),add:document.getElementById('add'),undo:document.getElementById('undo'),
settings:document.getElementById('settings'),openSettings:document.getElementById('openSettings'),
goalInput:document.getElementById('goalInput'),intervalInput:document.getElementById('intervalInput'),
startInput:document.getElementById('startInput'),endInput:document.getElementById('endInput'),save:document.getElementById('save'),
close:document.getElementById('close'),testNotif:document.getElementById('testNotif'),permNote:document.getElementById('permNote')};
const state=(()=>{const d=store.get();return{goal:d.goal??2000,logs:d.logs??{},reminders:d.reminders??{intervalMin:90,start:'09:00',end:'20:00'},lastNotifyAt:d.lastNotifyAt??0};})();
function persist(){store.set(state);}
const R=104,CIRC=2*Math.PI*R;els.arc.style.strokeDasharray=CIRC;els.arc.style.strokeDashoffset=CIRC;
function total(){return (state.logs[todayKey()]||[]).reduce((a,b)=>a+b.ml,0);}
function updateUndo(){els.undo.disabled=(state.logs[todayKey()]||[]).length===0;}
function render(){const t=total();els.nowMl.textContent=t;els.goalMl.textContent=state.goal;const pct=Math.min(100,Math.round(t/state.goal*100));els.pct.textContent=pct+'%';els.arc.style.strokeDashoffset=(CIRC*(1-pct/100)).toFixed(2);updateUndo();}
function add(ml){const k=todayKey();state.logs[k]=state.logs[k]||[];state.logs[k].push({ml,t:Date.now()});persist();render();}
function undo(){const k=todayKey();const list=state.logs[k]||[];if(list.length>0){list.pop();persist();render();}}
els.add.addEventListener('click',()=>add(parseInt(els.amount.value,10)));els.undo.addEventListener('click',undo);
let timer=null;els.add.addEventListener('pointerdown',()=>{timer=setInterval(()=>add(parseInt(els.amount.value,10)),400);});['pointerup','pointerleave','pointercancel'].forEach(e=>els.add.addEventListener(e,()=>{if(timer)clearInterval(timer);timer=null;}));
els.openSettings.addEventListener('click',()=>{els.goalInput.value=state.goal;els.intervalInput.value=state.reminders.intervalMin;els.startInput.value=state.reminders.start;els.endInput.value=state.reminders.end;els.settings.showModal();});
els.close.addEventListener('click',()=>els.settings.close());
els.save.addEventListener('click',async()=>{state.goal=Math.max(200,parseInt(els.goalInput.value||'2000',10));state.reminders.intervalMin=Math.max(5,parseInt(els.intervalInput.value||'90',10));state.reminders.start=els.startInput.value||'09:00';state.reminders.end=els.endInput.value||'20:00';persist();render();await ensureNotificationPermission();scheduleReminders();els.settings.close();});
function parseTime(h){const [hh,mm]=h.split(':').map(Number);const d=new Date();d.setHours(hh,mm,0,0);return d;}
function minutesSince(ts){return(Date.now()-ts)/60000;}
function within(now,start,end){const s=new Date(now);s.setHours(start.getHours(),start.getMinutes(),0,0);const e=new Date(now);e.setHours(end.getHours(),end.getMinutes(),0,0);return now>=s&&now<=e;}
async function ensureNotificationPermission(){if(!('Notification'in window))return;if(Notification.permission==='default'){await Notification.requestPermission();}const reg=await navigator.serviceWorker.getRegistration();if(!reg)await navigator.serviceWorker.register('./sw.js');if(els.permNote)els.permNote.textContent='Permiso de notificaciones: '+Notification.permission;}
function notify(body){navigator.serviceWorker.getRegistration().then(reg=>{if(reg&&Notification.permission==='granted'){reg.showNotification('AguApp',{body,icon:'icons/icon-192.png',badge:'icons/icon-192.png',tag:'agua-min',renotify:true});state.lastNotifyAt=Date.now();persist();}});}
let tmr=null;function scheduleReminders(){if(tmr)clearInterval(tmr);tmr=setInterval(checkReminder,60000);checkReminder();}
function checkReminder(){const now=new Date();const s=parseTime(state.reminders.start);const e=parseTime(state.reminders.end);if(!within(now,s,e))return;if(minutesSince(state.lastNotifyAt)>=state.reminders.intervalMin){notify('¡Hey! 💧 Es hora de tomar agua');}}
if(document.getElementById('testNotif'))document.getElementById('testNotif').addEventListener('click',()=>notify('¡Hey! 💧 Es hora de tomar agua'));
render();
if('serviceWorker'in navigator){window.addEventListener('load',async()=>{await navigator.serviceWorker.register('./sw.js').catch(()=>{});await ensureNotificationPermission();scheduleReminders();});}
