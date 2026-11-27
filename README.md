<p align="center">
  <img src="assets/logo.svg" alt="St. Monica LK3C Bible Study logo" width="96" height="96">
</p>

<h1 align="center">St. Monica LK3C — Bible Study</h1>

<p align="center">
  Faith. Reflection. Conversation.<br>
  A web space for the St. Monica Catholic community at Lower Kabete Campus, University of Nairobi.
</p>

---

## About

St. Monica LK3C Bible Study is a lightweight website where members can read the
weekly Bible study story, reflect on discussion questions, pray together and
chat with the community.

## Features

- **Member accounts:** sign up with a phone number and password, and choose a
  Bible study group.
- **Weekly story:** a real-life story paired with Scripture for reflection.
- **Reflection questions:** prompts for group discussion.
- **Catholic prayers:** Our Father, Hail Mary and Glory Be.
- **Public chat:** a real-time community conversation with replies and reactions.
- **Bible study groups:** live member counts for each group.
- **Admin editor:** admins can update the weekly story, verses and questions.
- **Guided weekly flow:** Read → Reflect → Discuss, with a reading-progress bar.
- **Responsive design:** transparent header on desktop and an app-style tab bar on phones.
- **Stays on your page after refresh:** a short splash shows while your session loads.

## Tech stack

| Layer | Tools |
| --- | --- |
| Frontend | HTML, CSS, vanilla JavaScript (ES modules) |
| Icons | [Lucide](https://lucide.dev) (loaded from CDN) |
| Fonts | DM Sans and Playfair Display (Google Fonts) |
| Backend | [Firebase](https://firebase.google.com) Authentication and Cloud Firestore |

No build step and no `npm install`: it's a static site.

## Project structure

```
Bible-study/
├── index.html     # Page markup (all sections)
├── style.css      # Base styles
├── modern.css     # Modern UI layer: header, nav, cards, buttons
├── auth.css       # Sign-in / registration screens
├── pages.css      # Page redesign: header, home, story, chat, footer
├── modern.js      # Icons, sign-in helpers, reading progress
├── script.js      # Firebase, auth, navigation, chat, admin logic
└── assets/
    └── logo.svg   # Logo and favicon
```

## Running locally

The site uses ES modules, so serve it over HTTP instead of opening the file directly:

```bash
git clone https://github.com/kenya-tech/Bible-study.git
cd Bible-study

# any static server works, for example:
python3 -m http.server 8080
# or
npx serve .
```

Then open <http://localhost:8080>.

> **Note:** Sign-in and chat use the project's live Firebase backend, so any
> account you create locally is a real account.

## Contributing

1. Create a branch: `git checkout -b feature/your-change`
2. Make your changes and check them on both mobile and desktop.
3. Commit with a clear message and open a pull request against `main`.

Please keep the site dependency-free (no build tools) and keep the
`id` attributes that `script.js` relies on (e.g. `membership-form`,
`member-group`, `chat-messages`) when changing the markup.

---

<p align="center"><em>Read. Reflect. Pray. Connect.</em></p>
