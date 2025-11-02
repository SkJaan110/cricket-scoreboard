// =================================================================
// ⚠️ WARNING: CONFIGURATION - REPLACE WITH YOUR ACTUAL KEYS!
// =================================================================
const BIN_ID = '69031647ae596e708f376e47'; 
// !!! VERY IMPORTANT: You need your private master key for PUT (Write) access !!!
const SECRET_KEY = '$2a$10$4JIQrBJ4q26ri7NRJ3j6tOht7D57KvQBLG/lT6646UHfjBKltayfe'; 
const WRITE_URL = `https://api.jsonbin.io/v3/b/${BIN_ID}`;
const READ_URL = `${WRITE_URL}/latest`;


// Master Object Structure (Full Cricket Stats)
let matchData = {};

// -----------------------------------------------------------------
// 1. INITIALIZATION & DATA LOADING
// -----------------------------------------------------------------

document.addEventListener('DOMContentLoaded', () => {
    // Load existing data on panel start
    loadDataFromJSONBin();
});

async function loadDataFromJSONBin() {
    // Note: Reading needs only Public URL, but writing needs Master Key
    try {
        const response = await fetch(READ_URL);
        const json_response = await response.json();
        
        // Agar data pehle se maujood ho, toh use load karo
        if (json_response.record && json_response.record.metadata) {
             matchData = json_response.record;
             updateDisplay();
             document.getElementById('message-area').textContent = "Existing match loaded.";
        } else {
            // Agar pehli baar hai, toh Setup Button dikhao
            document.getElementById('message-area').textContent = "No match data found. Click 'Setup New Match'.";
        }
    } catch (e) {
        document.getElementById('message-area').textContent = `ERROR: Failed to load data. Check Bin ID/URL.`;
    }
}

// Function to handle match setup (Simplified - In reality, this requires a large form)
function startNewMatchSetup() {
    const t1 = prompt("Enter Team 1 Abbreviation (e.g., IND):");
    const t2 = prompt("Enter Team 2 Abbreviation (e.g., AUS):");
    const toss = prompt("Toss details (e.g., IND opted to bat):");
    const striker = prompt("Enter Striker Name:");
    const nonStriker = prompt("Enter Non-Striker Name:");
    const bowler = prompt("Enter Starting Bowler Name:");

    // Initialize full complex structure
    matchData = {
        metadata: { team1_abbr: t1, team2_abbr: t2, toss_details: toss, overs_limit: 20, players: {} },
        innings: 1,
        target: 0,
        current_team: 'team1', 
        team1: { score: 0, wickets: 0, overs: 0.0, current_striker: striker, current_nonstriker: nonStriker },
        team2: { score: 0, wickets: 0, overs: 0.0 },
        current_bowler: { name: bowler, wickets: 0, runs: 0, overs: 0.0 },
        current_batters: { striker: { name: striker, runs: 0, balls: 0 }, non_striker: { name: nonStriker, runs: 0, balls: 0 } },
        ball_history: [], // For UNDO
        commentary_list: []
    };
    
    // Add initial players to the full stats list
    matchData.metadata.players[striker] = { b_runs: 0, b_balls: 0, status: 'batting' };
    matchData.metadata.players[nonStriker] = { b_runs: 0, b_balls: 0, status: 'batting' };
    
    updateDisplay();
    pushToJSONBin();
    document.getElementById('message-area').textContent = "New Match Setup Complete. Start Scoring!";
}


// -----------------------------------------------------------------
// 2. SCORING CORE LOGIC (Complex!)
// -----------------------------------------------------------------

function recordBall(runs, extra_type = 'none', extra_runs = 0) {
    saveStateForUndo(); 

    const team = matchData[matchData.current_team];
    let ball_result = runs.toString();

    // 1. Runs and Extras Update
    let total_runs = runs + extra_runs;
    team.score += total_runs;

    // 2. Ball Count (unless it's a Wide or No Ball)
    if (extra_type === 'none') {
        team.overs += 0.1;
        
        // Striker runs and balls
        let striker_obj = matchData.current_batters.striker;
        striker_obj.runs += runs;
        striker_obj.balls += 1;
        
        // Update full player stats
        matchData.metadata.players[striker_obj.name].b_runs += runs;
        matchData.metadata.players[striker_obj.name].b_balls += 1;

        // Bowler stats update
        matchData.current_bowler.runs += total_runs;

        // 3. Strike Rotation (1, 3, 5 runs or end of over)
        if (runs % 2 !== 0) {
            rotateStrike();
        }
        
    } else {
        // Extra stats update (Wd/Nb/B/LB)
        matchData.current_bowler.runs += extra_runs; // Extras count against bowler (except Bye/LB)
        ball_result = extra_type;
        if (extra_type !== 'Wd' && extra_type !== 'Nb') {
            // Ball count only happens if it's not a Wide/NoBall
            team.overs += 0.1; 
        }
    }
    
    // 4. Check for Over End
    if (team.overs.toFixed(1).endsWith('.6')) {
        team.overs = parseFloat((Math.floor(team.overs) + 1).toFixed(1)); // Convert 1.6 to 2.0
        rotateStrike(); // Strike always rotates at end of over
        switchBowler();
        // Check for Innings Switch here
        checkForInningsSwitch();
    }
    
    // 5. Save ball to history and commentary
    matchData.ball_history.push({ result: ball_result, runs: total_runs, type: extra_type, timestamp: Date.now() });

    updateDisplay();
    pushToJSONBin();
}

