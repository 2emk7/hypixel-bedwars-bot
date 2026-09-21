'use strict';

const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { resolveUsername } = require('../lib/mojang');

const MAX_DURATION_MINUTES = 60;

module.exports = {
  data: new SlashCommandBuilder()
    .setName('track')
    .setDescription("Live-track a player's status and recently ended games")
    .addStringOption((opt) =>
      opt.setName('user').setDescription('Minecraft username').setRequired(true)
    )
    .addIntegerOption((opt) =>
      opt
        .setName('duration')
        .setDescription(`Minutes to track for (max ${MAX_DURATION_MINUTES})`)
        .setRequired(true)
        .setMinValue(1)
        .setMaxValue(MAX_DURATION_MINUTES)
    ),

  async execute(interaction, { api, tracker }) {
    await interaction.deferReply();

    if (tracker.isAtCapacity()) {
      await interaction.editReply(
        `I'm already tracking the max of ${tracker.maxConcurrent} player(s) at once. Try again once one finishes, or ask an admin to raise MAX_CONCURRENT_TRACKS.`
      );
      return;
    }

    const rawUsername = interaction.options.getString('user');
    const durationMinutes = interaction.options.getInteger('duration');

    const resolved = await resolveUsername(rawUsername);
    if (!resolved) {
      await interaction.editReply(`Couldn't find a Minecraft account named **${rawUsername}**.`);
      return;
    }

    const existing = tracker.findByUuidInChannel(resolved.uuid, interaction.channelId);
    if (existing) {
      await interaction.editReply(
        `Already tracking **${resolved.username}** in this channel. Use \`/untrack user:${resolved.username}\` to stop it first.`
      );
      return;
    }

    const placeholder = new EmbedBuilder()
      .setTitle(`Tracking ${resolved.username}`)
      .setDescription('Starting up…')
      .setColor(0x5865f2);

    const message = await interaction.editReply({ embeds: [placeholder] });

    tracker.start({
      uuid: resolved.uuid,
      username: resolved.username,
      channelId: interaction.channelId,
      message,
      durationMinutes,
    });
  },
};
