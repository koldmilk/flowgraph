<script lang="ts">
	import {
		SvelteFlow,
		Controls,
		MiniMap,
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
	import SwitchNode from './nodes/SwitchNode.svelte';
	import GroupNode from './nodes/GroupNode.svelte';
	import TextNode from './nodes/TextNode.svelte';
	import MediaNode from './nodes/MediaNode.svelte';
	import YouTubeNode from './nodes/YouTubeNode.svelte';
	import ArrowNode from './nodes/ArrowNode.svelte';
	import IconNode from './nodes/IconNode.svelte';
	import RerouteNode from './nodes/RerouteNode.svelte';
	import CommentNode from './nodes/CommentNode.svelte';
	import SignalEdge from './SignalEdge.svelte';
	import ConnectionMenu from './ConnectionMenu.svelte';
	import NodeContextMenu from './NodeContextMenu.svelte';
	import PaneContextMenu from './PaneContextMenu.svelte';
	import StoreBridge from './StoreBridge.svelte';
	import CanvasGrid from './CanvasGrid.svelte';
	import NodePanel from './NodePanel.svelte';
	import SettingsPanel from './SettingsPanel.svelte';
	import OptionsIcon from './icons/OptionsIcon.svelte';
	import SettingsIcon from './icons/SettingsIcon.svelte';
	import GraphTabs from './GraphTabs.svelte';
	import { tick } from 'svelte';
	import {
		nodeCatalog,
		isConvertibleType,
		type ConnectableNodeType,
		type SignalNodeType,
		type PanelNodeType,
		type SwitchPin
	} from './nodeCatalog';
	import { defaultNodeColor } from './nodeColors';
	import { DEFAULT_COMMENT_COLOR } from './commentColors';
	import { readMediaFile, mediaKind, AUDIO_WIDTH, AUDIO_HEIGHT, type MediaKind } from './mediaFile';
	import { YOUTUBE_WIDTH, YOUTUBE_HEIGHT } from './youtube';
	import { DEFAULT_ICON, DEFAULT_ICON_STYLE } from './materialIcons';
	import { settings } from './settings.svelte';

	// Snapping is off unless a grid is handed over.
	const snapGrid = $derived(
		settings.snapToGrid ? ([settings.gridSize, settings.gridSize] as [number, number]) : undefined
	);

	const nodeTypes = {
		source: SourceNode,
		destination: DestinationNode,
		sourceDestination: SourceDestinationNode,
		switch: SwitchNode,
		group: GroupNode,
		text: TextNode,
		media: MediaNode,
		youtube: YouTubeNode,
		arrow: ArrowNode,
		icon: IconNode,
		reroute: RerouteNode,
		comment: CommentNode
	};

	// Override the built-in bezier so every edge uses our higher-curvature Unreal-style spline.
	const edgeTypes = {
		default: SignalEdge
	};

	// --- Workspaces / tabs --------------------------------------------------------------------
	// Each collapsed group node owns a nested graph (its own nodes/edges), stored here by id. The
	// active graph is mirrored into `nodes`/`edges` (so all the editing logic below is unchanged); the
	// others are parked in `graphs` until their tab is selected. 'main' is the always-present root.
	type Viewport = { x: number; y: number; zoom: number };
	type GraphMeta = { name: string; nodes: Node[]; edges: Edge[]; viewport?: Viewport };

	const initialNodes: Node[] = [
		{
			id: 'camera-1',
			type: 'source',
			position: { x: 0, y: 120 },
			data: { label: 'Source', description: 'Description' }
		},
		{
			id: 'router-1',
			type: 'sourceDestination',
			position: { x: 340, y: 120 },
			data: { label: 'Source + Destination', description: 'Description' }
		},
		{
			id: 'monitor-1',
			type: 'destination',
			position: { x: 680, y: 120 },
			data: { label: 'Destination', description: 'Description' }
		}
	];
	const initialEdges: Edge[] = [
		{ id: 'camera-1->router-1', source: 'camera-1', target: 'router-1', animated: true },
		{ id: 'router-1->monitor-1', source: 'router-1', target: 'monitor-1', animated: true }
	];

	let graphs = $state<Record<string, GraphMeta>>({
		main: { name: 'Main', nodes: initialNodes, edges: initialEdges }
	});
	let activeGraphId = $state('main');
	let openTabs = $state<string[]>(['main']);
	let nodes = $state<Node[]>(initialNodes);
	let edges = $state<Edge[]>(initialEdges);

	const tabs = $derived(openTabs.map((id) => ({ id, name: graphs[id]?.name ?? 'Group' })));

	const { screenToFlowPosition, deleteElements, getInternalNode, fitView, getViewport, setViewport } =
		useSvelteFlow();

	// A group pin's name follows its interface node: renaming the node inside the subgraph reconciles
	// back up to the owning group's pin. Done on tab switch (rather than live) since the group isn't
	// visible while its subgraph is open anyway.
	function reconcilePins(subgraphId: string, subNodes: Node[]) {
		const names = new Map<string, string>();
		for (const n of subNodes) {
			if (n.data?.groupInterface) names.set(n.id, (n.data?.label as string) ?? '');
		}
		if (names.size === 0) return;
		for (const [gId, g] of Object.entries(graphs)) {
			if (gId === subgraphId) continue;
			let changed = false;
			const sync = (list?: SwitchPin[]) =>
				list?.map((p) => {
					if (names.has(p.id) && names.get(p.id) !== p.name) {
						changed = true;
						return { ...p, name: names.get(p.id)! };
					}
					return p;
				});
			const newNodes = g.nodes.map((gn) => {
				if (gn.type !== 'group' || gn.data?.graphId !== subgraphId) return gn;
				return {
					...gn,
					data: {
						...gn.data,
						inputs: sync(gn.data?.inputs as SwitchPin[] | undefined),
						outputs: sync(gn.data?.outputs as SwitchPin[] | undefined)
					}
				};
			});
			if (changed) graphs[gId] = { ...g, nodes: newNodes };
		}
	}

	// Save the live nodes/edges (and pan/zoom) back onto the active graph, then load the target graph's.
	async function switchTab(id: string) {
		if (id === activeGraphId || !graphs[id]) return;
		reconcilePins(activeGraphId, nodes);
		graphs[activeGraphId] = { ...graphs[activeGraphId], nodes, edges, viewport: getViewport() };
		activeGraphId = id;
		nodes = graphs[id].nodes;
		edges = graphs[id].edges;
		const vp = graphs[id].viewport;
		nodeMenu = null;
		paneMenu = null;
		connectionMenu = null;
		await tick();
		if (vp) setViewport(vp);
		else fitView();
	}

	// Double-clicking a group node opens its subgraph in a tab (creating the tab the first time).
	function openGroup(graphId: string) {
		if (!graphs[graphId]) return;
		if (!openTabs.includes(graphId)) openTabs = [...openTabs, graphId];
		switchTab(graphId);
	}

	function closeTab(id: string) {
		if (id === 'main') return;
		if (activeGraphId === id) switchTab('main'); // persists this tab's edits before it's hidden
		openTabs = openTabs.filter((t) => t !== id);
	}
	// The live store arrives via <StoreBridge> (a child of <SvelteFlow>); see that component for why.
	let store = $state<ReturnType<typeof useStore> | null>(null);

	type NodeMenuState = { screenX: number; screenY: number; nodeIds: string[] };
	let nodeMenu = $state<NodeMenuState | null>(null);

	// Annotations (comment frames, text notes) decorate the canvas rather than carrying signal, so
	// they're skipped by anything that operates on the flow itself -- collapsing, most notably.
	const ANNOTATION_TYPES = new Set(['comment', 'text', 'media', 'youtube', 'arrow']);
	const isAnnotation = (n: Node) => ANNOTATION_TYPES.has(n.type ?? '');

	// --- Side panels --------------------------------------------------------------------------
	// Attributes and Settings share the top-right corner, so only one is open at a time; when neither
	// is, the dock shows a round button per panel. The attributes panel edits a single selected node:
	// any catalog type, plus comment frames (name + color only). Reroute knots and multi-selections
	// show an empty state instead.
	let openPanel = $state<'attributes' | 'settings' | null>('attributes');
	// A media node's content is set on the node itself, but it can still carry a description -- one
	// that only ever shows on hover, since text drawn over the picture would fight it.
	const isPanelType = (t?: string | null) =>
		t != null && t !== 'youtube' && (t in nodeCatalog || t === 'comment');
	const selectedNodes = $derived(nodes.filter((n) => n.selected));
	const panelNode = $derived(
		selectedNodes.length === 1 && isPanelType(selectedNodes[0].type) ? selectedNodes[0] : null
	);

	// A lone selected spline gets the panel to itself (color, flow direction, dashes). Nodes win when
	// both are selected -- a box selection sweeps up the wires between the nodes it caught.
	const selectedEdges = $derived(edges.filter((e) => e.selected));
	const panelEdge = $derived(
		selectedNodes.length === 0 && selectedEdges.length === 1 ? selectedEdges[0] : null
	);

	// A reroute knot is a bend in a wire, not a junction between two wires, so every segment between
	// the same pair of real nodes shares one look. Walks outward from an edge through knots (following
	// every branch a knot fans out into) and stops at the first real node in each direction.
	function splineChain(edgeId: string): Set<string> {
		const knots = new Set(nodes.filter((n) => n.type === 'reroute').map((n) => n.id));
		const chain = new Set<string>();
		const queue = [edgeId];
		while (queue.length) {
			const id = queue.pop()!;
			if (chain.has(id)) continue;
			chain.add(id);
			const edge = edges.find((e) => e.id === id);
			if (!edge) continue;
			// Every other edge touching a knot at either end is part of the same wire.
			for (const end of [edge.source, edge.target]) {
				if (!knots.has(end)) continue;
				for (const other of edges) {
					if ((other.source === end || other.target === end) && !chain.has(other.id)) {
						queue.push(other.id);
					}
				}
			}
		}
		return chain;
	}

	function updateEdgeData(id: string, patch: Record<string, unknown>) {
		const chain = splineChain(id);
		edges = edges.map((e) => (chain.has(e.id) ? { ...e, data: { ...e.data, ...patch } } : e));
	}

	// A new wire onto or out of a knot joins the wire that's already there, rather than starting over
	// at the default look.
	function inheritedSplineData(source: string, target: string): Record<string, unknown> {
		const knots = new Set(nodes.filter((n) => n.type === 'reroute').map((n) => n.id));
		for (const end of [source, target]) {
			if (!knots.has(end)) continue;
			const neighbor = edges.find((e) => e.source === end || e.target === end);
			if (neighbor?.data) return { ...neighbor.data };
		}
		return {};
	}

	// Selected nodes that collapseSelection would actually take (annotations ride along but don't
	// count, and a group's interface nodes stay put), so the menus only offer Collapse when there's
	// real flow content to collapse.
	const collapsibleCount = $derived(
		selectedNodes.filter((n) => !isAnnotation(n) && !n.data?.groupInterface).length
	);

	function updateNodeData(id: string, data: Record<string, unknown>) {
		nodes = nodes.map((n) => (n.id === id ? { ...n, data: { ...n.data, ...data } } : n));
		// A group node's name is also its tab's name — keep them in sync when it's renamed.
		if ('label' in data) {
			const n = nodes.find((x) => x.id === id);
			const gid = n?.type === 'group' ? (n.data?.graphId as string | undefined) : undefined;
			if (gid && graphs[gid]) graphs[gid].name = (data.label as string)?.trim() || graphs[gid].name;
		}
	}

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

	// Double-clicking a group node dives into its subgraph. (zoomOnDoubleClick is off, so a second
	// click just carries detail === 2.)
	function handleNodeClick({ node, event }: { node: Node; event: MouseEvent | TouchEvent }) {
		if (event.detail === 2 && node.type === 'group' && node.data?.graphId) {
			openGroup(node.data.graphId as string);
		}
	}

	// --- Convert node type -------------------------------------------------------------------
	// Which signal types among the targeted nodes can still be converted to. Only the three
	// signal node types are convertible (reroute/comment are excluded). When every targeted
	// signal node already shares one type, that type is dropped (nothing to convert to).
	function convertTypesFor(ids: string[]): SignalNodeType[] {
		// Interface nodes are locked to their pin's direction, so they aren't convertible.
		const targeted = nodes.filter(
			(n) => ids.includes(n.id) && isConvertibleType(n.type) && !n.data?.groupInterface
		);
		if (targeted.length === 0) return [];
		const all: SignalNodeType[] = ['source', 'destination', 'sourceDestination'];
		const present = new Set(targeted.map((n) => n.type));
		return present.size === 1 ? all.filter((t) => t !== [...present][0]) : all;
	}

	// Swap the type of every targeted signal node, keeping its label/position. Edges the new type
	// can no longer carry are pruned: a node that loses its output drops outgoing wires, one that
	// loses its input drops incoming wires.
	function convertNodes(ids: string[], toType: SignalNodeType) {
		const converted = new Set(
			nodes
				.filter((n) => ids.includes(n.id) && isConvertibleType(n.type) && !n.data?.groupInterface)
				.map((n) => n.id)
		);
		if (converted.size === 0) return;
		const hasSource = toType !== 'destination'; // source + sourceDestination emit
		const hasTarget = toType !== 'source'; // destination + sourceDestination receive
		nodes = nodes.map((n) => {
			if (!converted.has(n.id)) return n;
			// Preserve the color the node is currently showing: an explicit data.color stays as-is; a
			// node still on its type default gets that default baked in so converting doesn't recolor it.
			const color = (n.data?.color as string | undefined) ?? defaultNodeColor[n.type as SignalNodeType];
			return { ...n, type: toType, data: { ...n.data, color } };
		});
		edges = edges.filter((e) => {
			if (converted.has(e.source) && !hasSource) return false;
			if (converted.has(e.target) && !hasTarget) return false;
			return true;
		});
	}

	// --- Collapse to group ---------------------------------------------------------------------
	// Move the targeted nodes (and the wiring purely between them) into a new nested graph, and drop a
	// single group node in their place at the flow nodes' centroid. Wires that crossed the selection
	// boundary are dropped (v1) — the group node starts with one In/Out pin to be rewired by hand.
	// Selected annotations (comments, notes) travel in with the nodes they describe; a group's own
	// interface nodes stay put, since they belong to the graph they're already in.
	function collapseSelection(ids?: string[]) {
		const targetIds = new Set(ids ?? nodes.filter((n) => n.selected).map((n) => n.id));
		const inner = nodes.filter((n) => targetIds.has(n.id) && !n.data?.groupInterface);
		// Annotations ride along but don't justify a group on their own.
		const flowNodes = inner.filter((n) => !isAnnotation(n));
		if (flowNodes.length === 0) return;
		const innerIds = new Set(inner.map((n) => n.id));

		const internalEdges = edges.filter((e) => innerIds.has(e.source) && innerIds.has(e.target));

		// Positioned on the flow nodes alone -- a large comment frame shouldn't drag the centroid off.
		const cx = flowNodes.reduce((s, n) => s + n.position.x, 0) / flowNodes.length;
		const cy = flowNodes.reduce((s, n) => s + n.position.y, 0) / flowNodes.length;

		const graphId = crypto.randomUUID();
		const groupId = crypto.randomUUID();

		// The subgraph's real content, plus a source/destination interface node for each default pin.
		const subNodes = inner.map((n) => ({ ...($state.snapshot(n) as unknown as Node), selected: false }));
		const inPin = { id: crypto.randomUUID(), name: 'In 1' };
		const outPin = { id: crypto.randomUUID(), name: 'Out 1' };
		const inNode = makeInterfaceNode('input', inPin.id, inPin.name, interfacePosition(subNodes, 'input'));
		const withIn = [...subNodes, inNode];
		const outNode = makeInterfaceNode('output', outPin.id, outPin.name, interfacePosition(withIn, 'output'));

		graphs[graphId] = {
			name: 'Group',
			nodes: [...withIn, outNode],
			edges: internalEdges.map((e) => $state.snapshot(e) as unknown as Edge)
		};

		const groupNode: Node = {
			id: groupId,
			type: 'group',
			position: { x: cx, y: cy },
			data: {
				label: 'Group',
				description: '',
				graphId,
				color: defaultNodeColor.group,
				inputs: [inPin],
				outputs: [outPin]
			},
			selected: true
		};

		// Keep only nodes/edges that stay in this graph, then add the group node. Any edge touching an
		// inner node (internal or boundary-crossing) is removed.
		nodes = [
			...nodes.filter((n) => !innerIds.has(n.id)).map((n) => (n.selected ? { ...n, selected: false } : n)),
			groupNode
		];
		edges = edges.filter((e) => !innerIds.has(e.source) && !innerIds.has(e.target));
	}

	// Every subgraph id reachable from a graph (itself + nested groups), so deleting a group node can
	// tear down all the graphs it owned.
	function collectSubgraphIds(graphId: string, acc: Set<string>) {
		const g = graphs[graphId];
		if (!g || acc.has(graphId)) return;
		acc.add(graphId);
		for (const n of g.nodes) {
			if (n.type === 'group' && n.data?.graphId) collectSubgraphIds(n.data.graphId as string, acc);
		}
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

	// A fresh node's data: signal types just carry a label/description; a switch also starts with one
	// named input and one named output pin, which the attributes panel can then grow or rename.
	function initialData(type: PanelNodeType): Record<string, unknown> {
		const base = { label: nodeCatalog[type].label, description: 'Description' };
		// A text box is only its markdown body -- no title, so it starts on placeholder note text.
		if (type === 'text') return { description: 'New note' };
		// Media nodes start empty and prompt for their content (a file picker / a link field).
		if (type === 'media' || type === 'youtube') return {};
		// An icon node starts unnamed -- the label is optional, and a blank one keeps it compact until
		// there's a reason to title it.
		if (type === 'icon') return { icon: DEFAULT_ICON, iconStyle: DEFAULT_ICON_STYLE };
		// An arrow starts as a simple two-point diagonal; points are added by double-clicking it.
		if (type === 'arrow') {
			return {
				points: [
					{ x: 0, y: 0 },
					{ x: 170, y: 90 }
				],
				color: defaultNodeColor.arrow
			};
		}
		if (type === 'switch') {
			return {
				...base,
				inputs: [{ id: crypto.randomUUID(), name: 'In 1' }],
				outputs: [{ id: crypto.randomUUID(), name: 'Out 1' }]
			};
		}
		return base;
	}

	// The empty box a media node waits in before a file is chosen. Once one is, readMediaFile resizes
	// the node to the file's own proportions, so these only have to look reasonable while empty.
	function mediaPlaceholderSize(kind: MediaKind | undefined) {
		if (kind === 'video') return { width: 320, height: 180 };
		if (kind === 'audio') return { width: AUDIO_WIDTH, height: AUDIO_HEIGHT };
		return { width: 260, height: 180 };
	}

	// `extra` seeds the new node's data -- the Add Media menu uses it to say which kind of file the
	// placeholder should ask for.
	function addNodeAt(
		type: PanelNodeType,
		flowX: number,
		flowY: number,
		extra: Record<string, unknown> = {}
	) {
		// Media and arrow nodes are sized rather than laid out by content, so they need explicit boxes.
		const size =
			type === 'media'
				? mediaPlaceholderSize(extra.kind as MediaKind | undefined)
				: type === 'youtube'
					? { width: YOUTUBE_WIDTH, height: YOUTUBE_HEIGHT }
					: type === 'arrow'
						? { width: 170, height: 90 }
						: {};
		nodes = [
			...nodes,
			{
				id: crypto.randomUUID(),
				type,
				position: { x: flowX - 95, y: flowY - 39 },
				data: { ...initialData(type), ...extra },
				...size
			}
		];
	}

	// --- Dropping media onto the canvas ---------------------------------------------------------
	// Each image, video or audio file lands as a media node at the drop point, sized from its natural
	// dimensions by readMediaFile (shared with the media node's own picker).
	function handleDragOver(event: DragEvent) {
		// Only claim the drop when it actually carries files, so other drags behave normally.
		if (!event.dataTransfer?.types.includes('Files')) return;
		event.preventDefault();
		event.dataTransfer.dropEffect = 'copy';
	}

	async function handleDrop(event: DragEvent) {
		const files = [...(event.dataTransfer?.files ?? [])].filter((f) => mediaKind(f) !== null);
		if (files.length === 0) return;
		event.preventDefault();

		const origin = screenToFlowPosition({ x: event.clientX, y: event.clientY });
		let offset = 0;
		for (const file of files) {
			try {
				const { kind, src, width, height } = await readMediaFile(file);
				nodes = [
					...nodes,
					{
						id: crypto.randomUUID(),
						type: 'media',
						// Centered on the cursor; multiple files cascade so they don't stack exactly.
						position: { x: origin.x - width / 2 + offset, y: origin.y - height / 2 + offset },
						width,
						height,
						data: { kind, src, alt: file.name }
					}
				];
				offset += 28;
			} catch {
				// A file we can't decode (or one over the size limit) is skipped rather than aborting
				// the whole drop.
			}
		}
	}

	// --- Switch / group pins -------------------------------------------------------------------
	// A node owns two arrays of named pins (data.inputs / data.outputs). These edit them in place;
	// removing a pin also prunes any edge wired to it, since its handle disappears.
	//
	// For a GROUP node each pin also has a counterpart node inside its subgraph — the point where the
	// signal tunnels through the boundary: an input pin is a `source` inside (it feeds the subgraph),
	// an output pin is a `destination` inside (it drains it). The counterpart shares the pin's id, so
	// it's kept in lockstep and can only be removed by removing the pin (see handleBeforeDelete).
	const pinKey = (side: 'input' | 'output') => (side === 'input' ? 'inputs' : 'outputs');

	function pinsOf(node: Node, side: 'input' | 'output'): SwitchPin[] {
		return (node.data?.[pinKey(side)] as SwitchPin[] | undefined) ?? [];
	}

	// Bounding box of some nodes (measured size when known, else a default node footprint).
	function bounds(ns: Node[]) {
		if (ns.length === 0) return { minX: 0, maxX: 0, minY: 0 };
		const rects = ns.map(nodeRect);
		return {
			minX: Math.min(...rects.map((r) => r.x)),
			maxX: Math.max(...rects.map((r) => r.x + r.w)),
			minY: Math.min(...rects.map((r) => r.y))
		};
	}

	// Where to drop a new interface node in a subgraph: inputs stack down the left of the real content,
	// outputs down the right, so the tunnel nodes frame the graph.
	function interfacePosition(subNodes: Node[], side: 'input' | 'output') {
		const ifaces = subNodes.filter((n) => n.data?.groupInterface === side);
		// Measured against the flow nodes only -- a big comment frame shouldn't push the pins far out.
		const others = subNodes.filter((n) => !n.data?.groupInterface && !isAnnotation(n));
		const box = bounds(others.length ? others : subNodes);
		const x = side === 'input' ? box.minX - 250 : box.maxX + 250;
		return { x, y: box.minY + ifaces.length * 90 };
	}

	function makeInterfaceNode(side: 'input' | 'output', pinId: string, name: string, position: { x: number; y: number }): Node {
		return {
			id: pinId,
			type: side === 'input' ? 'source' : 'destination',
			position,
			data: { label: name, description: '', groupInterface: side }
		};
	}

	// The subgraph a group node owns, if any.
	function subgraphOf(node: Node | undefined): string | undefined {
		return node?.type === 'group' ? (node.data?.graphId as string | undefined) : undefined;
	}

	function addPin(id: string, side: 'input' | 'output') {
		const node = nodes.find((n) => n.id === id);
		if (!node) return;
		const pinId = crypto.randomUUID();
		const name = `${side === 'input' ? 'In' : 'Out'} ${pinsOf(node, side).length + 1}`;
		nodes = nodes.map((n) =>
			n.id === id
				? { ...n, data: { ...n.data, [pinKey(side)]: [...pinsOf(n, side), { id: pinId, name }] } }
				: n
		);
		const gid = subgraphOf(node);
		if (gid && graphs[gid]) {
			const g = graphs[gid];
			const iface = makeInterfaceNode(side, pinId, name, interfacePosition(g.nodes, side));
			graphs[gid] = { ...g, nodes: [...g.nodes, iface] };
		}
	}

	function renamePin(id: string, side: 'input' | 'output', pinId: string, name: string) {
		const node = nodes.find((n) => n.id === id);
		nodes = nodes.map((n) =>
			n.id === id
				? {
						...n,
						data: {
							...n.data,
							[pinKey(side)]: pinsOf(n, side).map((p) => (p.id === pinId ? { ...p, name } : p))
						}
					}
				: n
		);
		const gid = subgraphOf(node);
		if (gid && graphs[gid]) {
			graphs[gid] = {
				...graphs[gid],
				nodes: graphs[gid].nodes.map((n) =>
					n.id === pinId ? { ...n, data: { ...n.data, label: name } } : n
				)
			};
		}
	}

	function removePin(id: string, side: 'input' | 'output', pinId: string) {
		const node = nodes.find((n) => n.id === id);
		nodes = nodes.map((n) =>
			n.id === id
				? { ...n, data: { ...n.data, [pinKey(side)]: pinsOf(n, side).filter((p) => p.id !== pinId) } }
				: n
		);
		edges = edges.filter((e) =>
			side === 'input'
				? !(e.target === id && (e.targetHandle ?? null) === pinId)
				: !(e.source === id && (e.sourceHandle ?? null) === pinId)
		);
		// Drop the pin's interface node (and its wiring) from inside the group.
		const gid = subgraphOf(node);
		if (gid && graphs[gid]) {
			graphs[gid] = {
				...graphs[gid],
				nodes: graphs[gid].nodes.filter((n) => n.id !== pinId),
				edges: graphs[gid].edges.filter((e) => e.source !== pinId && e.target !== pinId)
			};
		}
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

	// An input pin normally carries one incoming spline, so a new connection replaces what was there --
	// unless the node has been set to accept several, or the global setting has lifted the rule for
	// everything. Output (source) handles are unrestricted either way and can fan out freely.
	function allowsMultipleInputs(targetNodeId: string) {
		if (settings.allowMultipleInputs) return true;
		return nodes.find((n) => n.id === targetNodeId)?.data?.multiInput === true;
	}

	// Every path that creates an edge routes through here, so the rule only has to live in one place.
	function disconnectExistingInput(targetNodeId: string, targetHandleId: string | null) {
		if (allowsMultipleInputs(targetNodeId)) return;
		edges = edges.filter(
			(edge) => !(edge.target === targetNodeId && (edge.targetHandle ?? null) === targetHandleId)
		);
	}

	function handleBeforeConnect(connection: Connection): Edge {
		disconnectExistingInput(connection.target, connection.targetHandle ?? null);
		return {
			id: crypto.randomUUID(),
			animated: true,
			data: inheritedSplineData(connection.source, connection.target),
			...connection
		};
	}

	// An icon node has one pin of each kind, so it can take the loose end from either direction.
	const menuOptions = $derived.by((): ConnectableNodeType[] =>
		!connectionMenu
			? []
			: connectionMenu.fromHandleType === 'source'
				? ['destination', 'sourceDestination', 'icon']
				: ['source', 'sourceDestination', 'icon']
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

	function addNodeFromMenu(type: ConnectableNodeType) {
		if (!connectionMenu) return;
		const { flowX, flowY, fromNodeId, fromHandleId, fromHandleType } = connectionMenu;

		const id = crypto.randomUUID();
		nodes = [
			...nodes,
			{
				id,
				type,
				position: { x: flowX - 95, y: flowY - 39 },
				data: initialData(type)
			}
		];

		const edge: Edge =
			fromHandleType === 'source'
				? {
						id: crypto.randomUUID(),
						source: fromNodeId,
						sourceHandle: fromHandleId,
						target: id,
						animated: true,
						data: inheritedSplineData(fromNodeId, id)
					}
				: {
						id: crypto.randomUUID(),
						source: id,
						target: fromNodeId,
						targetHandle: fromHandleId,
						animated: true,
						data: inheritedSplineData(id, fromNodeId)
					};

		if (fromHandleType === 'target') {
			disconnectExistingInput(fromNodeId, fromHandleId);
		}
		edges = [...edges, edge];

		connectionMenu = null;
	}

	// Q aligns every selected node onto a shared horizontal axis, so their wires run dead straight.
	function alignSelectedHorizontally() {
		const selected = nodes.filter((node) => node.selected);
		if (selected.length < 2) return;
		const selectedIds = new Set(selected.map((n) => n.id));

		// A handle's connection point (where the spline attaches) is its vertical middle; handleBounds
		// are node-relative + unscaled.
		const centerOf = (handles: { y: number; height: number }[]) =>
			handles.reduce((sum, h) => sum + h.y + h.height / 2, 0) / handles.length;

		// Align by the PIN that actually carries a wire to another selected node, so that wire runs
		// straight -- not the box center. For a chain of single-pin nodes this is simply "the pin," but
		// for a multi-pin node it picks only the pin(s) wired into the selection and ignores idle ones,
		// so the connecting spline lines up regardless of the node's shape. Falls back to averaging all
		// pins (then the box center) if a selected node has no wire to the rest of the selection.
		const pinOffsetY = (n: Node): number => {
			const bounds = getInternalNode(n.id)?.internals.handleBounds;
			const sources = bounds?.source ?? [];
			const targets = bounds?.target ?? [];

			const connected = new Set<{ y: number; height: number }>();
			for (const e of edges) {
				if (e.source === n.id && selectedIds.has(e.target)) {
					const match = sources.filter((s) => e.sourceHandle == null || s.id === e.sourceHandle);
					(match.length ? match : sources).forEach((h) => connected.add(h));
				} else if (e.target === n.id && selectedIds.has(e.source)) {
					const match = targets.filter((t) => e.targetHandle == null || t.id === e.targetHandle);
					(match.length ? match : targets).forEach((h) => connected.add(h));
				}
			}

			if (connected.size) return centerOf([...connected]);
			const all = [...sources, ...targets];
			if (all.length) return centerOf(all);
			return (n.measured?.height ?? 0) / 2;
		};

		const targetPinY =
			selected.reduce((sum, node) => sum + node.position.y + pinOffsetY(node), 0) / selected.length;
		nodes = nodes.map((node) =>
			node.selected
				? { ...node, position: { ...node.position, y: targetPinY - pinOffsetY(node) } }
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

	// --- Stacking order ---------------------------------------------------------------------------
	// Overlapping decoration (images, video, notes) needs an explicit draw order. With every node on
	// one layer the last one added wins, and whatever it covers can't be clicked at all -- so each
	// node carries a zIndex and these rewrite the whole set. Rewriting rather than nudging one node's
	// number keeps the values dense: "bring to front" repeated a hundred times still ends at n, not
	// 100.
	//
	// Comment frames sit this out. They're backdrops, pinned behind the wires at creation, and they're
	// click-through except for their title bar -- so they never cover what you're reaching for, and
	// including them would only risk tinting the splines they're meant to sit behind.
	type StackMove = 'front' | 'forward' | 'backward' | 'back';

	// Visual order, back to front. Equal zIndex falls back to array order, because at the same
	// stacking level that's exactly what the renderer paints.
	function stackOrder(list: Node[]): Node[] {
		return list
			.map((n, i) => ({ n, i }))
			.sort((a, b) => (a.n.zIndex ?? 0) - (b.n.zIndex ?? 0) || a.i - b.i)
			.map(({ n }) => n);
	}

	// `ids` targets specific nodes (the context menu, which can act on an unselected node it was
	// opened over); without it the current selection moves.
	function restack(move: StackMove, ids?: string[]) {
		const movable = nodes.filter((n) => n.type !== 'comment');
		const wanted = ids ? new Set(ids) : null;
		const picked = new Set(
			movable.filter((n) => (wanted ? wanted.has(n.id) : n.selected)).map((n) => n.id)
		);
		// Nothing selected, or everything selected -- either way the order can't change.
		if (picked.size === 0 || picked.size === movable.length) return;

		const isPicked = (n: Node) => picked.has(n.id);
		const order = stackOrder(movable);
		let next: Node[];

		if (move === 'front') {
			next = [...order.filter((n) => !isPicked(n)), ...order.filter(isPicked)];
		} else if (move === 'back') {
			next = [...order.filter(isPicked), ...order.filter((n) => !isPicked(n))];
		} else {
			next = [...order];
			if (move === 'forward') {
				// Scan from the top down so a run of selected nodes shifts as a block instead of
				// collapsing into a pile against the first unselected node above it.
				for (let i = next.length - 2; i >= 0; i--) {
					if (isPicked(next[i]) && !isPicked(next[i + 1])) {
						[next[i], next[i + 1]] = [next[i + 1], next[i]];
					}
				}
			} else {
				for (let i = 1; i < next.length; i++) {
					if (isPicked(next[i]) && !isPicked(next[i - 1])) {
						[next[i], next[i - 1]] = [next[i - 1], next[i]];
					}
				}
			}
		}

		// 1-based: zero would put a node level with the edge layer, which paints wires over it.
		const z = new Map(next.map((n, i) => [n.id, i + 1]));
		nodes = nodes.map((n) => (z.has(n.id) ? { ...n, zIndex: z.get(n.id) } : n));
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
		// Ctrl/Cmd+G collapses the current selection into a group node.
		if (mod && key === 'g') {
			if (nodes.some((n) => n.selected && !isAnnotation(n))) {
				event.preventDefault();
				collapseSelection();
			}
			return;
		}

		// Stacking order. Shift gives the bracket keys their punctuation twins, so match both:
		// ] / [ step one layer, Shift+] / Shift+[ jump straight to the front or back.
		const forward = key === ']' || key === '}';
		const backward = key === '[' || key === '{';
		if ((forward || backward) && !event.altKey) {
			event.preventDefault();
			if (event.shiftKey) restack(forward ? 'front' : 'back');
			else restack(forward ? 'forward' : 'backward');
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
			// Offset by half the knot's size so it lands centered on the click.
			{ id: rerouteId, type: 'reroute', position: { x: pos.x - 5, y: pos.y - 5 }, data: {} }
		];
		// Both halves inherit the spline's look, so a knot doesn't reset a colored or two-way wire.
		edges = [
			...edges.filter((e) => e.id !== edge.id),
			{
				id: crypto.randomUUID(),
				source: edge.source,
				sourceHandle: edge.sourceHandle ?? null,
				target: rerouteId,
				animated,
				data: { ...edge.data }
			},
			{
				id: crypto.randomUUID(),
				source: rerouteId,
				target: edge.target,
				targetHandle: edge.targetHandle ?? null,
				animated,
				data: { ...edge.data }
			}
		];
	}

	// When a reroute knot is deleted, splice the spline back together so signal still flows from
	// the upstream source to the downstream target (walking through any chained reroutes).
	async function handleBeforeDelete({ nodes: delNodes, edges: delEdges }: { nodes: Node[]; edges: Edge[] }) {
		// A group pin's interface node can't be deleted directly — only by removing its pin. Drop any
		// such node (and edges touching it) from the deletion, and let the rest through.
		const blockedIds = new Set(delNodes.filter((n) => n.data?.groupInterface).map((n) => n.id));
		const allowedNodes = blockedIds.size ? delNodes.filter((n) => !blockedIds.has(n.id)) : delNodes;
		const allowedEdges = blockedIds.size
			? delEdges.filter((e) => !blockedIds.has(e.source) && !blockedIds.has(e.target))
			: delEdges;
		const result = () => (blockedIds.size ? { nodes: allowedNodes, edges: allowedEdges } : true);

		const deletedIds = new Set(allowedNodes.map((n) => n.id));

		// Deleting a group node tears down its nested graph(s) and closes any open tabs for them.
		const deletedGroups = allowedNodes.filter((n) => n.type === 'group' && n.data?.graphId);
		if (deletedGroups.length) {
			const gone = new Set<string>();
			for (const g of deletedGroups) collectSubgraphIds(g.data!.graphId as string, gone);
			graphs = Object.fromEntries(Object.entries(graphs).filter(([id]) => !gone.has(id)));
			openTabs = openTabs.filter((t) => !gone.has(t));
			if (gone.has(activeGraphId)) activeGraphId = 'main';
		}

		const deletedReroutes = allowedNodes.filter((n) => n.type === 'reroute');
		if (deletedReroutes.length === 0) return result();

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
						animated: true,
						// Keep the look of the spline that ran into the knot, so removing one is a no-op
						// visually.
						data: { ...(up.data ?? down.data) }
					});
				}
			}
		}

		if (bypass.length) {
			for (const b of bypass) disconnectExistingInput(b.target, b.targetHandle ?? null);
			edges = [...edges, ...bypass];
		}
		return result();
	}

	// Auto-orient each reroute knot's pins toward the PINS they connect to (not node centers), so the
	// spline flows smoothly even when it doubles back. A source's output pin sits on its right edge
	// and a target's input pin on its left edge, so a node whose body is to the right can still have
	// its input pin to the left -- the wire then correctly exits the knot leftward (Unreal-style).
	// Recomputed live as any connected node (or the knot) moves.
	const nodeW = (n: Node) => n.measured?.width ?? (n.type === 'reroute' ? 10 : 190);
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
		// The grabbed spline's look, carried across so re-landing it doesn't reset the wire.
		data: Record<string, unknown>;
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
			pointerY: event.clientY,
			data: { ...connectedEdge.data }
		};
	}

	function handleMouseMove(event: MouseEvent) {
		lastPointer = { x: event.clientX, y: event.clientY };
		if (!reconnectDrag) return;
		reconnectDrag = { ...reconnectDrag, pointerX: event.clientX, pointerY: event.clientY };
	}

	function handleReconnectDragEnd(event: MouseEvent) {
		if (!reconnectDrag) return;
		const { fixedNodeId, fixedHandleId, fixedType, data: grabbedData } = reconnectDrag;
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
				animated: true,
				data: grabbedData
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

<div class="flex h-screen w-screen flex-col bg-[#1e1f22]">
	<GraphTabs {tabs} activeId={activeGraphId} onselect={switchTab} onclose={closeTab} />
	<div
		class="relative flex-1"
		onmousedowncapture={handlePointerDownCapture}
		ondragover={handleDragOver}
		ondrop={handleDrop}
		role="presentation"
	>
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
		{snapGrid}
		proOptions={{ hideAttribution: true }}
		onbeforeconnect={handleBeforeConnect}
		onbeforedelete={handleBeforeDelete}
		onconnectend={handleConnectEnd}
		onedgeclick={handleEdgeClick}
		onnodeclick={handleNodeClick}
		onnodecontextmenu={handleNodeContextMenu}
		onnodedragstart={handleNodeDragStart}
		onnodedrag={handleNodeDrag}
		onnodedragstop={handleNodeDragStop}
		class="signal-flow {settings.animateSignal ? '' : 'static-splines'}"
	>
		<StoreBridge onready={(s) => (store = s)} />
		<CanvasGrid />
		<Controls showLock={false} />
		{#if settings.showMinimap}
			<MiniMap
				pannable
				zoomable
				bgColor="#1e1f22"
				maskColor="rgba(0, 0, 0, 0.6)"
				nodeColor={(n) => (n.data?.color as string | undefined) ?? '#4e5058'}
				nodeStrokeColor="#1e1f22"
				nodeBorderRadius={3}
				class="rounded-lg border! border-black/40! bg-[#1e1f22]! shadow-2xl! shadow-black/60!"
			/>
		{/if}
	</SvelteFlow>

	{#if openPanel === 'attributes'}
		<NodePanel
			node={panelNode}
			edge={panelEdge}
			selectedCount={selectedNodes.length}
			onclose={() => (openPanel = null)}
			onupdate={updateNodeData}
			onupdateedge={updateEdgeData}
			onconvert={(id, type) => convertNodes([id], type)}
			onaddpin={addPin}
			onremovepin={removePin}
			onrenamepin={renamePin}
		/>
	{:else if openPanel === 'settings'}
		<SettingsPanel onclose={() => (openPanel = null)} />
	{:else}
		<!-- Dock: one round button per panel, stacked in the corner the panels open from. Hidden while
		     a panel is open, since the panel covers this spot. -->
		<div class="pointer-events-auto absolute top-4 right-4 z-30 flex flex-col gap-2">
			<button
				type="button"
				class="flex h-11 w-11 items-center justify-center rounded-full border border-black/40 bg-[#2b2d31] text-[#dbdee1] shadow-2xl shadow-black/60 ring-1 ring-white/5 hover:bg-[#35373c]"
				title="Show attributes"
				aria-label="Show attributes"
				onclick={() => (openPanel = 'attributes')}
			>
				<OptionsIcon class="h-5 w-5" />
			</button>
			<button
				type="button"
				class="flex h-11 w-11 items-center justify-center rounded-full border border-black/40 bg-[#2b2d31] text-[#dbdee1] shadow-2xl shadow-black/60 ring-1 ring-white/5 hover:bg-[#35373c]"
				title="Show settings"
				aria-label="Show settings"
				onclick={() => (openPanel = 'settings')}
			>
				<SettingsIcon class="h-5 w-5" />
			</button>
		</div>
	{/if}

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
			convertTypes={convertTypesFor(nodeMenu.nodeIds)}
			onconvert={(type) => {
				convertNodes(nodeMenu!.nodeIds, type);
				nodeMenu = null;
			}}
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
			oncollapse={() => {
				collapseSelection(nodeMenu!.nodeIds);
				nodeMenu = null;
			}}
			onreorder={(move) => {
				restack(move, nodeMenu!.nodeIds);
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
			selectedCount={collapsibleCount}
			onadd={(type, extra) => {
				addNodeAt(type, paneMenu!.flowX, paneMenu!.flowY, extra);
				paneMenu = null;
			}}
			oncomment={() => {
				createComment(undefined, { x: paneMenu!.flowX, y: paneMenu!.flowY });
				paneMenu = null;
			}}
			oncollapse={() => {
				collapseSelection();
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
				stroke="var(--spline)"
				stroke-width="1.5"
			/>
		</svg>
	{/if}
	</div>
</div>

<style>
	/* One source of truth for the signal-wire look: the splines, the in-flight reconnect wire, and the
	   reroute knots that sit on them all read these (the knots via inline styles). Declared on :root
	   so the fixed reconnect overlay -- which lives outside the flow container -- inherits them too. */
	:global(:root) {
		--spline: #7fd6db;
		--spline-glow-filter: drop-shadow(0 0 3px rgba(94, 226, 231, 0.7))
			drop-shadow(0 0 7px rgba(94, 226, 231, 0.35));
		--spline-glow-box:
			0 0 3px rgba(94, 226, 231, 0.7), 0 0 7px rgba(94, 226, 231, 0.35);
	}
	:global(.signal-flow .svelte-flow__edge-path) {
		stroke: var(--spline);
		stroke-width: 1.5;
		/* Soften the dash ends: a subtle bevel on the hard rectangles, small vs. the 8px dash length. */
		stroke-linecap: round;
		/* A soft cyan halo, so splines read as carrying signal rather than as flat lines. Two stacked
		   shadows: a tight bright core plus a wider faint bloom around it. */
		filter: var(--spline-glow-filter);
	}
	:global(.signal-flow .svelte-flow__edge.selected .svelte-flow__edge-path) {
		stroke: #5865f2;
		/* Selected wires keep the blurple stroke but glow wider so the selection reads at a glance. */
		filter: drop-shadow(0 0 4px rgba(120, 132, 255, 0.8)) drop-shadow(0 0 9px rgba(88, 101, 242, 0.45));
	}
	/* A wire that runs through reroute knots is drawn as one path by its first segment, so selecting
	   any segment of it has to highlight that path -- the rule above only sees its own edge. */
	:global(.signal-flow .svelte-flow__edge-path.spline-selected) {
		stroke: #5865f2;
		filter: drop-shadow(0 0 4px rgba(120, 132, 255, 0.8)) drop-shadow(0 0 9px rgba(88, 101, 242, 0.45));
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
	/* "Animate signal" off (Settings): wires go solid. Done in CSS rather than by clearing each edge's
	   `animated` flag, so the setting stays a view preference and the graph data is left alone. */
	:global(.signal-flow.static-splines .svelte-flow__edge.animated path:not(.svelte-flow__edge-interaction)) {
		stroke-dasharray: none;
		animation: none;
	}
	/* Per-edge overrides (attributes panel). Both carry an extra class over the rules above so they
	   win on specificity rather than on source order. */
	:global(.signal-flow .svelte-flow__edge.animated path.svelte-flow__edge-path.spline-solid) {
		stroke-dasharray: none;
		animation: none;
	}
	/* Same keyframes, played backwards: dashes travel target -> source. */
	:global(.signal-flow .svelte-flow__edge.animated path.svelte-flow__edge-path.spline-reverse) {
		animation-direction: reverse;
	}
	.reconnect-path {
		stroke-dasharray: 8 6;
		stroke-linecap: round;
		filter: var(--spline-glow-filter);
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
	/* An arrow's bounding box is a big rectangle around a thin curve, so the node is click-through
	   except on the line itself and its control dots -- otherwise it would swallow clicks meant for
	   the canvas (or nodes) sitting in its empty corners. */
	:global(.signal-flow .svelte-flow__node-arrow) {
		pointer-events: none;
	}
	:global(.signal-flow .svelte-flow__node-arrow .arrow-interactive) {
		pointer-events: auto;
	}
	/* Our node type is named 'group', which collides with xyflow's built-in 'group' node styling and
	   picks up its default border/background wrapper. The GroupNode draws its own card, so strip that. */
	:global(.signal-flow .svelte-flow__node-group),
	:global(.signal-flow .svelte-flow__node-group.selected),
	:global(.signal-flow .svelte-flow__node-group:focus),
	:global(.signal-flow .svelte-flow__node-group:focus-visible) {
		border: none;
		background: transparent;
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
