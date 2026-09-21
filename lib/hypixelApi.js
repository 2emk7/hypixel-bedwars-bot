'use strict';

const { RateLimiter } = require('./rateLimiter');

const BASE_URL = 'https://api.hypixel.net/v2';

class HypixelApi {
  constructor(apiKey, requestsPerMinute) {
    if (!apiKey) throw new Error('HYPIXEL_API_KEY is not set');
    this.apiKey = apiKey;
    this.limiter = new RateLimiter(requestsPerMinute);
  }

  _get(path, params = {}) {
    return this.limiter.schedule(async () => {
      const url = new URL(`${BASE_URL}${path}`);
      for (const [key, value] of Object.entries(params)) {
        url.searchParams.set(key, value);
      }

      const res = await fetch(url, {
        headers: { 'API-Key': this.apiKey },
      });

      let body;
      try {
        body = await res.json();
      } catch {
        throw new Error(`Hypixel API returned a non-JSON response (HTTP ${res.status})`);
      }

      if (res.status === 429) {
        throw new Error('Hypixel API rate limit hit — try again in a moment.');
      }
      if (!res.ok || body.success === false) {
        throw new Error(body.cause || `Hypixel API error (HTTP ${res.status})`);
      }

      return body;
    });
  }

  /** Swaps the key used for all future requests. */
  setKey(newKey) {
    this.apiKey = newKey;
  }

  /**
   * Tests a candidate key directly (bypassing the rate limiter / current
   * key) against a cheap endpoint, without committing to it. Used by
   * /apinew to validate a key before switching over.
   */
  async testKey(candidateKey) {
    let res;
    try {
      res = await fetch(`${BASE_URL}/punishmentstats`, {
        headers: { 'API-Key': candidateKey },
      });
    } catch (err) {
      return { valid: false, reason: `Network error: ${err.message}` };
    }

    let body;
    try {
      body = await res.json();
    } catch {
      return { valid: false, reason: `Non-JSON response (HTTP ${res.status})` };
    }

    if (res.status === 403) {
      return { valid: false, reason: body.cause || 'Invalid API key' };
    }
    if (!res.ok || body.success === false) {
      return { valid: false, reason: body.cause || `HTTP ${res.status}` };
    }
    return { valid: true };
  }

  /** Full player object, including the raw bedwars stats blob. */
  async getPlayer(uuid) {
    const body = await this._get('/player', { uuid });
    return body.player || null;
  }

  /** { online, gameType, mode, map } — null fields if offline or hidden. */
  async getStatus(uuid) {
    const body = await this._get('/status', { uuid });
    return body.session || null;
  }

  /** Up to 100 recent games, most recent first. Empty if the player has this hidden. */
  async getRecentGames(uuid) {
    const body = await this._get('/recentgames', { uuid });
    return body.games || [];
  }
}

module.exports = { HypixelApi };
