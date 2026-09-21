'use strict';

const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { resolveUsername } = require('../lib/mojang');
const { summarizeBedwars } = require('../lib/bedwarsStats');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('stats')
    .setDescription("Look up a player's Bedwars stats")
    .addStringOption((opt) =>
      opt.setName('user').setDescription('Minecraft username').setRequired(true)
    ),

  async execute(interaction, { api }) {
    await interaction.deferReply();

    const rawUsername = interaction.options.getString('user');
    const resolved = await resolveUsername(rawUsername);
    if (!resolved) {
      await interaction.editReply(`Couldn't find a Minecraft account named **${rawUsername}**.`);
      return;
    }

    let player;
    try {
      player = await api.getPlayer(resolved.uuid);
    } catch (err) {
      await interaction.editReply(`Hypixel API error: ${err.message}`);
      return;
    }

    if (!player) {
      await interaction.editReply(`**${resolved.username}** has never logged into Hypixel.`);
      return;
    }

    const bw = summarizeBedwars(player);
    if (!bw) {
      await interaction.editReply(`**${resolved.username}** has no Bedwars stats (or has API stats hidden).`);
      return;
    }

    const embed = new EmbedBuilder()
      .setTitle(`Bedwars stats — ${player.displayname || resolved.username}`)
      .setColor(0x5865f2)
      .setThumbnail(`https://mc-heads.net/avatar/${resolved.uuid}/128`)
      .addFields(
        { name: 'Star', value: `✪ ${bw.star}`, inline: true },
        { name: 'Coins', value: bw.coins.toLocaleString(), inline: true },
        { name: 'Winstreak', value: bw.winstreak === null ? 'Hidden' : String(bw.winstreak), inline: true },
        { name: 'Wins', value: bw.wins.toLocaleString(), inline: true },
        { name: 'Losses', value: bw.losses.toLocaleString(), inline: true },
        { name: 'WLR', value: bw.wlr, inline: true },
        { name: 'Final Kills', value: bw.finalKills.toLocaleString(), inline: true },
        { name: 'Final Deaths', value: bw.finalDeaths.toLocaleString(), inline: true },
        { name: 'FKDR', value: bw.fkdr, inline: true },
        { name: 'Kills', value: bw.kills.toLocaleString(), inline: true },
        { name: 'Deaths', value: bw.deaths.toLocaleString(), inline: true },
        { name: 'KDR', value: bw.kdr, inline: true },
        { name: 'Beds Broken', value: bw.bedsBroken.toLocaleString(), inline: true },
        { name: 'Games Played', value: bw.gamesPlayed.toLocaleString(), inline: true },
        { name: 'Win Rate', value: `${bw.winRatePct}%`, inline: true }
      )
      .setFooter({ text: 'Data from the Hypixel API' })
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
  },
};
