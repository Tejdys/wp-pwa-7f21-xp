
const workouts = {
  A: [
    {id:"pushup", name:"Push-ups na parallettes", target:"6–15", min:6, max:15, cue:"Tělo drž v jedné linii, lokty zhruba 30–45° od těla.", harder:"Feet-elevated nebo band-resisted push-ups"},
    {id:"dbrow", name:"One-arm dumbbell row", target:"8–15 / ruka", min:8, max:15, cue:"Táhni loket směrem k boku, nekrč rameno k uchu.", harder:"Pomalejší negativní fáze / pauza nahoře"},
    {id:"bss", name:"Bulgarian split squat", target:"8–15 / noha", min:8, max:15, cue:"Kontrolovaně dolů, koleno sleduje směr špičky.", harder:"Obě 9kg činky / pomalejší tempo / pauza dole"},
    {id:"rdl", name:"Dumbbell Romanian deadlift", target:"10–20", min:10, max:20, cue:"Boky dozadu, rovná záda, tah cítíš hlavně v hamstringách.", harder:"Single-leg RDL nebo činky + resistance band"},
    {id:"pike", name:"Pike push-ups", target:"5–12", min:5, max:12, cue:"Hlava míří před ruce, boky vysoko, tlak hlavně přes ramena.", harder:"Feet-elevated pike push-up"},
    {id:"lsit", name:"Tuck L-sit", target:"10–30 s", min:10, max:30, cue:"Ramena tlač dolů od uší, zvedni kolena co nejvýš.", harder:"One-leg L-sit → advanced tuck → full L-sit", timed:true}
  ],
  B: [
    {id:"pushup", name:"Push-ups / band-resisted push-ups", target:"6–15", min:6, max:15, cue:"Čistý rozsah, pevný střed těla, žádné propadání v bedrech.", harder:"Silnější guma / feet-elevated"},
    {id:"bandrow", name:"Band row / one-arm DB row", target:"10–20", min:10, max:20, cue:"Lopatky dozadu a dolů, tah přes záda, ne jen přes biceps.", harder:"Silnější guma / delší pauza v kontrakci"},
    {id:"lunge", name:"Reverse lunges s činkami", target:"8–15 / noha", min:8, max:15, cue:"Krok dozadu dostatečně dlouhý, přední chodidlo zůstává celé na zemi.", harder:"Obě 9kg činky / deficit reverse lunge"},
    {id:"bridge", name:"Single-leg glute bridge + činka", target:"10–20 / noha", min:10, max:20, cue:"Vrch pohybu dokonči stažením hýždě, ne prohnutím zad.", harder:"Pauza nahoře / elevated single-leg bridge"},
    {id:"pullapart", name:"Band pull-aparts", target:"12–25", min:12, max:25, cue:"Paže téměř rovné, ramena dole, gumu roztahuj přes horní záda.", harder:"Silnější guma / pomalejší návrat"},
    {id:"sideplank", name:"Side plank", target:"20–45 s / strana", min:20, max:45, cue:"Boky vysoko, tělo tvoří rovnou linii, neotáčej hrudník.", harder:"Star side plank / delší výdrž", timed:true}
  ]
};

const state = {
  settings: JSON.parse(localStorage.getItem("hw-settings") || "null") || {
    startDate: new Date().toISOString().slice(0,10),
    rest: 75
  },
  history: JSON.parse(localStorage.getItem("hw-history") || "[]"),
  weights: JSON.parse(localStorage.getItem("hw-weights") || "[]"),
  active: null,
  timer: {remaining:75, running:false, interval:null}
};

function save(){
  localStorage.setItem("hw-settings", JSON.stringify(state.settings));
  localStorage.setItem("hw-history", JSON.stringify(state.history));
  localStorage.setItem("hw-weights", JSON.stringify(state.weights));
}

