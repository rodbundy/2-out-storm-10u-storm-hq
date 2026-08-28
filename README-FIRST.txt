STORM HQ — COMBINED UPDATE
Homepage Speed + Public GameChanger

THIS PACKAGE COMBINES BOTH CHANGES SO YOU ONLY UPDATE GITHUB ONCE.

UPLOAD THESE FILES ON TOP OF YOUR EXISTING GITHUB REPOSITORY:
1. index.html
2. storm-channel.html
3. assets/js/api.js
4. assets/js/site.js
5. firebase-messaging-sw.js

DO NOT DELETE THE REPOSITORY.
DO NOT CHANGE APPS SCRIPT.
DO NOT CHANGE THE GOOGLE SHEET.

WHAT THIS COMBINED UPDATE DOES

HOMEPAGE SPEED
- Keeps the last successful PUBLIC team-data payload available for fast returning visits.
- Quietly refreshes live public data in the background.
- Renders the top/important homepage content first.
- Defers heavier lower-page content such as Family Board, full calendar, videos, players,
  tryouts, homework, and Picture of the Week until after the initial paint.
- Reduces first-load service-worker work by caching only the critical app shell.
- Adds connection pre-warming for Apps Script and Google-hosted images.
- Forces browsers to pick up the updated api.js/site.js files.

PUBLIC GAMECHANGER
- Adds an "Official Storm Game Center" panel to Storm Channel.
- Public visitors can open the official 2 Out Storm 10U GameChanger team page.
- Includes quick labels for Live Scoring, Schedule, Results, and Team Updates.
- Opens GameChanger in a new tab for reliability.
- Uses the saved Website Settings -> gamechanger link when available.
- Falls back to:
  https://web.gc.com/teams/k7Ir88y2JrCI?utm_source=Web&utm_campaign=team_share_link

NOT TOUCHED
- Code.gs
- Admin.html
- FamilyPortal.html
- LineupBuilder.html
- Google Sheet data
- player records
- photos
- availability
- homework
- lineups
- Family Board messages
- GameChanger stats
- forms
- notification/push registrations

INSTALL
1. Download and extract this ZIP.
2. Open the existing Storm HQ GitHub repository.
3. Click Add file -> Upload files.
4. Drag these files/folders ON TOP of the existing repository.
5. Commit the changes.
6. Wait for GitHub Pages / Actions to turn green.
7. Open 2outstorm2035.com and refresh.
8. If using the installed phone app/PWA, close and reopen it or refresh one more time.

ROLLBACK
This package changes only static GitHub files. Your saved data remains untouched.
