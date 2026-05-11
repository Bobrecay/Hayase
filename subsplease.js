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

  async search(query, episode) {
    const res = await fetch(`${this.url}?f=search&tz=UTC&s=${encodeURIComponent(query)}`)
    return this.parse(await res.json(), episode)
  }

  buildQueries(titles, season) {
    const queries = [...titles]
    // If a season is detected in any title (e.g. "Season 2", "2nd Season"), also try S2 style
    if (season && season > 1) {
      const base = titles[0].replace(/\s*(season\s*\d+|\d+(st|nd|rd|th)\s*season|S\d+)\s*/gi, '').trim()
      queries.push(`${base} S${season}`)
      queries.push(`${base} Season ${season}`)
      queries.push(`${base} Part ${season}`)
    }
    return [...new Set(queries)]
  }

  detectSeason(titles) {
    for (const title of titles) {
      const s = title.match(/(?:Season\s*|S)(\d+)/i) || title.match(/(\d+)(?:st|nd|rd|th)\s*Season/i)
      if (s) return Number(s[1])
    }
    return null
  }

  async single({ titles, episode }) {
    if (!navigator.onLine) return []
    const ep = String(episode).padStart(2, '0')
    const season = this.detectSeason(titles)
    const queries = this.buildQueries(titles, season)

    for (const q of queries) {
      const results = await this.search(`${q} ${ep}`, episode)
      if (results.length > 0) return results
    }

    // Fallback for movies where SubsPlease uses "Movie" not an episode number
    for (const q of queries) {
      const results = await this.search(q, null)
      if (results.length > 0) return results
    }

    return []
  }

  async batch({ titles }) {
    if (!navigator.onLine) return []
    const season = this.detectSeason(titles)
    const queries = this.buildQueries(titles, season)

    for (const q of queries) {
      const results = await this.search(`${q} Batch`, null)
      if (results.length > 0) return results
    }
    return []
  }

  async movie({ titles }) {
    if (!navigator.onLine) return []
    const season = this.detectSeason(titles)
    const queries = this.buildQueries(titles, season)

    for (const q of queries) {
      const results = await this.search(q, null)
      if (results.length > 0) return results
    }
    return []
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
