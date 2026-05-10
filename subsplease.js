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
  // Magnet feed (?r=1080) includes <torrent:magnetURI>; torrent feed (?t&r=1080) does not
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
    // titles[0] is romaji — the format SubsPlease uses in their release names
    const title = titles?.[0] ?? ''
    const ep = episode != null ? String(episode).padStart(2, '0') : ''
    return searchRSS(ep ? `${title} ${ep}` : title)
  }

  async batch({ titles }) {
    return searchRSS(titles?.[0] ?? '')
  }

  async movie({ titles }) {
    return searchRSS(titles?.[0] ?? '')
  }
}
