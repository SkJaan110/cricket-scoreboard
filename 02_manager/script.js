// =================================================================
// 02_manager/script.js (FINAL OFFLINE LOGIN LOGIC - CORRECTED STRUCTURE)
// =================================================================

// ⚠️ JSONBin Master Details ko filhal ignore kar rahe hain, sirf login check ke liye.
// const CREDENTIALS_BIN_ID = '...'; 
// const ADMIN_MASTER_KEY = '...'; 

let userCredentials = [
    // Default credentials for offline testing (MD5 Hash)
    { username: 'admin', hash: 'e10adc3949ba59abbe56e057f20f883e', role: 'admin' }, // 123456
    { username: 'scorer', hash: '5f4dcc3b5aa765d61d8327deb882cf99', role: 'scorer' } // password
];

document.addEventListener('DOMContentLoaded', () => {
    // 1. Initial message and loading check
    console.log("Login Script Loaded (Offline Mode)."); 
    const messageDisplay = document.getElementById('message');
    if (messageDisplay) {
        messageDisplay.textContent = 'Ready to Login (Offline Test Mode).';
        messageDisplay.style.color = '#fff';
    }

    // 2. Event Listener Setup (CRITICAL FIX: agar HTML onclick kaam nahi kar raha)
    // Assuming button has id="loginBtn" as discussed in previous step
    const loginButton = document.getElementById('loginBtn');
    if (loginButton) {
        // Hamein 'attemptLogin' function ko yahan attach karna hai
        loginButton.addEventListener('click', attemptLogin);
    }
});


// Is function ko global scope mein hona zaroori hai, taaki HTML use call kar sake
function attemptLogin() {
    // 🛑 DEBUG CODE: Check karta hai ki function chala ya nahi
    console.log("--- Login button clicked. Starting verification. ---"); 

    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value.trim();
    const messageDisplay = document.getElementById('message');

    if (!username || !password) {
        messageDisplay.textContent = 'Username and Password are required.';
        return;
    }

    // 1. Client-Side Hashing (CryptoJS should be loaded via crypto-md5.js)
    // Agar 'CryptoJS' undefined hai, toh error console mein dikhega
    try {
        const inputHash = CryptoJS.MD5(password).toString();
        
        // 2. Verification
        const foundUser = userCredentials.find(user => 
            user.username === username && user.hash === inputHash
        );

        if (foundUser) {
            messageDisplay.textContent = `Login Successful! Redirecting to ${foundUser.role} panel.`;
            messageDisplay.style.color = 'lightgreen';
            
            // 3. Store Role in localStorage 
            localStorage.setItem('currentUserRole', foundUser.role);
            
            // 4. Redirection (Paths checked: same folder)
            if (foundUser.role === 'admin') {
                window.location.href = 'admin_dashboard.html'; 
            } else {
                window.location.href = 'scorer_select.html'; 
            }
        } else {
            messageDisplay.textContent = 'Invalid Username or Password.';
            messageDisplay.style.color = '#ffd700';
        }
    } catch (e) {
        console.error("Hashing Error: CryptoJS is not available.", e);
        messageDisplay.textContent = 'A critical error occurred (Hashing Library Missing). Check Console.';
        messageDisplay.style.color = 'red';
    }
}
