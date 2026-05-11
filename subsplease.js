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

  // Strips season words and returns { base, season } e.g. "Overlord IV" -> { base: "Overlord", season: 4 }
  stripSeason(title) {
    const patterns = [
      // "Season 2", "S2"
      { re: /\s+S(?:eason\s*)?(\d+)$/i, fn: m => Number(m[1]) },
      // "2nd Season", "3rd Season"
      { re: /\s+(\d+)(?:st|nd|rd|th)\s+Season$/i, fn: m => Number(m[1]) },
      // Roman numerals II, III, IV, V, VI, VII, VIII (season 2-8)
      { re: /\s+(II|III|IV|V|VI|VII|VIII)$/i, fn: m => ({ II:2,III:3,IV:4,V:5,VI:6,VII:7,VIII:8 })[m[1].toUpperCase()] },
      // "Part 2"
      { re: /\s+Part\s+(\d+)$/i, fn: m => Number(m[1]) },
    ]
    for (const { re, fn } of patterns) {
      const m = title.match(re)
      if (m) return { base: title.replace(re, '').trim(), season: fn(m) }
    }
    return { base: title, season: null }
  }

  async single({ titles, episode }) {
    if (!navigator.onLine) return []
    const ep = String(episode).padStart(2, '0')

    // First try all titles Hayase gave us as-is
    for (const title of titles) {
      const results = await this.search(`${title} ${ep}`, episode)
      if (results.length > 0) return results
    }

    // Fallback: strip season from first title and re-add as S2
    const { base, season } = this.stripSeason(titles[0])
    if (season && season > 1) {
      const results = await this.search(`${base} S${season} ${ep}`, episode)
      if (results.length > 0) return results
    }

    // Final fallback for movies
    for (const title of titles) {
      const results = await this.search(title, null)
      if (results.length > 0) return results
    }

    return []
  }

  async batch({ titles }) {
    if (!navigator.onLine) return []
    const res = await fetch(`${this.url}?f=search&tz=UTC&s=${encodeURIComponent(`${titles[0]} Batch`)}`)
    return this.parse(await res.json(), null)
  }
 
  async movie({ titles }) {
    if (!navigator.onLine) return []
    const res = await fetch(`${this.url}?f=search&tz=UTC&s=${encodeURIComponent(titles[0])}`)
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
