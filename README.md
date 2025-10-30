# 🏏 Cricket Scoring Website (No Firebase)
### Free, Mobile-Friendly, Live Overlay for Streaming

---

## 🔧 Setup Steps
1. Go to [https://jsonbin.io](https://jsonbin.io)
2. Create a new bin, copy its API URL.
3. Paste that URL in both `script.js` and `overlay.html` (replace the placeholder).
4. Go to [https://github.com](https://github.com)
5. Create a new repository → `cricket-scoreboard`
6. Upload all these files.
7. Go to `Settings > Pages > Deploy from branch`.
8. Your site will be live at:
   `https://yourusername.github.io/cricket-scoreboard`

---

## 🎥 For Streaming (OBS / Prism Live)
1. Open your live streaming app (OBS, Prism, etc.)
2. Add a new **Browser Source**
3. Paste your overlay URL:
   `https://yourusername.github.io/cricket-scoreboard/overlay.html`
4. Set width = 1280, height = 720
5. Done! The overlay will auto-refresh every 3 seconds.

---

## ✅ Features
- Team + Match creation
- Runs, wickets, extras buttons
- Auto innings switch
- Live overlay for stream
- Free hosting on GitHub
- No Firebase / No paid tools
