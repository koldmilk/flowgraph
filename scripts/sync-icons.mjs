// Publishes the Material Design icon set into static/ and writes a name manifest beside it.
//
// Why copy instead of importing: the set is 2,122 icons in five styles. Bundling them (import.meta.glob)
// either inlines megabytes of path data or emits ten thousand tiny chunks, and the picker only ever
// needs the *names* up front -- the artwork is fetched one icon at a time, by URL, as it's shown. So
// the icons are served as plain static files and the manifest is a single small fetch.
//
// The copy is generated, not committed (see .gitignore). It runs from predev/prebuild, and no-ops when
// the manifest already matches, so it costs nothing after the first run.
import { cp, mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const source = path.join(root, 'node_modules', '@material-design-icons', 'svg');
const target = path.join(root, 'static', 'material-icons');
const manifestPath = path.join(target, 'index.json');

// Every style ships the same icon names, so one list covers all five.
const STYLES = ['filled', 'outlined', 'round', 'sharp', 'two-tone'];

async function main() {
	let names;
	try {
		names = (await readdir(path.join(source, STYLES[0])))
			.filter((file) => file.endsWith('.svg'))
			.map((file) => file.slice(0, -4))
			.sort();
	} catch {
		// Not fatal: the app builds fine, the icon picker just comes up empty until the dep is there.
		console.warn(
			'[icons] @material-design-icons/svg not found -- run `npm install` to enable the icon node.'
		);
		return;
	}

	const manifest = { styles: STYLES, names };

	try {
		const existing = JSON.parse(await readFile(manifestPath, 'utf8'));
		if (existing.names?.length === names.length && existing.styles?.length === STYLES.length) {
			console.log(`[icons] up to date (${names.length} icons x ${STYLES.length} styles)`);
			return;
		}
	} catch {
		// No manifest yet (or an unreadable one) -- fall through and rebuild.
	}

	await mkdir(target, { recursive: true });
	for (const style of STYLES) {
		await cp(path.join(source, style), path.join(target, style), { recursive: true });
	}
	await writeFile(manifestPath, JSON.stringify(manifest));
	console.log(`[icons] copied ${names.length} icons x ${STYLES.length} styles into static/`);
}

main().catch((err) => {
	console.error('[icons] failed:', err);
	process.exit(1);
});
