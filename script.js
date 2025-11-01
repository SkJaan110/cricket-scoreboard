/* ----------------- CONFIG ----------------- */
const BIN_ID = "69031647ae596e708f376e47";
const BASE = `https://api.jsonbin.io/v3/b/${BIN_ID}`;
const MASTER_KEY = ""; // if your bin needs X-Master-Key, put it here (string). Otherwise leave empty.

/* utility: fetch wrapper for jsonbin */
async function putBin(obj){
  const headers = { "Content-Type":"application/json" };
  if(MASTER_KEY) headers["X-Master-Key"] = MASTER_KEY;
  try {
    await fetch(BASE, { method: "PUT", headers, body: JSON.stringify(obj) });
  } catch(e){ console.error("PUT error", e); }
}
async function getBin(){
  try {
    const res = await fetch(`${BASE}/latest?_= ${Date.now()}`);
    const j = await res.json();
    return j.record || j;
  } catch(e){ console.error("GET error", e); return null; }
}

/* contrast function to pick black/white text on color */
function contrastColor(hex){
  if(!hex) return "#000";
  const c = hex.replace("#","");
  const r = parseInt(c.substring(0,2),16);
  const g = parseInt(c.substring(2,4),16);
  const b = parseInt(c.substring(4,6),16);
  const yiq = ((r*299)+(g*587)+(b*114))/1000;
  return yiq >= 128 ? "#071042" : "#ffffff";
}

/* ----------------- STATE ----------------- */
let state = {
  teamA: { name: "", color: "#ff3a8d", score:0, wickets:0, overs:0 },
  teamB: { name: "", color: "#ffd24d", score:0, wickets:0, overs:0 },
  battingSide: "A", // "A" or "B"
  bowlingSide: "B",
  oversLimit: 10,
  ballsInOver: 0, // legal balls in current over (0..5)
  striker: { name:"", runs:0, balls:0 },
  nonStriker: { name:"", runs:0, balls:0 },
  bowler: { name:"", runs:0, wickets:0, balls:0, overs:0 },
  recentBalls: [], // resets each over
  innings: 1,
  target: null
};

/* ----------------- DOM helpers ----------------- */
const $ = id => document.getElementById(id);
const showToast = (t)=>{ const el=$('toast'); el.innerText=t; el.classList.remove('hidden'); setTimeout(()=>el.classList.add('hidden'),1800); };

/* ---------- Create match ---------- */
$('btnCreate').addEventListener('click', async ()=>{
  const tA = $('teamA').value.trim() || "Team A";
  const tB = $('teamB').value.trim() || "Team B";
  const cA = $('teamAColor').value;
  const cB = $('teamBColor').value;
  const overs = Math.max(1, Math.min(100, parseInt($('oversLimit').value) || 10));
  const toss = document.querySelector('input[name="toss"]:checked')?.value || "A";
  const decision = $('tossDecision').value; // 'bat' or 'bowl'

  state.teamA.name = tA; state.teamA.color = cA;
  state.teamB.name = tB; state.teamB.color = cB;
  state.oversLimit = overs;

  // decide batting side based on manual toss selection & decision
  let batting = (toss === "A" && decision === "bat") || (toss === "B" && decision === "bowl") ? "A" : "B";
  state.battingSide = batting;
  state.bowlingSide = batting === "A" ? "B" : "A";

  // reset scores and players
  state.teamA.score = 0; state.teamA.wickets = 0; state.teamA.overs = 0;
  state.teamB.score = 0; state.teamB.wickets = 0; state.teamB.overs = 0;
  state.ballsInOver = 0;
  state.striker = { name:"", runs:0, balls:0 };
  state.nonStriker = { name:"", runs:0, balls:0 };
  state.bowler = { name:"", runs:0, wickets:0, balls:0, overs:0 };
  state.recentBalls = [];
  state.innings = 1;
  state.target = null;

  // show players card
  $('playersCard').classList.remove('hidden');

  // update bin
  await putBin(stateToRecord());
  showToast("Match created — set players");
});

/* ---------- Set players & start ---------- */
$('btnSetPlayers')?.addEventListener('click', async ()=>{
  const s = $('inputStriker').value.trim(); const ns = $('inputNonStriker').value.trim(); const bw = $('inputBowler').value.trim();
  if(!s || !ns || !bw) return alert("Enter striker, non-striker and bowler names");

  state.striker = { name: s, runs:0, balls:0 };
  state.nonStriker = { name: ns, runs:0, balls:0 };
  state.bowler = { name: bw, runs:0, wickets:0, balls:0, overs:0 };
  $('playersCard').classList.add('hidden');
  $('scoreCard').classList.remove('hidden');
  renderPanel();
  await putBin(stateToRecord());
  showToast("Scoring started");
});