function programWeek(){
  const a = new Date(state.settings.startDate+"T00:00:00");
  const now = new Date();
  const days = Math.max(0, Math.floor((now-a)/(1000*60*60*24)));
  return Math.min(6, Math.floor(days/7)+1);
}
function recommendedFrequency(){
  return programWeek() <= 2 ? 2 : 3;
}
function nextWorkout(){
  if(!state.history.length) return "A";
  return state.history[0].workout === "A" ? "B" : "A";
}
function fmtTime(sec){
  const m = Math.floor(sec/60).toString().padStart(2,"0");
  const s = (sec%60).toString().padStart(2,"0");
  return `${m}:${s}`;
}
function dateLabel(iso){
  return new Intl.DateTimeFormat("cs-CZ",{day:"numeric",month:"short",year:"numeric"}).format(new Date(iso));
}
function elapsed(){
  if(!state.active) return "00:00";
  return fmtTime(Math.floor((Date.now()-state.active.startedAt)/1000));
}

function renderToday(){
  const w = nextWorkout();
  document.getElementById("workout-title").textContent = `Workout ${w}`;
  document.getElementById("workout-subtitle").textContent = `Full body · ${workouts[w].length} cviků · přibližně 20–30 min`;
  document.getElementById("phase-pill").textContent = `Týden ${programWeek()} · ${recommendedFrequency()}× týdně`;
}

function renderActive(){
  const box = document.getElementById("active-workout");
  if(!state.active){ box.classList.add("hidden"); return; }
  box.classList.remove("hidden");
  document.getElementById("next-card").classList.add("hidden");
  document.querySelector(".hero-card").classList.add("hidden");
  document.getElementById("session-name").textContent = `Workout ${state.active.workout}`;

  const list = document.getElementById("exercise-list");
  list.innerHTML = "";
  workouts[state.active.workout].forEach((ex, i)=>{
    const record = state.active.exercises[i];
    const card = document.createElement("article");
    card.className = "exercise-card";
    const prior = findLastExercise(ex.id);
    card.innerHTML = `
      <div class="exercise-head">
        <div>
          <div class="exercise-title">${ex.name}</div>
          <div class="target">Cíl: 2× ${ex.target}${prior ? ` · minule ${prior.reps.join(" / ")}` : ""}</div>
        </div>
        <div class="pill">${i+1}/${workouts[state.active.workout].length}</div>
      </div>
      <div class="demo">
        <div class="demo-icon">▶︎</div>
        <div><strong>10s demo slot</strong><small>${ex.cue}<br>Sem lze vložit vlastní krátké MP4/WebM video bez změny logiky appky.</small></div>
      </div>
      <div class="sets">
        ${[0,1].map(si=>`
          <div class="set-row">
            <div class="set-num">SÉRIE ${si+1}</div>
            <input class="rep-input" data-ex="${i}" data-set="${si}" type="number" min="0" max="99" placeholder="${ex.timed ? "sekundy" : "reps"}" value="${record.reps[si] ?? ""}">
            <button class="done-set" data-done="${i}:${si}">✓</button>
          </div>
        `).join("")}
      </div>
      <div class="rir-block">
        <div class="rir-label">RIR po poslední sérii</div>
        <div class="rir-buttons">
          ${["0","1","2","3+"].map(v=>`<button class="rir-btn ${record.rir===v?"selected":""}" data-rir="${i}:${v}">${v}</button>`).join("")}
        </div>
      </div>
      ${progressSuggestion(ex, record)}
    `;
    list.appendChild(card);
  });

  document.querySelectorAll(".rep-input").forEach(inp=>{
    inp.addEventListener("input", e=>{
      const ei = +e.target.dataset.ex, si = +e.target.dataset.set;
      state.active.exercises[ei].reps[si] = e.target.value === "" ? null : +e.target.value;
    });
  });

  document.querySelectorAll("[data-done]").forEach(btn=>{
    btn.addEventListener("click", e=>{
      const [ei,si] = e.currentTarget.dataset.done.split(":").map(Number);
      const inp = document.querySelector(`.rep-input[data-ex="${ei}"][data-set="${si}"]`);
      if(inp.value===""){ inp.focus(); return; }
      startRestTimer();
      if(si===0){
        setTimeout(()=>document.querySelector(`.rep-input[data-ex="${ei}"][data-set="1"]`)?.focus(),150);
      }
    });
  });

  document.querySelectorAll("[data-rir]").forEach(btn=>{
    btn.addEventListener("click", e=>{
      const [ei,v] = e.currentTarget.dataset.rir.split(":");
      state.active.exercises[+ei].rir = v;
      renderActive();
    });
  });
}

