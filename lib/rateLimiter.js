'use strict';

/**
 * A minimal request queue that spaces calls out evenly across a rolling
 * one-minute window so the bot never exceeds the Hypixel API key's limit,
 * no matter how many /track sessions or /stats lookups are running at once.
 */
class RateLimiter {
  constructor(requestsPerMinute) {
    this.minIntervalMs = 60000 / Math.max(1, requestsPerMinute);
    this.queue = [];
    this.lastRunAt = 0;
    this.timer = null;
  }

  /**
   * Schedules fn to run, respecting the spacing limit, and returns a promise
   * that resolves/rejects with fn's result.
   */
  schedule(fn) {
    return new Promise((resolve, reject) => {
      this.queue.push({ fn, resolve, reject });
      this._pump();
    });
  }

  _pump() {
    if (this.timer) return; // already scheduled
    const now = Date.now();
    const wait = Math.max(0, this.lastRunAt + this.minIntervalMs - now);

    this.timer = setTimeout(async () => {
      this.timer = null;
      const job = this.queue.shift();
      if (!job) return;

      this.lastRunAt = Date.now();
      try {
        const result = await job.fn();
        job.resolve(result);
      } catch (err) {
        job.reject(err);
      }

      if (this.queue.length > 0) this._pump();
    }, wait);
  }
}

module.exports = { RateLimiter };
