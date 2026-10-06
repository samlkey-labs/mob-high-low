import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { fetchMonsterRows } from './wiki.js';
import { normalizeMonsters } from './normalize.js';
import { addColors } from './colors.js';
import { checkSanity, diffDatasets, formatSummary, hasChanges, serialize } from './dataset.js';

const DEFAULT_OUT = resolve(dirname(fileURLToPath(import.meta.url)), '../../FRONTEND/public/data/mobs.json');

const { values: args } = parseArgs({
    options: {
        out: { type: 'string', default: DEFAULT_OUT },
        summary: { type: 'string' }, // optional markdown summary path, used as the PR body
    },
});

async function readPrevious(path) {
    try {
        return JSON.parse(await readFile(path, 'utf8')).mobs ?? [];
    } catch (error) {
        if (error.code === 'ENOENT') return [];
        throw error;
    }
}

async function main() {
    const previousMobs = await readPrevious(args.out);
    console.log(`Previous dataset: ${previousMobs.length} mobs`);

    const rows = await fetchMonsterRows();
    console.log(`Fetched ${rows.length} infobox rows`);

    const mobs = await addColors(normalizeMonsters(rows), previousMobs);
    console.log(`Normalized to ${mobs.length} mobs`);

    checkSanity(mobs, previousMobs);

    const diff = diffDatasets(previousMobs, mobs);
    const summary = formatSummary(diff, mobs.length);
    console.log(summary);
    if (args.summary) await writeFile(args.summary, summary);

    // Leave the file untouched when nothing changed, so a fresh timestamp alone doesn't open a PR
    if (!hasChanges(diff)) {
        console.log('No changes, dataset left as is');
        return;
    }

    await mkdir(dirname(args.out), { recursive: true });
    await writeFile(args.out, serialize(mobs, new Date().toISOString()));
    console.log(`Wrote ${args.out}`);
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});
