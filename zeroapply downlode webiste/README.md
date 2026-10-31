# ZeroApply download website

Run `npm run dev` and open http://127.0.0.1:5180. Run `npm run build` to verify the static files. Deploy `dist/` to any static host.

The hero rebuilds the upright ZeroApply mark as projected 3D annular solids and a hollow diagonal beam. Hairline owns pointer input, spring integration, reduced motion, and offscreen sleeping. Horizontal movement turns the solid geometry; vertical movement changes its pitch and ring spacing. Arrow keys demonstrate the poses.

No public installer was found. Set each available platform in `dist/releases.json` to its real HTTPS installer URL, or place the installer in `dist/downloads/` and use `./downloads/filename`. Unavailable platforms display an honest release message.

Optional Google Fonts fall back to local system fonts. All drawing and interaction code is local.

The `#agent` section is a looping illustrative application demo. Its single paused GSAP timeline selects each of three sample opportunities, types Vijay's profile, drags in a PDF, scrolls the form, clicks Apply, and moves on. The supplied transparent avatar is framed with CSS and a small animated eye layer; the pointer is a local SVG. It pauses outside the viewport, while the tab is hidden, or using its Pause button, and shows a still filled example for reduced motion. The GSAP browser bundle is vendored locally in `dist/vendor/`.

## Firebase Hosting

This website's Firebase setup lives entirely in this folder:

- `dist/firebase-config.js`: the supplied `zero-apply-app` web app configuration and optional Analytics initialization.
- `firebase.json`: deploys only this folder's `dist/` to the `zero-apply-app` Hosting site.
- `.firebaserc`: pins the project to `zero-apply-app`.
- `deploy-firebase.mjs`: validates the website and deploys Hosting with an explicit local config and project.

Run `npm run firebase:login` if Firebase CLI authentication is needed, then `npm run deploy`. The deployment script can also be invoked by absolute path from another directory. It always selects this folder and does not use the desktop application's Firebase configuration.

## Desktop roaming agents

`desktop-agents.js` and `desktop-agents.css` add three non-interactive mascots on desktop pointer devices at least 1024px wide. The **Agents on screen** toggle sits before **How it works** and remembers On/Off. Mobile never creates the mascot layer or requests the two new mascot assets. The activity catalogue has 30 shuffled routines, expressive eyes, gentle bumps/races, navigation perches, and occasional tips. The shared GSAP clock pauses in background tabs; reduced motion shows a still trio. `agent-routing.js` protects an expanded rectangle around the main wordmark; `node --test test/desktop-agents.test.mjs` verifies routing and activity coverage. The black and white mascots were recreated from the supplied references as transparent HD assets; the blue mascot uses the supplied existing artwork.
