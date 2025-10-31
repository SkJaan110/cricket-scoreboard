const binUrl = "https://api.jsonbin.io/v3/b/69031647ae596e708f376e47";
let match = {
  matchName: "",
  teamA: "", teamB: "",
  battingTeam: "", bowlingTeam: "",
  score: 0, wickets: 0, overs: 0,
  striker: "-", nonStriker: "-", bowler: "-",
  strikerRuns: 0, strikerBalls: 0,
  nonStrikerRuns: 0, nonStrikerBalls: 0,
  bowlerRuns: 0, bowlerWickets: 0, bowlerOvers: 0,
  recentBalls: []
};

function createMatch() {
  match.matchName = document.getElementById("matchName").value;
  match.teamA = document.getElementById("teamA").value;
  match.teamB = document.getElementById("teamB").value;
  match.battingTeam = match.teamA;
  match.bowlingTeam = match.teamB;
  document.getElementById("matchTitle").innerText = match.matchName;
  document.getElementById("scoringPanel").style.display = "block";
  updateDisplay(); updateBin();
}

function updatePlayers() {
  match.striker = document.getElementById("strike").value;
  match.nonStriker = document.getElementById("nonStrike").value;
  match.bowler = document.getElementById("bowler").value;
  updateBin();
}

function rotateStrike() {
  const temp = match.striker;
  match.striker = match.nonStriker;
  match.nonStriker = temp;
  updateBin();
}

function updateDisplay() {
  document.getElementById("scoreLine").innerText =
    `${match.battingTeam}: ${match.score}/${match.wickets}`;
  document.getElementById("overLine").innerText = `Overs: ${match.overs.toFixed(1)}`;
}

async function updateBin() {
  await fetch(binUrl, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(match)
  });
}

function addRun(runs) {
  match.score += runs;
  match.strikerRuns += runs;
  match.strikerBalls++;
  match.recentBalls.push(runs);
  if (runs % 2 === 1) rotateStrike();
  ballCount();
}

function addExtra(type) {
  if (type === "wide" || type === "noball") match.score++;
  if (type === "noball") {
    const extra = prompt("Runs scored on No Ball (0-6):", "0");
    match.score += parseInt(extra);
    match.recentBalls.push("NB+" + extra);
  } else match.recentBalls.push(type.toUpperCase());
  updateDisplay(); updateBin();
}

function addWicket(type) {
  match.wickets++;
  match.strikerBalls++;
  match.recentBalls.push("W");
  if (match.wickets >= 10) endInnings();
  ballCount();
}

function ballCount() {
  const balls = Math.round((match.overs * 10) % 10);
  if (balls < 5) match.overs += 0.1;
  else { match.overs = Math.floor(match.overs) + 1; nextOver(); }
  updateDisplay(); updateBin();
}

function nextOver() {
  match.bowlerOvers += 1;
  match.recentBalls = [];
  rotateStrike();
  updateDisplay(); updateBin();
}

function endInnings() {
  [match.battingTeam, match.bowlingTeam] = [match.bowlingTeam, match.battingTeam];
  match.score = 0; match.wickets = 0; match.overs = 0;
  match.recentBalls = [];
  updateDisplay(); updateBin();
}
