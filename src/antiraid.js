import { EmbedBuilder } from "discord.js";

const joinTimestamps = new Map();
const raidActive = new Map();

export function handleMemberJoin(member, config) {
  if (!config.logsChannelId) return;

  const guildId = member.guild.id;
  const now = Date.now();
  const { joinThreshold, timeWindowMs } = config.antiRaid;

  const recent = (joinTimestamps.get(guildId) || []).filter(
    (t) => now - t <= timeWindowMs
  );
  recent.push(now);
  joinTimestamps.set(guildId, recent);

  if (recent.length >= joinThreshold && !raidActive.get(guildId)) {
    raidActive.set(guildId, true);
    logRaidAlert(member, recent.length, config);
    setTimeout(() => raidActive.set(guildId, false), timeWindowMs);
  }
}

async function logRaidAlert(member, joinCount, config) {
  const channel = member.client.channels.cache.get(config.logsChannelId);
  if (!channel || !channel.isTextBased()) return;

  const embed = new EmbedBuilder()
    .setColor(0xed4245)
    .setTitle("\u{1F6A8} Possible Raid Detected")
    .setDescription(
      `**${joinCount}** members joined **${member.guild.name}** within the configured time window.`
    )
    .addFields(
      { name: "Guild", value: `${member.guild.name} (\`${member.guild.id}\`)`, inline: true },
      { name: "Threshold", value: String(config.antiRaid.joinThreshold), inline: true },
      { name: "Window", value: `${config.antiRaid.timeWindowMs} ms`, inline: true }
    )
    .setTimestamp();

  try {
    await channel.send({ embeds: [embed] });
  } catch {
    // Ignore logging failures.
  }
}

export function logJoin(member, config) {
  if (!config.logsChannelId) return;
  const channel = member.client.channels.cache.get(config.logsChannelId);
  if (!channel || !channel.isTextBased()) return;

  const embed = new EmbedBuilder()
    .setColor(0x5865f2)
    .setTitle("\u{1F440} Member Joined")
    .setDescription(`${member} (\`${member.id}\`) joined the server.`)
    .setThumbnail(member.user.displayAvatarURL())
    .setTimestamp();

  channel.send({ embeds: [embed] }).catch(() => {});
}
