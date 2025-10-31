/* scoring logic — updates JSONBin (public bin) */
const BIN_PUT = "https://api.jsonbin.io/v3/b/69031647ae596e708f376e47";

let state = {
  matchName: "",
  teamA: "", teamB: "",
  battingTeam: "", bowlingTeam: "",
  score: 0, wickets: 0,
  balls: 0, // legal balls in current innings
  overs: "0.0",
  striker: { name: "", runs: 0, balls: 0 },
  nonStriker: { name: "", runs: 0, balls: 0 },
  bowler: { name: "", overs: 0, runs: 0, wickets: 0 },
  recentBalls: [] // resets at over end
};

function createMatch(){
  state.matchName = document.getElementById('matchName').value || 'Match';
  state.teamA = document.getElementById('teamA').value || 'Team A';
  state.teamB = document.getElementById('teamB').value || 'Team B';
  state.battingTeam = state.teamA;
  state.bowlingTeam = state.teamB;
  document.getElementById('panel').classList.remove('hidden');
  pushState(); renderPanel();
  transient('Match created');
}

function setBowler(){
  const v = document.getElementById('bowler').value.trim();
  if(!v){ return alert('Enter bowler name'); }
  state.bowler.name = v;
  state.bowler.overs = state.bowler.overs || 0;
  state.bowler.runs = state.bowler.runs || 0;
  state.bowler.wickets = state.bowler.wickets || 0;
  pushState(); renderPanel();
  transient('Bowler set');
}

function renderPanel(){
  document.getElementById('strike').value = state.striker.name || '';
  document.getElementById('nonStrike').value = state.nonStriker.name || '';
  document.getElementById('strikeStat').innerText = `${state.striker.runs}(${state.striker.balls})`;
  document.getElementById('nonStrikeStat').innerText = `${state.nonStriker.runs}(${state.nonStriker.balls})`;
  document.getElementById('teamCenter').innerText = state.battingTeam;
  document.getElementById('scoreCenter').innerText = `${state.score}-${state.wickets}`;
  document.getElementById('oversCenter').innerText = state.overs;
  document.getElementById('bowlerLine').innerText = `Bowler: ${state.bowler.name} | Recent: ${(state.recentBalls.slice(-6).join(' ')||'-')}`;
}

function pushState(){
  // prepare public-record body; JSONBin accepts PUT with raw object
  fetch(BIN_PUT, {
    method: 'PUT',
    headers: { "Content-Type":"application/json" },
    body: JSON.stringify({
      battingTeam: state.battingTeam,
      bowlingTeam: state.bowlingTeam,
      score: state.score,
      wickets: state.wickets,
      overs: state.overs,
      striker: state.striker,
      nonStriker: state.nonStriker,
      bowler: state.bowler,
      recentBalls: state.recentBalls
    })
  }).catch(e=>console.error('push err',e));
}

/* helpers */
function calcOversFromBalls(){
  const full = Math.floor(state.balls/6);
  const rem = state.balls % 6;
  state.overs = `${full}.${rem}`;
}

/* add runs (legal delivery) */
function addRun(r){
  state.score += r;
  state.striker.runs += r;
  state.striker.balls += 1;
  state.bowler.runs += r;
  state.bowler.balls = (state.bowler.balls||0) + 1;

  state.balls += 1;
  state.recentBalls.push(r);
  if(state.recentBalls.length>6) state.recentBalls.shift();

  if(r % 2 === 1) swapBatsmen();
  handleOverEnd();
  renderPanel(); pushState();
}

/* extras */
function addExtra(type){
  if(type === 'wide'){
    state.score += 1;
    state.recentBalls.push('WD');
    if(state.recentBalls.length>6) state.recentBalls.shift();
    // wide NOT count as legal ball
  } else if(type === 'noball'){
    let runs = parseInt(prompt('Runs scored on no-ball (0-6):','0')||'0');
    runs = isNaN(runs)?0:runs;
    state.score += 1 + runs;
    state.recentBalls.push('NB+'+runs);
    // credit to striker commonly
    state.striker.runs += runs;
    if(state.recentBalls.length>6) state.recentBalls.shift();
    if(runs % 2 === 1) swapBatsmen();
    // no legal ball increment
  } else if(type === 'bye' || type === 'legbye'){
    let runs = parseInt(prompt('Bye runs (0-6):','0')||'0');
    runs = isNaN(runs)?0:runs;
    state.score += runs;
    state.recentBalls.push((type==='bye'?'B':'LB')+runs);
    // byes count as legal delivery
    state.balls += 1;
    state.bowler.runs += runs;
    state.bowler.balls = (state.bowler.balls||0) + 1;
    if(state.recentBalls.length>6) state.recentBalls.shift();
    if(runs % 2 === 1) swapBatsmen();
    handleOverEnd();
  }
  renderPanel(); pushState();
}

