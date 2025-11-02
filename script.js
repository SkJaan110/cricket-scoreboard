document.addEventListener('DOMContentLoaded', () => {
    // 1. Data Structure (Example Dummy Data - Real data will come from a server/API)
    const liveMatchData = {
        team1Name: "India",
        team2Name: "Australia",
        team1Score: "150/3 (20 Overs)",
        team2Score: "50/1 (5 Overs)",
        matchStatus: "India is currently batting. Target: 250",
        team1Batsmen: [
            { batsman: "Rohit Sharma", R: 85, B: 52, '4s': 10, '6s': 5, SR: 163.46 },
            { batsman: "Virat Kohli", R: 5, B: 10, '4s': 0, '6s': 0, SR: 50.00 }
        ],
        commentary: [
            "18.1: SIX! Sharma hammers it over long-off.",
            "18.2: WICKET! Kohli is caught at deep mid-wicket.",
            "18.3: Single. New batsman is Jadeja."
        ]
    };

    // 2. Function to Update the Match Summary Section
    function updateMatchSummary(data) {
        document.getElementById('team1-name').textContent = data.team1Name;
        document.getElementById('team2-name').textContent = data.team2Name;
        document.getElementById('team1-score').textContent = data.team1Score;
        document.getElementById('team2-score').textContent = data.team2Score;
        document.getElementById('match-status').textContent = data.matchStatus;
        
        // Note: You would set logo src here if you had actual images.
        // document.querySelector('.team-info:first-child img').src = 'india-logo.png';
    }

    // 3. Function to Update the Scorecard Table
    function updateScorecard(batsmen) {
        const tbody = document.getElementById('team1-batsmen');
        tbody.innerHTML = ''; // Clear previous data

        batsmen.forEach(player => {
            const row = tbody.insertRow();
            // Create cells for each stat
            row.insertCell().textContent = player.batsman;
            row.insertCell().textContent = player.R;
            row.insertCell().textContent = player.B;
            row.insertCell().textContent = player['4s'];
            row.insertCell().textContent = player['6s'];
            row.insertCell().textContent = player.SR;
        });
    }
    
    // 4. Function to Update the Commentary List
    function updateCommentary(comments) {
        const ul = document.getElementById('commentary-list');
        ul.innerHTML = ''; // Clear previous commentary

        comments.forEach(comment => {
            const li = document.createElement('li');
            li.textContent = comment;
            ul.appendChild(li);
        });
    }

    // --- Main Call ---
    updateMatchSummary(liveMatchData);
    updateScorecard(liveMatchData.team1Batsmen);
    updateCommentary(liveMatchData.commentary);

    // In a real application, you would use a function like this to fetch live data
    // setInterval(fetchAndUpdateData, 5000); // Update every 5 seconds
});
