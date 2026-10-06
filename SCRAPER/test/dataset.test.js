import { test } from 'node:test';
import assert from 'node:assert/strict';
import { checkSanity, diffDatasets, formatSummary, hasChanges, serialize } from '../src/dataset.js';

const mob = (id, combatLevel, extra = {}) => ({ id, name: id, variant: null, combatLevel, image: `${id}.png`, color: '#000000', wikiUrl: id, ...extra });
const many = (n) => Array.from({ length: n }, (_, i) => mob(`Mob ${i}`, i + 1));

test('checkSanity rejects tiny or sharply shrunk datasets', () => {
    assert.throws(() => checkSanity(many(10)), /minimum/);
    assert.throws(() => checkSanity(many(800), many(1000)), /shrank/);
    assert.doesNotThrow(() => checkSanity(many(950), many(1000)));
    assert.doesNotThrow(() => checkSanity(many(600)));
});

test('diffDatasets reports added, removed and changed mobs', () => {
    const before = [mob('Goblin', 2), mob('Cow', 2), mob('Imp', 7)];
    const after = [mob('Goblin', 2), mob('Cow', 3), mob('Imp', 7, { color: '#ffffff' }), mob('Vardorvis', 1029)];
    const diff = diffDatasets(before, after);

    assert.deepEqual(diff.added.map((m) => m.id), ['Vardorvis']);
    assert.deepEqual(diff.removed, []);
    assert.deepEqual(diff.levelChanged.map(({ mob, from }) => [mob.id, from, mob.combatLevel]), [['Cow', 2, 3]]);
    assert.equal(diff.otherChanges, 1);
    assert.equal(hasChanges(diff), true);

    const summary = formatSummary(diff, after.length);
    assert.match(summary, /Vardorvis: level 1029/);
    assert.match(summary, /Cow: 2 → 3/);
});

test('identical datasets have no changes', () => {
    const diff = diffDatasets(many(5), many(5));
    assert.equal(hasChanges(diff), false);
    assert.match(formatSummary(diff, 5), /No changes/);
});

test('serialize writes valid JSON with one mob per line', () => {
    const text = serialize(many(3), '2026-10-06T00:00:00.000Z');
    const parsed = JSON.parse(text);
    assert.equal(parsed.version, 1);
    assert.equal(parsed.mobs.length, 3);
    assert.equal(text.split('\n').filter((l) => l.includes('"id"')).length, 3);
});
