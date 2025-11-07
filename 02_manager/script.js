// =================================================================
// 02_manager/script.js (TEMPORARY OFFLINE LOGIN LOGIC)
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
    // Console mein message daal do taaki pata chale ki script load ho gayi hai
    console.log("Login Script Loaded (Offline Mode)."); 
    document.getElementById('message').textContent = 'Ready to Login (Offline Test Mode).';
    document.getElementById('message').style.color = '#fff';
});

    
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value.trim();
    const messageDisplay = document.getElementById('message');

    if (!username || !password) {
        messageDisplay.textContent = 'Username and Password are required.';
        return;
    }

    // 1. Client-Side Hashing
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
}

// ⚠️ Ensure admin_dashboard.html and admin_style.css are in the 02_manager folder.
