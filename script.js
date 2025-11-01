/* ----------------- CONFIG ----------------- */
const BIN_ID = "69031647ae596e708f376e47";
const BASE = `https://api.jsonbin.io/v3/b/${BIN_ID}`;
const MASTER_KEY = ""; // set if you make bin private and need X-Master-Key

/* helper */
const $ = id => document.getElementById(id);
function contrastColor(hex){
  if(!hex) return "#000";
  const c = hex.replace("#","");
  const r = parseInt(c.substring(0,2),16);
  const g = parseInt(c.substring(2,4),16);
  const b = parseInt(c.substring(4,6),16);
  const yiq = ((r*299)+(g*587)+(b*114))/1000;
  return yiq >= 128 ? "#071042" : "#ffffff";
}

/* fetch & put helpers */
async function putBin(obj){
  const headers = {"Content-Type":"application/json"};
  if(MASTER_KEY) headers["X-Master-Key"] = MASTER_KEY;
  try {
    await fetch(BASE, { method: "PUT", headers, body: JSON.stringify(obj) });
  } catch(e){ console.error("PUT error", e); }
}
async function getBin(){
  try {
    const res = await fetch(`${BASE}/latest?=${Date.now()}`);
    const j = await res.json();
    return j.record || j;
  } catch(e){ console.error("GET error", e); return null; }
}

/* state */
let state = {
  teamA: { name:"Team A", color:"#ff3a8d", score:0, wickets:0, overs:0 },
  teamB: { name:"Team B", color:"#ffd24d", score:0, wickets:0, overs:0 },
  battingSide: "A",
  bowlingSide: "B",
  oversLimit: 10,
  ballsInOver: 0,
  striker: { name:"", runs:0, balls:0 },
  nonStriker: { name:"", runs:0, balls:0 },
  bowler: { name:"", runs:0, wickets:0, balls:0, overs:0 },
  recentBalls: [],
  innings: 1,
  target: null
};

/* UI init */
$('btnCreate').addEventListener('click', async ()=>{
  state.teamA.name = $('teamA').value.trim() || "Team A";
  state.teamB.name = $('teamB').value.trim() || "Team B";
  state.teamA.color = $('teamAColor').value;
  state.teamB.color = $('teamBColor').value;
  state.oversLimit = Math.max(1, Math.min(100, parseInt($('oversLimit').value) || 10));
  const toss = document.querySelector('input[name="toss"]:checked')?.value || "A";
  const decision = $('tossDecision').value;
  // determine batting side
  const batting = (toss === "A" && decision === "bat") || (toss === "B" && decision === "bowl") ? "A" : "B";
  state.battingSide = batting;
  state.bowlingSide = batting === "A" ? "B" : "A";
  // reset
  state.teamA.score = state.teamA.wickets = state.teamA.overs = 0;
  state.teamB.score = state.teamB.wickets = state.teamB.overs = 0;
  state.ballsInOver = 0;
  state.striker = {name:"",runs:0,balls:0};
  state.nonStriker = {name:"",runs:0,balls:0};
  state.bowler = {name:"",runs:0,wickets:0,balls:0,overs:0};
  state.recentBalls = [];
  state.innings = 1; state.target = null;
  // show players card automatically for innings 1
  $('playersCard').classList.remove('hidden');
  $('inningLabel').innerText = state.innings;
  await putBin(stateToRecord());
  showToast("Match created — set players");
});

/* set players button */
$('btnSetPlayers').addEventListener('click', async ()=>{
  const s = $('inputStriker').value.trim(); const ns = $('inputNonStriker').value.trim(); const bw = $('inputBowler').value.trim();
  if(!s || !ns || !bw) return alert("Enter striker, non-striker and bowler names");
  state.striker = { name: s, runs:0, balls:0 };
  state.nonStriker = { name: ns, runs:0, balls:0 };
  state.bowler = { name: bw, runs:0, wickets:0, balls:0, overs:0 };
  $('playersCard').classList.add('hidden');
  $('scoreCard').classList.remove('hidden');
  renderPanel();
  await putBin(stateToRecord());
  showToast("Innings started");
});

