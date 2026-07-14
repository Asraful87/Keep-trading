import { Client, GatewayIntentBits } from "discord.js";
import { config } from "../src/config.js";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const client = new Client({ intents: [GatewayIntentBits.Guilds] });
await client.login(config.token);
const guild = await client.guilds.fetch(config.guildId);
await guild.roles.fetch();

const norm = (s) => String(s).toLowerCase().replace(/[^a-z0-9]/g, "");
const find = (name) =>
  guild.roles.cache.find((r) => norm(r.name) === norm(name)) || null;

const member = find("📈 Member");
const processLab = find("💎 Process Lab");
const alumni = find("🎓 Alumni");

// Force Member above Process Lab (so a stacked member's DENY is applied before the grant),
// then place Alumni just below Process Lab.
try {
  await member.setPosition(7, { hoist: member.hoist });
  console.log("Moved Member -> 7");
} catch (e) {
  console.warn("Member move:", e.message);
}
await sleep(500);

try {
  await alumni.setPosition(5, { hoist: alumni.hoist });
  console.log("Moved Alumni -> 5");
} catch (e) {
  console.warn("Alumni move:", e.message);
}
await sleep(500);

await guild.roles.fetch();
console.log("\nResulting order (top->bottom):");
[...guild.roles.cache.values()]
  .sort((a, b) => b.position - a.position)
  .forEach((r) => console.log(`  pos=${r.position} ${r.name}`));

await client.destroy();