// Simplified function to record extras
function recordExtra(type, runs = 1) {
    if (type === 'Wd' || type === 'Nb') {
        recordBall(0, type, runs); // Wide/NoBall: No ball counted, extra run added
    } else {
        recordBall(0, type, runs); // Bye/LegBye: Ball counted, runs added
    }
}

// Placeholder for Wicket Details Prompt
function promptWicketDetails(dismissal) {
    const fielder = prompt(`Wicket Type: ${dismissal}. Enter Fielder Name (N/A if Bowled/LBW):`);
    const newBatsman = prompt("Enter NEW Batsman Name:");
    recordWicket(dismissal, fielder, newBatsman);
}

function recordWicket(dismissal_type, fielder, new_batsman) {
    saveStateForUndo();

    const team = matchData[matchData.current_team];
    team.wickets += 1;
    team.overs += 0.1;
    
    // 1. Update Dismissed Batsman's Status
    const outBatsmanName = matchData.current_batters.striker.name;
    const outBatsmanStats = matchData.metadata.players[outBatsmanName];
    
    if(outBatsmanStats) {
        outBatsmanStats.status = `${dismissal_type} b ${matchData.current_bowler.name} c ${fielder}`;
        // If it's a Run Out, need more complex logic to know who is Run Out (Striker or Non-Striker)
    }

    // 2. Update Bowler Stats (Wicket)
    matchData.current_bowler.wickets += 1;
    
    // 3. Bring in New Batsman
    matchData.current_batters.striker = { name: new_batsman, runs: 0, balls: 0 };
    matchData.metadata.players[new_batsman] = { b_runs: 0, b_balls: 0, status: 'batting' };
    
    // 4. Check for Innings Switch
    checkForInningsSwitch();

    updateDisplay();
    pushToJSONBin();
}

// -----------------------------------------------------------------
// 3. UTILITY FUNCTIONS (Strike Rotation, Undo, Push)
// -----------------------------------------------------------------

function rotateStrike() {
    [matchData.current_batters.striker, matchData.current_batters.non_striker] = 
    [matchData.current_batters.non_striker, matchData.current_batters.striker];
}

function switchBowler() {
    // In a real app, this would prompt for a new bowler selection
    matchData.current_bowler.overs = parseFloat(matchData.current_bowler.overs.toFixed(1)); // Finalize overs
    document.getElementById('message-area').textContent = `Over End. New Bowler Needed!`;
}

function checkForInningsSwitch() {
    const team = matchData[matchData.current_team];
    const oversLimit = matchData.metadata.overs_limit;
    
    if (team.wickets === 10 || team.overs >= oversLimit) {
        if (matchData.innings === 1) {
            matchData.innings = 2;
            matchData.current_team = 'team2';
            matchData.target = team.score + 1;
            document.getElementById('message-area').textContent = `Innings Break! Target for team2: ${matchData.target}`;
        } else {
            matchData.match_status = 'Finished';
            document.getElementById('message-area').textContent = `Match Finished!`;
        }
    }
}

function undoLastBall() {
    if (matchData.ballHistory.length === 0) {
        document.getElementById('message-area').textContent = "Cannot Undo further!";
        return;
    }
    // Revert to the last saved state
    const lastState = matchData.ballHistory.pop();
    matchData = lastState;
    
    updateDisplay();
    pushToJSONBin();
    document.getElementById('message-area').textContent = "Last ball undone and published!";
}

function saveStateForUndo() {
    // Deep copy current state
    const stateCopy = JSON.parse(JSON.stringify(matchData));
    matchData.ballHistory.push(stateCopy);
}


async function pushToJSONBin() {
    document.getElementById('message-area').textContent = "Updating score (PUT request)...";
    
    try {
        const response = await fetch(WRITE_URL, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'X-Master-Key': SECRET_KEY 
            },
            body: JSON.stringify(matchData)
        });

        if (response.ok) {
            document.getElementById('message-area').textContent = "Score Updated Successfully!";
        } else {
            const error = await response.json();
            document.getElementById('message-area').textContent = `ERROR: Failed to update! Is Master Key correct?`;
        }
    } catch (e) {
        document.getElementById('message-area').textContent = `Network Error. Check connection or Master Key.`;
    }
}


function updateDisplay() {
    if (!matchData.current_team) return;
    const team = matchData[matchData.current_team];
    const striker = matchData.current_batters.striker;
    
    document.getElementById('display-innings').textContent = `${matchData.innings}st Innings`;
    document.getElementById('display-score').textContent = `${team.score}/${team.wickets}`;
    document.getElementById('display-overs').textContent = team.overs.toFixed(1);
    document.getElementById('display-batsman').textContent = striker.name;
    document.getElementById('display-striker-runs').textContent = striker.runs;
    document.getElementById('display-bowler').textContent = matchData.current_bowler.name;
}
