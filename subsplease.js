const BASE_URL = 'https://subsplease.org/api/'

function hashFromMagnet (magnet) {
  const match = magnet.match(/urn:btih:([a-fA-F0-9]{40}|[a-zA-Z2-7]{32})/i)
  return match ? match[1].toLowerCase() : ''
}

async function search (query) {
  const url = `${BASE_URL}?f=search&tz=UTC&s=${encodeURIComponent(query)}`
  const res = await fetch(url)
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
        hash,
        title: `[SubsPlease] ${show} - ${episode} (1080p)`,
        seeders: 0,
        leechers: 0,
        size: 0,
        magnet: dl.magnet
      })
    }
  }

  return results
}

export default class SubsPlease {
  async findByMedia ({ media, episode }) {
    const title = media.title?.romaji ?? media.title?.english ?? ''
    return search(`${title} ${String(episode).padStart(2, '0')}`)
  }

  async findByQuery ({ query }) {
    return search(query)
  }

  async findByBatch ({ media }) {
    const title = media.title?.romaji ?? media.title?.english ?? ''
    return search(title)
  }
}
