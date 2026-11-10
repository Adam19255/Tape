# Tape on Firebase: setup (about 15 minutes, no card needed)

1. **Create the project.** console.firebase.google.com → Add project (skip Analytics). Stay on the free Spark plan.
2. **Add a web app.** Project overview → `</>` Web → register (no Hosting needed here). Copy the `firebaseConfig` values into `firebase-config.js`.
3. **Turn on sign-in.** Build → Authentication → Get started → Sign-in method → **Google** → enable. Set the **public-facing name** (shown on Google's consent screen) and a **support email**, then save.
4. **Create the database.** Build → Firestore Database → Create database → pick a region near you → start in **production mode**.
5. **Deploy.** Install Node.js, then in this folder:
   ```
   npm install -g firebase-tools
   firebase login
   firebase use --add        # pick your project
   firebase deploy           # publishes the site and the security rules
   ```
6. Share the `https://<project-id>.web.app` address. **Anyone with a Google account can sign in, and their first sign-in creates their account.** There is no invite list and nothing to approve. Each person only ever sees their own data.

**Custom domain?** Authentication → Settings → Authorized domains → add it, or the Google popup will fail with `auth/unauthorized-domain`. (`*.web.app` and `*.firebaseapp.com` are already allowed.)
**Redeploying rules only:** `firebase deploy --only firestore:rules`.
**Data layout:** `users/{uid}` holds settings and notes; `users/{uid}/logs/{id}` holds one raw log file each (max ~900 KB). `firestore.rules` fixes the shape and size of both, so nobody can store arbitrary data.
**Free-tier note:** opening the app reads your settings plus one doc per log. The Spark plan allows 50,000 reads/day in total across *all* users, so open sign-up shares that budget. If you outgrow it, the app stops loading data until the daily reset (nothing is billed on Spark); upgrading to Blaze lifts the cap.

**Upgrading from the invite-only version:** deploy the new rules (step 5). The old `allowed` collection is no longer read; delete it in the console whenever you like.
**Want to limit sign-ups later?** In `firestore.rules`, add a condition to `isOwner`, for example `&& request.auth.token.email.matches('.*@yourcompany[.]com')`, then redeploy the rules.

## Admin and market events (optional)

The calendar can show scheduled releases (CPI, FOMC, ...) and market holidays. One person, the **admin**, uploads a JSON file in the app and everyone sees it straight away.

1. **Deploy the new rules first:** `firebase deploy --only firestore:rules` (or a full `firebase deploy`). Until then the app still works; the events and admin controls just don't appear.
2. **Find your uid:** Build → Authentication → Users → copy the **User UID** of your account.
3. **Make yourself admin:** Build → Firestore Database → Start collection → collection ID `admins` → document ID = **your uid** → add one field (anything, e.g. `note` = `admin`; the rules only check that the document exists). Nothing in the app can create or change this document, so this console step is the only way to become admin.
4. **Reload the app → Settings.** You now see **Market events** with **Choose events file…**. Everyone else sees only a status line once something is uploaded.
5. **File format:** `{"v":1,"events":[{"date":"2026-11-10","time":"08:30","kind":"cpi","title":"CPI (Oct)"}, ...]}`. `time` is **New York time**; `closed` days have no time; an `early-close` time is the closing time. `kind` is one of `cpi ppi pce jobs jolts gdp fomc minutes closed early-close`; optional: `status` (`scheduled`, `rescheduled`, `canceled`), `was` (the old date), `url` (https only). Up to 3,000 events and 800 KB. The app checks the file and shows a preview before anything is replaced.
6. **Changing events later:** Settings → **Download current file**, edit it, upload it again. Each upload replaces the whole set.

**Checking the rules work** (do this once after step 3; the Firebase console's **Rules → Rules Playground** can simulate every case below without a second account):
- As a signed-in, verified user who is *not* in `admins`: **get** `shared/events` is allowed; **create/update** `shared/events` is **denied**; **get** `admins/<someone else's uid>` is **denied**; **create** `admins/<your own uid>` is **denied**.
- As you (with the `admins` document in place): **create/update** `shared/events` with `{v: 1, updated: "2026-11-09", events: []}` is **allowed**; the same with an extra field (e.g. `admin: true`), or with `v: 2`, is **denied**.
- Unauthenticated, or `email_verified` false: **get** `shared/events` is **denied**.
- In the app, signed in as a second (non-admin) Google account: Settings shows no upload controls, and after you upload, that account sees the status line appear without reloading.

**Free-tier note:** this adds about two reads per app open per person (your admin flag and the events document).
