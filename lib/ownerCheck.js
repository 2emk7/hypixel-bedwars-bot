'use strict';

/**
 * True if `userId` is the owner of the bot's Discord application — the
 * single owner for a personal app, or any member for a team-owned app.
 * Used to gate sensitive commands like /apinew.
 */
async function isBotOwner(client, userId) {
  let app = client.application;
  if (!app) return false;

  if (!app.owner) {
    try {
      app = await app.fetch();
    } catch {
      return false;
    }
  }

  const owner = app.owner;
  if (!owner) return false;

  // Team-owned apps expose a `members` Collection; user-owned apps ARE the owner.
  if (owner.members) return owner.members.has(userId);
  return owner.id === userId;
}

module.exports = { isBotOwner };
