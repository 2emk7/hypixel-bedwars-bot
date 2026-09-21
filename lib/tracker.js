'use strict';

const { EmbedBuilder } = require('discord.js');

const STATUS_POLL_MS = 3000;
// Recent games don't change every 3s, so we only re-check them every few
// status polls to save API calls. 5 * 3s = every 15s.
const RECENT_GAMES_EVERY_N_POLLS = 5;

const GAME_TYPE_NAMES = {
  BEDWARS: 'Bed Wars',
  SKYWARS: 'SkyWars',
  DUELS: 'Duels',
  SKYBLOCK: 'SkyBlock',
  MURDER_MYSTERY: 'Murder Mystery',
  BUILD_BATTLE: 'Build Battle',
  ARCADE: 'Arcade',
  UHC: 'UHC Champions',
  TNTGAMES: 'TNT Games',
  MCGO: 'Cops and Crims',
  WOOL_GAMES: 'Wool Wars',
  PIT: 'Pit',
  SMP: 'SMP',
};

function friendlyGameType(raw) {
  if (!raw) return null;
  return GAME_TYPE_NAMES[raw] || raw.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}

function friendlyMode(raw) {
  if (!raw) return null;
  return raw
    .replace(/^BEDWARS_/, '')
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatClock(ms) {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

class Tracker {
  constructor(api, maxConcurrent) {
    this.api = api;
    this.maxConcurrent = maxConcurrent;
    this.sessions = new Map(); // trackId -> session
  }

  activeCount() {
    return this.sessions.size;
  }

  isAtCapacity() {
    return this.sessions.size >= this.maxConcurrent;
  }

  findByUuidInChannel(uuid, channelId) {
    for (const session of this.sessions.values()) {
      if (session.uuid === uuid && session.channelId === channelId) return session;
    }
    return null;
  }

  /**
   * Starts tracking a player. `message` is the Discord message that will be
   * repeatedly edited with updates (create it with interaction.reply first).
   */
  start({ uuid, username, channelId, message, durationMinutes }) {
    const trackId = `${channelId}:${uuid}`;
    this.stop(trackId); // replace any existing session for this player+channel

    const durationMs = durationMinutes * 60 * 1000;
    const startedAt = Date.now();

    const session = {
      trackId,
      uuid,
      username,
      channelId,
      message,
      startedAt,
      durationMs,
      pollCount: 0,
      seenGameEnds: new Set(),
      lastRecentGames: [],
      lastError: null,
    };

    session.interval = setInterval(() => this._poll(session), STATUS_POLL_MS);
    session.timeout = setTimeout(() => this._finish(session, 'duration_elapsed'), durationMs);

    this.sessions.set(trackId, session);
    // Kick off the first poll immediately instead of waiting 3s.
    this._poll(session);

    return session;
  }

  stop(trackId, reason = 'stopped') {
    const session = this.sessions.get(trackId);
    if (!session) return false;
    clearInterval(session.interval);
    clearTimeout(session.timeout);
    this.sessions.delete(trackId);

    // Best-effort: update the message to show tracking has ended. Fire and
    // forget so callers (like /untrack) don't have to await this.
    session.message
      .edit({ embeds: [this._buildEmbed(session, { finished: true, reason })] })
      .catch(() => {});

    return true;
  }

  _finish(session, reason) {
    this.stop(session.trackId, reason);
  }

  async _poll(session) {
    session.pollCount += 1;

    try {
      const status = await this.api.getStatus(session.uuid);
      session.lastStatus = status;
      session.lastError = null;

      const shouldCheckRecentGames =
        session.pollCount === 1 || session.pollCount % RECENT_GAMES_EVERY_N_POLLS === 0;

      if (shouldCheckRecentGames) {
        const games = await this.api.getRecentGames(session.uuid);
        this._recordNewlyEndedGames(session, games);
        session.lastRecentGames = games;
      }
    } catch (err) {
      session.lastError = err.message;
    }

    if (Date.now() - session.startedAt >= session.durationMs) {
      await this._finish(session, 'duration_elapsed');
      return;
    }

    try {
      const embed = this._buildEmbed(session, { finished: false });
      await session.message.edit({ embeds: [embed] });
    } catch {
      // Message gone / edit rate-limited — stop tracking rather than spam errors.
      this._finish(session, 'message_unavailable');
    }
  }

  _recordNewlyEndedGames(session, games) {
    session.newlyEnded = [];
    for (const game of games) {
      if (!game.ended) continue; // still in progress
      const key = `${game.date}-${game.ended}`;
      if (session.seenGameEnds.has(key)) continue;
      session.seenGameEnds.add(key);
      // Don't flood the very first poll with the player's whole history —
      // only announce games that ended after we started watching.
      if (game.ended >= session.startedAt - 5000) {
        session.newlyEnded.push(game);
      }
    }
  }

  _buildEmbed(session, { finished, reason }) {
    const elapsed = Date.now() - session.startedAt;
    const remaining = Math.max(0, session.durationMs - elapsed);
    const status = session.lastStatus;

    const embed = new EmbedBuilder()
      .setTitle(`Tracking ${session.username}`)
      .setColor(finished ? 0x808080 : status && status.online ? 0x57f287 : 0xed4245)
      .setFooter({
        text: finished
          ? 'Tracking ended'
          : `Updates every ${STATUS_POLL_MS / 1000}s • ${formatClock(remaining)} remaining`,
      })
      .setTimestamp();

    if (session.lastError) {
      embed.addFields({ name: 'Status', value: `⚠️ ${session.lastError}` });
    } else if (!status) {
      embed.addFields({ name: 'Status', value: 'No data available.' });
    } else if (!status.online) {
      embed.addFields({ name: 'Status', value: '⚫ Offline' });
    } else if (!status.gameType) {
      // Online but Hypixel isn't reporting a game — usually means the
      // player has "online status" hidden in their API settings.
      embed.addFields({ name: 'Status', value: '🟢 Online (location hidden by player settings)' });
    } else {
      const game = friendlyGameType(status.gameType);
      const mode = friendlyMode(status.mode);
      const map = status.map ? ` on **${status.map}**` : '';
      embed.addFields({
        name: 'Status',
        value: `🟢 Online — playing **${game}**${mode ? ` (${mode})` : ''}${map}`,
      });
    }

    if (session.newlyEnded && session.newlyEnded.length > 0) {
      const lines = session.newlyEnded.slice(0, 5).map((g) => {
        const type = friendlyGameType(g.gameType);
        const mode = friendlyMode(g.mode);
        const map = g.map ? ` on ${g.map}` : '';
        const endedAgo = formatClock(Date.now() - g.ended);
        return `• **${type}**${mode ? ` (${mode})` : ''}${map} — ended ${endedAgo} ago`;
      });
      embed.addFields({ name: 'Game(s) just ended', value: lines.join('\n') });
    }

    if (finished) {
      const reasonText =
        {
          duration_elapsed: 'Reached the requested tracking duration.',
          manual_stop: 'Stopped with /untrack.',
          message_unavailable: 'Stopped (the tracked message was deleted or could not be updated).',
        }[reason] || 'Stopped.';
      embed.addFields({ name: 'Finished', value: reasonText });
    }

    return embed;
  }
}

module.exports = { Tracker, friendlyGameType, friendlyMode };
