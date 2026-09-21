'use strict';

const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const { resolveUsername } = require('../lib/mojang');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('untrack')
    .setDescription('Stop an active /track session in this channel')
    .addStringOption((opt) =>
      opt.setName('user').setDescription('Minecraft username currently being tracked').setRequired(true)
    ),

  async execute(interaction, { tracker }) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const rawUsername = interaction.options.getString('user');
    const resolved = await resolveUsername(rawUsername);
    if (!resolved) {
      await interaction.editReply(`Couldn't find a Minecraft account named **${rawUsername}**.`);
      return;
    }

    const session = tracker.findByUuidInChannel(resolved.uuid, interaction.channelId);
    if (!session) {
      await interaction.editReply(`No active tracking session for **${resolved.username}** in this channel.`);
      return;
    }

    tracker.stop(session.trackId, 'manual_stop');
    await interaction.editReply(`Stopped tracking **${resolved.username}**.`);
  },
};
