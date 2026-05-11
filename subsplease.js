export default new class SubsPlease {
  base = 'https://subsplease.org/api/'

  async single({ anilistId, titles, episode, fetch: fetchFn }) {
    let title = titles?.[0] ?? ''

    if (anilistId) {
      try {
        const res = await fetchFn('https://graphql.anilist.co', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
          body: JSON.stringify({
            query: `query ($id: Int) { Media (id: $id, type: ANIME) { title { romaji } } }`,
            variables: { id: Number(anilistId) }
          })
        })
        const json = await res.json()
        title = json?.data?.Media?.title?.romaji ?? title
      } catch {}
    }

    const query = title + (episode ? ` ${episode}` : '')
    const res = await fetchFn(`${this.base}?f=search&tz=America/New_York&s=${encodeURIComponent(query)}`)
    const data = await res.json()

    if (!data || typeof data !== 'object') return []

    const results = []
    for (const key in data) {
      const item = data[key]
      if (!item.downloads) continue
      for (const dl of item.downloads) {
        if (dl.res !== '1080') continue
        const hash = dl.magnet?.match(/btih:([a-fA-F0-9]+)/i)?.[1]
        if (!hash) continue
        results.push({
          title: `${item.show} - ${item.episode} (1080p)`,
          link: dl.magnet,
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

  batch = this.single
  movie = this.single

  async test() {
    try {
      const res = await fetch(this.base + '?f=search&tz=America/New_York&s=One%20Piece')
      return res.ok
    } catch {
      return false
    }
  }
}()
