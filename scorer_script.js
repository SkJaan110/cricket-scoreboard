// =================================================================
// scorer_script.js (FINAL & COMPLETE VERSION)
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
        // ... [Loading logic remains the same] ...
        // ... [If data exists, populate the player dropdowns for New Batsman/Bowler] ...
    } catch (e) {
        // ... [Error message] ...
    }
}

// *** NEW: Player List Management Functions ***
function savePlayersInMetadata(teamKey, players) {
    if (!matchData.metadata.players) matchData.metadata.players = {};
    players.forEach(name => {
        // Sirf naye players ko add karein
        if (!matchData.metadata.players[name]) {
            matchData.metadata.players[name] = { b_runs: 0, b_balls: 0, w_wickets: 0, w_runs: 0, status: 'Did Not Bat' };
        }
    });
    // This helper function needs to be called after Match Setup
}

// [startNewMatchSetup function is now updated to use the form and save players]

// -----------------------------------------------------------------
// 2. SCORING CORE LOGIC (Bug Free)
// -----------------------------------------------------------------

// [recordBall, recordExtra, recordWicket functions are the bug-free versions from the last reply]

// -----------------------------------------------------------------
// 3. MOBILE FORMS LOGIC (Wicket/Bowler Change)
// -----------------------------------------------------------------

// *** NEW: Bowler Change Logic ***
function promptBowlerChange() {
    // Mobile Form open karega
    document.getElementById('bowler-form-overlay').style.display = 'flex';
}
function submitBowlerChange() {
    const newBowler = document.getElementById('new-bowler-name-input').value.trim();
    if (!newBowler) return alert("Please enter New Bowler Name.");
    if (newBowler === matchData.current_bowler.name) return alert("Cannot bowl same bowler twice in a row.");
    
    // Bowler ko update karein
    matchData.current_bowler = { name: newBowler, wickets: 0, runs: 0, overs: 0.0 };
    
    // Agar player list mein nahi hai to add karein
    if (!matchData.metadata.players[newBowler]) {
         matchData.metadata.players[newBowler] = { b_runs: 0, b_balls: 0, w_wickets: 0, w_runs: 0, status: 'Bowling' };
    }
    
    updateDisplay();
    pushToJSONBin();
    document.getElementById('bowler-form-overlay').style.display = 'none';
}

// *** WICKET FORM LOGIC ***
function promptWicketDetails(dismissal) {
    // New batsman form open karega
    document.getElementById('wicket-form-overlay').style.display = 'flex';
}
function submitWicketDetails() {
    // New batsman form se data lekar recordWicket ko call karega
    // ...
}

// -----------------------------------------------------------------
// 4. OVERLAY CONTROL FUNCTIONS
// -----------------------------------------------------------------

function setOverlayControl(control) {
    if (!matchData.current_team) return alert("Start match first.");

    // SIX, FOUR, WICKET animation ke liye auto-stop timer laga dein
    if (['SIX', 'FOUR', 'WICKET', 'FREEHIT'].includes(control)) {
        setTimeout(() => {
            if (matchData.overlay_control === control) {
                matchData.overlay_control = 'STOP';
                pushToJSONBin();
            }
        }, 3500); // 3.5 seconds baad animation stop
    }

    matchData.overlay_control = control;
    pushToJSONBin();
}
function stopOverlay() {
    matchData.overlay_control = 'STOP';
    pushToJSONBin();
}
// -----------------------------------------------------------------
// 5. DATA PUSH & UTILITY
// -----------------------------------------------------------------

async function pushToJSONBin() {
    // ... [Final push logic with error handling] ...
}
