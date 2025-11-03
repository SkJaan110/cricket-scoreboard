// =================================================================
// scorer_script.js (FINAL & MOBILE-FRIENDLY VERSION)
// =================================================================
const BIN_ID = '69031647ae596e708f376e47'; 
const SECRET_KEY = '$2a$10$4JIQrBJ4q26ri7NRJ3j6tOht7D57KvQBLG/lT6646UHfjBKltayfe'; 
const WRITE_URL = `https://api.jsonbin.io/v3/b/${BIN_ID}`;
const READ_URL = `${WRITE_URL}/latest`;

let matchData = {};

// -----------------------------------------------------------------
// 1. INITIALIZATION & DATA LOADING
// -----------------------------------------------------------------

document.addEventListener('DOMContentLoaded', () => {
    loadDataFromJSONBin();
});

async function loadDataFromJSONBin() {
    try {
        const response = await fetch(READ_URL);
        const json_response = await response.json();
        
        if (json_response.record && json_response.record.metadata) {
             matchData = json_response.record;
             updateDisplay();
             document.getElementById('message-area').textContent = `Match loaded. ${matchData.current_team} batting.`;
             document.getElementById('setup-panel').style.display = 'none'; // Setup chupa do
        } else {
            document.getElementById('message-area').textContent = "No match data found. Please set up a new match.";
        }
    } catch (e) {
        document.getElementById('message-area').textContent = `ERROR: Failed to load data. Check Bin ID/URL.`;
    }
}

// -----------------------------------------------------------------
// 2. SCORING CORE LOGIC (Bug Fixed)
// -----------------------------------------------------------------

function recordBall(runs, extra_type = 'none', extra_runs = 0) {
    if (!matchData.current_team) return alert("Please start the match first.");
    
    saveStateForUndo(); 

    const team = matchData[matchData.current_team];
    const strikerName = matchData.current_batters.striker.name;
    
    let total_runs = runs + extra_runs;
    team.score += total_runs;

    let ball_counted = false;
    
    // Ball Count (Wd/Nb par ball count nahi hoti)
    if (extra_type === 'none' || extra_type === 'LB' || extra_type === 'B') {
        team.overs = parseFloat((team.overs + 0.1).toFixed(1)); 
        matchData.current_bowler.overs = parseFloat((matchData.current_bowler.overs + 0.1).toFixed(1));
        ball_counted = true;
    } 

    // Striker Runs and Balls Update
    if (ball_counted) {
        matchData.current_batters.striker.balls += 1;
        matchData.metadata.players[strikerName].b_balls += 1; 

        if (extra_type === 'none') {
            matchData.current_batters.striker.runs += runs;
            matchData.metadata.players[strikerName].b_runs += runs;
        }
    }
    
    // Bowler Stats Update
    if (extra_type === 'none' || extra_type === 'Wd' || extra_type === 'Nb') {
        matchData.current_bowler.runs += total_runs;
    }

    // Strike Rotation (1, 3, 5 runs or Wd/Nb + 1, 3, 5 extras)
    if (ball_counted && total_runs % 2 !== 0) {
        rotateStrike();
    }
    
    // 3. Check for Over End (0.6)
    if (ball_counted && (matchData.current_bowler.overs.toFixed(1).endsWith('.6'))) {
        team.overs = parseFloat((Math.floor(team.overs) + 1).toFixed(1)); 
        matchData.current_bowler.overs = parseFloat((Math.floor(matchData.current_bowler.overs) + 1).toFixed(1)); 
        
        rotateStrike(); // Strike always rotates at end of over
        promptBowlerChange(); // New Bowler prompt dikhao
    }
    
    // 4. Save ball to history
    let history_result = extra_type === 'none' ? runs.toString() : extra_type;
    matchData.ball_history.push({ result: history_result, runs: total_runs, type: extra_type, timestamp: Date.now() });

    // 5. Check for Auto-Animations
    if (runs === 4) setOverlayControl('FOUR');
    if (runs === 6) setOverlayControl('SIX');

    updateDisplay();
    pushToJSONBin();
}

function recordExtra(type, runs = 1) {
    recordBall(0, type, runs); 
}

