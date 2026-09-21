'use strict';

const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const { isBotOwner } = require('../lib/ownerCheck');
const { updateEnvFile } = require('../lib/envFile');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('apinew')
    .setDescription("(Owner only) Replace the bot's Hypixel API key")
    .addStringOption((opt) =>
      opt.setName('key').setDescription('New Hypixel API key').setRequired(true)
    ),

  async execute(interaction, { api }) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const allowed = await isBotOwner(interaction.client, interaction.user.id);
    if (!allowed) {
      await interaction.editReply("Only the bot's owner can update the API key.");
      return;
    }

    const newKey = interaction.options.getString('key').trim();
    if (!newKey) {
      await interaction.editReply('That key looks empty.');
      return;
    }

    const result = await api.testKey(newKey);
    if (!result.valid) {
      await interaction.editReply(`Hypixel rejected that key: ${result.reason}`);
      return;
    }

    api.setKey(newKey);

    try {
      await updateEnvFile('HYPIXEL_API_KEY', newKey);
    } catch (err) {
      await interaction.editReply(
        `✅ Key updated for this running session, but I couldn't write it to .env (${err.message}). ` +
          "It'll revert to the old key next restart unless you update .env by hand."
      );
      return;
    }

    await interaction.editReply(
      '✅ Hypixel API key validated, switched over, and saved to .env — it will persist across restarts.'
    );
  },
};
