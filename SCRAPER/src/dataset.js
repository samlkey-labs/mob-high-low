export const DATASET_VERSION = 1;

// Refuse to publish a dataset that shrank this much; it almost certainly means the scrape broke
export const MIN_MOBS = 500;
export const MAX_SHRINK_RATIO = 0.9;

export function checkSanity(mobs, previousMobs = []) {
    if (mobs.length < MIN_MOBS) {
        throw new Error(`Only ${mobs.length} mobs scraped (minimum ${MIN_MOBS}), refusing to write dataset`);
    }
    if (previousMobs.length && mobs.length < previousMobs.length * MAX_SHRINK_RATIO) {
        throw new Error(
            `Dataset shrank from ${previousMobs.length} to ${mobs.length} mobs, refusing to write dataset`,
        );
    }
}

const key = (m) => `${m.id}\u0000${m.combatLevel}`;
const label = (m) => (m.variant ? `${m.name} (${m.variant})` : m.name);

export function diffDatasets(previousMobs, mobs) {
    const before = new Map(previousMobs.map((m) => [m.id, m]));
    const after = new Map(mobs.map((m) => [m.id, m]));

    const added = mobs.filter((m) => !before.has(m.id));
    const removed = previousMobs.filter((m) => !after.has(m.id));
    const levelChanged = mobs
        .filter((m) => before.has(m.id) && before.get(m.id).combatLevel !== m.combatLevel)
        .map((m) => ({ mob: m, from: before.get(m.id).combatLevel }));

    const prevJson = new Map(previousMobs.map((m) => [key(m), JSON.stringify(m)]));
    const otherChanges = mobs.filter((m) => prevJson.has(key(m)) && prevJson.get(key(m)) !== JSON.stringify(m)).length;

    return { added, removed, levelChanged, otherChanges };
}

export function hasChanges(diff) {
    return diff.added.length + diff.removed.length + diff.levelChanged.length + diff.otherChanges > 0;
}

export function formatSummary(diff, total) {
    const list = (items, fmt) => items.map((x) => `- ${fmt(x)}`).join('\n');
    const lines = [`Scraped **${total}** mobs from the OSRS wiki.`, ''];

    if (diff.added.length) {
        lines.push(`### Added (${diff.added.length})`, list(diff.added, (m) => `${label(m)}: level ${m.combatLevel}`), '');
    }
    if (diff.removed.length) {
        lines.push(`### Removed (${diff.removed.length})`, list(diff.removed, (m) => `${label(m)}: level ${m.combatLevel}`), '');
    }
    if (diff.levelChanged.length) {
        lines.push(
            `### Combat level changed (${diff.levelChanged.length})`,
            list(diff.levelChanged, ({ mob, from }) => `${label(mob)}: ${from} → ${mob.combatLevel}`),
            '',
        );
    }
    if (diff.otherChanges) {
        lines.push(`${diff.otherChanges} other mob(s) changed image, colour or link.`, '');
    }
    if (!hasChanges(diff)) lines.push('No changes.');

    return lines.join('\n').trim() + '\n';
}

// One mob per line keeps git diffs (and PR reviews) readable
export function serialize(mobs, generatedAt) {
    const body = mobs.map((m) => '    ' + JSON.stringify(m)).join(',\n');
    return `{\n  "version": ${DATASET_VERSION},\n  "generatedAt": ${JSON.stringify(generatedAt)},\n  "mobs": [\n${body}\n  ]\n}\n`;
}
