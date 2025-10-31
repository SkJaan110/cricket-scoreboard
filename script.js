// main script for scoring panel
const binUrl = "https://api.jsonbin.io/v3/b/69031647ae596e708f376e47";

let state = {
  matchName: "",
  teamA: "", teamB: "",
  battingTeam: "", bowlingTeam: "",
  score: 0, wickets: 0,
  balls: 0, // raw balls count (legal deliveries)
  overs: "0.0",
  striker: "", nonStriker: "", bowler: "",
  strikerRuns: 0, strikerBalls: 0,
  nonStrikerRuns: 0, nonStrikerBalls: 0,
  bowlerRuns: 0, bowlerWickets: 0, bowlerBalls: 0,
  recentBalls: []
};

function createMatch(){
  state.matchName = document.getElementById('matchName').value || 'Match';
  state.teamA = document.getElementById('teamA').value || 'Team A';
  state.teamB = document.getElementById('teamB').value || 'Team B';
  state.battingTeam = state.teamA;
  state.bowlingTeam = state.teamB;
  document.getElementById('matchTitle').innerText = state.matchName;
  document.getElementById('scoringPanel').style.display = 'block';
  pushState();
  renderPanel();
}

function setBowler(){
  const b = document.getElementById('bowler').value.trim();
  if(!b) return alert('Enter bowler name');
  state.bowler = b;
  // reset current bowler over-stat if new
  state.bowlerRuns = 0; state.bowlerWickets = 0; state.bowlerBalls = 0;
  pushState(); renderPanel();
  showPopup(`${b} set as bowler`);
}

function updatePlayers(){
  const s = document.getElementById('strike').value.trim();
  const ns = document.getElementById('nonStrike').value.trim();
  if(s) { state.striker = s; state.strikerRuns = state.strikerRuns || 0; state.strikerBalls = state.strikerBalls || 0; }
  if(ns) { state.nonStriker = ns; state.nonStrikerRuns = state.nonStrikerRuns || 0; state.nonStrikerBalls = state.nonStrikerBalls || 0; }
  pushState(); renderPanel();
  showPopup('Players updated');
}

function rotateStrike(){
  const a = state.striker; state.striker = state.nonStriker; state.nonStriker = a;
  const ar = state.strikerRuns, ab = state.strikerBalls;
  state.strikerRuns = state.nonStrikerRuns; state.strikerBalls = state.nonStrikerBalls;
  state.nonStrikerRuns = ar; state.nonStrikerBalls = ab;
  pushState(); renderPanel();
}

function addRun(r){
  // legal delivery
  state.score += r;
  state.balls += 1;
  state.strikerRuns += r;
  state.strikerBalls += 1;
  state.bowlerRuns += r;
  state.bowlerBalls += 1;
  state.recentBalls.push(r);
  if(r % 2 === 1) swapBatsmenAfterRun();
  handleOverProgress();
  pushState(); renderPanel();
}

function addExtra(type){
  if(type === 'wide'){
    state.score += 1;
    state.recentBalls.push('WD');
    // wide does NOT count as legal ball
  } else if(type === 'noball'){
    // no ball gives +1 and then ask for runs on free hit
    const runs = parseInt(prompt('Runs scored on no ball (0-6):', '0')||'0');
    state.score += 1 + (isNaN(runs)?0:runs);
    state.recentBalls.push('NB+' + (isNaN(runs)?0:runs));
    // no legal ball increment (unless boundary on free hit logic needed)
    // credit runs to striker (commonly)
    state.strikerRuns += (isNaN(runs)?0:runs);
    if(!isNaN(runs) && runs % 2 === 1) swapBatsmenAfterRun();
  } else if(type === 'bye' || type === 'legbye'){
    const runs = parseInt(prompt('Bye runs (0-6):','0')||'0');
    state.score += (isNaN(runs)?0:runs);
    state.recentBalls.push(type === 'bye' ? 'B' + runs : 'LB' + runs);
    state.balls += 1;
    state.bowlerRuns += (isNaN(runs)?0:runs);
    state.bowlerBalls += 1;
    if(!isNaN(runs) && runs % 2 === 1) swapBatsmenAfterRun();
    handleOverProgress();
  }
  pushState(); renderPanel();
}

function addWicket(kind){
  if(kind === 'Run Out'){
    // ask if legal (counts ball) or no-ball (doesn't)
    const legal = confirm('Count this run-out as a legal delivery? OK = legal (ball counted). Cancel = no-ball (ball not counted).');
    if(!legal){
      state.recentBalls.push('RO(NB)');
      // run out on no-ball: usually not wicket, but per your rule allow wicket but no ball counted
      // we'll count wicket but not ball
      state.wickets += 1;
      state.bowlerWickets += 1;
      swapForNewBatsman();
      pushState(); renderPanel();
      return;
    }
    // else legal
  }
  // legal wicket
  state.wickets += 1;
  state.balls += 1;
  state.bowlerWickets += 1;
  state.strikerBalls += 1;
  state.recentBalls.push('W');
  handleOverProgress();
  // show modal to add next batsman or all out
  openNewBatsmanModal();
  pushState(); renderPanel();
}

function swapBatsmenAfterRun(){
  // swap striker/non-striker scores & names
  const sa = {name: state.striker, r: state.strikerRuns, b: state.strikerBalls};
  const nb = {name: state.nonStriker, r: state.nonStrikerRuns, b: state.nonStrikerBalls};
  // after swap: striker becomes nonStriker etc.
  state.striker = nb.name; state.strikerRuns = nb.r; state.strikerBalls = nb.b;
  state.nonStriker = sa.name; state.nonStrikerRuns = sa.r; state.nonStrikerBalls = sa.b;
}

