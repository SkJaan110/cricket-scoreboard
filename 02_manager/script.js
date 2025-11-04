// =================================================================
// script.js (Login Logic for 02_manager)
// =================================================================

// ⚠️ IMPORTANT: Yeh Master Bin wohi hoga jo Admin aur Scorers ke credentials store karega
const CREDENTIALS_BIN_ID = '69031647ae596e708f376e47'; // Assuming this is your Master Bin
const CREDENTIALS_READ_URL = `https://api.jsonbin.io/v3/b/${CREDENTIALS_BIN_ID}/latest`;
const ADMIN_MASTER_KEY = '$2a$10$4JIQrBJ4q26ri7NRJ3j6tOht7D57KvQBLG/lT6646UHfjBKltayfe';

let userCredentials = {};

document.addEventListener('DOMContentLoaded', loadCredentials);

async function loadCredentials() {
    // Load Admin/Scorer credentials from JSONBin
    try {
        const response = await fetch(CREDENTIALS_READ_URL);
        const json_response = await response.json();
        
        if (json_response.record && json_response.record.users) {
            userCredentials = json_response.record.users;
            document.getElementById('message').textContent = 'Ready to Login.';
            document.getElementById('message').classList.remove('error-message');
            document.getElementById('message').style.color = 'lightgreen';
        } else {
            // Initializing credentials if the Bin is empty (for the first time)
            await initializeCredentials();
        }
    } catch (e) {
        document.getElementById('message').textContent = 'CRITICAL ERROR: Failed to load credentials.';
    }
}

async function initializeCredentials() {
    const initialUsers = {
        // NOTE: Passwords are pre-hashed (MD5 used here for simplicity)
        users: [
            { username: 'admin', hash: 'e10adc3949ba59abbe56e057f20f883e', role: 'admin' }, // 123456
            { username: 'scorer', hash: '5f4dcc3b5aa765d61d8327deb882cf99', role: 'scorer' } // password
        ]
    };

    // Store this initial data back into the Master Bin
    await fetch(CREDENTIALS_READ_URL, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            'X-Master-Key': ADMIN_MASTER_KEY,
            'X-Bin-Versioning': 'false'
        },
        body: JSON.stringify(initialUsers)
    });
    userCredentials = initialUsers.users;
    document.getElementById('message').textContent = 'Default credentials loaded (admin/123456 & scorer/password).';
    document.getElementById('message').style.color = 'lightgreen';
}


function attemptLogin() {
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value.trim();
    const messageDisplay = document.getElementById('message');

    if (!username || !password) {
        messageDisplay.textContent = 'Username and Password are required.';
        return;
    }

    // 1. Client-Side Hashing (CryptoJS is loaded via script tag in HTML)
    const inputHash = CryptoJS.MD5(password).toString();

    // 2. Verification
    const foundUser = userCredentials.find(user => 
        user.username === username && user.hash === inputHash
    );

    if (foundUser) {
        messageDisplay.textContent = `Login Successful! Redirecting to ${foundUser.role} panel.`;
        messageDisplay.style.color = 'lightgreen';
        
        // 3. Store Role in localStorage for persistence (Crucial step)
        localStorage.setItem('currentUserRole', foundUser.role);
        
        // 4. Redirection to the respective Control Panel
        if (foundUser.role === 'admin') {
            window.location.href = 'admin_dashboard.html'; // Admin goes to the full dashboard
        } else {
            window.location.href = 'scorer_select.html'; // Scorer goes directly to match selection
        }
    } else {
        messageDisplay.textContent = 'Invalid Username or Password.';
        messageDisplay.style.color = '#ffd700';
    }
}
