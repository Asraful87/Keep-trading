import { REST, Routes } from "discord.js";
import { config, validateConfig } from "./config.js";
import sendCommand from "./commands/send.js";
import purgeCommand from "./commands/purge.js";

const commands = [sendCommand, purgeCommand].map((c) => c.data.toJSON());

const errors = validateConfig();
if (errors.length) {
  console.error("Missing configuration:\n" + errors.map((e) => ` - ${e}`).join("\n"));
  process.exit(1);
}

const rest = new REST({ version: "10" }).setToken(config.token);

async function main() {
  try {
    if (config.guildId) {
      await rest.put(
        Routes.applicationGuildCommands(config.clientId, config.guildId),
        { body: commands }
      );
      console.log(`Registered ${commands.length} commands to guild ${config.guildId}.`);
    } else {
      await rest.put(Routes.applicationCommands(config.clientId), { body: commands });
      console.log(`Registered ${commands.length} commands globally.`);
    }
  } catch (error) {
    console.error("Failed to register commands:", error);
    process.exit(1);
  }
}

main();