/* ---------- Controls ---------- */
document.querySelectorAll('.runBtn').forEach(b=>{
  b.addEventListener('click', async ()=> {
    const r = parseInt(b.dataset.run,10);
    await doLegalRun(r);
  });
});
document.querySelectorAll('.extraBtn').forEach(b=>{
  b.addEventListener('click', async ()=> {
    const type = b.dataset.type;
    await doExtra(type);
  });
});
$('btnWicket').addEventListener('click', async ()=> {
  await doWicket();
});
$('btnForceOver').addEventListener('click', async ()=> {
  await forceEndOver();
});
$('btnEndInnings').addEventListener('click', async ()=> {
  await finishInnings();
});
$('btnRotate').addEventListener('click', async ()=> {
  swapStrike(); renderPanel(); await putBin(stateToRecord());
});

/* ---------- Core functions ---------- */

async function doLegalRun(r){
  // add to batting side score & striker stats, bowler runs/balls
  const batting = state.battingSide === "A" ? state.teamA : state.teamB;
  batting.score += r;

  state.striker.runs += r;
  state.striker.balls += 1;

  state.bowler.runs += r;
  state.bowler.balls += (state.bowler.balls || 0) + 1;

  state.ballsInOver += 1;
  state.recentBalls.push(r);
  if(state.recentBalls.length>6) state.recentBalls.shift();

  // animation for 4/6
  if(r === 4) showAnim("FOUR");
  if(r === 6) showAnim("SIX");

  if(r % 2 === 1) swapStrike();

  await handleOverProgress();
  renderPanel();
  await putBin(stateToRecord());
  await checkTargetIfNeeded();
}

async function doExtra(type){
  const batting = state.battingSide === "A" ? state.teamA : state.teamB;
  if(type === "wide"){
    batting.score += 1;
    state.recentBalls.push("WD");
    if(state.recentBalls.length>6) state.recentBalls.shift();
  } else if(type === "noball"){
    const runs = parseInt(prompt("Runs scored on no-ball (0-6):","0")||"0");
    const r = isNaN(runs)?0:runs;
    batting.score += 1 + r;
    state.recentBalls.push("NB+"+r);
    // credit to striker's runs typically
    state.striker.runs += r;
    if(r % 2 === 1) swapStrike();
  } else if(type === "bye" || type === "legbye"){
    const runs = parseInt(prompt("Bye runs (0-6):","0")||"0");
    const r = isNaN(runs)?0:runs;
    batting.score += r;
    state.recentBalls.push((type==="bye"?"B":"LB")+r);
    // counts as legal ball
    state.ballsInOver += 1;
    state.bowler.runs += r;
    state.bowler.balls += 1;
    if(state.recentBalls.length>6) state.recentBalls.shift();
    if(r % 2 === 1) swapStrike();
    await handleOverProgress();
  }
  renderPanel();
  await putBin(stateToRecord());
  await checkTargetIfNeeded();
}

async function doWicket(){
  const batting = state.battingSide === "A" ? state.teamA : state.teamB;
  batting.wickets += 1;

  // legal wicket counted as legal ball
  state.striker.balls += 1;
  state.bowler.wickets += 1;
  state.bowler.balls += 1;
  state.ballsInOver += 1;
  state.recentBalls.push("W");
  if(state.recentBalls.length>6) state.recentBalls.shift();

  showAnim("OUT");

  if(batting.wickets >= 10){
    // all out -> end innings
    await finishInnings();
    return;
  }

  renderPanel();
  await putBin(stateToRecord());
  await handleOverProgress();

  // open new batsman modal equivalent: simple prompt (mobile friendly)
  setTimeout(async ()=>{
    const newName = prompt("New batsman name (leave empty for All Out)");
    if(!newName){
      await finishInnings();
      return;
    }
    // add new striker and reset his personal stats
    state.striker = { name: newName, runs:0, balls:0 };
    await putBin(stateToRecord());
    renderPanel();
  }, 100);
}

/* swap positions */
function swapStrike(){
  const a = state.striker;
  state.striker = state.nonStriker;
  state.nonStriker = a;
}