function findLastExercise(id){
  for(const h of state.history){
    const x = h.exercises.find(e=>e.id===id);
    if(x) return x;
  }
  return null;
}

function progressSuggestion(ex, rec){
  const reps = rec.reps.filter(v=>v!==null);
  if(reps.length===2 && reps.every(v=>v>=ex.max) && ["2","3+"].includes(rec.rir)){
    return `<div class="suggestion">↑ Vypadá to lehce. Příště zvaž těžší variantu: <b>${ex.harder}</b>.</div>`;
  }
  return "";
}

function startWorkout(){
  const w = nextWorkout();
  state.active = {
    workout:w,
    startedAt:Date.now(),
    exercises: workouts[w].map(ex=>({id:ex.id, name:ex.name, reps:[null,null], rir:null}))
  };
  renderActive();
  if(!window.sessionClock){
    window.sessionClock = setInterval(()=>{
      const el = document.getElementById("session-time");
      if(state.active) el.textContent = elapsed();
    },1000);
  }
}

function finishWorkout(){
  if(!state.active) return;
  const hasAny = state.active.exercises.some(e=>e.reps.some(v=>v!==null));
  if(!hasAny) return;
  state.history.unshift({
    workout:state.active.workout,
    date:new Date().toISOString(),
    durationSec:Math.floor((Date.now()-state.active.startedAt)/1000),
    exercises:state.active.exercises
  });
  state.active = null;
  save();
  document.querySelector(".hero-card").classList.remove("hidden");
  document.getElementById("next-card").classList.remove("hidden");
  renderToday(); renderActive(); renderHistory(); renderPlan();
}

function cancelWorkout(){
  state.active = null;
  document.querySelector(".hero-card").classList.remove("hidden");
  document.getElementById("next-card").classList.remove("hidden");
  renderActive();
}

function startRestTimer(){
  clearInterval(state.timer.interval);
  state.timer.remaining = +state.settings.rest;
  state.timer.running = true;
  document.getElementById("timer-sheet").classList.remove("hidden");
  document.getElementById("timer-sheet").setAttribute("aria-hidden","false");
  tickTimer();
  state.timer.interval = setInterval(()=>{
    if(state.timer.running && state.timer.remaining>0){
      state.timer.remaining--;
      tickTimer();
      if(state.timer.remaining===0 && navigator.vibrate) navigator.vibrate([150,100,150]);
    }
  },1000);
}
function tickTimer(){
  document.getElementById("timer-value").textContent = fmtTime(state.timer.remaining);
  document.getElementById("timer-toggle").textContent = state.timer.running ? "Pauza" : "Pokračovat";
}
function closeTimer(){
  document.getElementById("timer-sheet").classList.add("hidden");
  document.getElementById("timer-sheet").setAttribute("aria-hidden","true");
}
function renderHistory(){
  const box = document.getElementById("history-list");
  if(!state.history.length){ box.innerHTML = `<div class="muted">První workout se tu objeví po dokončení.</div>`; return; }
  box.innerHTML = state.history.slice(0,20).map(h=>`
    <div class="history-item">
      <div class="history-top"><strong>Workout ${h.workout}</strong><span class="history-date">${dateLabel(h.date)} · ${fmtTime(h.durationSec)}</span></div>
      <div class="history-summary">${h.exercises.map(e=>`${e.name}: ${e.reps.map(v=>v ?? "–").join(" / ")}${e.rir ? ` · RIR ${e.rir}`:""}`).join("<br>")}</div>
    </div>
  `).join("");
}
function renderPlan(){
  const box = document.getElementById("plan-list");
  box.innerHTML = ["A","B"].map(w=>`
    <div class="plan-card plan-workout">
      <h2>Workout ${w}</h2>
      ${workouts[w].map(ex=>`<div class="plan-ex"><div>${ex.name}</div><small>2× ${ex.target}</small></div>`).join("")}
    </div>
  `).join("");
}
function renderWeights(){
  const box = document.getElementById("weight-summary");
  const chart = document.getElementById("weight-chart");
  if(!state.weights.length){
    box.textContent = "Zatím bez záznamu.";
    chart.innerHTML = "";
    return;
  }
  const latest = state.weights[state.weights.length-1];
  const first = state.weights[0];
  const delta = (latest.value-first.value).toFixed(1);
  box.textContent = `Aktuálně ${latest.value.toFixed(1)} kg · změna ${delta>0?"+":""}${delta} kg`;

  const data = state.weights.slice(-20);
  if(data.length<2){ chart.innerHTML=""; return; }
  const vals = data.map(d=>d.value);
  const min = Math.min(...vals)-0.5, max = Math.max(...vals)+0.5;
  const pts = data.map((d,i)=>{
    const x = 10 + i*(280/(data.length-1));
    const y = 105 - ((d.value-min)/(max-min))*90;
    return `${x},${y}`;
  }).join(" ");
  chart.innerHTML = `<svg viewBox="0 0 300 120" role="img" aria-label="Vývoj tělesné váhy">
    <polyline points="${pts}" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
    <text x="10" y="116" fill="currentColor" font-size="10">${data[0].value.toFixed(1)} kg</text>
    <text x="250" y="116" fill="currentColor" font-size="10">${data[data.length-1].value.toFixed(1)} kg</text>
  </svg>`;
}

