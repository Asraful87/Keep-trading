import { Client, GatewayIntentBits, Events, Collection } from "discord.js";
import { config, validateConfig, loadRuntimeOverrides } from "./config.js";
import sendCommand from "./commands/send.js";
import purgeCommand from "./commands/purge.js";
import { startWebServer } from "./web/server.js";
import { buildWelcomeEmbed } from "./welcome.js";
import { handleMemberJoin, logJoin } from "./antiraid.js";

await loadRuntimeOverrides();
const errors = validateConfig();
if (errors.length) {
  console.error("Missing configuration:\n" + errors.map((e) => ` - ${e}`).join("\n"));
  process.exit(1);
}

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers],
});

client.commands = new Collection();
for (const command of [sendCommand, purgeCommand]) {
  client.commands.set(command.data.name, command);
}

client.once(Events.ClientReady, (readyClient) => {
  console.log(`Logged in as ${readyClient.user.tag}`);
  console.log(`Resolved WELCOME_CHANNEL_ID: ${config.welcomeChannelId || "(none - DM fallback)"}`);
  if (!config.logsChannelId) {
    console.warn("LOGS_CHANNEL_ID is not set; anti-raid and join logs are disabled.");
  }
  startWebServer(client, config);
});

client.on(Events.GuildMemberAdd, async (member) => {
  try {
    const embed = buildWelcomeEmbed(member);
    if (config.welcomeChannelId) {
      const welcomeChannel = member.guild.channels.cache.get(
        config.welcomeChannelId
      );
      if (welcomeChannel && welcomeChannel.isTextBased()) {
        await welcomeChannel.send({ content: `${member}`, embeds: [embed] });
      } else {
        console.warn(
          `WELCOME_CHANNEL_ID ${config.welcomeChannelId} is invalid; falling back to DM.`
        );
        await member.send({ embeds: [embed] }).catch(() => {});
      }
    } else {
      await member.send({ embeds: [embed] }).catch(async () => {
        const system = member.guild.systemChannel;
        if (system && system.isTextBased()) {
          await system.send({ content: `Welcome ${member}!`, embeds: [embed] });
        }
      });
    }
  } catch (error) {
    console.error("Failed to send welcome message:", error);
  }

  logJoin(member, config);
  handleMemberJoin(member, config);
});

client.on(Events.InteractionCreate, async (interaction) => {
  try {
    if (!interaction.isChatInputCommand()) return;
    const command = client.commands.get(interaction.commandName);
    if (!command) return;

    await command.execute(interaction);
  } catch (error) {
    console.error(`Error running /${interaction.commandName}:`, error);
    const detail = error && error.message ? error.message : String(error);
    const reply = {
      content: `There was an error executing that command.\n\`\`\`\n${detail.slice(0, 1800)}\n\`\`\``,
      ephemeral: true,
    };
    if (interaction.deferred || interaction.replied) {
      await interaction.editReply(reply).catch(() => {});
    } else {
      await interaction.reply(reply).catch(() => {});
    }
  }
});

client.login(config.token);
