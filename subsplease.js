export default new class SubsPlease {
  url = 'https://subsplease.org/api/'

  async single({ media, episode }) {
    if (!navigator.onLine) return []
    const title = media.title?.romaji ?? media.title?.english ?? ''
    const ep = String(episode).padStart(2, '0')
    const res = await fetch(`${this.url}?f=search&tz=America/New_York&s=${encodeURIComponent(`${title} ${ep}`)}`)
    const data = await res.json()
    return Object.values(data).flatMap(({ show, episode, downloads = [] }) =>
      downloads.flatMap(({ res, magnet }) => {
        const match = magnet.match(/urn:btih:([a-fA-F0-9]{40}|[a-zA-Z2-7]{32})/i)
        if (!match) return []
        return [{
          hash: match[1].toLowerCase(),
          link: magnet,
          title: `[SubsPlease] ${show} - ${episode} (${res === 'sd' ? 'SD' : res + 'p'})`,
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

  batch = this.single
  movie = this.single

  async test() {
    try {
      if (!(await fetch('https://subsplease.org?f=search&tz=America/New_York&s=')).ok) throw new Error(`Failed to load data from ${this.url}! Is the site down?`)
      return true
    } catch (error) {
      throw new Error(`Could not reach ${this.url}! Does the site work in your region?`)
    }
  }
}
