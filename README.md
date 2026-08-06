# WhiteHouseGames

The public-facing (but fully private/gated) marketing site and Unity game player — Next.js, Tailwind v4, Framer Motion. Talks to RMBackend over HTTP only.

## Setup

```bash
npm install
cp .env.example .env.local   # NEXT_PUBLIC_BACKEND_URL / NEXT_PUBLIC_SOCKET_URL, both default to http://localhost:4000
npm run dev                  # http://localhost:3000
```

RMBackend must already be running and seeded (see its README).

## Login

**The entire site sits behind login** — Home, About, Technologies, Contact included. Only `/login` itself is public. This was a deliberate, explicit decision (see ARCHITECTURE.md §7): it's a private preview, not a public marketing site with a gated portfolio section. Both `ADMIN` and `CLIENT` accounts can sign in here (unlike the CRM, which is ADMIN-only).

## How it's built

- **`src/proxy.ts`** — default-deny gate, same pattern as the CRM's.
- **`src/app/(site)/layout.tsx`** wraps every marketing/portfolio page in the shared Navbar + Footer and does the real session check. **`src/app/games/[slug]/page.tsx`** deliberately sits *outside* that route group — the game player gets its own minimal top bar instead of the full nav, so nothing distracts from the game itself.
- **Design system is single-theme by intent** — dark, black-and-gold, no light mode. That's the studio's visual identity, not an unfinished light theme (see the comment at the top of `globals.css`).
- **Unity WebGL loading** (`src/components/game/`):
  - `unityBuildPath` can be either a path on RMBackend's own `game-builds/` static host (the original convention) **or a full URL to any static host** — GitHub Pages, a CDN, wherever. `GamePlayer`'s `resolveBuildUrl()` is the one place that tells them apart (anything starting `http://`/`https://` is used as-is). This means you never have to copy build files onto the server manually if you'd rather just push to a GitHub Pages branch and paste the URL into the CRM.
    - If the build is compressed, **Unity's "Decompression Fallback" (Player Settings → Publishing Settings) must be on** for it to load from a plain static host like GitHub Pages — those hosts don't send the `Content-Encoding` header Unity's loader otherwise expects.
    - The build files themselves become publicly reachable at whatever URL you host them at, even though the site around them stays login-gated — fine here specifically because all the real game logic (RNG, paytable, balance) lives server-side in RMBackend's game modules, never in the Unity build.
  - `UnityPlayer` expects every build to export as `Build/game.loader.js/.data/.framework.js/.wasm` (see RMBackend's README for the export convention) and fails gracefully — a friendly "build not deployed yet" message, not a hang — if those files 404.
  - **The bridge contract is real, not a placeholder** — it matches what the ZombieLand Unity project's `Assets/Plugins/WebGL/CustomJsLib.jslib` actually calls: Unity invokes `window.dispatchReactUnityEvent(message)` directly (same-window embed, no iframe). `UnityPlayer` implements that function and handles four messages: `"authToken"` (replies via `unityInstance.SendMessage("SocketManager", "ReceiveAuthToken", json)` with `{cookie, socketURL, nameSpace: "game", gameSlug}` — the GameObject name `"SocketManager"` is fixed on the Unity side, confirmed from the scene file), `"OnEnter"` (the real ready signal — hides the splash screen; this is *not* the same moment the WebGL engine finishes loading, since the game still has to load its data over the socket after that), `"OnExit"` (navigates back to `/portfolio`), and `"error"`/`"session_expired"`.
  - A game that doesn't implement this bridge at all still works — `UnityPlayer` falls back to hiding the splash ~3s after the engine loads if `"OnEnter"` never arrives.

## Verified

Build is clean, and the full flow (login → every nav page → a game detail page hitting its expected "build not found" state) was driven end-to-end with a headless browser with zero console/page errors.

## Deploying (Vercel)

Zero config, same as the CRM. Import this repo as its own Vercel project and set two environment variables:

- `NEXT_PUBLIC_BACKEND_URL` → RMBackend's deployed URL (e.g. `https://whitehouse-rmbackend.onrender.com`)
- `NEXT_PUBLIC_SOCKET_URL` → same value — the browser opens the Unity build's Socket.IO connection directly to this, so it needs to be the real public URL, not `localhost`

Then add this project's `https://*.vercel.app` URL to RMBackend's `CORS_ORIGINS` env var — this one actually matters here, since the Socket.IO handshake is a real cross-origin browser request unlike everything else in this app (which goes server-to-server and isn't subject to CORS at all).
