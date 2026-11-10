# Tape

Tape is a browser-based trading journal and market calendar. It lets users import trading-platform log files, review trading performance, keep private notes, and view scheduled market events, holidays, and early closes.

**Repository:** https://github.com/Adam19255/Tape

## Features

- Import trade logs in `.txt`, `.tsv`, and `.csv` formats.
- Review trades, performance statistics, account-value history, and charts.
- Filter and inspect trades, including expanded trade details.
- Add notes and tags to trades and calendar days.
- Export calendar and insights data.
- Generate shareable trade/day cards.
- Use dark and light themes.
- View market events such as CPI, PPI, PCE, jobs reports, JOLTS, GDP, FOMC decisions and minutes.
- See market holidays and early-close sessions in the calendar.
- Filter economic events by Fed, Inflation, Jobs, and GDP groups.
- Use the responsive layout on desktop and phones.
- Sync each signed-in user's data through Firebase.

## Tech stack

- Vanilla JavaScript ES modules; no frontend framework or build step is used.
- HTML and CSS, with design tokens in `src/styles/tokens.css`.
- Firebase Authentication with Google sign-in.
- Cloud Firestore for user data and shared market-event data.
- Firebase Hosting for deployment.

The app is served from the repository root. `index.html` loads the CSS and `src/main.js` directly.

## Run locally

Because the app uses JavaScript modules, serve the project over HTTP rather than opening `index.html` as a `file://` URL.

With Python installed, run this from the project root:

```bash
python -m http.server 8000
```

Then open:

```text
http://localhost:8000
```

Firebase sign-in and cloud features require a correctly configured Firebase project and an authorized local domain. See [SETUP.md](SETUP.md).

## Firebase setup and deployment

Follow the detailed instructions in [SETUP.md](SETUP.md). In brief:

1. Create a Firebase project and register a Web app.
2. Enable Google as an Authentication provider.
3. Create a Cloud Firestore database.
4. Add your Firebase web-app configuration to `firebase-config.js`.
5. Install and sign in to the Firebase CLI.
6. Select your Firebase project and deploy Hosting plus Firestore rules.

Typical deployment commands:

```bash
npm install -g firebase-tools
firebase login
firebase use --add
firebase deploy
```

To deploy only the Firestore security rules:

```bash
firebase deploy --only firestore:rules
```

The Firebase project alias is stored in `.firebaserc`. Review it before deploying if you are working with a different Firebase project.

## Market events administration

Market events are stored in the shared Firestore document `shared/events`. Signed-in users can read the events; writes are restricted by the Firestore rules to an administrator.

To enable an administrator, create a document at `admins/{userUid}` manually in the Firebase console. The app does not allow users to grant themselves admin access. The detailed process, event JSON schema, and rules checks are documented in [SETUP.md](SETUP.md).

Supported event kinds are defined in `src/lib/events.js`. Event dates use `YYYY-MM-DD`; event times are New York wall-clock times. The UI converts event times for display in the viewer's local timezone.

## Project structure

```text
.
├── index.html                 # App shell and CSS/module entry points
├── firebase-config.js         # Firebase web-app configuration
├── firebase.json              # Firebase Hosting and Firestore config
├── firestore.rules             # Firestore access-control rules
├── .firebaserc                 # Firebase project alias
├── assets/                     # Brand assets
├── src/
│   ├── main.js                 # App entry point, state, delegated events, rendering
│   ├── components/             # HTML-rendering UI components
│   ├── views/                  # Page/tab views
│   ├── lib/                    # Pure business logic and formatting
│   ├── services/               # Browser, Firebase, and download integrations
│   └── styles/
│       ├── tokens.css          # Theme and semantic color tokens
│       ├── base.css            # Global layout and base styles
│       ├── components.css      # Component styles
│       └── responsive.css      # Breakpoints and phone-specific styles
├── ARCHITECTURE.md             # Detailed implementation conventions
└── SETUP.md                    # Firebase setup, deployment, and event administration
```

## Architecture and contribution conventions

Read [ARCHITECTURE.md](ARCHITECTURE.md) before making structural changes. Important project conventions:

- Keep `src/lib/` pure: no DOM, Firebase, or browser side effects.
- Components accept data through props and return HTML; they do not own application state.
- `src/main.js` owns delegated UI events and application-level state.
- Keep shared colors and easing in CSS tokens; avoid hard-coded theme-specific colors.
- When changing an architectural convention, update `ARCHITECTURE.md`.
- Escape user- or upload-provided strings before inserting them into HTML.

## Calendar mobile event markers

The calendar displays category-colored event chips on wider screens. On phones, each event is represented by its own colored dot. Up to three dots are shown per day; when a day has more than three events, a `+N` count indicates the additional events. The date remains tappable and its accessible label includes all events for that day.

## Security and privacy notes

- Firestore rules isolate private user data under `users/{uid}`.
- Shared market events are readable by signed-in users and writable only by the configured admin.
- Do not commit private credentials, service-account keys, or access tokens.
- `firebase-config.js` contains the Firebase web-app configuration. It is client-side project identification, not a substitute for Firestore security rules.
- Review `firestore.rules` carefully before changing access policies.

## Testing

The repository does not currently define an automated test script or build pipeline. After UI changes, test the app in a browser at desktop and phone widths. For calendar event changes, verify:

1. A day with one event shows one colored dot on a phone.
2. A day with two or three events shows two or three distinct category-colored dots.
3. A day with more than three events shows three dots and a `+N` overflow count.
4. Tapping the date opens the day details with every event.
5. Desktop event chips and calendar navigation still work.
6. Both dark and light themes remain legible.

## License

No license file is currently included in the repository. Unless a license is added, the project should be treated as having no explicit open-source reuse license.
