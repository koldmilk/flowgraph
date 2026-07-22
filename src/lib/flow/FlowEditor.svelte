<script lang="ts">
	import {
		SvelteFlow,
		Background,
		BackgroundVariant,
		Controls,
		useSvelteFlow,
		useStore,
		getBezierPath,
		Position,
		type Node,
		type Edge
	} from '@xyflow/svelte';
	import type { Connection, FinalConnectionState } from '@xyflow/system';
	import '@xyflow/svelte/dist/base.css';
	import SourceNode from './nodes/SourceNode.svelte';
	import DestinationNode from './nodes/DestinationNode.svelte';
	import SourceDestinationNode from './nodes/SourceDestinationNode.svelte';
	import RerouteNode from './nodes/RerouteNode.svelte';
	import CommentNode from './nodes/CommentNode.svelte';
	import SignalEdge from './SignalEdge.svelte';
	import ConnectionMenu from './ConnectionMenu.svelte';
	import NodeContextMenu from './NodeContextMenu.svelte';
	import PaneContextMenu from './PaneContextMenu.svelte';
	import StoreBridge from './StoreBridge.svelte';
	import { nodeCatalog, type SignalNodeType } from './nodeCatalog';
	import { DEFAULT_COMMENT_COLOR } from './commentColors';

	const nodeTypes = {
		source: SourceNode,
		destination: DestinationNode,
		sourceDestination: SourceDestinationNode,
		reroute: RerouteNode,
		comment: CommentNode
	};

	// Override the built-in bezier so every edge uses our higher-curvature Unreal-style spline.
	const edgeTypes = {
		default: SignalEdge
	};

	let nodes = $state<Node[]>([
		{
			id: 'camera-1',
			type: 'source',
			position: { x: 0, y: 120 },
			data: { label: 'Camera 1', subtitle: 'SDI Out' }
		},
		{
			id: 'router-1',
			type: 'sourceDestination',
			position: { x: 340, y: 120 },
			data: { label: 'Router 1', subtitle: 'Matrix Switch' }
		},
		{
			id: 'monitor-1',
			type: 'destination',
			position: { x: 680, y: 120 },
			data: { label: 'Program Monitor', subtitle: 'SDI In' }
		}
	]);

	let edges = $state<Edge[]>([
		{ id: 'camera-1->router-1', source: 'camera-1', target: 'router-1', animated: true },
		{ id: 'router-1->monitor-1', source: 'router-1', target: 'monitor-1', animated: true }
	]);

	const { screenToFlowPosition, deleteElements } = useSvelteFlow();
	// The live store arrives via <StoreBridge> (a child of <SvelteFlow>); see that component for why.
	let store = $state<ReturnType<typeof useStore> | null>(null);

	type NodeMenuState = { screenX: number; screenY: number; nodeIds: string[] };
	let nodeMenu = $state<NodeMenuState | null>(null);

	// Right-clicking a node opens a menu to delete it. If the clicked node is part of a
	// multi-selection, the whole selection is targeted; otherwise just the clicked node.
	function handleNodeContextMenu({ node, event }: { node: Node; event: MouseEvent }) {
		event.preventDefault();
		const selectedIds = nodes.filter((n) => n.selected).map((n) => n.id);
		const nodeIds = node.selected && selectedIds.length > 1 ? selectedIds : [node.id];
		nodeMenu = { screenX: event.clientX, screenY: event.clientY, nodeIds };
	}

	function deleteNodes(ids: string[]) {
		// deleteElements also removes any edges connected to the removed nodes.
		deleteElements({ nodes: ids.map((id) => ({ id })) });
	}

	// --- Pane (empty space) context menu -------------------------------------------------------
	type PaneMenuState = { screenX: number; screenY: number; flowX: number; flowY: number };
	let paneMenu = $state<PaneMenuState | null>(null);
	// Where the right mouse button went down (recorded in handlePointerDownCapture), so we can tell
	// a right-click from a drag-to-pan.
	let rightDownAt: { x: number; y: number } | null = null;

	// Right-drag pans the canvas (button 2 in panOnDrag), which makes Svelte Flow swallow its own
	// pane-contextmenu event -- so we catch the native contextmenu here instead. We only open the
	// menu for a genuine right-click on empty space: not on a node (that has its own menu), not on
	// our menus, and not at the end of a pan drag (pointer moved since right-mousedown).
	function handleWrapperContextMenu(event: MouseEvent) {
		const target = event.target as HTMLElement;
		if (
			target.closest('.svelte-flow__node') ||
			target.closest('[data-context-menu]') ||
			target.closest('.svelte-flow__panel, .svelte-flow__controls')
		) {
			return;
		}
		if (rightDownAt) {
			const moved = Math.hypot(event.clientX - rightDownAt.x, event.clientY - rightDownAt.y);
			rightDownAt = null;
			if (moved > 4) return; // it was a pan, not a click
		}
		event.preventDefault();
		nodeMenu = null;
		connectionMenu = null;
		const flow = screenToFlowPosition({ x: event.clientX, y: event.clientY });
		paneMenu = { screenX: event.clientX, screenY: event.clientY, flowX: flow.x, flowY: flow.y };
	}

	function addNodeAt(type: SignalNodeType, flowX: number, flowY: number) {
		nodes = [
			...nodes,
			{
				id: crypto.randomUUID(),
				type,
				position: { x: flowX - 95, y: flowY - 39 },
				data: { label: `New ${nodeCatalog[type].label}` }
			}
		];
	}

	// --- Copy / Cut / Paste -------------------------------------------------------------------
	let clipboard = $state<{ nodes: Node[]; edges: Edge[] } | null>(null);
	// Last known cursor position (screen coords), so keyboard paste lands under the pointer.
	let lastPointer = { x: 0, y: 0 };

	// Copy the given nodes plus any splines that run purely between them (internal wiring is kept,
	// connections to nodes outside the copied set are dropped).
	function copyIds(ids: string[]): boolean {
		if (ids.length === 0) return false;
		const idSet = new Set(ids);
		clipboard = {
			nodes: nodes.filter((n) => idSet.has(n.id)).map((n) => $state.snapshot(n) as unknown as Node),
			edges: edges
				.filter((e) => idSet.has(e.source) && idSet.has(e.target))
				.map((e) => $state.snapshot(e) as unknown as Edge)
		};
		return true;
	}

	const selectedIds = () => nodes.filter((n) => n.selected).map((n) => n.id);

	function cutIds(ids: string[]) {
		if (copyIds(ids)) deleteNodes(ids);
	}

	function pasteClipboard(atScreen?: { x: number; y: number }) {
		if (!clipboard || clipboard.nodes.length === 0) return;

		// Anchor on the copied cluster's top-left so the group keeps its shape when re-placed.
		const anchorX = Math.min(...clipboard.nodes.map((n) => n.position.x));
		const anchorY = Math.min(...clipboard.nodes.map((n) => n.position.y));
		let delta = { x: 40, y: 40 };
		if (atScreen) {
			const target = screenToFlowPosition(atScreen);
			delta = { x: target.x - anchorX, y: target.y - anchorY };
		}

		const idMap = new Map<string, string>();
		const pastedNodes: Node[] = clipboard.nodes.map((n) => {
			const newId = crypto.randomUUID();
			idMap.set(n.id, newId);
			return {
				...n,
				id: newId,
				position: { x: n.position.x + delta.x, y: n.position.y + delta.y },
				data: { ...n.data },
				selected: true
			};
		});
		const pastedEdges: Edge[] = clipboard.edges.map((e) => ({
			...e,
			id: crypto.randomUUID(),
			source: idMap.get(e.source)!,
			target: idMap.get(e.target)!,
			selected: false
		}));

		// Deselect what was there so only the freshly pasted nodes are selected.
		nodes = [
			...nodes.map((n) => (n.selected ? { ...n, selected: false } : n)),
			...pastedNodes
		];
		edges = [...edges, ...pastedEdges];
	}

	type ConnectionMenuState = {
		screenX: number;
		screenY: number;
		flowX: number;
		flowY: number;
		fromNodeId: string;
		fromHandleId: string | null;
		fromHandleType: 'source' | 'target';
	};

	let connectionMenu = $state<ConnectionMenuState | null>(null);

	// An input (target) handle may only carry one incoming spline; a new connection replaces it.
	// Output (source) handles are unrestricted and can fan out to many destinations.
	function disconnectExistingInput(targetNodeId: string, targetHandleId: string | null) {
		edges = edges.filter(
			(edge) => !(edge.target === targetNodeId && (edge.targetHandle ?? null) === targetHandleId)
		);
	}

	function handleBeforeConnect(connection: Connection): Edge {
		disconnectExistingInput(connection.target, connection.targetHandle ?? null);
		return { id: crypto.randomUUID(), animated: true, ...connection };
	}

	const menuOptions = $derived.by((): SignalNodeType[] =>
		!connectionMenu
			? []
			: connectionMenu.fromHandleType === 'source'
				? ['destination', 'sourceDestination']
				: ['source', 'sourceDestination']
	);

	function handleConnectEnd(event: MouseEvent | TouchEvent, connectionState: FinalConnectionState) {
		if (connectionState.isValid) return;
		if (!connectionState.fromNode || !connectionState.fromHandle) return;

		const point = 'changedTouches' in event ? event.changedTouches[0] : event;
		const flowPosition = screenToFlowPosition({ x: point.clientX, y: point.clientY });

		connectionMenu = {
			screenX: point.clientX,
			screenY: point.clientY,
			flowX: flowPosition.x,
			flowY: flowPosition.y,
			fromNodeId: connectionState.fromNode.id,
			fromHandleId: connectionState.fromHandle.id ?? null,
			fromHandleType: connectionState.fromHandle.type
		};
	}

	function addNodeFromMenu(type: SignalNodeType) {
		if (!connectionMenu) return;
		const { flowX, flowY, fromNodeId, fromHandleId, fromHandleType } = connectionMenu;

		const id = crypto.randomUUID();
		nodes = [
			...nodes,
			{
				id,
				type,
				position: { x: flowX - 95, y: flowY - 39 },
				data: { label: `New ${nodeCatalog[type].label}` }
			}
		];

		const edge: Edge =
			fromHandleType === 'source'
				? {
						id: crypto.randomUUID(),
						source: fromNodeId,
						sourceHandle: fromHandleId,
						target: id,
						animated: true
					}
				: {
						id: crypto.randomUUID(),
						source: id,
						target: fromNodeId,
						targetHandle: fromHandleId,
						animated: true
					};

		if (fromHandleType === 'target') {
			disconnectExistingInput(fromNodeId, fromHandleId);
		}
		edges = [...edges, edge];

		connectionMenu = null;
	}

	// Q aligns every selected node onto a shared horizontal axis, so their pins line up.
	function alignSelectedHorizontally() {
		const selected = nodes.filter((node) => node.selected);
		if (selected.length < 2) return;

		// Align by each node's vertical CENTER -- that's where the input/output pins sit. Nodes have
		// different heights, so aligning the top-left position.y (as before) left the pins off-axis.
		const halfH = (n: Node) => (n.measured?.height ?? 0) / 2;
		const targetCenterY =
			selected.reduce((sum, node) => sum + node.position.y + halfH(node), 0) / selected.length;
		nodes = nodes.map((node) =>
			node.selected
				? { ...node, position: { ...node.position, y: targetCenterY - halfH(node) } }
				: node
		);
	}

	// --- Comment boxes (Unreal-style) ---------------------------------------------------------
	// A comment is a resizable colored frame. It doesn't reparent nodes; instead, grabbing its title
	// bar moves whatever nodes sit inside it at that moment (see the drag handlers below).
	const COMMENT_PAD = 36; // space between the wrapped nodes and the frame
	const COMMENT_TITLE = 40; // extra headroom for the title bar

	// Bounding rect of a node in flow coords, using measured size (or an explicit width/height).
	function nodeRect(n: Node) {
		const w = n.width ?? n.measured?.width ?? 190;
		const h = n.height ?? n.measured?.height ?? 76;
		return { x: n.position.x, y: n.position.y, w, h };
	}

	// Create a comment. With member nodes it wraps their bounding box; otherwise an empty box lands
	// at the given flow point (falling back to the last pointer position).
	function createComment(memberIds?: string[], atFlow?: { x: number; y: number }) {
		const members = memberIds
			? nodes.filter((n) => memberIds.includes(n.id) && n.type !== 'comment')
			: nodes.filter((n) => n.selected && n.type !== 'comment');

		let x: number, y: number, w: number, h: number;
		if (members.length) {
			const rects = members.map(nodeRect);
			const minX = Math.min(...rects.map((r) => r.x));
			const minY = Math.min(...rects.map((r) => r.y));
			const maxX = Math.max(...rects.map((r) => r.x + r.w));
			const maxY = Math.max(...rects.map((r) => r.y + r.h));
			x = minX - COMMENT_PAD;
			y = minY - COMMENT_PAD - COMMENT_TITLE;
			w = maxX - minX + COMMENT_PAD * 2;
			h = maxY - minY + COMMENT_PAD * 2 + COMMENT_TITLE;
		} else {
			const f = atFlow ?? screenToFlowPosition(lastPointer);
			x = f.x;
			y = f.y;
			w = 320;
			h = 200;
		}

		const id = crypto.randomUUID();
		const comment: Node = {
			id,
			type: 'comment',
			position: { x, y },
			width: w,
			height: h,
			data: { label: 'Comment', color: DEFAULT_COMMENT_COLOR },
			dragHandle: '.comment-drag-handle',
			zIndex: -1,
			selected: true
		};
		// Render first (draw order) and select only the comment, so its resize handles show at once.
		nodes = [comment, ...nodes.map((n) => (n.selected ? { ...n, selected: false } : n))];
		// A drag-select leaves the multi-selection box active ('nodes' mode); clear it so the stale,
		// pointer-grabbing box doesn't hover over the new comment and block its title bar.
		if (store) store.selectionRectMode = null;
	}

	// While a comment's title bar is dragged, move every node that was inside it at drag start.
	// Selected nodes are excluded here because Svelte Flow already moves the whole selection together.
	type CommentDrag = {
		commentId: string;
		startX: number;
		startY: number;
		members: { id: string; startX: number; startY: number }[];
	};
	let commentDrag: CommentDrag | null = null;

	function handleNodeDragStart({ targetNode }: { targetNode: Node | null }) {
		if (!targetNode || targetNode.type !== 'comment') return;
		const r = nodeRect(targetNode);
		const members = nodes
			.filter((n) => {
				if (n.id === targetNode.id || n.type === 'comment' || n.selected) return false;
				const nr = nodeRect(n);
				const cx = nr.x + nr.w / 2;
				const cy = nr.y + nr.h / 2;
				return cx >= r.x && cx <= r.x + r.w && cy >= r.y && cy <= r.y + r.h;
			})
			.map((n) => ({ id: n.id, startX: n.position.x, startY: n.position.y }));
		commentDrag = {
			commentId: targetNode.id,
			startX: targetNode.position.x,
			startY: targetNode.position.y,
			members
		};
	}

	function handleNodeDrag({ targetNode }: { targetNode: Node | null }) {
		if (!commentDrag || !targetNode || targetNode.id !== commentDrag.commentId) return;
		const dx = targetNode.position.x - commentDrag.startX;
		const dy = targetNode.position.y - commentDrag.startY;
		const moved = new Map(commentDrag.members.map((m) => [m.id, m]));
		nodes = nodes.map((n) => {
			const m = moved.get(n.id);
			return m ? { ...n, position: { x: m.startX + dx, y: m.startY + dy } } : n;
		});
	}

	function handleNodeDragStop() {
		commentDrag = null;
	}

	function isEditableTarget(target: EventTarget | null) {
		const el = target as HTMLElement | null;
		return (
			!!el &&
			(el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable === true)
		);
	}

	function handleKeydown(event: KeyboardEvent) {
		if (connectionMenu) return;
		// Don't hijack shortcuts while typing in a field (e.g. editing a comment label).
		if (isEditableTarget(event.target)) return;

		const mod = event.ctrlKey || event.metaKey;
		const key = event.key.toLowerCase();

		if (mod && key === 'c') {
			if (copyIds(selectedIds())) event.preventDefault();
			return;
		}
		if (mod && key === 'x') {
			if (selectedIds().length) {
				event.preventDefault();
				cutIds(selectedIds());
			}
			return;
		}
		if (mod && key === 'v') {
			event.preventDefault();
			pasteClipboard(lastPointer);
			return;
		}

		if (key === 'q' && !event.ctrlKey && !event.metaKey && !event.altKey) {
			alignSelectedHorizontally();
			return;
		}

		// C (no modifiers) wraps the current selection in a comment, or drops an empty one at the cursor.
		if (key === 'c' && !event.ctrlKey && !event.metaKey && !event.altKey) {
			createComment();
		}
	}

	// Alt+click a spline to delete it outright.
	function handleEdgeClick({ edge, event }: { edge: Edge; event: MouseEvent }) {
		if (event.altKey) {
			// Alt+click deletes the spline outright.
			edges = edges.filter((e) => e.id !== edge.id);
			return;
		}
		if (event.detail === 2) {
			// Double-click drops a reroute knot on the spline, splitting it in two (Unreal-style).
			addRerouteOnEdge(edge, event);
		}
	}

	function addRerouteOnEdge(edge: Edge, event: MouseEvent) {
		const pos = screenToFlowPosition({ x: event.clientX, y: event.clientY });
		const rerouteId = crypto.randomUUID();
		const animated = edge.animated ?? true;

		nodes = [
			...nodes,
			{ id: rerouteId, type: 'reroute', position: { x: pos.x - 8, y: pos.y - 8 }, data: {} }
		];
		edges = [
			...edges.filter((e) => e.id !== edge.id),
			{
				id: crypto.randomUUID(),
				source: edge.source,
				sourceHandle: edge.sourceHandle ?? null,
				target: rerouteId,
				animated
			},
			{
				id: crypto.randomUUID(),
				source: rerouteId,
				target: edge.target,
				targetHandle: edge.targetHandle ?? null,
				animated
			}
		];
	}

	// When a reroute knot is deleted, splice the spline back together so signal still flows from
	// the upstream source to the downstream target (walking through any chained reroutes).
	async function handleBeforeDelete({ nodes: delNodes }: { nodes: Node[]; edges: Edge[] }) {
		const deletedIds = new Set(delNodes.map((n) => n.id));
		const deletedReroutes = delNodes.filter((n) => n.type === 'reroute');
		if (deletedReroutes.length === 0) return true;

		const bypass: Edge[] = [];
		const seen = new Set<string>();
		for (const r of deletedReroutes) {
			// Walk upstream/downstream past any reroutes also being deleted to reach real endpoints.
			let up = edges.find((e) => e.target === r.id);
			const guardUp = new Set<string>();
			while (up && deletedIds.has(up.source) && !guardUp.has(up.source)) {
				guardUp.add(up.source);
				up = edges.find((e) => e.target === up!.source);
			}
			let down = edges.find((e) => e.source === r.id);
			const guardDown = new Set<string>();
			while (down && deletedIds.has(down.target) && !guardDown.has(down.target)) {
				guardDown.add(down.target);
				down = edges.find((e) => e.source === down!.target);
			}
			if (up && down && !deletedIds.has(up.source) && !deletedIds.has(down.target)) {
				const key = `${up.source}:${up.sourceHandle ?? ''}->${down.target}:${down.targetHandle ?? ''}`;
				if (!seen.has(key)) {
					seen.add(key);
					bypass.push({
						id: crypto.randomUUID(),
						source: up.source,
						sourceHandle: up.sourceHandle ?? null,
						target: down.target,
						targetHandle: down.targetHandle ?? null,
						animated: true
					});
				}
			}
		}

		if (bypass.length) {
			for (const b of bypass) disconnectExistingInput(b.target, b.targetHandle ?? null);
			edges = [...edges, ...bypass];
		}
		return true;
	}

	// Auto-orient each reroute knot's pins toward the PINS they connect to (not node centers), so the
	// spline flows smoothly even when it doubles back. A source's output pin sits on its right edge
	// and a target's input pin on its left edge, so a node whose body is to the right can still have
	// its input pin to the left -- the wire then correctly exits the knot leftward (Unreal-style).
	// Recomputed live as any connected node (or the knot) moves.
	const nodeW = (n: Node) => n.measured?.width ?? (n.type === 'reroute' ? 16 : 190);
	const knotCenterX = (n: Node) => n.position.x + nodeW(n) / 2;
	// Upstream node's OUTPUT pin x (right edge; a reroute's pin is its center).
	const outputPinX = (n: Node) => (n.type === 'reroute' ? knotCenterX(n) : n.position.x + nodeW(n));
	// Downstream node's INPUT pin x (left edge; a reroute's pin is its center).
	const inputPinX = (n: Node) => (n.type === 'reroute' ? knotCenterX(n) : n.position.x);
	// A pin only flips once the connected pin is this far past the knot. Flipping right at the
	// boundary produced cramped little S-curves; holding the direction until there's real overlap
	// lets the wire sweep out into the large Unreal-style loop (and avoids flicker at the edge).
	const FLIP_MARGIN = 90;

	$effect(() => {
		const byId = new Map(nodes.map((n) => [n.id, n]));
		let changed = false;
		const next = nodes.map((n) => {
			if (n.type !== 'reroute') return n;
			const rx = knotCenterX(n);

			const inEdge = edges.find((e) => e.target === n.id);
			const up = inEdge ? byId.get(inEdge.source) : undefined;
			const outEdge = edges.find((e) => e.source === n.id);
			const down = outEdge ? byId.get(outEdge.target) : undefined;

			// The knot flips as a WHOLE: wire always enters one side and exits the opposite side
			// (never in and out the same side -- that's what caused the weird S when routing
			// backwards). Net flow direction through the knot decides the orientation, and the
			// margin acts as hysteresis: within the dead-zone the knot keeps its current facing.
			let flow: number | null = null;
			if (up && down) flow = inputPinX(down) - outputPinX(up);
			else if (up) flow = rx - outputPinX(up);
			else if (down) flow = inputPinX(down) - rx;

			const prev = n.data as { inputPos?: Position; outputPos?: Position };
			let backward = prev?.inputPos === Position.Right;
			if (flow === null) backward = false;
			else if (flow > FLIP_MARGIN) backward = false;
			else if (flow < -FLIP_MARGIN) backward = true;

			const inputPos = backward ? Position.Right : Position.Left;
			const outputPos = backward ? Position.Left : Position.Right;

			const data = n.data as { inputPos?: Position; outputPos?: Position };
			if (data?.inputPos !== inputPos || data?.outputPos !== outputPos) {
				changed = true;
				return { ...n, data: { ...n.data, inputPos, outputPos } };
			}
			return n;
		});
		if (changed) nodes = next;
	});

	// Ctrl+click-drag on a node's pin grabs whichever spline is already attached there and lets
	// you drag its loose end to a different node. Ctrl only matters for the initial grab -- once
	// the drag starts it's driven purely by mouse position, so releasing Ctrl mid-drag is fine.
	type ReconnectDrag = {
		fixedNodeId: string;
		fixedHandleId: string | null;
		fixedType: 'source' | 'target';
		fixedX: number;
		fixedY: number;
		pointerX: number;
		pointerY: number;
	};

	let reconnectDrag = $state<ReconnectDrag | null>(null);

	// Draw the in-flight reconnect wire as the same S-curve bezier the real edges use. Output pins
	// sit on the right (Position.Right), input pins on the left (Position.Left); the fixed end keeps
	// its side and the loose end takes the opposite. Computed in screen space since the overlay is fixed.
	const reconnectPath = $derived.by(() => {
		if (!reconnectDrag) return null;
		const { fixedType, fixedX, fixedY, pointerX, pointerY } = reconnectDrag;
		const [source, target] =
			fixedType === 'source'
				? [
						{ x: fixedX, y: fixedY, position: Position.Right },
						{ x: pointerX, y: pointerY, position: Position.Left }
					]
				: [
						{ x: pointerX, y: pointerY, position: Position.Right },
						{ x: fixedX, y: fixedY, position: Position.Left }
					];
		const [path] = getBezierPath({
			sourceX: source.x,
			sourceY: source.y,
			sourcePosition: source.position,
			targetX: target.x,
			targetY: target.y,
			targetPosition: target.position
		});
		return path;
	});

	function findHandleElement(nodeId: string, type: 'source' | 'target') {
		return document.querySelector<HTMLElement>(
			`.svelte-flow__handle[data-nodeid="${nodeId}"].${type}`
		);
	}

	function handlePointerDownCapture(event: MouseEvent) {
		// Record the right-button start point here in the capture phase, before Svelte Flow's pan
		// handler can stopPropagation -- otherwise a window-level listener would never see it.
		if (event.button === 2) {
			rightDownAt = { x: event.clientX, y: event.clientY };
			return;
		}
		if (event.button !== 0 || !event.ctrlKey) return;

		const handleEl = (event.target as HTMLElement).closest<HTMLElement>('.svelte-flow__handle');
		if (!handleEl?.dataset.nodeid) return;

		const nodeId = handleEl.dataset.nodeid;
		const grabbedIsTarget = handleEl.classList.contains('target');

		// A target handle carries at most one spline. A source handle can fan out to many, so grab
		// the most recently created one -- there's no way to tell which wire the user meant to pick.
		const connectedEdge = grabbedIsTarget
			? edges.find((e) => e.target === nodeId)
			: [...edges].reverse().find((e) => e.source === nodeId);
		if (!connectedEdge) return;

		event.preventDefault();
		event.stopPropagation();

		edges = edges.filter((e) => e.id !== connectedEdge.id);

		const fixedNodeId = grabbedIsTarget ? connectedEdge.source : connectedEdge.target;
		const fixedType: 'source' | 'target' = grabbedIsTarget ? 'source' : 'target';
		const fixedHandleId =
			(grabbedIsTarget ? connectedEdge.sourceHandle : connectedEdge.targetHandle) ?? null;

		const fixedEl = findHandleElement(fixedNodeId, fixedType);
		if (!fixedEl) return;

		const rect = fixedEl.getBoundingClientRect();
		reconnectDrag = {
			fixedNodeId,
			fixedHandleId,
			fixedType,
			fixedX: rect.left + rect.width / 2,
			fixedY: rect.top + rect.height / 2,
			pointerX: event.clientX,
			pointerY: event.clientY
		};
	}

	function handleMouseMove(event: MouseEvent) {
		lastPointer = { x: event.clientX, y: event.clientY };
		if (!reconnectDrag) return;
		reconnectDrag = { ...reconnectDrag, pointerX: event.clientX, pointerY: event.clientY };
	}

	function handleReconnectDragEnd(event: MouseEvent) {
		if (!reconnectDrag) return;
		const { fixedNodeId, fixedHandleId, fixedType } = reconnectDrag;
		reconnectDrag = null;

		const dropEl = document
			.elementFromPoint(event.clientX, event.clientY)
			?.closest<HTMLElement>('.svelte-flow__handle');
		if (!dropEl?.dataset.nodeid) return;

		const dropNodeId = dropEl.dataset.nodeid;
		const dropIsTarget = dropEl.classList.contains('target');
		const fixedIsTarget = fixedType === 'target';

		if (dropNodeId === fixedNodeId || dropIsTarget === fixedIsTarget) return;

		const dropHandleId = dropEl.dataset.handleid ?? null;
		const sourceNodeId = fixedIsTarget ? dropNodeId : fixedNodeId;
		const sourceHandleId = fixedIsTarget ? dropHandleId : fixedHandleId;
		const targetNodeId = fixedIsTarget ? fixedNodeId : dropNodeId;
		const targetHandleId = fixedIsTarget ? fixedHandleId : dropHandleId;

		disconnectExistingInput(targetNodeId, targetHandleId);
		edges = [
			...edges,
			{
				id: crypto.randomUUID(),
				source: sourceNodeId,
				sourceHandle: sourceHandleId,
				target: targetNodeId,
				targetHandle: targetHandleId,
				animated: true
			}
		];
	}
