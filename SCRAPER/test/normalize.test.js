import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { displayVariant, imageUrl, normalizeMonsters, wikiUrl } from '../src/normalize.js';

const rows = JSON.parse(readFileSync(new URL('./fixtures/bucket-rows.json', import.meta.url), 'utf8'));
const mobs = normalizeMonsters(rows);
const find = (name, level) => mobs.find((m) => m.name === name && m.combatLevel === level);

test('displayVariant never reveals the combat level', () => {
    assert.equal(displayVariant('Level 5'), null);
    assert.equal(displayVariant('Level 8 (3)'), null);
    assert.equal(displayVariant('Level 1,234'), null);
    assert.equal(displayVariant('Level 70 (Temple Trekking)'), 'Temple Trekking');
    assert.equal(displayVariant('Level 2 (armed)'), 'armed');
    assert.equal(displayVariant('Standard (Level 20)'), 'Standard');
    assert.equal(displayVariant('Blue (level 50)'), 'Blue');
    assert.equal(displayVariant('Standard (3)'), 'Standard');
    assert.equal(displayVariant('Knife'), 'Knife');
    assert.equal(displayVariant(undefined), null);
});

test('image and wiki URLs use underscores and escape special characters', () => {
    assert.equal(imageUrl('File:Goblin (level 5).png'), 'https://oldschool.runescape.wiki/images/Goblin_(level_5).png');
    assert.equal(
        imageUrl('File:The Maiden of Sugadinti (70% health).png'),
        'https://oldschool.runescape.wiki/images/The_Maiden_of_Sugadinti_(70%25_health).png',
    );
    assert.equal(wikiUrl('Goblin', 'Level 5'), 'https://oldschool.runescape.wiki/w/Goblin#Level_5');
    assert.equal(wikiUrl('Mithril dragon'), 'https://oldschool.runescape.wiki/w/Mithril_dragon');
});

test('drops rows without a level or image, unused variants and non-article pages', () => {
    assert.equal(mobs.some((m) => m.name === 'Solus Dellagar'), false);
    assert.equal(mobs.some((m) => m.name === 'Zero hero'), false);
    assert.equal(mobs.some((m) => m.name === 'Goblin raider'), false);
    assert.equal(mobs.some((m) => m.name.includes(':')), false);
    assert.equal(find('Goblin', 12), undefined);
});

test('collapses variants of one monster that share a combat level, preferring the plain one', () => {
    const goblins = mobs.filter((m) => m.name === 'Goblin');
    assert.deepEqual(goblins.map((m) => m.combatLevel).sort((a, b) => a - b), [2, 5]);
    assert.equal(find('Goblin', 2).image, 'https://oldschool.runescape.wiki/images/Goblin.png');

    const guards = mobs.filter((m) => m.name === 'Fortress Guard');
    assert.equal(guards.length, 1);
    assert.equal(guards[0].image, 'https://oldschool.runescape.wiki/images/Fortress_Guard.png');
});

test('produces the game entry shape', () => {
    assert.deepEqual(find('Ghoul', 70), {
        id: 'Ghoul#Level 70 (Temple Trekking)',
        name: 'Ghoul',
        variant: 'Temple Trekking',
        combatLevel: 70,
        image: 'https://oldschool.runescape.wiki/images/Ghoul.png',
        color: null,
        wikiUrl: 'https://oldschool.runescape.wiki/w/Ghoul#Level_70_(Temple_Trekking)',
    });
});

test('ids are unique', () => {
    assert.equal(new Set(mobs.map((m) => m.id)).size, mobs.length);
});
