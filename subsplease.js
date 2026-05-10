function hashFromMagnet(magnet) {
  const match = magnet.match(/urn:btih:([a-fA-F0-9]{40}|[a-zA-Z2-7]{32})/i)
  return match ? match[1].toLowerCase() : ''
}

async function search(fetchFn, query) {
  const url = `https://subsplease.org/api/?f=search&tz=UTC&s=${encodeURIComponent(query)}`
  const res = await fetchFn(url)
  if (!res.ok) throw new Error(`SubsPlease API error: ${res.status}`)

  const data = await res.json()
  const results = []

  for (const entry of Object.values(data)) {
    const { show, episode, downloads } = entry
    if (!downloads?.length) continue

    for (const dl of downloads) {
      if (dl.res !== '1080') continue

      const hash = hashFromMagnet(dl.magnet)
      if (!hash) continue

      results.push({
        title: `[SubsPlease] ${show} - ${episode} (1080p)`,
        link: dl.magnet,
        hash,
        seeders: 0,
        leechers: 0,
        downloads: 0,
        accuracy: 'high',
        size: 0,
        date: new Date()
      })
    }
  }

  return results
}

export default new class {
  async test() {
    try {
      const res = await fetch('https://subsplease.org/api/?f=latest&tz=UTC')
      return res.ok
    } catch {
      return false
    }
  }

  async single({ titles, episode, fetch: fetchFn }) {
    const title = titles?.[0] ?? ''
    const ep = episode != null ? String(episode).padStart(2, '0') : ''
    return search(fetchFn, ep ? `${title} ${ep}` : title)
  }

  async batch({ titles, fetch: fetchFn }) {
    return search(fetchFn, titles?.[0] ?? '')
  }

  async movie({ titles, fetch: fetchFn }) {
    return search(fetchFn, titles?.[0] ?? '')
  }
}

