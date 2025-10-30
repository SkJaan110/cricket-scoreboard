const apiURL = "https://api.jsonbin.io/v3/b/69031647ae596e708f376e47"; 

let score = 0, wickets = 0, overs = 0.0, batting = "Team A", team1 = "", team2 = "";

async function createMatch() {
  team1 = document.getElementById('team1').value;
  team2 = document.getElementById('team2').value;
  batting = team1;
  score = 0; wickets = 0; overs = 0.0;

  document.getElementById('matchName').textContent = `${team1} vs ${team2}`;
  document.getElementById('batting').textContent = `Batting: ${batting}`;

  await updateJSON();
}

function addRun(runs) {
  score += runs;
  updateDisplay();
  updateJSON();
}

function addWicket(type) {
  wickets++;
  updateDisplay();
  updateJSON();
}

function addExtra(type) {
  score++;
  updateDisplay();
  updateJSON();
}

function nextOver() {
  overs = Math.floor(overs) + 1;
  updateDisplay();
  updateJSON();
}

function endInnings() {
  batting = (batting === team1) ? team2 : team1;
  score = 0;
  wickets = 0;
  overs = 0.0;
  updateDisplay();
  updateJSON();
}

function updateDisplay() {
  document.getElementById('score').textContent = score;
  document.getElementById('wickets').textContent = wickets;
  document.getElementById('overs').textContent = overs.toFixed(1);
  document.getElementById('batting').textContent = `Batting: ${batting}`;
}

async function updateJSON() {
  const newData = {
    match: { team1, team2, batting, score, wickets, overs }
  };
  await fetch(apiURL, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(newData)
  });
}
