const BASE_URL = 'https://subsplease.org/api/'

function hashFromMagnet(magnet) {
  const match = magnet.match(/urn:btih:([a-fA-F0-9]{40}|[a-zA-Z2-7]{32})/i)
  return match ? match[1].toLowerCase() : ''
}

function resLabel(res) {
  if (res === '1080') return '1080p'
  if (res === '720') return '720p'
  if (res === 'sd') return 'SD'
  return res
}

async function searchSubsPlease(query, fetch) {
  const url = `${BASE_URL}?f=search&tz=UTC&s=${encodeURIComponent(query)}`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`SubsPlease API error: ${res.status}`)
  const data = await res.json()
  const results = []
  for (const entry of Object.values(data)) {
    const { show, episode, downloads } = entry
    if (!downloads?.length) continue
    for (const dl of downloads) {
      const hash = hashFromMagnet(dl.magnet)
      if (!hash) continue
      results.push({
        title: `[SubsPlease] ${show} - ${episode} (${resLabel(dl.res)})`,
        hash,
        link: dl.magnet,
        seeders: 0,
        leechers: 0,
        size: 0,
        accuracy: 'high',
        date: new Date(),
      })
    }
  }
  return results
}

export default new class SubsPlease {
  async single({ media, episode, fetch }) {
    const title = media.title?.romaji ?? media.title?.english ?? ''
    const ep = String(episode).padStart(2, '0')
    return searchSubsPlease(`${title} ${ep}`, fetch)
  }

  batch = this.single

  async movie({ media, fetch }) {
    const title = media.title?.romaji ?? media.title?.english ?? ''
    return searchSubsPlease(title, fetch)
  }

  async test({ fetch }) {
    try {
      const res = await fetch(`${BASE_URL}?f=schedule&tz=UTC`)
      if (!res.ok) throw new Error()
      return true
    } catch {
      throw new Error('Could not reach subsplease.org! Is the site down or blocked in your region?')
    }
  }
}
