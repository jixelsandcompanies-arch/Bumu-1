# BUMU Agent Portal - React Native

A modern agent management portal built with **React Native** and featuring **Georgia serif font** typography.

## Features

- 📊 Dashboard with real-time statistics
- 👥 Customer management
- 💰 Commission tracking
- 👤 Agent profile management
- ⚙️ Comprehensive settings
- 🔐 Secure authentication
- 📱 Responsive design (Web & Mobile)

## Quick Start (Windows)

1. Install dependencies (first time):

```powershell
npm install
```

2. Start the app (desktop-friendly):

```powershell
npm run start-desktop
# or
npm run dev
# then open http://localhost:5174/ if needed
```

You can also double-click `run-bumu.bat` in the project root to start the dev server and open the app in your default browser.

## Tech Stack

- **React Native** - Cross-platform UI framework
- **React** - Web framework
- **React Navigation** - Navigation library
- **Georgia Serif Font** - Professional typography

## Project Structure

```
src/
├── App.jsx                 # Main app component
├── index.jsx               # Entry point
├── features/
│   ├── auth/               # Authentication
│   ├── dashboard/          # Dashboard
│   ├── customers/          # Customer management
│   ├── profile/            # Agent profile
│   └── settings/           # Settings
└── bumu.css                # Global styles
```

## Recent UI & Safety Improvements

- Attractive rider visuals: stacked payment bars and per-rider sparklines.
- Dashboard: payment-distribution histogram and new KPI tiles.
- Client-side `computeRisk()` evaluator: riders that score high are flagged for review and surfaced across the UI.
- Basic anti-fraud ideas implemented as flags; for production move risk evaluation server-side and enforce holds/escrow.
- `run-bumu.bat` updated to open port `5174` and `package.json` includes `start-desktop` for a fixed-port launch.

## Notes & Next Steps

- Risk rules are currently client-side placeholders. For robust enforcement, add server-side validation, immutable audit logs, and OTP/device checks.
- Next backend step: connect authentication, OTP, customer onboarding, screening, payments, and commission data to live API/Supabase services.

---

Enjoy — open the app and tell me any visual or rule tweaks you'd like applied next.
