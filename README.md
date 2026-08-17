# MediAssist — V1 Frontend (Expo / React Native)

Implementation of the five V1 screens from the SFE 4010A CAT 1 report, for elderly users (65+), accessibility-first. Now wired to a live backend (see `../MediAssist-backend` or wherever you've placed it) instead of static mock data.

## Run it

1. Start the backend first (from its own folder): `npm install && npm run prisma:migrate && npm run seed && npm run dev`. It listens on `http://localhost:4000`.
2. In this folder, edit [config.js](config.js) if needed — it defaults to `10.0.2.2` for the Android emulator and `localhost` otherwise. **On a physical device via Expo Go, replace it with your computer's LAN IP** (`ipconfig`), since `localhost` on the phone means the phone itself.
3. `npx expo start` (or `npx expo start --web` to try it in a browser first).
4. Sign in with one of the seeded demo accounts shown on the login screen (`grace@example.com` / patient, `peter@example.com` / caregiver, password `password123` for both), or register a new account against the backend.

No navigation library — a flat, always-visible tab bar is custom-built to keep touch targets large, and the tab set itself changes based on who's signed in (see below).

## Files

| File | Purpose |
|---|---|
| `App.js` | Root: auth gate, role-based tab bar (64px targets, 1 tap to any screen) |
| `AuthContext.js` | Session state (JWT + user + resolved patientId), persisted via AsyncStorage |
| `api.js` | Fetch wrapper for every backend endpoint |
| `config.js` | Backend base URL |
| `formatters.js` | Shared dose-status / time / 12h↔24h helpers |
| `push.js` | Expo push notification permission + token registration |
| `theme.js` | Design tokens — every accessibility constraint lives here |
| `components/ui.js` | `BigButton`, `StatusDot`, `Card`, `ScreenHeader` |
| `screens/LoginScreen.js` | Sign-in (not in the original Figma set — needed to tell Grace's session from Peter's against a real backend) |
| `screens/HomeScreen.js` | S1 — summary cards + colour-coded medication list (patient only) |
| `screens/ReminderScreen.js` | S2 — 24pt bold name, 72px green confirm, secondary snooze (patient only) |
| `screens/AddMedicationScreen.js` | S3 — 4 fields, inline chip time picker, single Save CTA (both roles) |
| `screens/ReportScreen.js` | S4 — 48pt overall %, date range selector, colour-coded bars (both roles) |
| `screens/CaregiverScreen.js` | S5 — red alert card, real-time list, remote-add button (caregiver only) |

## Roles → tabs

Per the report's own Reflections ("design tension... led us to separate the two interfaces into distinct user modes"):
- **Patient session** (Grace): Home, Remind, Add, Report.
- **Caregiver session** (Peter): Family (dashboard), Add, Report — no Home/Remind, since those are the patient's own reminder flow.

## Constraint → code mapping

| Report constraint | Where enforced |
|---|---|
| 375×812 base canvas | Fluid flex layout; renders correctly at 375×812 and scales up |
| 18pt minimum text | `type.body = 18` in `theme.js`; no style uses a smaller size |
| 4.5:1 contrast (WCAG AA) | All pairs documented in `theme.js` with measured ratios (lowest pair: white on blue600 = 6.3:1) |
| 48×48px touch targets | `BigButton` enforces `minHeight: max(48, height)`; chips/tabs set `minHeight: 48`+ |
| ≤ 2 taps to core actions | Flat tab bar: any screen = 1 tap; confirm dose = 1 tap on S2; save medicine = field + 1 tap |
| Green/orange/red coding | `StatusDot` + `statusTextColor()` + `barColor()` — single source of truth |
| Confirm button 72px | `touch.confirm = 72` passed to `BigButton` on S2 |
| Max 4 form fields | S3 has exactly: name, dose, frequency, time |
| TalkBack compatibility | `accessibilityRole` / `accessibilityLabel` / `accessibilityState` throughout; `announceForAccessibility` on dose confirm/snooze |
| Feedback (Norman) | Confirm shows checkmark text + screen-reader announcement instantly |

## Notes for V2

- Push notifications: `push.js` registers an Expo push token on login, but actually *receiving* a background push while the app is closed needs a development build (`eas build`) rather than Expo Go, plus an EAS project ID in `app.json`. In Expo Go the reminder still shows up next time the Reminder tab polls the backend (every 20s) or on pull-to-refresh.
- The double-confirmation lockout (Section 9 Constraints) is enforced server-side (`backend/src/utils/doseLogic.js`), not just hidden in the UI — confirming twice within 60 minutes returns an error the Reminder screen displays.
- "18pt" is implemented as React Native font size 18 (density-independent). If your evaluator wants true typographic points, bump `type.body` to ~24.