/* handle over end after ball increments */
async function handleOverProgress(){
  if(state.ballsInOver >= 6){
    // finish over
    const batting = state.battingSide === "A" ? state.teamA : state.teamB;
    batting.overs += 1;
    // set bowler's overs count
    state.bowler.overs = (state.bowler.overs || 0) + 1;
    // reset balls
    state.ballsInOver = 0;
    // reset recent balls for new over
    state.recentBalls = [];
    // rotate strike at over end
    swapStrike();

    renderPanel();
    await putBin(stateToRecord());

    // ask to change bowler (non-blocking)
    setTimeout(async ()=>{
      if(confirm("Change bowler? OK to change.")){
        const nb = prompt("Enter new bowler name:","");
        if(nb){
          state.bowler = { name: nb, runs:0, wickets:0, balls:0, overs:0 };
          await putBin(stateToRecord());
          renderPanel();
        }
      }
    },200);
  } else {
    // update overs display only
    const batting = state.battingSide === "A" ? state.teamA : state.teamB;
    // no change to batting.overs until over completes
  }
}

/* force end over */
async function forceEndOver(){
  const batting = state.battingSide === "A" ? state.teamA : state.teamB;
  // convert remaining balls to complete over
  if(state.ballsInOver > 0){
    batting.overs += 1;
    state.ballsInOver = 0;
    state.recentBalls = [];
    state.bowler.overs = (state.bowler.overs||0)+1;
    swapStrike();
    renderPanel();
    await putBin(stateToRecord());
  }
}

/* finish innings and handle target/2nd innings */
async function finishInnings(){
  if(state.innings === 1){
    // set target and switch
    const batting = state.battingSide === "A" ? state.teamA : state.teamB;
    state.target = batting.score + 1;
    state.innings = 2;
    // swap batting side
    state.battingSide = state.battingSide === "A" ? "B" : "A";
    state.bowlingSide = state.battingSide === "A" ? "B" : "A";
    // reset per-player but keep team totals
    state.striker = { name:"", runs:0, balls:0 };
    state.nonStriker = { name:"", runs:0, balls:0 };
    state.bowler = { name:"", runs:0, wickets:0, balls:0, overs:0 };
    state.ballsInOver = 0;
    state.recentBalls = [];
    renderPanel();
    await putBin(stateToRecord());
    showToast("2nd innings started. Target: " + state.target);
    return;
  } else {
    // match end: determine winner
    const batting = state.battingSide === "A" ? state.teamA : state.teamB;
    const other = state.battingSide === "A" ? state.teamB : state.teamA;
    let msg;
    if(state.target !== null){
      // check who reached target
      if(batting.score >= state.target) msg = `${batting.name} won by chase!`;
      else msg = `${other.name} won!`;
    } else {
      msg = "Match ended";
    }
    await putBin(stateToRecord());
    alert(msg);
  }
}

/* ------------- UI render ------------- */
function renderPanel(){
  $('matchTitle').innerText = `${state.teamA.name} vs ${state.teamB.name} — Innings ${state.innings}`;
  const battingName = state.battingSide === "A" ? state.teamA.name : state.teamB.name;
  $('battingLabel').innerText = `Batting: ${battingName}`;
  const battingObj = state.battingSide === "A" ? state.teamA : state.teamB;
  $('scoreLabel').innerText = `${battingObj.score} - ${battingObj.wickets}`;
  $('oversLabel').innerText = `${Math.floor(battingObj.overs)}.${state.ballsInOver}`;
  if(state.target !== null && state.innings === 2){
    $('targetLabel').innerText = `Target: ${state.target}`; $('targetLabel').classList.remove('hidden');
  } else { $('targetLabel').classList.add('hidden'); }

  // players
  $('strikerName').innerText = state.striker.name || "-";
  $('strikerStat').innerText = `${state.striker.runs}(${state.striker.balls})`;
  $('nonStrikerName').innerText = state.nonStriker.name || "-";
  $('nonStrikerStat').innerText = `${state.nonStriker.runs}(${state.nonStriker.balls})`;

  // bowler & recent balls
  $('bowlerLabel').innerText = `🥎 ${state.bowler.name || "-"}`;
  $('recentBalls').innerText = (state.recentBalls.length? state.recentBalls.join(' '): '- - - - - -');

  // apply team colors to UI small preview (scorer side)
  const batColor = state.battingSide === "A" ? state.teamA.color : state.teamB.color;
  const bowlColor = state.bowlingSide === "A" ? state.teamA.color : state.teamB.color;
  $('strikerName').style.background = batColor; $('strikerName').style.color = contrastColor(batColor);
  $('strikerStat').style.background = "rgba(255,255,255,0.85)"; $('strikerStat').style.color = "#071042";
  $('nonStrikerName').style.background = batColor; $('nonStrikerName').style.color = contrastColor(batColor);
  $('nonStrikerStat').style.background = "rgba(255,255,255,0.85)"; $('nonStrikerStat').style.color = "#071042";
  $('bowlerLabel').style.background = bowlColor; $('bowlerLabel').style.color = contrastColor(bowlColor);

  // update overlay immediately too (so scorer changes reflect quickly)
  updateOverlayElements();
}

