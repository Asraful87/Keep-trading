import { SlashCommandBuilder, ChannelType } from "discord.js";
import { splitMessage, validateChunks, MAX_MESSAGE_LENGTH, MAX_EMBED_LENGTH } from "../message-splitter.js";

function logSend(content, parts) {
  console.log(`[send] original length: ${content.length}`);
  console.log(`[send] chunks: ${parts.length}`);
  parts.forEach((part, i) => console.log(`[send] chunk ${i + 1} length: ${part.length}`));
}

function resolveTargets(interaction, category, channel) {
  const guild = interaction.guild;
  if (category) {
    return [...category.children.cache.values()].filter((c) => c.isTextBased());
  }
  if (channel) {
    return channel.isTextBased() ? [channel] : [];
  }
  return interaction.channel && interaction.channel.isTextBased() ? [interaction.channel] : [];
}

export default {
  data: new SlashCommandBuilder()
    .setName("send")
    .setDescription("[Deprecated] Use the Embed Builder dashboard. Legacy send of Markdown to a channel/category.")
    .addStringOption((option) =>
      option
        .setName("message")
        .setDescription("Message to send (supports full Discord Markdown)")
        .setRequired(true)
    )
    .addChannelOption((option) =>
      option
        .setName("channel")
        .setDescription("The channel to send to. Defaults to this channel.")
        .setRequired(false)
    )
    .addChannelOption((option) =>
      option
        .setName("category")
        .setDescription("A category: send to every text channel inside it.")
        .addChannelTypes(ChannelType.GuildCategory)
        .setRequired(false)
    )
    .addBooleanOption((option) =>
      option
        .setName("embed")
        .setDescription("Send as embeds instead of plain content.")
        .setRequired(false)
    ),

  async execute(interaction) {
    const content = interaction.options.getString("message", true);
    const category = interaction.options.getChannel("category");
    const channel = interaction.options.getChannel("channel");
    const embed = interaction.options.getBoolean("embed") ?? false;

    const targets = resolveTargets(interaction, category, channel);
    if (targets.length === 0) {
      await interaction.reply({
        content: "No valid text channel(s) found to send to.",
        ephemeral: true,
      });
      return;
    }

    const maxLength = embed ? MAX_EMBED_LENGTH : MAX_MESSAGE_LENGTH;
    let sent = 0;

    for (const target of targets) {
      try {
        if (content.length <= maxLength) {
          logSend(content, [content]);
          validateChunks([content], maxLength);
          await target.send(embed ? { embeds: [{ description: content }] } : { content });
        } else {
          const parts = splitMessage(content, maxLength);
          logSend(content, parts);
          validateChunks(parts, maxLength);
          for (const part of parts) {
            await target.send(embed ? { embeds: [{ description: part }] } : { content: part });
          }
        }
        sent++;
      } catch (error) {
        console.error(`Failed to send to ${target.id}:`, error);
      }
    }

    await interaction.reply({
      content: `Message sent to ${sent}/${targets.length} channel(s).`,
      ephemeral: true,
    });
  },
};
