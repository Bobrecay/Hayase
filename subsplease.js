export default new class SubsPlease {
  url = atob('aHR0cHM6Ly9zdWJzcGxlYXNlLm9yZy9hcGkv')

  parse(data, episode) {
    const epStr = episode != null ? String(episode).padStart(2, '0') : null
    return Object.values(data).flatMap(({ show, episode: itemEp, release_date, downloads = [] }) => {
      if (epStr) {
        const itemEpStr = String(itemEp).replace(/v\d+$/i, '').padStart(2, '0')
        if (itemEpStr !== epStr) return []
      }
      return downloads
        .filter(({ res }) => res === '1080')
        .flatMap(({ magnet }) => {
          const match = magnet.match(/urn:btih:([a-fA-F0-9]{40}|[a-zA-Z2-7]{32})/i)
          if (!match) return []
          const xlMatch = magnet.match(/xl=(\d+)/)
          return [{
            title: `[SubsPlease] ${show} - ${itemEp} (1080p)`,
            link: magnet,
            hash: match[1].toLowerCase(),
            size: xlMatch ? Number(xlMatch[1]) : 0,
            seeders: 5000,
            leechers: 0,
            downloads: 0,
            accuracy: 'high',
            date: release_date ? new Date(release_date) : new Date()
          }]
        })
    })
  }

  async single({ titles, episode, absoluteEpisodeNumber }) {
    if (!navigator.onLine) return []
    const ep = String(episode).padStart(2, '0')
    console.log(titles[0])
    const res = await fetch(`${this.url}?f=search&tz=UTC&s=${encodeURIComponent(`${titles[0]} ${ep}`)}`)
    const results = this.parse(await res.json(), episode)
    if (results.length > 0) return results
    
    const seasonTitles = titles
      .filter(t => /S\d+/i.test(t))
      .map(t => {
        const match = t.match(/^(.*?)\s*(S\d+)/i)
        return { base: match[1].trim(), season: match[2].toUpperCase() }
      })
    const { base, season } = seasonTitles[0]
    console.log(seasonTitles[0])
    const res2 = await fetch(`${this.url}?f=search&tz=UTC&s=${encodeURIComponent(`${base} ${season} ${ep}`)}`)
    const results2 = this.parse(await res2.json(), episode)
    if (results2.length > 0) return results2

    const romajiTitle = seasonTitles[0]
      .filter(t => /\d+(st|nd|rd|th)\s+Season/i.test(t))
      .map(t => t.replace(/\s*\d+(st|nd|rd|th)\s+Season.*/i, '').trim())
    console.log(romajiTitle)
    const absEP = String(absoluteEpisodeNumber).padStart(2, '0')
    const res3 = await fetch(`${this.url}?f=search&tz=UTC&s=${encodeURIComponent(`${romajiTitle} ${absEP}`)}`)
    const results3 = this.parse(await res3.json(), absEP)
    if (results3.length > 0) return results3

    // No results — could be a movie where SubsPlease uses "Movie" not an episode number
    const res4 = await fetch(`${this.url}?f=search&tz=UTC&s=${encodeURIComponent(`${titles[0]} Movie`)}`)
    return this.parse(await res4.json(), null)
  }

  async batch({ titles }) {
    if (!navigator.onLine) return []
    const res = await fetch(`${this.url}?f=search&tz=UTC&s=${encodeURIComponent(`${titles[0]} Batch`)}`)
    return this.parse(await res.json(), null)
  }
 
  async movie({ titles }) {
    if (!navigator.onLine) return []
    const res = await fetch(`${this.url}?f=search&tz=UTC&s=${encodeURIComponent(`${titles[0]} Movie`)}`)
    return this.parse(await res.json(), null)
  }

  async test() {
    try {
      if (!(await fetch(this.url + '?f=schedule&tz=UTC')).ok) throw new Error(`Failed to load data from ${this.url}! Is the site down?`)
      return true
    } catch (error) {
      throw new Error(`Could not reach ${this.url}! Does the site work in your region?`)
    }
  }
}