/* helper to build record for bin */
function stateToRecord(){
  return {
    teamA: state.teamA,
    teamB: state.teamB,
    battingSide: state.battingSide,
    bowlingSide: state.bowlingSide,
    oversLimit: state.oversLimit,
    innings: state.innings,
    target: state.target,
    striker: state.striker,
    nonStriker: state.nonStriker,
    bowler: state.bowler,
    recentBalls: state.recentBalls,
    ballsInOver: state.ballsInOver
  };
}

/* ---------- Overlay updater (runs in same script file, used by overlay.html via same script) ---------- */
async function updateOverlayElements(){
  // This function will set overlay DOM if overlay is same page; but overlay.html includes same script
  // So on overlay page, getBin will be used by interval below to read latest and update overlay UI
  // For scorer side we also call this to push immediate changes (but overlay fetches its own)
  try{
    // no-op here; overlay page uses getBin() interval
  } catch(e){ console.error(e); }
}

/* ---------- Animation ---------- */
let animTimeout = null;
function showAnim(text){
  const anim = $('animBox') || document.querySelector('#animBox'); // overlay or scorer
  if(!anim) return;
  anim.innerText = text;
  anim.classList.remove('hidden');
  // ensure slide animation (overlay CSS handles direction)
  clearTimeout(animTimeout);
  animTimeout = setTimeout(()=> anim.classList.add('hidden'), 3500);
}

/* ---------- Overlay page logic (if loaded in overlay.html) ---------- */
async function overlayLoop(){
  const record = await getBin();
  if(!record) return;
  // determine batting & colors
  const battingSide = record.battingSide || "A";
  const batting = battingSide === "A" ? record.teamA : record.teamB;
  const bowling = battingSide === "A" ? record.teamB : record.teamA;

  // set backgrounds for batsmen and bowler areas
  const bar = document.getElementById('overlayBar');
  if(bar){
    // batting team color for batsmen bg
    const leftName = document.getElementById('ov_leftName'); const leftStat = document.getElementById('ov_leftStat');
    const rightName = document.getElementById('ov_rightName'); const rightStat = document.getElementById('ov_rightStat');
    leftName && (leftName.style.background = batting.color);
    leftName && (leftName.style.color = contrastColor(batting.color));
    rightName && (rightName.style.background = batting.color);
    rightName && (rightName.style.color = contrastColor(batting.color));
    leftStat && (leftStat.style.background = "rgba(255,255,255,0.85)"); leftStat && (leftStat.style.color = "#071042");
    rightStat && (rightStat.style.background = "rgba(255,255,255,0.85)"); rightStat && (rightStat.style.color = "#071042");

    // bowling color for bowler & recent
    const bow = document.getElementById('ov_bowler'); const recent = document.getElementById('ov_recent');
    bow && (bow.style.background = bowling.color); bow && (bow.style.color = contrastColor(bowling.color));
    recent && (recent.style.background = bowling.color); recent && (recent.style.color = contrastColor(bowling.color));
  }

  // fill data
  if(document.getElementById('ov_leftName')) document.getElementById('ov_leftName').innerText = record.striker?.name || "-";
  if(document.getElementById('ov_leftStat')) document.getElementById('ov_leftStat').innerText = `${record.striker?.runs||0}(${record.striker?.balls||0})`;
  if(document.getElementById('ov_rightName')) document.getElementById('ov_rightName').innerText = record.nonStriker?.name || "-";
  if(document.getElementById('ov_rightStat')) document.getElementById('ov_rightStat').innerText = `${record.nonStriker?.runs||0}(${record.nonStriker?.balls||0})`;

  if(document.getElementById('ov_team')) document.getElementById('ov_team').innerText = batting.name;
  if(document.getElementById('ov_score')) document.getElementById('ov_score').innerText = `${batting.score || 0}-${batting.wickets || 0}`;
  if(document.getElementById('ov_overs')) document.getElementById('ov_overs').innerText = `${Math.floor(batting.overs)}.${record.ballsInOver || 0}`;
  if(record.target && document.getElementById('ov_target')) { document.getElementById('ov_target').innerText = `Target: ${record.target}`; document.getElementById('ov_target').classList.remove('hidden'); }
  else document.getElementById('ov_target') && document.getElementById('ov_target').classList.add('hidden');

  // bowler + recent
  if(document.getElementById('ov_bowler')) document.getElementById('ov_bowler').innerText = `🥎 ${record.bowler?.name || "-"}`;
  if(document.getElementById('ov_recent')) document.getElementById('ov_recent').innerText = (record.recentBalls && record.recentBalls.length? record.recentBalls.join(' ') : "- - - - - -");

  // flash animations: show only when last ball is 4,6,W or NB/WD etc.
  const last = record.recentBalls && record.recentBalls.slice(-1)[0];
  if(last === 4) showOverlayAnim("FOUR");
  else if(last === 6) showOverlayAnim("SIX");
  else if(last === "W") showOverlayAnim("OUT");
}

