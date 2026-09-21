'use strict';

require('dotenv').config();
const fs = require('node:fs');
const path = require('node:path');
const { REST, Routes } = require('discord.js');

const { DISCORD_TOKEN, DISCORD_CLIENT_ID, DISCORD_GUILD_ID } = process.env;

if (!DISCORD_TOKEN || !DISCORD_CLIENT_ID) {
  console.error('DISCORD_TOKEN and DISCORD_CLIENT_ID must be set in .env before deploying commands.');
  process.exit(1);
}

const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter((f) => f.endsWith('.js'));

const commands = commandFiles.map((file) => require(path.join(commandsPath, file)).data.toJSON());

const rest = new REST().setToken(DISCORD_TOKEN);

(async () => {
  try {
    const route = DISCORD_GUILD_ID
      ? Routes.applicationGuildCommands(DISCORD_CLIENT_ID, DISCORD_GUILD_ID)
      : Routes.applicationCommands(DISCORD_CLIENT_ID);

    const scope = DISCORD_GUILD_ID ? `guild ${DISCORD_GUILD_ID}` : 'globally';
    console.log(`Deploying ${commands.length} command(s) ${scope}...`);

    await rest.put(route, { body: commands });

    console.log('Done. Guild commands show up instantly; global commands can take up to an hour.');
  } catch (err) {
    console.error('Failed to deploy commands:', err);
    process.exit(1);
  }
})();
