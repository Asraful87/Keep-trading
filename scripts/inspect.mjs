import { Client, GatewayIntentBits, ChannelType, PermissionFlagsBits } from "discord.js";
import { config } from "../src/config.js";

const client = new Client({ intents: [GatewayIntentBits.Guilds] });
await client.login(config.token);
const guild = await client.guilds.fetch(config.guildId);
await guild.fetch();

console.log("=== SERVER ===");
console.log("name:", guild.name, "id:", guild.id);
console.log("systemChannelId:", guild.systemChannelId);
console.log("rulesChannelId:", guild.rulesChannelId);
console.log("ownerId:", guild.ownerId);

console.log("\n=== ROLES (top->bottom) ===");
for (const r of [...guild.roles.cache.values()].sort((a, b) => b.position - a.position)) {
  console.log(
    `pos=${r.position} id=${r.id} name="${r.name}" admin=${r.permissions.has(PermissionFlagsBits.Administrator)} perms=${r.permissions.bitfield}`
  );
}

console.log("\n=== CHANNELS/CATEGORIES (by position) ===");
const all = [...guild.channels.cache.values()].sort((a, b) => a.position - b.position);
for (const c of all) {
  const type = Object.keys(ChannelType).find((k) => ChannelType[k] === c.type);
  const isSystem = c.id === guild.systemChannelId || c.id === guild.rulesChannelId;
  console.log(
    `pos=${c.position} id=${c.id} type=${type} name="${c.name}" parent=${c.parentId || "-"} ${isSystem ? "[SYSTEM]" : ""}`
  );
}

await client.destroy();
