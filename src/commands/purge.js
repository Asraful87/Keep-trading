import {
  SlashCommandBuilder,
  PermissionFlagsBits,
} from "discord.js";

export default {
  data: new SlashCommandBuilder()
    .setName("purge")
    .setDescription("Delete a number of recent messages from this channel.")
    .addIntegerOption((option) =>
      option
        .setName("amount")
        .setDescription("How many messages to delete (1-100).")
        .setMinValue(1)
        .setMaxValue(100)
        .setRequired(true)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
    .setDMPermission(false),
  async execute(interaction) {
    const amount = interaction.options.getInteger("amount", true);
    const channel = interaction.channel;

    if (!channel.isTextBased()) {
      await interaction.reply({
        content: "This command can only be used in text channels.",
        ephemeral: true,
      });
      return;
    }

    await interaction.deferReply({ ephemeral: true });

    try {
      const fetched = await channel.bulkDelete(amount, true);
      await interaction.editReply({
        content: `Purged ${fetched.size} message(s).`,
      });
    } catch (error) {
      await interaction.editReply({
        content: `Failed to purge messages: ${error.message}`,
      });
    }
  },
};
