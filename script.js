// =================================================================
// JSON BIN CONFIGURATION
// =================================================================
const PUBLIC_BIN_URL = 'https://api.jsonbin.io/v3/b/69031647ae596e708f376e47';
const FETCH_URL = PUBLIC_BIN_URL + '/latest'; 
const REFRESH_INTERVAL = 5000; // Fetch data every 5 seconds

// =================================================================
// 1. DATA FETCHING AND UI UPDATES
// =================================================================

async function fetchLiveData() {
    try {
        const response = await fetch(FETCH_URL);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        
        const json_response = await response.json();
        const liveData = json_response.record; 
        
        updateOverlayUI(liveData);
        checkForAnimations(liveData); // Check for Wicket/Boundary triggers

    } catch (error) {
        console.error("Error fetching data:", error);
        document.getElementById('target-status').textContent = "Connection Error";
    }
}

function updateOverlayUI(data) {
    const battingTeamKey = data.current_team; // 'team1' or 'team2'
    const teamData = data[battingTeamKey];
    
    // Check if player data exists before setting
    const striker = data.current_batters ? data.current_batters.striker : { name: 'N/A', runs: 0, balls: 0 };
    const nonStriker = data.current_batters ? data.current_batters.non_striker : { name: 'N/A', runs: 0, balls: 0 };
    const bowler = data.current_bowler || { name: 'N/A', wickets: 0, runs: 0, overs: 0 };

    // Update Core Stats
    document.getElementById('score-runs-wickets').textContent = `${teamData.score}-${teamData.wickets}`;
    document.getElementById('overs').textContent = teamData.overs.toFixed(1);
    
    // Update Batsmen
    document.getElementById('batsman1-name').textContent = striker.name.toUpperCase();
    document.getElementById('batsman1-runs').textContent = `${striker.runs}(${striker.balls})`;

    document.getElementById('batsman2-name').textContent = nonStriker.name.toUpperCase();
    document.getElementById('batsman2-runs').textContent = `${nonStriker.runs}(${nonStriker.balls})`;

    // Update Bowler
    document.getElementById('bowler-name').textContent = bowler.name.toUpperCase();
    document.getElementById('bowler-figure').textContent = `${bowler.wickets}-${bowler.runs}-${bowler.overs.toFixed(1)}`; // Wickets-Runs-Overs

    // Update Status/Target
    document.getElementById('team1-abbr').textContent = data.metadata.team1_abbr;
    document.getElementById('team2-abbr').textContent = data.metadata.team2_abbr;
    if (data.innings === 2) {
        document.getElementById('target-status').textContent = `TARGET: ${data.target}`;
    } else {
        document.getElementById('target-status').textContent = data.metadata.toss_details;
    }

    updateBallTracker(data.ball_history);
}

// =================================================================
// 2. ANIMATION AND BALL TRACKER LOGIC
// =================================================================

let lastBallTimestamp = 0;

function updateBallTracker(history) {
    const trackerDiv = document.getElementById('ball-tracker');
    trackerDiv.innerHTML = ''; 
    const lastSix = history.slice(-6); 
    
    lastSix.forEach(ball => {
        const div = document.createElement('div');
        div.classList.add('ball-result');
        div.textContent = ball.result; 
        
        // Custom color based on result (Like in the video)
        if (ball.result === 'W') div.style.backgroundColor = '#dc3545'; // Red
        else if (ball.result === '4' || ball.result === '6') div.style.backgroundColor = '#28a745'; // Green for boundaries
        else if (ball.result === '1' || ball.result === '2' || ball.result === '3') div.style.backgroundColor = '#ffc107'; // Yellow/Orange for singles
        else div.style.backgroundColor = '#008000'; // Green for Dot

        trackerDiv.appendChild(div);
    });
}

function checkForAnimations(data) {
    if (!data.ball_history || data.ball_history.length === 0) return;
    
    const latestBall = data.ball_history[data.ball_history.length - 1];
    
    // Check if this is a newly recorded ball
    if (latestBall && latestBall.timestamp > lastBallTimestamp) {
        lastBallTimestamp = latestBall.timestamp;

        if (latestBall.result === '4' || latestBall.result === '6') {
            triggerPopup(`${latestBall.result} RUNS!`);
        } else if (latestBall.result === 'W') {
            triggerPopup('WICKET!');
        }
    }
}

function triggerPopup(text) {
    const popup = document.getElementById('action-popup');
    document.getElementById('popup-text').textContent = text.toUpperCase();
    
    popup.classList.add('is-active');

    setTimeout(() => {
        popup.classList.remove('is-active');
    }, 3000); // Popup stays for 3 seconds
}


// =================================================================
// START THE LIVE FEED
// =================================================================
document.addEventListener('DOMContentLoaded', () => {
    fetchLiveData(); 
    setInterval(fetchLiveData, REFRESH_INTERVAL); 
});
