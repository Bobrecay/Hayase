export default new class SubsPlease {
  url = atob('aHR0cHM6Ly9zdWJzcGxlYXNlLm9yZy9hcGkv')

  parse(data) {
    return Object.values(data).flatMap(({ show, episode, downloads = [] }) =>
      downloads.flatMap(({ res, magnet }) => {
        const match = magnet.match(/urn:btih:([a-fA-F0-9]{40}|[a-zA-Z2-7]{32})/i)
        if (!match) return []
        return [{
          title: `[SubsPlease] ${show} - ${episode} (${res === 'sd' ? 'SD' : res + 'p'})`,
          link: magnet,
          hash: match[1].toLowerCase(),
          size: 0,
          seeders: 0,
          leechers: 0,
          downloads: 0,
          accuracy: 'high',
          date: new Date()
        }]
      })
    )
  }

  async single({ titles, episode }) {
    if (!navigator.onLine) return []
    const ep = String(episode).padStart(2, '0')
    const res = await fetch(`${this.url}?f=search&tz=UTC&s=${encodeURIComponent(`${titles[0]} ${ep}`)}`)
    return this.parse(await res.json())
  }

  async batch({ titles }) {
    if (!navigator.onLine) return []
    const res = await fetch(`${this.url}?f=search&tz=UTC&s=${encodeURIComponent(titles[0])}`)
    return this.parse(await res.json())
  }

  async movie({ titles }) {
    if (!navigator.onLine) return []
    const res = await fetch(`${this.url}?f=search&tz=UTC&s=${encodeURIComponent(titles[0])}`)
    return this.parse(await res.json())
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