</script>

<svelte:window
	onkeydown={handleKeydown}
	onmousemove={handleMouseMove}
	onmouseup={handleReconnectDragEnd}
	oncontextmenu={handleWrapperContextMenu}
/>

<div class="h-screen w-screen bg-[#1e1f22]" onmousedowncapture={handlePointerDownCapture}>
	<SvelteFlow
		bind:nodes
		bind:edges
		{nodeTypes}
		{edgeTypes}
		fitView
		colorMode="dark"
		panOnDrag={[1, 2]}
		selectionOnDrag={true}
		selectionKey={null}
		multiSelectionKey={['Control', 'Meta', 'Shift']}
		zoomOnDoubleClick={false}
		minZoom={0.2}
		maxZoom={2}
		deleteKey={['Backspace', 'Delete']}
		elevateNodesOnSelect={false}
		proOptions={{ hideAttribution: true }}
		onbeforeconnect={handleBeforeConnect}
		onbeforedelete={handleBeforeDelete}
		onconnectend={handleConnectEnd}
		onedgeclick={handleEdgeClick}
		onnodecontextmenu={handleNodeContextMenu}
		onnodedragstart={handleNodeDragStart}
		onnodedrag={handleNodeDrag}
		onnodedragstop={handleNodeDragStop}
		class="signal-flow"
	>
		<StoreBridge onready={(s) => (store = s)} />
		<Background variant={BackgroundVariant.Dots} gap={24} size={1} patternColor="#3f4147" bgColor="#1e1f22" />
		<Controls showLock={false} />
	</SvelteFlow>

	{#if connectionMenu}
		<ConnectionMenu
			x={connectionMenu.screenX}
			y={connectionMenu.screenY}
			options={menuOptions}
			onselect={addNodeFromMenu}
			onclose={() => (connectionMenu = null)}
		/>
	{/if}

	{#if nodeMenu}
		<NodeContextMenu
			x={nodeMenu.screenX}
			y={nodeMenu.screenY}
			count={nodeMenu.nodeIds.length}
			canPaste={!!clipboard && clipboard.nodes.length > 0}
			oncopy={() => {
				copyIds(nodeMenu!.nodeIds);
				nodeMenu = null;
			}}
			oncut={() => {
				cutIds(nodeMenu!.nodeIds);
				nodeMenu = null;
			}}
			onpaste={() => {
				pasteClipboard({ x: nodeMenu!.screenX, y: nodeMenu!.screenY });
				nodeMenu = null;
			}}
			oncomment={() => {
				createComment(nodeMenu!.nodeIds);
				nodeMenu = null;
			}}
			ondelete={() => {
				deleteNodes(nodeMenu!.nodeIds);
				nodeMenu = null;
			}}
			onclose={() => (nodeMenu = null)}
		/>
	{/if}

	{#if paneMenu}
		<PaneContextMenu
			x={paneMenu.screenX}
			y={paneMenu.screenY}
			canPaste={!!clipboard && clipboard.nodes.length > 0}
			onadd={(type) => {
				addNodeAt(type, paneMenu!.flowX, paneMenu!.flowY);
				paneMenu = null;
			}}
			oncomment={() => {
				createComment(undefined, { x: paneMenu!.flowX, y: paneMenu!.flowY });
				paneMenu = null;
			}}
			onpaste={() => {
				pasteClipboard({ x: paneMenu!.screenX, y: paneMenu!.screenY });
				paneMenu = null;
			}}
			onclose={() => (paneMenu = null)}
		/>
	{/if}

	{#if reconnectPath}
		<svg class="pointer-events-none fixed inset-0 z-50 h-full w-full">
			<path
				class="reconnect-path"
				d={reconnectPath}
				fill="none"
				stroke="#80848e"
				stroke-width="1.5"
			/>
		</svg>
	{/if}
</div>

<style>
	:global(.signal-flow .svelte-flow__edge-path) {
		stroke: #80848e;
		stroke-width: 1.5;
	}
	:global(.signal-flow .svelte-flow__edge.selected .svelte-flow__edge-path) {
		stroke: #5865f2;
	}
	/* Hide the bounding box Svelte Flow draws around multi-selected nodes (group-drag still works). */
	:global(.signal-flow .svelte-flow__selection-wrapper .svelte-flow__selection) {
		border: none;
		background: transparent;
	}
	:global(.signal-flow .svelte-flow__edge.animated path:not(.svelte-flow__edge-interaction)) {
		stroke-dasharray: 8 6;
		animation: signal-flow-dash 0.8s linear infinite;
	}
	.reconnect-path {
		stroke-dasharray: 8 6;
		animation: signal-flow-dash 0.8s linear infinite;
	}
	@keyframes signal-flow-dash {
		from {
			stroke-dashoffset: 14;
		}
		to {
			stroke-dashoffset: 0;
		}
	}
	/* Comment boxes are click-through except for the title bar and resize handles, so nodes sitting
	   inside a comment stay selectable and the canvas still pans through the frame. */
	:global(.signal-flow .svelte-flow__node-comment) {
		pointer-events: none;
	}
	:global(.signal-flow .svelte-flow__node-comment .comment-interactive) {
		pointer-events: auto;
	}
	:global(.signal-flow .svelte-flow__controls) {
		border-radius: 0.5rem;
		overflow: hidden;
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
	}
	:global(.signal-flow .svelte-flow__controls-button) {
		background: #2b2d31;
		border-bottom: 1px solid #1e1f22;
		fill: #dbdee1;
	}
	:global(.signal-flow .svelte-flow__controls-button:hover) {
		background: #35373c;
	}
</style>
