import ColorThief from 'colorthief';
import { fetchWithRetry } from './wiki.js';

const toHex = (rgb) => '#' + rgb.map((c) => c.toString(16).padStart(2, '0')).join('');

async function dominantColor(imageUrl) {
    const res = await fetchWithRetry(imageUrl);
    const buffer = Buffer.from(await res.arrayBuffer());
    return toHex(await ColorThief.getColor(buffer));
}

/**
 * Fills in each mob's background colour. Colours from the previous dataset are reused by image
 * URL, so only images the scraper hasn't seen before get downloaded. Mobs whose image doesn't
 * exist on the wiki are dropped, since the game would show a broken image.
 */
export async function addColors(mobs, previousMobs = [], { concurrency = 4 } = {}) {
    const cache = new Map(previousMobs.filter((m) => m.color).map((m) => [m.image, m.color]));
    const toFetch = [...new Set(mobs.map((m) => m.image).filter((url) => !cache.has(url)))];
    const missing = new Set();

    console.log(`Colours: ${cache.size} cached, ${toFetch.length} to download`);

    let next = 0;
    let failed = 0;
    const worker = async () => {
        while (next < toFetch.length) {
            const url = toFetch[next++];
            try {
                cache.set(url, await dominantColor(url));
            } catch (error) {
                if (error.status === 404) {
                    missing.add(url);
                    console.warn(`  image missing, dropping its mobs: ${url}`);
                } else {
                    failed++;
                    console.warn(`  colour failed for ${url}: ${error.message}`);
                }
            }
            if (next % 200 === 0) console.log(`  ${next}/${toFetch.length}`);
        }
    };
    await Promise.all(Array.from({ length: concurrency }, worker));

    if (failed) console.warn(`Colours: ${failed} image(s) failed, the game falls back to a default`);
    return mobs
        .filter((m) => !missing.has(m.image))
        .map((m) => ({ ...m, color: cache.get(m.image) ?? null }));
}
