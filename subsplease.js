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
            seeders: 0,
            leechers: 0,
            downloads: 0,
            accuracy: 'high',
            date: release_date ? new Date(release_date) : new Date()
          }]
        })
    })
  }

  async single({ titles, episode }) {
    if (!navigator.onLine) return []
    const ep = String(episode).padStart(2, '0')
    const res = await fetch(`${this.url}?f=search&tz=UTC&s=${encodeURIComponent(`${titles[0]} ${ep}`)}`)
    return this.parse(await res.json(), episode)
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