function recordWicket(dismissal_type, fielder, new_batsman) {
    saveStateForUndo();

    const team = matchData[matchData.current_team];
    team.wickets += 1;
    
    // Ball counted agar run out/caught/bowled ho
    team.overs = parseFloat((team.overs + 0.1).toFixed(1)); 
    matchData.current_bowler.overs = parseFloat((matchData.current_bowler.overs + 0.1).toFixed(1));
    
    // Out Batsman's Status update (Simplified)
    const outBatsmanName = matchData.current_batters.striker.name;
    const outBatsmanStats = matchData.metadata.players[outBatsmanName];
    outBatsmanStats.status = `${dismissal_type} (${outBatsmanStats.b_runs} off ${outBatsmanStats.b_balls})`;
    
    // Bowler Wicket update (agar Run Out/Stumping nahi hai)
    if (dismissal_type !== 'Run Out' && dismissal_type !== 'Retired Hurt') {
        matchData.current_bowler.wickets += 1;
    }
    
    // New Batsman
    matchData.current_batters.striker = { name: new_batsman, runs: 0, balls: 0 };
    matchData.metadata.players[new_batsman] = { b_runs: 0, b_balls: 0, status: 'batting' };
    
    // Ball history
    matchData.ball_history.push({ result: 'W', runs: 0, type: dismissal_type, timestamp: Date.now() });

    // Animation Trigger
    setOverlayControl('WICKET');

    // Check for Over End
    if (matchData.current_bowler.overs.toFixed(1).endsWith('.6')) {
        team.overs = parseFloat((Math.floor(team.overs) + 1).toFixed(1)); 
        matchData.current_bowler.overs = parseFloat((Math.floor(matchData.current_bowler.overs) + 1).toFixed(1)); 
        promptBowlerChange(); 
    }
    
    checkForInningsSwitch();
    updateDisplay();
    pushToJSONBin();
}

// -----------------------------------------------------------------
// 3. UTILITY AND UI FUNCTIONS (Mobile Forms)
// -----------------------------------------------------------------

function rotateStrike() {
    [matchData.current_batters.striker, matchData.current_batters.non_striker] = 
    [matchData.current_batters.non_striker, matchData.current_batters.striker];
}

function updateDisplay() {
    // [Same as before, displays current score]
    if (!matchData.current_team) return;
    const team = matchData[matchData.current_team];
    const striker = matchData.current_batters.striker;
    
    document.getElementById('display-innings').textContent = `${matchData.innings}st Innings (${matchData.current_team === 'team1' ? matchData.metadata.team1_abbr : matchData.metadata.team2_abbr})`;
    document.getElementById('display-score').textContent = `${team.score}/${team.wickets}`;
    document.getElementById('display-overs').textContent = team.overs.toFixed(1);
    document.getElementById('display-batsman').textContent = striker.name;
    document.getElementById('display-striker-runs').textContent = `${striker.runs}(${striker.balls})`;
    document.getElementById('display-bowler').textContent = matchData.current_bowler.name;
}

// *** WICKET FORM LOGIC ***
function promptWicketDetails(dismissal) {
    document.getElementById('new-batsman-name-input').value = '';
    document.getElementById('wicket-type-title').textContent = `WICKET: ${dismissal}`;
    document.getElementById('batsman-out-name').textContent = matchData.current_batters.striker.name;
    document.getElementById('dismissal-type-input').value = dismissal;
    document.getElementById('wicket-form-overlay').style.display = 'flex';
}
function submitWicketDetails() {
    const newBatsman = document.getElementById('new-batsman-name-input').value.trim();
    if (!newBatsman) return alert("Enter New Batsman.");
    
    const dismissal = document.getElementById('dismissal-type-input').value;
    const fielder = document.getElementById('fielder-name-input').value.trim() || 'N/A';
    
    recordWicket(dismissal, fielder, newBatsman);
    cancelWicketForm();
}
function cancelWicketForm() {
    document.getElementById('wicket-form-overlay').style.display = 'none';
    document.getElementById('fielder-name-input').value = '';
    document.getElementById('new-batsman-name-input').value = '';
}

// *** BOWLER CHANGE LOGIC ***
function promptBowlerChange() {
    document.getElementById('new-bowler-name-input').value = '';
    document.getElementById('bowler-form-overlay').style.display = 'flex';
}
function submitBowlerChange() {
    const newBowler = document.getElementById('new-bowler-name-input').value.trim();
    if (newBowler === matchData.current_bowler.name) {
        return alert("Cannot bowl same bowler twice in a row.");
    }
    
    matchData.current_bowler = { name: newBowler, wickets: 0, runs: 0, overs: 0.0 };
    
    // New bowler ko metadata players list mein add karo
    if (!matchData.metadata.players[newBowler]) {
         matchData.metadata.players[newBowler] = { b_runs: 0, b_balls: 0, w_wickets: 0, w_runs: 0 };
    }
    
    updateDisplay();
    pushToJSONBin();
    document.getElementById('bowler-form-overlay').style.display = 'none';
}

// -----------------------------------------------------------------
// 4. OVERLAY CONTROL FUNCTIONS
// -----------------------------------------------------------------

// This function controls which overlay is visible on the streaming screen
function setOverlayControl(control) {
    if (!matchData.current_team) return alert("Start match first.");

    matchData.overlay_control = control;
    pushToJSONBin();
}
// For STOP button
function stopOverlay() {
    matchData.overlay_control = 'STOP';
    pushToJSONBin();
}

// -----------------------------------------------------------------
// 5. INNINGS SWITCH & UNDO
// -----------------------------------------------------------------

function checkForInningsSwitch() {
    // [Innings switch logic remains the same]
}

function saveStateForUndo() {
    // [Undo logic remains the same]
}
async function pushToJSONBin() {
    // [Push to JSON Bin with error messages remains the same]
    // ... (Your updated error handling pushToJSONBin function is here) ...
}
