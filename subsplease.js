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

async function searchRSS(query) {
  const url = `https://subsplease.org/rss/?r=1080&s=${encodeURIComponent(query)}`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`SubsPlease RSS error: ${res.status}`)
  const text = await res.text()

  const results = []
  const items = text.split('<item>').slice(1)

  for (const item of items) {
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

// Try each title in order, return first non-empty result.
// SubsPlease uses romaji names, so we try all titles Hayase provides
// since we don't know which index is romaji.
async function searchWithFallback(titles, ep) {
  const ep2 = ep != null ? String(ep).padStart(2, '0') : ''
  for (const title of titles) {
    if (!title) continue
    const query = ep2 ? `${title} ${ep2}` : title
    const results = await searchRSS(query)
    if (results.length > 0) return results
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

  async single({ titles, episode }) {
    return searchWithFallback(titles ?? [], episode)
  }

  async batch({ titles }) {
    return searchWithFallback(titles ?? [], null)
  }

  async movie({ titles }) {
    return searchWithFallback(titles ?? [], null)
  }
}
