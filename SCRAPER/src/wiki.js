export const WIKI_BASE = 'https://oldschool.runescape.wiki';
const API_URL = `${WIKI_BASE}/api.php`;

// The wiki asks API clients to identify themselves with a descriptive User-Agent
export const USER_AGENT = 'MobHighLow dataset scraper (https://github.com/samlkey/MobHighLow)';

const PAGE_SIZE = 1000;
const MONSTER_FIELDS = ['page_name', 'page_name_sub', 'version_anchor', 'combat_level', 'image'];

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// GET with a few retries and backoff, since a weekly job shouldn't fail on one flaky request
export async function fetchWithRetry(url, { retries = 3, ...init } = {}) {
    for (let attempt = 0; ; attempt++) {
        try {
            const res = await fetch(url, {
                ...init,
                headers: { 'User-Agent': USER_AGENT, ...init.headers },
            });
            if (!res.ok) throw Object.assign(new Error(`HTTP ${res.status} for ${url}`), { status: res.status });
            return res;
        } catch (error) {
            if (attempt >= retries || error.status === 404) throw error;
            await sleep(1000 * 2 ** attempt);
        }
    }
}

// Reads the structured infobox_monster data via the wiki's Bucket API, one page at a time
export async function fetchMonsterRows() {
    const select = MONSTER_FIELDS.map((f) => `'${f}'`).join(',');
    const rows = [];

    for (let offset = 0; ; offset += PAGE_SIZE) {
        const query = `bucket('infobox_monster').select(${select}).limit(${PAGE_SIZE}).offset(${offset}).run()`;
        const url = `${API_URL}?${new URLSearchParams({ action: 'bucket', format: 'json', query })}`;
        const data = await (await fetchWithRetry(url)).json();

        if (data.error) throw new Error(`Bucket query failed: ${JSON.stringify(data.error)}`);
        if (!Array.isArray(data.bucket)) throw new Error('Bucket response missing "bucket" array');

        rows.push(...data.bucket);
        if (data.bucket.length < PAGE_SIZE) return rows;
    }
}
