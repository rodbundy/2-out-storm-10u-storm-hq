# 2 Out Storm 10U - Storm HQ Master Rebuild

This is the clean master repository for the 2 Out Storm 10U team website and Storm HQ management system.

## What this package does

The public GitHub Pages site includes:

- The Eye (homepage)
- Meet the Storm roster and player profiles
- Storm Tracker schedule and countdown
- Event Details pages
- Tryout Center
- Storm Channel
- Storm Homework
- Storm Development
- Storm Reports and gallery
- The Shelter / family access
- Join the Storm recruiting page
- Website Guide

The Google Apps Script backend includes:

- Password-protected Coach Control Center
- Parent-code Family Portal
- Schedule/game/practice editor
- Team announcements and family-only messages
- Player/profile editor with independent card and profile photo framing
- Tryout manager
- Homework manager with drills, reps, videos, questions and automatic grading
- Weekly and season homework reporting
- Event groups
- Game Day Builder with Starting Order + Adjustment 1 + Adjustment 2
- Defensive positions by inning
- Print / Save PDF / CSV lineup output
- Parent availability tracking
- Accepted Player approval queue
- Parent photo submission approval queue
- Google Forms setup/registry
- Dynamic team branding for future white-label/rebrand use

## First-time setup order

1. Upload `../GOOGLE-SHEET-TEMPLATE/2_Out_Storm_Storm_HQ_Master_Data.xlsx` to Google Drive and save it as a Google Sheet.
2. Open **Extensions > Apps Script**.
3. Install these six Apps Script files from `apps-script/`:
   - `Code.gs`
   - `Admin.html`
   - `FamilyPortal.html`
   - `LineupBuilder.html`
   - `StormStyles.html`
   - `appsscript.json`
4. Run `initializeStormHQ` once.
5. Refresh the Google Sheet.
6. Use **Storm HQ > Set Coach Password**.
7. Use **Storm HQ > Create / Repair Google Forms**.
8. Use **Storm HQ > Install Form Trigger**.
9. Deploy Apps Script as a Web App: **Execute as Me**; **Who has access: Anyone**.
10. Copy the Web App URL ending in `/exec`.
11. Edit `assets/js/config.js` and paste the `/exec` URL into `apiUrl`.
12. Upload the contents of this `GITHUB-REPOSITORY` folder to a clean public GitHub repository.
13. Enable GitHub Pages from `main` / root.
14. Test the temporary GitHub Pages URL.
15. Connect `2outstorm2035.com` only after the temporary URL works.

## Normal coaching workflow

After setup, normal team work belongs in the **Coach Control Center**. Do not edit GitHub for:

- practices or games
- team announcements
- players or player photos
- tryouts
- homework
- event groups
- batting orders
- videos
- shoutouts
- form links
- team colors/logo/contact information

## Critical data rules

- Database headers must remain in row 1 of managed Google Sheet tabs.
- Times should be typed as plain text such as `6:00 PM`.
- Only rows with `Show = YES` and `Approved = YES` publish publicly.
- Parent codes, availability, homework responses, pending players, and admin logs stay private.
- Only parent-approved youth photos/information should be published.

See `docs/STORM-HQ-QUICK-REFERENCE.md` and the separate Owner's Manual included in the master package.
