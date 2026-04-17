# 🎮 Bally Pi — Premium Ball Merge Physics Game

A **AAA-quality mobile-ready** browser game. Drop balls, merge identical ones to evolve to the next level, and aim for the legendary ⚽ Football!

---

## ✅ Completed Features

### 🎮 Gameplay
- **Matter.js real physics**: gravity, bounce, friction, body sleeping for performance
- **16-ball progression**: 🏓 → 🎱 → 🎾 → 🏸 → 🥎 → ⚾ → 🏐 → 🏀 → 🏉 → 🏏 → 🏑 → 🏒 → 🥍 → 🎳 → 🏈 → ⚽
- **Merge system**: identical balls merge via collision events into next-level ball
- **Score + Combo multiplier** (up to 8×)
- **Game over detection** via danger zone line with 2.5s grace period
- **Smart spawn**: only low-level balls early, max level scales with score
- **Difficulty scaling**: spawn cooldown reduces from 1200ms → 450ms with score

### 💥 Visual Effects
- **Canvas particle system**: sparks, rings, confetti (level 5+), score pops
- **Screen shake** on high-level merges
- **Glow + gradient** on every ball
- **Aim line** with dot indicator
- **Animated star background** with floating ball decorations
- **Glassmorphism UI** panels, buttons, overlays

### 🎨 UI/UX Screens
- **Splash Screen**: animated logo, loading dots, fade transition
- **Main Menu**: logo, best score, Play / Connect Pi / How to Play buttons
- **In-Game HUD**: score (top center), pause button, next ball preview, combo display
- **Pause Overlay**: resume, restart, main menu, sound toggle
- **Game Over Screen**: score, best, highest ball, restart / continue with Pi / menu
- **How to Play**: complete ball progression guide grid

### 🔊 Audio
- **Procedural 8-bit sounds** via Web Audio API (no audio files needed)
  - Drop, bounce, merge (pitch scales with level), game over, UI click, combo
- **Looping 8-bit background music** (soft, non-intrusive)
- **Mobile audio unlock** on first touch
- **Sound ON/OFF toggle** persistent via LocalStorage

### 🌐 Pi Network Integration
- **Pi SDK authentication** flow (Pi Browser compatible)
- **Demo mode** fallback when Pi SDK not available
- **Full payment flow**: `createPayment → onReadyForServerApproval → onReadyForServerCompletion`
- **Anti-replay protection**: txid stored in LocalStorage, checked before granting rewards
- **"Continue for 0.5 π"** game over feature (clears danger zone, small score penalty)
- **In-game π button** for power-ups (extensible)

### 📱 Mobile Optimization
- Touch drag-and-aim controls (touchstart/touchmove/touchend)
- Max-width 430px centered layout (phone-sized)
- `user-scalable=no`, `touch-action:none` prevents zoom/scroll conflicts
- `env(safe-area-inset-*)` padding for notched phones
- Matter.js body sleeping enabled for 60 FPS stability
- Maximum 50 physics bodies limit prevents overcrowding
- Lightweight Web Audio synthesis (no large audio file downloads)

---

## 🚀 How to Run

Open `index.html` directly in a browser — **no build step needed!**

```bash
# Serve locally (optional):
npx serve .
# or:
python -m http.server 8080
```

Then open: `http://localhost:8080`

### Deploy to Netlify
1. Drag and drop the project folder to [netlify.com/drop](https://app.netlify.com/drop)
2. Or connect the GitHub repo — Netlify will detect `index.html` as the publish root
3. No `netlify.toml` needed for single-page static deployment

---

## 📁 Project Structure

```
/
├── index.html     # Complete game (HTML + CSS + JS, self-contained)
└── README.md      # This file
```

---

## ⚠️ Before Production Launch

### 1. Switch Pi SDK to Production mode
```js
// In index.html, find CONFIG object:
SANDBOX: false,   // was: true
```

### 2. Add real Pi backend endpoints
In `index.html`, find `onReadyForServerApproval` and `onReadyForServerCompletion` and replace the sandbox stubs with:

```js
// Server approval
await fetch('/api/pi/approve', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ paymentId }),
});

// Server completion
const res = await fetch('/api/pi/complete', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ paymentId, txid }),
});
// Only grant reward if res.ok === true
```

Your backend must call Pi Platform API:
- `POST https://api.minepi.com/v2/payments/{paymentId}/approve`
- `POST https://api.minepi.com/v2/payments/{paymentId}/complete`

---

## 🗄️ Data Storage

All game data stored client-side in **LocalStorage**:

| Key | Type | Description |
|-----|------|-------------|
| `bally_best` | Number | All-time best score |
| `bally_sound` | Boolean | Sound on/off preference |
| `bally_pi_user` | JSON | Authenticated Pi user object |
| `bally_txids` | JSON Array | Processed transaction IDs (anti-replay) |

---

## 🔮 Recommended Next Steps

1. **Real Pi backend** (Node.js/Python) to handle approve/complete API calls securely
2. **Global leaderboard** via Pi API or simple REST backend
3. **Power-ups shop** (Bomb, Change, Remove) with Pi payment
4. **Skin packs** (Neon, Fire, Ice, Gold, Galaxy) unlockable via score milestones or Pi purchase
5. **Daily rewards** system with streak tracking
6. **Haptic feedback** via `navigator.vibrate()` on merge
7. **Ball trail effects** using canvas drawing history
8. **Share score** via Web Share API

---

## 🛠️ Tech Stack

| Technology | Version | Purpose |
|-----------|---------|---------|
| Matter.js | 0.19.0 | Physics engine (via CDN) |
| Web Audio API | Native | Procedural sound synthesis |
| Canvas 2D API | Native | Game rendering + particles |
| Google Fonts | Latest | Orbitron + Exo 2 typography |
| Pi Network SDK | Latest | Web3 payments (Pi Browser) |
| LocalStorage | Native | Client-side persistence |

---

*Bally Pi — Drop. Merge. Evolve.* ⚽
