# Flow Grapher

A node editor for illustrating **signal flow in broadcast environments**, modeled on Unreal Engine's
Blueprint editor. Built with SvelteKit, Svelte Flow, and Tailwind CSS.

## Features

- **Three node types** — *Source* (output only), *Destination* (input only), and *Source +
  Destination* (both), styled after Unreal Blueprints and Discord.
- **Animated signal splines** — dotted bezier wires that flow left-to-right to show direction.
  Destinations accept a single input; sources fan out to many destinations.
- **Unreal-style navigation** — pan with middle/right drag, rubber-band select with left drag,
  multi-select with Shift/Ctrl.
- **Reroute knots** — double-click a wire to drop a knot; wires cross its center and auto-orient
  (including flipping to route backwards). Delete a knot to splice the wire straight through.
- **Comment boxes** — select nodes and press **C** (or right-click → *Comment around nodes*) to wrap
  them in a resizable, colored frame. Drag the title bar to move the whole group, double-click it to
  rename, and pick from an 8-color palette.
- **Editing** — copy/cut/paste (`Ctrl+C/X/V`), delete (`Backspace`/`Delete`), and align selected
  nodes on a shared axis with **Q**. Drag off a pin onto empty canvas to create and attach a node.

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
| Add comment | Select nodes, press **C** |
| Align selected | **Q** |
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
```

## Tech stack

- [SvelteKit](https://svelte.dev/docs/kit) (Svelte 5, runes mode) + TypeScript
- [Svelte Flow](https://svelteflow.dev/) (`@xyflow/svelte`) for the node graph
- [Tailwind CSS v4](https://tailwindcss.com/)
- [Vite](https://vite.dev/)