/* overlay animation function (for overlay page) */
let overlayAnimTimer = null;
function showOverlayAnim(text){
  const box = document.getElementById('animBox');
  if(!box) return;
  box.innerText = text;
  box.classList.remove('hidden');
  clearTimeout(overlayAnimTimer);
  overlayAnimTimer = setTimeout(()=> box.classList.add('hidden'), 3500);
}

/* start overlay interval if running in overlay page */
if(typeof window !== 'undefined' && window.location.pathname.endsWith('overlay.html')){
  setInterval(overlayLoop, 1600);
  overlayLoop();
}

/* overlayLoop uses getBin internal */
async function overlayLoop(){
  const rec = await getBin();
  if(rec) overlayLoopUpdate(rec);
}
function overlayLoopUpdate(rec){
  // same as update logic above but slightly optimized for overlay page
  const batting = rec.battingSide === "A" ? rec.teamA : rec.teamB;
  const bowling = rec.battingSide === "A" ? rec.teamB : rec.teamA;

  const leftName = document.getElementById('ov_leftName'); const leftStat = document.getElementById('ov_leftStat');
  const rightName = document.getElementById('ov_rightName'); const rightStat = document.getElementById('ov_rightStat');
  const bow = document.getElementById('ov_bowler'); const recent = document.getElementById('ov_recent');

  leftName && (leftName.innerText = rec.striker?.name || "-"); leftStat && (leftStat.innerText = `${rec.striker?.runs||0}(${rec.striker?.balls||0})`);
  rightName && (rightName.innerText = rec.nonStriker?.name || "-"); rightStat && (rightStat.innerText = `${rec.nonStriker?.runs||0}(${rec.nonStriker?.balls||0})`);
  document.getElementById('ov_team') && (document.getElementById('ov_team').innerText = batting.name);
  document.getElementById('ov_score') && (document.getElementById('ov_score').innerText = `${batting.score || 0}-${batting.wickets || 0}`);
  document.getElementById('ov_overs') && (document.getElementById('ov_overs').innerText = `${Math.floor(batting.overs)}.${rec.ballsInOver || 0}`);
  if(rec.target && document.getElementById('ov_target')) { document.getElementById('ov_target').innerText = `Target: ${rec.target}`; document.getElementById('ov_target').classList.remove('hidden'); }
  else document.getElementById('ov_target') && document.getElementById('ov_target').classList.add('hidden');

  // style batsman bg with batting color
  if(leftName) { leftName.style.background = batting.color; leftName.style.color = contrastColor(batting.color); }
  if(rightName) { rightName.style.background = batting.color; rightName.style.color = contrastColor(batting.color); }
  if(leftStat) leftStat.style.background = "rgba(255,255,255,0.85)"; if(rightStat) rightStat.style.background = "rgba(255,255,255,0.85)";

  // bowler & recent with bowling color
  if(bow) { bow.innerText = `🥎 ${rec.bowler?.name || "-"}`; bow.style.background = bowling.color; bow.style.color = contrastColor(bowling.color); }
  if(recent) { recent.innerText = (rec.recentBalls && rec.recentBalls.length? rec.recentBalls.join(' ') : "- - - - - -"); recent.style.background = bowling.color; recent.style.color = contrastColor(bowling.color); }

  // animations
  const last = rec.recentBalls && rec.recentBalls.slice(-1)[0];
  if(last === 4) showOverlayAnim("FOUR");
  else if(last === 6) showOverlayAnim("SIX");
  else if(last === "W") showOverlayAnim("OUT");
}

/* end of script.js */
