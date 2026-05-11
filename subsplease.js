export default new class SubsPlease {
  url = 'https://nyaa.si/'

  parse(xml) {
    const doc = new DOMParser().parseFromString(xml, 'application/xml')
    return [...doc.querySelectorAll('item')].map(item => {
      const get = tag => item.querySelector(tag)?.textContent ?? ''
      const magnet = get('nyaa\\:magnetLink') || get('magnetLink')
      const hash = magnet.match(/urn:btih:([a-fA-F0-9]{40}|[a-zA-Z2-7]{32})/i)?.[1]?.toLowerCase()
      if (!hash) return null
      return {
        title: get('title'),
        link: magnet,
        hash,
        size: 0,
        seeders: Number(get('nyaa\\:seeders') || get('seeders')) || 0,
        leechers: Number(get('nyaa\\:leechers') || get('leechers')) || 0,
        downloads: Number(get('nyaa\\:downloads') || get('downloads')) || 0,
        accuracy: 'high',
        date: new Date(get('pubDate'))
      }
    }).filter(Boolean)
  }

  async single({ media, episode }) {
    if (!navigator.onLine) return []
    const title = media.title?.romaji ?? media.title?.english ?? ''
    const ep = String(episode).padStart(2, '0')
    const q = encodeURIComponent(`[SubsPlease] ${title} - ${ep}`)
    const res = await fetch(`${this.url}?page=rss&q=${q}&c=1_2&f=0`)
    return this.parse(await res.text())
  }

  async batch({ media }) {
    if (!navigator.onLine) return []
    const title = media.title?.romaji ?? media.title?.english ?? ''
    const q = encodeURIComponent(`[SubsPlease] ${title} Batch`)
    const res = await fetch(`${this.url}?page=rss&q=${q}&c=1_2&f=0`)
    return this.parse(await res.text())
  }

  async movie({ media }) {
    if (!navigator.onLine) return []
    const title = media.title?.romaji ?? media.title?.english ?? ''
    const q = encodeURIComponent(`[SubsPlease] ${title}`)
    const res = await fetch(`${this.url}?page=rss&q=${q}&c=1_2&f=0`)
    return this.parse(await res.text())
  }

  async test() {
    try {
      if (!(await fetch(this.url)).ok) throw new Error(`Failed to load data from ${this.url}! Is the site down?`)
      return true
    } catch (error) {
      throw new Error(`Could not reach ${this.url}! Does the site work in your region?`)
    }
  }
}
