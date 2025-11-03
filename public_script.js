// =================================================================
// public_script.js (FINAL VERSION with Overlay Controls)
// =================================================================
const PUBLIC_BIN_URL = 'https://api.jsonbin.io/v3/b/69031647ae596e708f376e47';
const FETCH_URL = PUBLIC_BIN_URL + '/latest'; 
const REFRESH_INTERVAL = 3000; // Faster update (3 seconds)

let lastBallTimestamp = 0;
let activePopupType = 'NONE'; // To manage which detailed popup is active

// [fetchLiveData and updateOverlayUI functions remain similar, but are enhanced to handle overlay_control]

async function fetchLiveData() {
    // ... [Same fetch logic] ...
    const liveData = json_response.record; 
    
    updateOverlayUI(liveData);
    checkForAnimations(liveData); 
    handleOverlayControls(liveData.overlay_control); // NEW: Check for manual overlay control

}

function handleOverlayControls(control) {
    const detailBox = document.getElementById('detail-box');
    const detailContent = document.getElementById('detail-content');
    
    // STOP case
    if (control === 'STOP' || control === undefined) {
        detailBox.classList.remove('is-active');
        activePopupType = 'NONE';
        return;
    }

    // New detailed overlay is requested
    if (control !== 'STOP' && control !== 'NONE' && control !== activePopupType) {
        detailBox.classList.add('is-active');
        detailContent.innerHTML = generateOverlayContent(control, matchData);
        activePopupType = control;
    }
}

// *** NEW: Content Generation Function ***
function generateOverlayContent(control, data) {
    const team1 = data.metadata.team1_abbr;
    const team2 = data.metadata.team2_abbr;
    
    // This is a placeholder structure, you can make it much more detailed later!
    switch (control) {
        case 'MATCH_DETAILS':
            return `
                <h3>MATCH DETAILS</h3>
                <p>MATCH NAME: ${team1} vs ${team2}</p>
                <p>${data.metadata.overs_limit} OVER MATCH</p>
                <p>${data.metadata.toss_details}</p>
            `;
        case 'SQUADS':
            // SQUADS logic would require the full player list in metadata
            return `
                <h3>SQUADS: ${team1} vs ${team2}</h3>
                <p>This feature requires a full 'metadata.players' list for both teams.</p>
                <p>Currently active players: ${Object.keys(data.metadata.players).join(', ')}</p>
            `;
        case 'BATSMAN1':
            const bat1 = data.current_batters.striker;
            return `
                <h3>STRIKER: ${bat1.name.toUpperCase()}</h3>
                <p>Runs: ${bat1.runs} | Balls: ${bat1.balls} | SR: ${(bat1.runs/bat1.balls*100).toFixed(1)}</p>
            `;
        case 'BOWLER':
            const bowl = data.current_bowler;
            return `
                <h3>CURRENT BOWLER: ${bowl.name.toUpperCase()}</h3>
                <p>Overs: ${bowl.overs.toFixed(1)} | Runs: ${bowl.runs} | Wickets: ${bowl.wickets}</p>
            `;
        // [Add more cases for SCORECARD, SUMMARY, PROJECT_SCORE, etc.]
        case 'TARGET':
            const needed = data.target - data.team2.score;
            const remainingBalls = (data.metadata.overs_limit * 6) - (data.team2.overs * 10).toFixed(0);
            return `
                <h3>TARGET 🎯</h3>
                <p>${data.team2.abbr} needs ${needed} runs from ${remainingBalls} balls.</p>
            `;
        default:
            return `<h3>${control} OVERLAY</h3><p>Content coming soon!</p>`;
    }
}

// [updateOverlayUI, checkForAnimations, updateBallTracker functions remain the same]
// ...
// [START THE LIVE FEED remains the same]
