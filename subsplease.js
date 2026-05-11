export default new class SubsPlease {
  base = 'https://subsplease.org/api/'

  async getRomaji(anilistId) {
    const query = `query ($id: Int) { Media (id: $id, type: ANIME) { title { romaji } } }`
    const res = await fetch('https://graphql.anilist.co', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({ query, variables: { id: Number(anilistId) } })
    })
    const json = await res.json()
    return json?.data?.Media?.title?.romaji ?? null
  }

  async single({ anilistId, titles, episode }) {
    if (!titles?.length) return []

    let title = titles[0]
    if (anilistId) {
      const romaji = await this.getRomaji(anilistId)
      if (romaji) title = romaji
    }

    const query = title + (episode ? ` ${episode}` : '')
    const url = `${this.base}?f=search&tz=America/New_York&s=${encodeURIComponent(query)}`

    const res = await fetch(url)
    const data = await res.json()

    if (!data || typeof data !== 'object') return []

    return this.map(data)
  }

  batch = this.single
  movie = this.single

  map(data) {
    const results = []
    for (const key in data) {
      const item = data[key]
      if (!item.downloads) continue

      for (const download of item.downloads) {
        if (download.res !== '1080') continue

        const hash = download.magnet?.match(/btih:([a-fA-F0-9]+)/)?.[1]
        if (!hash) continue

        results.push({
          title: `${item.show} - ${item.episode} (1080p)`,
          link: download.magnet,
          hash,
          seeders: 0,
          leechers: 0,
          downloads: 0,
          size: 0,
          date: new Date(item.release_date),
          verified: true,
          type: 'alt',
          accuracy: 'high'
        })
      }
    }
    return results
  }

  async test() {
    try {
      const res = await fetch(this.base + '?f=search&tz=America/New_York&s=One%20Piece')
      return res.ok
    } catch {
      return false
    }
  }
}()
