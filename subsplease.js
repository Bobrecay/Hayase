// @ts-check
/// <reference path="./index.d.ts" />

import { Extension } from 'hayase-extensions'

const BASE_URL = 'https://subsplease.org/api/'

/**
 * Extracts the info hash from a magnet URI.
 * Magnet links look like: magnet:?xt=urn:btih:<HASH>&...
 * @param {string} magnet
 * @returns {string}
 */
function hashFromMagnet (magnet) {
  const match = magnet.match(/urn:btih:([a-fA-F0-9]{40}|[a-zA-Z2-7]{32})/i)
  return match ? match[1].toLowerCase() : ''
}

/**
 * Maps a resolution string from SubsPlease to a human-readable label.
 * @param {string} res
 * @returns {string}
 */
function resLabel (res) {
  if (res === '1080') return '1080p'
  if (res === '720') return '720p'
  if (res === 'sd') return 'SD'
  return res
}

/**
 * Calls the SubsPlease search API and returns normalised torrent results.
 * @param {string} query
 * @returns {Promise<import('hayase-extensions').SearchResult[]>}
 */
async function searchSubsPlease (query) {
  const url = `${BASE_URL}?f=search&tz=UTC&s=${encodeURIComponent(query)}`
  const res = await fetch(url)

  if (!res.ok) throw new Error(`SubsPlease API error: ${res.status}`)

  /** @type {Record<string, {show: string, episode: string, downloads: {res: string, magnet: string}[]}>} */
  const data = await res.json()

  const results = []

  for (const entry of Object.values(data)) {
    const { show, episode, downloads } = entry
    if (!downloads?.length) continue

    for (const dl of downloads) {
      const hash = hashFromMagnet(dl.magnet)
      if (!hash) continue

      results.push({
        hash,
        title: `[SubsPlease] ${show} - ${episode} (${resLabel(dl.res)})`,
        seeders: 0,   // SubsPlease API doesn't expose seeder counts
        leechers: 0,
        size: 0,
        magnet: dl.magnet,
      })
    }
  }

  return results
}

export default class SubsPlease extends Extension {
  /**
   * Called when Hayase searches by anime media metadata (title + episode).
   * @param {{ media: import('hayase-extensions').Media, episode: number }} opts
   */
  async findByMedia ({ media, episode }) {
    // Try romaji first, fall back to english title
    const title = media.title?.romaji ?? media.title?.english ?? ''
    return searchSubsPlease(`${title} ${String(episode).padStart(2, '0')}`)
  }

  /**
   * Called when the user types a free-text search query.
   * @param {{ query: string }} opts
   */
  async findByQuery ({ query }) {
    return searchSubsPlease(query)
  }

  /**
   * Called for batch/movie searches (no specific episode).
   * @param {{ media: import('hayase-extensions').Media }} opts
   */
  async findByBatch ({ media }) {
    const title = media.title?.romaji ?? media.title?.english ?? ''
    return searchSubsPlease(title)
  }
}