/* controls */
document.querySelectorAll('.runBtn').forEach(b=> b.addEventListener('click', ()=> doLegalRun(parseInt(b.dataset.run))));
document.querySelectorAll('.extraBtn').forEach(b=> b.addEventListener('click', ()=> doExtra(b.dataset.type)));
$('btnWicket').addEventListener('click', ()=> doWicket());
$('btnForceOver').addEventListener('click', ()=> forceEndOver());
$('btnEndInnings').addEventListener('click', ()=> finishInnings());
$('btnRotate').addEventListener('click', ()=> { swapStrike(); renderPanel(); putBin(stateToRecord()); });

/* core functions */
async function doLegalRun(r){
  const batting = state.battingSide === "A" ? state.teamA : state.teamB;
  batting.score += r;
  state.striker.runs += r; state.striker.balls += 1;
  state.bowler.runs += r; state.bowler.balls = (state.bowler.balls||0)+1;
  state.ballsInOver += 1;
  state.recentBalls.push(r); if(state.recentBalls.length>6) state.recentBalls.shift();
  if(r===4) showAnim("FOUR"); if(r===6) showAnim("SIX");
  if(r%2===1) swapStrike();
  await handleOverProgress();
  renderPanel(); await putBin(stateToRecord()); await checkTargetIfNeeded();
}

async function doExtra(type){
  const batting = state.battingSide === "A" ? state.teamA : state.teamB;
  if(type === "wide"){
    batting.score += 1; state.recentBalls.push("WD"); if(state.recentBalls.length>6) state.recentBalls.shift();
  } else if(type === "noball"){
    const runs = parseInt(prompt("Runs on no-ball (0-6):","0")||"0"); const r = isNaN(runs)?0:runs;
    batting.score += 1 + r; state.recentBalls.push("NB+"+r);
    state.striker.runs += r; if(r%2===1) swapStrike();
  } else if(type === "bye" || type === "legbye"){
    const runs = parseInt(prompt("Bye runs (0-6):","0")||"0"); const r = isNaN(runs)?0:runs;
    batting.score += r; state.recentBalls.push((type==="bye"?"B":"LB")+r);
    state.ballsInOver += 1; state.bowler.runs += r; state.bowler.balls = (state.bowler.balls||0)+1;
    if(state.recentBalls.length>6) state.recentBalls.shift(); if(r%2===1) swapStrike();
    await handleOverProgress();
  }
  renderPanel(); await putBin(stateToRecord()); await checkTargetIfNeeded();
}

async function doWicket(){
  const batting = state.battingSide === "A" ? state.teamA : state.teamB;
  batting.wickets += 1;
  state.striker.balls += 1;
  state.bowler.wickets = (state.bowler.wickets||0)+1;
  state.bowler.balls = (state.bowler.balls||0)+1;
  state.ballsInOver += 1;
  state.recentBalls.push("W"); if(state.recentBalls.length>6) state.recentBalls.shift();
  showAnim("OUT");
  if(batting.wickets >= 10){
    await finishInnings(); return;
  }
  renderPanel(); await putBin(stateToRecord()); await handleOverProgress();
  // automatic prompt for new batsman (mobile-friendly)
  setTimeout(async ()=>{
    const newName = prompt("New batsman name (leave empty = All Out)");
    if(!newName){ await finishInnings(); return; }
    state.striker = { name: newName, runs:0, balls:0 };
    await putBin(stateToRecord());
    renderPanel();
  },120);
}

function swapStrike(){
  const a = state.striker; state.striker = state.nonStriker; state.nonStriker = a;
}

async function handleOverProgress(){
  if(state.ballsInOver >= 6){
    const batting = state.battingSide === "A" ? state.teamA : state.teamB;
    batting.overs = (batting.overs||0) + 1;
    state.ballsInOver = 0;
    state.recentBalls = [];
    state.bowler.overs = (state.bowler.overs||0) + 1;
    swapStrike();
    renderPanel(); await putBin(stateToRecord());
    // ask to change bowler (non-blocking)
    setTimeout(async ()=>{
      if(confirm("Change bowler? OK to change.")){
        const nb = prompt("Enter new bowler name:","");
        if(nb){ state.bowler = { name: nb, runs:0, wickets:0, balls:0, overs:0 }; await putBin(stateToRecord()); renderPanel(); }
      }
    },200);
    // check if innings should end by overs limit
    const battingObj = state.battingSide === "A" ? state.teamA : state.teamB;
    if(battingObj.overs >= state.oversLimit){
      await finishInnings();
    }
  } else {
    // nothing
  }
}

