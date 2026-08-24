# IT Arena Subject Quiz v3

A separate Information Technology subject quiz platform with student/admin modules, animated IT + cricket-inspired visuals, final-question submission, leaderboard, question management, and quiz warning/blocking controls.

## 1. Use a separate Supabase project
Create a NEW project in Supabase for this website. Do not mix these tables with your Placement Quiz database.

## 2. Create the database
Open Supabase > SQL Editor > New query. Copy the entire contents of `sql/SUPABASE_SETUP.sql` and click Run.

The script creates:
- `profiles`
- `questions`
- `quiz_results`
- registration trigger
- admin checks
- leaderboard/admin result RPCs
- RLS policies
- 3-warning blocking RPC

## 3. Create your admin account
Register normally on the website. Then in Supabase SQL Editor run:

```sql
update public.profiles set role='admin' where email='YOUR_EMAIL';
```

## 4. Connect the website
Open `js/supabase.js` and replace the placeholders with the new project's browser-safe Project URL and Publishable/anon key. Never use a service_role/secret key in browser code.

## 5. Run locally
Serve the folder with VS Code Live Server (or another local web server). Do not rely on `file://`.

## 6. Features
- Students cannot see or use Admin; `admin.html` also checks the role server-side through RLS.
- Leaderboard uses `get_leaderboard()` so it does not fail because profile RLS blocks cross-student profile reads.
- A quiz result is inserted only once, after every question has been answered and the final button is pressed.
- The final question button says `Submit Quiz ✓`.
- Admin can create/delete questions and view completed attempts.
- Quiz tab/window/fullscreen violations create up to 3 warnings. At 3 warnings the student is blocked. Admin can reset the warning count and unblock the student.

## Important: run through a local web server

Do NOT open the HTML files by double-clicking them (`file:///...`). Browser security can block storage/cookies and some module/network behavior on `file:` URLs.

In VS Code, install the **Live Server** extension, right-click `index.html`, and choose **Open with Live Server**. The site should open at an address such as `http://127.0.0.1:5500/`.

Also make sure `js/supabase.js` contains your NEW Supabase Project URL and browser-safe Publishable/anon key.
