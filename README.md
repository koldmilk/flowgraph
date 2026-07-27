# Flow Grapher

A node editor for illustrating **signal flow in broadcast environments**, modeled on Unreal Engine's
Blueprint editor. Built with SvelteKit, Svelte Flow, and Tailwind CSS.

## Features

- **Signal nodes** — *Source* (output only), *Destination* (input only), *Source + Destination*
  (both), and *Switch* (a variable set of named input/output pins), styled after Unreal Blueprints
  and Discord.
- **Icon nodes** — any of the 2,122 Material Design icons, in five styles, wired inline with one
  input and one output. Naming one is optional: unnamed, it stays a compact square.
- **Groups** — collapse a selection into a single node backed by its own nested graph, opened in its
  own workspace tab.
- **Annotations** — markdown text boxes, media (images, video and audio, dropped onto the canvas or
  picked from the node), free-floating arrows, and comment frames.
- **Animated signal splines** — dotted bezier wires that flow to show direction, each with its own
  color, direction and solid/dashed setting. An input pin takes one wire by default; individual
  nodes, or every node at once, can be set to accept several.
- **Reroute knots** — double-click a wire to drop a knot; wires cross its center and auto-orient
  (including flipping to route backwards). A wire is drawn as a single continuous spline no matter
  how many knots it bends through, and its look carries across all of them.
- **Attributes panel** — name, markdown description, color, type, pins and icon for the selected
  node, or color and flow for the selected wire. Long descriptions clamp on the canvas and show in
  full on hover.
- **Settings panel** — grid pattern and size, snap to grid, signal animation, minimap, and the
  global multiple-inputs rule.
- **Unreal-style navigation** — pan with middle/right drag, rubber-band select with left drag,
  multi-select with Shift/Ctrl.
- **Editing** — copy/cut/paste (`Ctrl+C/X/V`), delete (`Backspace`/`Delete`), align selected nodes
  on a shared axis with **Q**, and move overlapping nodes through the draw stack with **[** / **]**.
  Drag off a pin onto empty canvas to create and attach a node.

## Keyboard & mouse

| Action | Control |
| --- | --- |
| Pan | Middle- or right-drag |
| Box select | Left-drag |
| Multi-select | Shift or Ctrl + click |
| Create + attach node | Drag off a pin, release on empty canvas |
| Delete a wire | Alt + click the wire |
| Grab / reconnect a wire | Ctrl + click a pin, then drag |
| Add reroute knot | Double-click a wire |
| Add media | Drop image / video / audio files on the canvas |
| Add comment | Select nodes, press **C** |
| Collapse into a group | Ctrl + G |
| Align selected | **Q** |
| Bring forward / send backward | **]** / **[** |
| Bring to front / send to back | Shift + **]** / Shift + **[** |
| Copy / Cut / Paste | Ctrl + C / X / V |
| Delete selected | Backspace / Delete |

## Getting started

```sh
npm install
npm run dev      # start the dev server
```

Then open the printed local URL (e.g. http://localhost:5173).

```sh
npm run build    # production build
npm run preview  # preview the production build
npm run check    # type-check with svelte-check
npm run icons    # refresh the icon set (see below)
```

### The icon set

The icon node draws from `@material-design-icons/svg` — 2,122 icons in five styles, about 16 MB.
Bundling that is a bad trade either way: importing the artwork inlines megabytes of path data, and
importing it lazily emits ten thousand one-line chunks. So the set is served as plain static files
instead, and only the icons you actually place are ever fetched.

`scripts/sync-icons.mjs` copies it from `node_modules` into `static/material-icons/` and writes a
name manifest beside it, which is all the picker needs to list and search. That copy is **generated,
not committed** (it's in `.gitignore`), and `npm run dev` and `npm run build` regenerate it via their
`predev` / `prebuild` hooks — so a fresh clone needs nothing beyond `npm install`. It no-ops once the
manifest matches, so it costs nothing after the first run. `npm run icons` runs it by hand.

If the package is missing the script warns and carries on: the app still builds, the picker just
comes up empty.

## Tech stack

- [SvelteKit](https://svelte.dev/docs/kit) (Svelte 5, runes mode) + TypeScript
- [Svelte Flow](https://svelteflow.dev/) (`@xyflow/svelte`) for the node graph
- [Tailwind CSS v4](https://tailwindcss.com/)
- [Vite](https://vite.dev/)
- [Material Design Icons](https://github.com/marella/material-design-icons) for the icon nodes

## Known limitations

- **Nothing persists.** The graph lives in memory and a reload starts over. Media is stored as data
  URLs, so persistence will likely need IndexedDB for the files with the graph referencing them by
  key, rather than `localStorage`.
- **YouTube embeds are parked** behind `YOUTUBE_ENABLED` in `src/lib/flow/youtube.ts`.