document.getElementById("start-workout").addEventListener("click", startWorkout);
document.getElementById("finish-workout").addEventListener("click", finishWorkout);
document.getElementById("cancel-workout").addEventListener("click", cancelWorkout);

document.querySelectorAll(".tab").forEach(tab=>{
  tab.addEventListener("click", ()=>{
    document.querySelectorAll(".tab").forEach(t=>t.classList.remove("active"));
    tab.classList.add("active");
    document.querySelectorAll(".view").forEach(v=>v.classList.remove("active"));
    document.getElementById(tab.dataset.view).classList.add("active");
    document.getElementById("page-title").textContent = tab.textContent;
  });
});

document.querySelectorAll("[data-add]").forEach(b=>{
  b.addEventListener("click",()=>{
    state.timer.remaining = Math.max(0,state.timer.remaining + +b.dataset.add);
    tickTimer();
  });
});
document.getElementById("timer-toggle").addEventListener("click",()=>{
  state.timer.running = !state.timer.running; tickTimer();
});
document.getElementById("timer-close").addEventListener("click", closeTimer);

document.getElementById("settings-btn").addEventListener("click",()=>{
  document.getElementById("start-date").value = state.settings.startDate;
  document.getElementById("rest-seconds").value = String(state.settings.rest);
  document.getElementById("settings-sheet").classList.remove("hidden");
});
document.getElementById("settings-close").addEventListener("click",()=>document.getElementById("settings-sheet").classList.add("hidden"));
document.getElementById("save-settings").addEventListener("click",()=>{
  state.settings.startDate = document.getElementById("start-date").value || state.settings.startDate;
  state.settings.rest = +document.getElementById("rest-seconds").value;
  save(); renderToday();
  document.getElementById("settings-sheet").classList.add("hidden");
});

document.getElementById("save-weight").addEventListener("click",()=>{
  const v = parseFloat(document.getElementById("weight-input").value);
  if(!v) return;
  state.weights.push({date:new Date().toISOString(), value:v});
  save();
  document.getElementById("weight-input").value="";
  renderWeights();
});

renderToday();
renderActive();
renderHistory();
renderPlan();
renderWeights();

if("serviceWorker" in navigator){
  window.addEventListener("load",()=>navigator.serviceWorker.register("service-worker.js").catch(()=>{}));
}
