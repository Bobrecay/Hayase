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

// Normalize a string for loose comparison: lowercase, strip punctuation/spaces
function normalize(str) {
  return str.toLowerCase().replace(/[^a-z0-9]/g, '')
}

async function search(fetchFn, titles, ep) {
  // Fetch full 1080p magnet feed — no search param, filter client-side
  // This avoids relying on SubsPlease's ?s= param which may not work reliably
  const res = await fetchFn('https://subsplease.org/rss/?r=1080')
  if (!res.ok) throw new Error(`SubsPlease RSS error: ${res.status}`)
  const text = await res.text()
  const all = parseItems(text)

  // Build normalized versions of all titles Hayase gave us
  const normTitles = (titles ?? []).filter(Boolean).map(normalize)

  // Optional episode filter e.g. "07"
  const epStr = ep != null ? String(ep).padStart(2, '0') : null

  return all.filter(item => {
    const normItem = normalize(item.title)
    // Must match at least one title
    const titleMatch = normTitles.some(t => normItem.includes(t))
    if (!titleMatch) return false
    // If we have an episode number, also filter by it
    if (epStr) {
      // RSS titles look like "... - 07 (1080p) ..."
      const epMatch = item.title.match(/- (\d+) \(/)
      if (epMatch && epMatch[1].padStart(2, '0') !== epStr) return false
    }
    return true
  })
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

  async single({ titles, episode, fetch: fetchFn }) {
    if (!navigator.onLine) return []
    return search(fetchFn, titles, episode)
  }

  async batch({ titles, fetch: fetchFn }) {
    if (!navigator.onLine) return []
    return search(fetchFn, titles, null)
  }

  async movie({ titles, fetch: fetchFn }) {
    if (!navigator.onLine) return []
    return search(fetchFn, titles, null)
  }
}