function handleOverProgress(){
  // balls is count of legal deliveries
  const full = Math.floor(state.balls / 6);
  const rem = state.balls % 6;
  state.overs = parseFloat(full + '.' + rem);
  if(rem === 0 && state.balls !== 0){
    // over finished
    // increment bowler overs
    state.bowlerBalls = 0;
    state.bowlerOvers = (state.bowlerOvers || 0) + 1;
    // clear recentBalls after saving last over
    // keep recent balls of last over in array but trimmed to last 6
    state.recentBalls = (state.recentBalls || []).slice(-6);
    // popup to change bowler
    openNewBowlerModal();
  }
}

function nextOver(){
  // force end over: convert current partial to complete and rotate strike
  const rem = state.balls % 6;
  if(rem !== 0){
    state.balls += (6 - rem);
  }
  handleOverProgress();
  rotateStrike();
  pushState(); renderPanel();
}

function endInnings(){
  // swap teams
  const prevBat = state.battingTeam;
  state.battingTeam = state.bowlingTeam;
  state.bowlingTeam = prevBat;
  state.score = 0; state.wickets = 0; state.balls = 0; state.overs = "0.0";
  state.striker = ""; state.nonStriker = ""; state.bowler = "";
  state.strikerRuns = state.strikerBalls = 0;
  state.nonStrikerRuns = state.nonStrikerBalls = 0;
  state.bowlerRuns = state.bowlerWickets = state.bowlerOvers = 0;
  state.recentBalls = [];
  pushState(); renderPanel();
}

function openNewBatsmanModal(){
  document.getElementById('modalTitle').innerText = 'New Batsman (or All Out)';
  document.getElementById('newPlayerName').value = '';
  document.getElementById('modal').classList.remove('hidden');
}

function confirmNewBatsman(){
  const name = document.getElementById('newPlayerName').value.trim();
  if(!name){
    // If empty, treat as All out
    allOutProcedure();
    closeModal();
    return;
  }
  // replace striker with new player and reset his stats
  state.striker = name;
  state.strikerRuns = 0; state.strikerBalls = 0;
  closeModal(); pushState(); renderPanel();
  showPopup(`${name} in`);
}

function allOutProcedure(){
  // start next innings
  endInnings();
  showPopup('All Out → Next Innings');
}

function closeModal(){ document.getElementById('modal').classList.add('hidden'); }

function openNewBowlerModal(){
  if(confirm('Change bowler now?')) {
    const b = prompt('Enter new bowler name:','');
    if(b){ state.bowler = b; state.bowlerRuns = 0; state.bowlerWickets = 0; state.bowlerOvers = 0; pushState(); renderPanel(); showPopup('Bowler: '+b); }
  }
}

function swapForNewBatsman(){
  // when run out in legal ball: replace striker with new batsman
  openNewBatsmanModal();
}

function renderPanel(){
  // update UI of scorer
  document.getElementById('leftName').innerText = state.striker || '-';
  document.getElementById('leftStats').innerText = `${state.strikerRuns||0}(${state.strikerBalls||0})`;
  document.getElementById('rightName').innerText = state.nonStriker || '-';
  document.getElementById('rightStats').innerText = `${state.nonStrikerRuns||0}(${state.nonStrikerBalls||0})`;
  document.getElementById('teamCenter').innerText = state.battingTeam || 'TEAM';
  document.getElementById('scoreLine').innerText = `${state.score||0}-${state.wickets||0}`;
  document.getElementById('oversLine').innerText = (typeof state.overs === 'number' ? state.overs.toFixed(1) : state.overs);
  document.getElementById('bowlerLine').innerText = `Bowler: ${state.bowler||'-'} | Recent: ${ (state.recentBalls||[]).slice(-6).join(' ') || '-' }`;
}

async function pushState(){
  try {
    await fetch(binUrl, {
      method: 'PUT',
      headers: {"Content-Type":"application/json"},
      body: JSON.stringify({
        battingTeam: state.battingTeam,
        bowlingTeam: state.bowlingTeam,
        score: state.score,
        wickets: state.wickets,
        overs: (typeof state.overs === 'number' ? parseFloat(state.overs.toFixed(1)) : state.overs),
        striker: state.striker,
        strikerRuns: state.strikerRuns,
        strikerBalls: state.strikerBalls,
        nonStriker: state.nonStriker,
        nonStrikerRuns: state.nonStrikerRuns,
        nonStrikerBalls: state.nonStrikerBalls,
        bowler: state.bowler,
        bowlerRuns: state.bowlerRuns,
        bowlerWickets: state.bowlerWickets,
        bowlerOvers: state.bowlerOvers || 0,
        recentBalls: state.recentBalls.slice(-12)
      })
    });
  } catch(e){ console.error('push error', e); }
}

function showPopup(text){
  // simple transient popup for scorer
  const el = document.createElement('div');
  el.className = 'transient';
  el.innerText = text;
  document.body.appendChild(el);
  setTimeout(()=> el.classList.add('fade'), 10);
  setTimeout(()=> el.remove(), 2500);
}

// keyboard shortcuts (optional)
window.addEventListener('keydown',(e)=>{
  if(e.key === '1') addRun(1);
  if(e.key === '4') addRun(4);
  if(e.key === '6') addRun(6);
});