async function forceEndOver(){
  if(state.ballsInOver > 0){
    const batting = state.battingSide === "A" ? state.teamA : state.teamB;
    batting.overs = (batting.overs||0) + 1;
    state.ballsInOver = 0; state.recentBalls = []; state.bowler.overs = (state.bowler.overs||0)+1;
    swapStrike(); renderPanel(); await putBin(stateToRecord());
  }
}

async function finishInnings(){
  if(state.innings === 1){
    // set target and switch to 2nd
    const battingObj = state.battingSide === "A" ? state.teamA : state.teamB;
    state.target = battingObj.score + 1;
    state.innings = 2;
    // switch sides
    state.battingSide = state.battingSide === "A" ? "B" : "A";
    state.bowlingSide = state.battingSide === "A" ? "B" : "A";
    // keep team totals; reset per-player data
    state.striker = { name:"", runs:0, balls:0 };
    state.nonStriker = { name:"", runs:0, balls:0 };
    state.bowler = { name:"", runs:0, wickets:0, balls:0, overs:0 };
    state.ballsInOver = 0; state.recentBalls = [];
    // show playersCard automatically so user can set players for 2nd innings
    $('playersCard').classList.remove('hidden'); $('inningLabel').innerText = state.innings;
    renderPanel(); await putBin(stateToRecord());
    showToast("2nd innings started — set players");
    return;
  } else {
    // end match: determine winner
    const battingObj = state.battingSide === "A" ? state.teamA : state.teamB;
    const otherObj = state.battingSide === "A" ? state.teamB : state.teamA;
    let msg;
    if(state.target !== null){
      if(battingObj.score >= state.target) msg = `${battingObj.name} won by chase!`;
      else msg = `${otherObj.name} won!`;
    } else msg = "Match ended";
    await putBin(stateToRecord());
    alert(msg);
  }
}

/* check during 2nd innings if target reached */
async function checkTargetIfNeeded(){
  if(state.innings === 2 && state.target){
    const battingObj = state.battingSide === "A" ? state.teamA : state.teamB;
    const otherObj = state.battingSide === "A" ? state.teamB : state.teamA;
    if(battingObj.score >= state.target){
      await putBin(stateToRecord());
      alert(`${battingObj.name} reached the target — WON`);
    } else {
      // if overs ended later, finishInnings will determine winner
    }
  }
}

/* render UI */
function renderPanel(){
  $('matchTitle').innerText = `${state.teamA.name} vs ${state.teamB.name} — Innings ${state.innings}`;
  const battingName = state.battingSide === "A" ? state.teamA.name : state.teamB.name;
  $('battingLabel').innerText = `Batting: ${battingName}`;
  const battingObj = state.battingSide === "A" ? state.teamA : state.teamB;
  $('scoreLabel').innerText = `${battingObj.score} - ${battingObj.wickets}`;
  $('oversLabel').innerText = `${Math.floor(battingObj.overs)}.${state.ballsInOver}`;
  if(state.target !== null && state.innings === 2){ $('targetLabel').innerText = `Target: ${state.target}`; $('targetLabel').classList.remove('hidden'); }
  else $('targetLabel').classList.add('hidden');

  $('strikerName').innerText = state.striker.name || "-"; $('strikerStat').innerText = `${state.striker.runs}(${state.striker.balls})`;
  $('nonStrikerName').innerText = state.nonStriker.name || "-"; $('nonStrikerStat').innerText = `${state.nonStriker.runs}(${state.nonStriker.balls})`;

  $('bowlerLabel').innerText = `🥎 ${state.bowler.name || "-"}`;
  $('recentBalls').innerText = (state.recentBalls.length? state.recentBalls.join(' '): '- - - - - -');

  // apply small color preview in scorer UI
  const batColor = state.battingSide === "A" ? state.teamA.color : state.teamB.color;
  const bowlColor = state.bowlingSide === "A" ? state.teamA.color : state.teamB.color;
  $('strikerName').style.background = batColor; $('strikerName').style.color = contrastColor(batColor);
  $('nonStrikerName').style.background = batColor; $('nonStrikerName').style.color = contrastColor(batColor);
  $('bowlerLabel').style.background = bowlColor; $('bowlerLabel').style.color = contrastColor(bowlColor);
}

