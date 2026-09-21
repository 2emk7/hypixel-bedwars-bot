'use strict';

require('dotenv').config();
const fs = require('node:fs');
const path = require('node:path');
const { Client, GatewayIntentBits, Collection, MessageFlags } = require('discord.js');

const { HypixelApi } = require('./lib/hypixelApi');
const { Tracker } = require('./lib/tracker');

const {
  DISCORD_TOKEN,
  HYPIXEL_API_KEY,
  HYPIXEL_RATE_LIMIT_PER_MIN,
  MAX_CONCURRENT_TRACKS,
} = process.env;

if (!DISCORD_TOKEN) {
  console.error('DISCORD_TOKEN is not set. Copy .env.example to .env and fill it in.');
  process.exit(1);
}
if (!HYPIXEL_API_KEY) {
  console.error('HYPIXEL_API_KEY is not set. Copy .env.example to .env and fill it in.');
  process.exit(1);
}

const api = new HypixelApi(HYPIXEL_API_KEY, Number(HYPIXEL_RATE_LIMIT_PER_MIN) || 100);
const tracker = new Tracker(api, Number(MAX_CONCURRENT_TRACKS) || 3);

// This bot only needs to know about guilds and doesn't read message content,
// so it only requests the minimal intent slash commands need.
const client = new Client({ intents: [GatewayIntentBits.Guilds] });
client.commands = new Collection();

const commandsPath = path.join(__dirname, 'commands');
for (const file of fs.readdirSync(commandsPath).filter((f) => f.endsWith('.js'))) {
  const command = require(path.join(commandsPath, file));
  client.commands.set(command.data.name, command);
}

client.once('clientReady', async (c) => {
  console.log(`Logged in as ${c.user.tag}`);
  try {
    await c.application.fetch(); // populates .owner for the /apinew owner check
  } catch (err) {
    console.warn('Could not fetch application owner info:', err.message);
  }
});

client.on('interactionCreate', async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  const command = client.commands.get(interaction.commandName);
  if (!command) return;

  try {
    await command.execute(interaction, { api, tracker });
  } catch (err) {
    console.error(`Error handling /${interaction.commandName}:`, err);
    const payload = { content: 'Something went wrong running that command.', flags: MessageFlags.Ephemeral };
    if (interaction.deferred || interaction.replied) {
      await interaction.editReply(payload).catch(() => {});
    } else {
      await interaction.reply(payload).catch(() => {});
    }
  }
});

client.login(DISCORD_TOKEN);