/* wicket */
function addWicket(kind){
  if(kind === 'Run Out'){
    const legal = confirm('Count this run-out as legal delivery? OK=legal (counts ball). Cancel = no-ball (no legal ball).');
    if(!legal){
      // no-ball run out: count wicket but not increase ball
      state.wickets += 1;
      state.bowler.wickets = (state.bowler.wickets||0) + 1;
      state.recentBalls.push('RO(NB)');
      if(state.recentBalls.length>6) state.recentBalls.shift();
      openNewBatsmanModal();
      renderPanel(); pushState();
      return;
    }
    // else fall through as legal wicket
  }

  // legal wicket
  state.wickets += 1;
  state.bowler.wickets = (state.bowler.wickets||0) + 1;
  state.striker.balls += 1;
  state.bowler.balls = (state.bowler.balls||0) + 1;
  state.balls += 1;
  state.recentBalls.push('W');
  if(state.recentBalls.length>6) state.recentBalls.shift();
  handleOverEnd();
  openNewBatsmanModal();
  renderPanel(); pushState();
}

/* swap batsmen on odd runs or rotate */
function swapBatsmen(){
  const aName = state.striker.name, aRuns = state.striker.runs, aBalls = state.striker.balls;
  const bName = state.nonStriker.name, bRuns = state.nonStriker.runs, bBalls = state.nonStriker.balls;
  state.striker = { name: bName, runs: bRuns, balls: bBalls };
  state.nonStriker = { name: aName, runs: aRuns, balls: aBalls };
}

/* rotate strike by button */
function rotateStrike(){
  swapBatsmen();
  renderPanel(); pushState();
}

/* handle over end: when balls %6 ===0 => increment bowler overs, reset recentBalls */
function handleOverEnd(){
  if(state.balls % 6 === 0){
    // complete over
    state.bowler.overs = (state.bowler.overs||0) + 1;
    // reset recentBalls for new over
    state.recentBalls = [];
    // no automatic clear of striker etc; rotate strike at over end
    swapBatsmen();
    // update overs string
    calcOversFromBalls();
    renderPanel(); pushState();
    // prompt to change bowler (non-blocking)
    setTimeout(()=> {
      if(confirm('Change bowler now?')) {
        const nb = prompt('Enter bowler name:','');
        if(nb) { state.bowler = { name: nb, overs: 0, runs: 0, wickets: 0 }; pushState(); renderPanel(); }
      }
    },200);
  } else {
    calcOversFromBalls();
  }
}

/* calc overs */
function calcOversFromBalls(){
  const full = Math.floor(state.balls/6);
  const rem = state.balls % 6;
  state.overs = `${full}.${rem}`;
}

/* modal flow */
function openNewBatsmanModal(){
  document.getElementById('newModal').classList.remove('hidden');
  document.getElementById('newName').value = '';
  document.getElementById('modalTitle').innerText = 'New Batsman (or Cancel = All Out)';
}
function confirmNewBatsman(){
  const n = document.getElementById('newName').value.trim();
  if(!n){
    // treat empty as all out
    endInnings();
    closeNewModal();
    return;
  }
  // replace striker with new batsman (reset only his runs)
  state.striker = { name: n, runs: 0, balls: 0 };
  closeNewModal();
  renderPanel(); pushState();
}
function cancelNewBatsman(){
  // cancel = All out (as requested earlier)
  endInnings();
  closeNewModal();
}
function closeNewModal(){ document.getElementById('newModal').classList.add('hidden'); }

/* nextOver forced by button */
function nextOver(){
  const rem = state.balls % 6;
  if(rem !== 0){
    state.balls += (6 - rem);
  }
  handleOverEnd();
  calcOversFromBalls();
  renderPanel(); pushState();
}

/* end innings -> swap teams and reset per-player but keep totals as per your rule (we reset totals here per innings) */
function endInnings(){
  // swap batting/bowling teams and reset inning stats
  const prevBat = state.battingTeam;
  state.battingTeam = state.bowlingTeam || state.teamB;
  state.bowlingTeam = prevBat;
  state.score = 0; state.wickets = 0; state.balls = 0; state.overs = "0.0";
  state.striker = { name: "", runs: 0, balls: 0 };
  state.nonStriker = { name: "", runs: 0, balls: 0 };
  state.bowler = { name: "", overs: 0, runs: 0, wickets:0 };
  state.recentBalls = [];
  renderPanel(); pushState();
}

/* set striker / non-striker from inputs when user updates names in panel (optional) */
document.getElementById && document.addEventListener('DOMContentLoaded', ()=> {
  const sInput = document.getElementById('strike');
  const nsInput = document.getElementById('nonStrike');
  sInput && sInput.addEventListener('change', ()=> { state.striker.name = sInput.value.trim(); pushState(); });
  nsInput && nsInput.addEventListener('change', ()=> { state.nonStriker.name = nsInput.value.trim(); pushState(); });
});

/* transient message */
function transient(msg){
  const el = document.createElement('div');
  el.className = 'transient'; el.innerText = msg;
  document.body.appendChild(el);
  setTimeout(()=> el.classList.add('fade'), 10);
  setTimeout(()=> el.remove(), 2200);
}

/* keyboard shortcuts */
window.addEventListener('keydown',(e)=>{
  if(e.key==='1') addRun(1);
  if(e.key==='4') addRun(4);
  if(e.key==='6') addRun(6);
});

