const binId = "69031647ae596e708f376e47";
const apiKey = "<69031647ae596e708f376e47>"; // apni key lagao
const apiUrl = `https://api.jsonbin.io/v3/b/${binId}`;

let match = {
  teamA: "", teamB: "",
  colors: { A: "#ff0040", B: "#0011ff" },
  toss: "", decision: "",
  totalOvers: 10,
  innings: 1,
  score: { A: 0, B: 0 },
  wickets: { A: 0, B: 0 },
  overs: { A: 0, B: 0 },
  striker: "", nonStriker: "", bowler: "",
  balls: [], target: 0
};

async function updateBin() {
  await fetch(apiUrl, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      "X-Master-Key": apiKey
    },
    body: JSON.stringify(match)
  });
}

// Create Match
document.getElementById("createMatch")?.addEventListener("click", async () => {
  match.teamA = document.getElementById("teamA").value;
  match.teamB = document.getElementById("teamB").value;
  match.colors.A = document.getElementById("teamAColor").value;
  match.colors.B = document.getElementById("teamBColor").value;
  match.totalOvers = parseInt(document.getElementById("totalOvers").value);
  match.toss = document.getElementById("tossWinner").value;
  match.decision = document.getElementById("tossDecision").value;

  let batting = (match.toss === "A" && match.decision === "bat") || (match.toss === "B" && match.decision === "bowl") ? "A" : "B";
  match.batting = batting;

  document.getElementById("battingTeam").innerText = `Batting: ${batting === "A" ? match.teamA : match.teamB}`;
  document.getElementById("scoring").style.display = "block";

  await updateBin();
});

// Scoring Buttons
document.querySelectorAll(".run").forEach(btn => {
  btn.addEventListener("click", async () => {
    let run = parseInt(btn.dataset.run);
    match.score[match.batting] += run;
    match.balls.push(run);
    if (match.balls.length === 6) {
      match.overs[match.batting]++;
      match.balls = [];
    }
    await updateBin();
    triggerAnimation(run >= 4 ? (run === 6 ? "SIX" : "FOUR") : null);
  });
});

document.querySelectorAll(".extra").forEach(btn => {
  btn.addEventListener("click", async () => {
    match.score[match.batting]++;
    match.balls.push("extra");
    await updateBin();
  });
});

document.getElementById("wicketBtn")?.addEventListener("click", async () => {
  match.wickets[match.batting]++;
  triggerAnimation("OUT");
  await updateBin();
});

document.getElementById("endOver")?.addEventListener("click", async () => {
  match.overs[match.batting]++;
  match.balls = [];
  await updateBin();
});

document.getElementById("endInnings")?.addEventListener("click", async () => {
  if (match.innings === 1) {
    match.target = match.score[match.batting] + 1;
    match.innings = 2;
    match.batting = match.batting === "A" ? "B" : "A";
  } else {
    match.result = match.score[match.batting] >= match.target
      ? `${match.batting === "A" ? match.teamA : match.teamB} Won`
      : `${match.batting === "A" ? match.teamB : match.teamA} Won`;
  }
  await updateBin();
});

function triggerAnimation(text) {
  if (!text) return;
  const box = document.getElementById("animationBox");
  box.innerText = text;
  box.style.display = "block";
  setTimeout(() => (box.style.display = "none"), 3000);
}

// Overlay Updater
async function overlayUpdater() {
  const res = await fetch(apiUrl, {
    headers: { "X-Master-Key": apiKey }
  });
  const data = await res.json();
  const m = data.record;
  const teamColor = m.colors[m.batting];
  document.querySelector(".overlay").style.background = teamColor + "b0";

  document.getElementById("battingTeamName").innerText = m.batting === "A" ? m.teamA : m.teamB;
  document.getElementById("bowlingTeamName").innerText = m.batting === "A" ? m.teamB : m.teamA;
  document.getElementById("scoreInfo").innerText = `${m.score[m.batting]}/${m.wickets[m.batting]} (${m.overs[m.batting]}.0)`;
  document.getElementById("bowlerName").innerText = "🥎 " + (m.bowler || "");
  document.getElementById("recentBalls").innerText = m.balls.join(" ");
  document.getElementById("targetInfo").innerText = m.innings === 2 ? `Target: ${m.target}` : "";
}

setInterval(overlayUpdater, 2000);
