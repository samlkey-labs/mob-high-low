import { WIKI_BASE } from './wiki.js';

// Variants that aren't (or are no longer) obtainable in game
const EXCLUDED_VARIANT = /\b(unused|historical)\b/i;

const toWikiPath = (text) => text.replace(/ /g, '_');

export function imageUrl(file) {
    const name = file.replace(/^File:/, '').trim();
    return `${WIKI_BASE}/images/${encodeURIComponent(toWikiPath(name))}`;
}

export function wikiUrl(pageName, anchor) {
    const page = `${WIKI_BASE}/w/${encodeURIComponent(toWikiPath(pageName))}`;
    return anchor ? `${page}#${encodeURIComponent(toWikiPath(anchor))}` : page;
}

// Version anchors are often "Level 5" or "Level 70 (Temple Trekking)", which would give the
// answer away, so strip the level and drop anything that's only a number
export function displayVariant(anchor) {
    if (!anchor) return null;
    let variant = anchor
        .replace(/\(?\blevel\s*\d[\d,]*\)?/gi, '')
        .replace(/\(\d+\)/g, '') // numbered duplicates e.g. "Standard (3)"
        .replace(/\s+/g, ' ')
        .trim();
    variant = variant.replace(/^\((.*)\)$/, '$1').replace(/^[\s,]+|[\s,]+$/g, '');
    if (!variant || /^\d+$/.test(variant)) return null;
    return variant;
}

function isUsable(row) {
    return (
        typeof row.page_name === 'string' &&
        !row.page_name.includes(':') && // skip non-article namespaces e.g. "RuneScape:Templates"
        Number.isInteger(row.combat_level) &&
        row.combat_level > 0 &&
        Array.isArray(row.image) &&
        row.image.length > 0 &&
        !EXCLUDED_VARIANT.test(row.version_anchor ?? '')
    );
}

// Lower is better when choosing which row represents a page + level
function rank(row) {
    let score = 0;
    if (EXCLUDED_VARIANT.test(row.image[0])) score += 2;
    if (displayVariant(row.version_anchor)) score += 1;
    return score;
}

/**
 * Turns raw infobox_monster rows into game entries.
 * Variants of the same monster that share a combat level are collapsed into one entry, since
 * they're indistinguishable for the game and would otherwise over-weight monsters with many
 * cosmetic variants.
 */
export function normalizeMonsters(rows) {
    const byPageAndLevel = new Map();
    for (const row of rows) {
        if (!isUsable(row)) continue;
        const key = `${row.page_name}\u0000${row.combat_level}`;
        const current = byPageAndLevel.get(key);
        if (!current || rank(row) < rank(current)) byPageAndLevel.set(key, row);
    }

    return [...byPageAndLevel.values()]
        .map((row) => ({
            id: row.page_name_sub || row.page_name,
            name: row.page_name,
            variant: displayVariant(row.version_anchor),
            combatLevel: row.combat_level,
            image: imageUrl(row.image[0]),
            color: null,
            wikiUrl: wikiUrl(row.page_name, row.version_anchor),
        }))
        .sort((a, b) => a.id.localeCompare(b.id) || a.combatLevel - b.combatLevel);
}
