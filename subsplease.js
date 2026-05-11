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
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: JSON.stringify({ query, variables: { id: Number(anilistId) } })
  })
  if (!res.ok) throw new Error(`AniList error: ${res.status}`)
  const json = await res.json()
  return json?.data?.Media?.title?.romaji ?? null
}

function parseItems(text) {
  const results = []
  for (const item of text.split('<item>').slice(1)) {
    const title = item.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/)?.[1]
      ?? item.match(/<title>(.*?)<\/title>/)?.[1]
    const magnet = item.match(/<torrent:magnetURI><!\[CDATA\[(.*?)\]\]><\/torrent:magnetURI>/)?.[1]
      ?? item.match(/<torrent:magnetURI>(.*?)<\/torrent:magnetURI>/)?.[1]
    const sizeStr = item.match(/<subsplease:size>(.*?)<\/subsplease:size>/)?.[1]
    const pubDate = item.match(/<pubDate>(.*?)<\/pubDate>/)?.[1]

    if (!title || !magnet) continue
    const hash = hashFromMagnet(magnet)
    if (!hash) continue

    results.push({
      title,
      link: magnet,
      hash,
      seeders: 0,
      leechers: 0,
      downloads: 0,
      accuracy: 'high',
      size: parseSize(sizeStr),
      date: pubDate ? new Date(pubDate) : new Date()
    })
  }
  return results
}

function normalize(str) {
  return str.toLowerCase().replace(/[^a-z0-9]/g, '')
}

async function search(fetchFn, romajiTitle, ep) {
  const epStr = ep != null ? String(ep).padStart(2, '0') : null
  const normRomaji = normalize(romajiTitle)

  // Try ?s= search first; if it returns nothing, fall back to full feed
  for (const url of [
    `https://subsplease.org/rss/?r=1080&s=${encodeURIComponent(romajiTitle)}`,
    `https://subsplease.org/rss/?r=1080`
  ]) {
    const res = await fetchFn(url)
    if (!res.ok) continue
    const text = await res.text()
    const items = parseItems(text)

    // Filter by romaji title match
    const filtered = items.filter(item => {
      // RSS titles: "[SubsPlease] Maid-san wa Taberu Dake - 07 (1080p) [HASH].mkv"
      // Extract the show name part between "] " and " - "
      const showMatch = item.title.match(/\[SubsPlease\] (.+?) - \d+ \(/)
      if (!showMatch) return false
      if (normalize(showMatch[1]) !== normRomaji) return false
      if (epStr) {
        const epMatch = item.title.match(/- (\d+) \(/)
        if (!epMatch || epMatch[1].padStart(2, '0') !== epStr) return false
      }
      return true
    })

    if (filtered.length > 0) return filtered
  }

  return []
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
    if (!navigator.onLine) return []
    const romaji = await getRomajiTitle(anilistId, fetchFn)
    return search(fetchFn, romaji ?? titles?.[0] ?? '', episode)
  }

  async batch({ anilistId, titles, fetch: fetchFn }) {
    if (!navigator.onLine) return []
    const romaji = await getRomajiTitle(anilistId, fetchFn)
    return search(fetchFn, romaji ?? titles?.[0] ?? '', null)
  }

  async movie({ anilistId, titles, fetch: fetchFn }) {
    if (!navigator.onLine) return []
    const romaji = await getRomajiTitle(anilistId, fetchFn)
    return search(fetchFn, romaji ?? titles?.[0] ?? '', null)
  }
}