/* convert state for bin */
function stateToRecord(){
  return {
    teamA: state.teamA, teamB: state.teamB,
    battingSide: state.battingSide, bowlingSide: state.bowlingSide,
    oversLimit: state.oversLimit, innings: state.innings, target: state.target,
    striker: state.striker, nonStriker: state.nonStriker, bowler: state.bowler,
    recentBalls: state.recentBalls, ballsInOver: state.ballsInOver
  };
}

/* toast */
function showToast(t){ const el=$('toast'); el.innerText=t; el.classList.remove('hidden'); setTimeout(()=>el.classList.add('hidden'),1600); }

/* animation for scorer */
let animTimer = null;
function showAnim(text){
  const el = $('animBox') || document.getElementById('animBox');
  if(!el) return;
  el.innerText = text; el.classList.remove('hidden');
  clearTimeout(animTimer); animTimer = setTimeout(()=> el.classList.add('hidden'),3500);
}

/* ---------- Overlay fetching & apply (runs in overlay.html) ---------- */
async function overlayFetchAndApply(){
  const rec = await getBin();
  if(!rec) return;
  // determine batting & bowling team objects
  const battingSide = rec.battingSide || "A";
  const batting = battingSide === "A" ? rec.teamA : rec.teamB;
  const bowling = battingSide === "A" ? rec.teamB : rec.teamA;

  // fill overlay fields if present
  const setIf = (id, val) => { const el = document.getElementById(id); if(el) el.innerText = val; };
  setIf('ov_leftName', rec.striker?.name || "-");
  setIf('ov_leftStat', `${rec.striker?.runs||0}(${rec.striker?.balls||0})`);
  setIf('ov_rightName', rec.nonStriker?.name || "-");
  setIf('ov_rightStat', `${rec.nonStriker?.runs||0}(${rec.nonStriker?.balls||0})`);
  setIf('ov_team', batting.name);
  setIf('ov_score', `${batting.score||0}-${batting.wickets||0}`);
  setIf('ov_overs', `${Math.floor(batting.overs)}.${rec.ballsInOver||0}`);
  if(rec.target && rec.innings === 2){ setIf('ov_target', `Target: ${rec.target}`); document.getElementById('ov_target') && document.getElementById('ov_target').classList.remove('hidden'); }
  else document.getElementById('ov_target') && document.getElementById('ov_target').classList.add('hidden');

  // recent and bowler
  setIf('ov_bowler', `🥎 ${rec.bowler?.name || "-"}`);
  setIf('ov_recent', (rec.recentBalls && rec.recentBalls.length) ? rec.recentBalls.join(' ') : "- - - - - -");

  // apply colors: batsmen bg = batting.color; bowler/recent bg = bowling.color; text color auto contrast
  const leftName = document.getElementById('ov_leftName'); const rightName = document.getElementById('ov_rightName');
  const leftStat = document.getElementById('ov_leftStat'); const rightStat = document.getElementById('ov_rightStat');
  const bow = document.getElementById('ov_bowler'); const recent = document.getElementById('ov_recent');
  if(leftName){ leftName.style.background = batting.color; leftName.style.color = contrastColor(batting.color); }
  if(rightName){ rightName.style.background = batting.color; rightName.style.color = contrastColor(batting.color); }
  if(leftStat) leftStat.style.background = "rgba(255,255,255,0.85)"; if(rightStat) rightStat.style.background = "rgba(255,255,255,0.85)";
  if(bow){ bow.style.background = bowling.color; bow.style.color = contrastColor(bowling.color); }
  if(recent){ recent.style.background = bowling.color; recent.style.color = contrastColor(bowling.color); }

  // animation: last ball
  const last = rec.recentBalls && rec.recentBalls.slice(-1)[0];
  if(last === 4) showOverlayAnim("FOUR");
  else if(last === 6) showOverlayAnim("SIX");
  else if(last === "W") showOverlayAnim("OUT");
}

/* overlay animation */
let overlayTimer = null;
function showOverlayAnim(text){
  const box = document.getElementById('animBox');
  if(!box) return;
  box.innerText = text; box.classList.remove('hidden');
  clearTimeout(overlayTimer); overlayTimer = setTimeout(()=> box.classList.add('hidden'),3500);
}

/* start overlay polling only on overlay page (overlay.html) */
if(typeof window !== 'undefined' && window.location.pathname.endsWith('overlay.html')){
  setInterval(overlayFetchAndApply, 1400);
  overlayFetchAndApply();
}
