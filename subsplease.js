function hashFromMagnet(magnet) {
  const match = magnet.match(/urn:btih:([a-fA-F0-9]{40}|[a-zA-Z2-7]{32})/i)
  return match ? match[1].toLowerCase() : ''
}

function parseSize(sizeStr) {
  if (!sizeStr) return 0
  const match = sizeStr.match(/([\d.]+)\s*(GiB|MiB|KiB|GB|MB|KB)/i)
  if (!match) return 0
  const num = parseFloat(match[1])
  const unit = match[2].toUpperCase()
  if (unit === 'GIB' || unit === 'GB') return Math.round(num * 1024 * 1024 * 1024)
  if (unit === 'MIB' || unit === 'MB') return Math.round(num * 1024 * 1024)
  if (unit === 'KIB' || unit === 'KB') return Math.round(num * 1024)
  return 0
}

async function getRomajiTitle(anilistId, fetchFn) {
  const query = `query ($id: Int) { Media (id: $id, type: ANIME) { title { romaji } } }`
  const res = await fetchFn('https://graphql.anilist.co', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
    body: JSON.stringify({ query, variables: { id: Number(anilistId) } })
  })
  if (!res.ok) throw new Error(`AniList error: ${res.status}`)
  const json = await res.json()
  return json?.data?.Media?.title?.romaji ?? null
}

export default new class {
  async test() {
    try {
      const res = await fetch('https://subsplease.org/rss/?r=1080')
      return res.ok
    } catch {
      return false
    }
  }

  async single({ anilistId, titles, episode, fetch: fetchFn }) {
    // Step 1: get romaji from AniList
    let romaji
    try {
      romaji = await getRomajiTitle(anilistId, fetchFn)
    } catch(e) {
      throw new Error(`AniList lookup failed: ${e.message}`)
    }

    // Step 2: fetch RSS
    const url = `https://subsplease.org/rss/?r=1080&s=${encodeURIComponent(romaji ?? titles?.[0] ?? '')}`
    let text
    try {
      const res = await fetchFn(url)
      text = await res.text()
    } catch(e) {
      throw new Error(`RSS fetch failed: ${e.message}`)
    }

    // Step 3: log the first 500 chars so we can see what we're getting
    throw new Error(`DEBUG romaji=${romaji} rssPreview=${text?.slice(0, 500)}`)
  }

  async batch({ anilistId, titles, episode, fetch: fetchFn }) {
    return this.single({ anilistId, titles, episode, fetch: fetchFn })
  }

  async movie({ anilistId, titles, episode, fetch: fetchFn }) {
    return this.single({ anilistId, titles, episode, fetch: fetchFn })
  }
}
