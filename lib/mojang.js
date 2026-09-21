'use strict';

/**
 * Resolves a Minecraft username to a UUID (undashed) and the current
 * canonical username for that account.
 *
 * Tries Mojang's API first, then falls back to PlayerDB (which itself
 * proxies Mojang + caches) since Mojang's API can be flaky/rate-limited.
 */
async function resolveUsername(username) {
  const mojangResult = await tryMojang(username);
  if (mojangResult) return mojangResult;

  const playerDbResult = await tryPlayerDb(username);
  if (playerDbResult) return playerDbResult;

  return null;
}

async function tryMojang(username) {
  try {
    const res = await fetch(
      `https://api.mojang.com/users/profiles/minecraft/${encodeURIComponent(username)}`
    );
    if (res.status === 404) return null;
    if (!res.ok) return null;

    const data = await res.json();
    if (!data || !data.id) return null;

    return { uuid: data.id, username: data.name };
  } catch {
    return null;
  }
}

async function tryPlayerDb(username) {
  try {
    const res = await fetch(
      `https://playerdb.co/api/player/minecraft/${encodeURIComponent(username)}`
    );
    if (!res.ok) return null;

    const data = await res.json();
    const player = data && data.data && data.data.player;
    if (!player || !player.id) return null;

    return { uuid: player.id.replace(/-/g, ''), username: player.username };
  } catch {
    return null;
  }
}

module.exports = { resolveUsername };
