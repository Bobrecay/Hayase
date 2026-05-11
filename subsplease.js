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
  const query = `query($id:Int){Media(id:$id){title{romaji}}}`
  const res = await fetchFn('https://graphql.anilist.co', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, variables: { id: anilistId } })
  })
  if (!res.ok) throw new Error(`AniList error: ${res.status}`)
  const json = await res.json()
  return json?.data?.Media?.title?.romaji ?? null
}

async function searchRSS(fetchFn, romajiTitle, ep) {
  const url = `https://subsplease.org/rss/?r=1080&s=${encodeURIComponent(romajiTitle)}`
  const res = await fetchFn(url)
  if (!res.ok) throw new Error(`SubsPlease RSS error: ${res.status}`)
  const text = await res.text()

  const epStr = ep != null ? String(ep).padStart(2, '0') : null
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

    // Filter by episode if provided
    if (epStr) {
      const epMatch = title.match(/- (\d+) \(/)
      if (!epMatch || epMatch[1].padStart(2, '0') !== epStr) continue
    }

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

  async single({ anilistId, titles, episode, fetch: fetchFn }) {
    if (!navigator.onLine) return []
    const romaji = await getRomajiTitle(anilistId, fetchFn)
    return searchRSS(fetchFn, romaji ?? titles?.[0] ?? '', episode)
  }

  async batch({ anilistId, titles, fetch: fetchFn }) {
    if (!navigator.onLine) return []
    const romaji = await getRomajiTitle(anilistId, fetchFn)
    return searchRSS(fetchFn, romaji ?? titles?.[0] ?? '', null)
  }

  async movie({ anilistId, titles, fetch: fetchFn }) {
    if (!navigator.onLine) return []
    const romaji = await getRomajiTitle(anilistId, fetchFn)
    return searchRSS(fetchFn, romaji ?? titles?.[0] ?? '', null)
  }
}
