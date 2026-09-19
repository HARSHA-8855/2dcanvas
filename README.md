# 2D Canvas Editor

A lightweight, web-based canvas editor — create shapes, text, and freehand drawings, save them to the cloud, and come back to keep editing. Built as a focused tool rather than a full design suite: no accounts, no clutter, just open a link and start drawing.

**Live demo:** [canvas2d-5a2dd.web.app](https://canvas2d-5a2dd.web.app)
**Video walkthrough:** [ link here_](https://www.loom.com/share/71dfaa9e66d2410cb4f8133b00e6fa37)
**Repo:** [github.com/HARSHA-8855/2dcanvas](https://github.com/HARSHA-8855/2dcanvas)

## Tech stack

- **React** (Vite) — UI
- **Fabric.js** — canvas rendering and object manipulation
- **Firebase Firestore** — persistence, no auth

## Features

**Home**
- Create a new canvas with one click
- Up to 3 most-recent canvases shown as cards (tracked per-browser), each with an editable name
- Hover a card to reveal a share icon that copies its link
- "+" card to start another canvas

**Editor**
- Shapes: rectangle, circle, triangle, line, and a custom polygon tool (click to place points, right-click or `Esc` to close the shape)
- Freehand pen tool with adjustable color
- Text tool with bold, italic, and font size controls
- Contextual properties panel — appears only when something is selected, shows the controls relevant to that object type
- Rulers along the top and left edges with a live cursor coordinate readout
- Rename the canvas directly from the editor header
- Start a new canvas from inside the editor (auto-saves the current one first) without going back to Home
- Share button to copy the current canvas's link
- Auto-save (debounced) plus a manual Save button, with a live Saved / Saving / Unsaved status indicator

**Persistence**
- Each canvas is one Firestore document, keyed by its id
- Opening `/canvas/:canvasId` loads that document's saved state, if any
- No login — anyone with a canvas's link can open and edit it (see `DECISIONS.md` for why)

## Running locally

```bash
npm install
```

Create a `.env` file (see `.env.example`) with your own Firebase project's config:

```
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
```

Enable Firestore in your Firebase project (test mode is fine — no auth is used).

```bash
npm run dev
```

## More on the thinking behind this

- [`docs/DECISIONS.md`](./docs/DECISIONS.md) — the trade-offs, scope calls, and reasoning behind how this was built.
- [`docs/CODEBASE_GUIDE.md`](./docs/CODEBASE_GUIDE.md) — a component-by-component tour of the code.

---

Made with ♡ by Harsha
