import { PermissionsBitField, PermissionFlagsBits, ChannelType, Collection } from "discord.js";
import debugCmd from "./src/commands/debug-permissions.js";
function pom(entries = []) { const map = new Map(entries.map((e) => [e.id, e])); return { get cache() { return map; }, set(arr) { map.clear(); for (const e of arr) map.set(e.id, e); return Promise.resolve(); }, delete(id) { map.delete(id); return Promise.resolve(); } }; }
function ow(id, allow, deny = []) { return { id, type: "role", allow: new PermissionsBitField(allow), deny: new PermissionsBitField(deny) }; }
function role(name, id, bits = 0n) { return { id, name, position: 1, permissions: new PermissionsBitField(bits), hexColor: "#000", hoist: false, mentionable: false }; }
const VIEW = PermissionFlagsBits.ViewChannel, SEND = PermissionFlagsBits.SendMessages;
function makeCh(name, id, type, parentId, entries = []) {
  const ch = { name, id, type, parentId, position: 1, permissionOverwrites: pom(entries), guild: null,
    permissionsFor(entity) {
      if (entity && entity.user) { let allow = 0n; for (const rid of entity.roles.cache.keys()) { const r = ch_guild.roles.cache.get(rid); if (r && this.permissionsFor(r).has(VIEW)) allow |= VIEW; } return new PermissionsBitField(allow ? ["ViewChannel"] : []); }
      const BASE = BigInt(entity.permissions.bitfield); let allow = BASE; let deny = 0n;
      const targets = [this]; const p = this.parentId ? ch_guild.channels.cache.get(this.parentId) : null; if (p) targets.push(p);
      for (const t of targets) for (const o of t.permissionOverwrites.cache.values()) {
        if (o.id === entity.id) { allow |= o.allow.bitfield; deny |= o.deny.bitfield; }
        if (entity.id === ch_guild.id && o.id === ch_guild.id) { allow |= o.allow.bitfield; deny |= o.deny.bitfield; }
      }
      const final = allow & ~deny;
      return new PermissionsBitField(final & VIEW ? ["ViewChannel"] : []);
    } };
  return ch;
}
const roles = [role("@everyone","g1",0n),role("👑 Owner","o1",PermissionFlagsBits.Administrator),role("🛡️ Admin","a1",PermissionFlagsBits.Administrator),role("🎓 Coach","c1",0n),role("🔨 Moderator","m1",0n),role("💎 Process Lab","pl1",0n),role("📈 Member","mem1",0n),role("🤖 Bots","b1",0n),role("KEEPGOING TRADING BOT","kb1",VIEW),role("Paid","paid1",0n),role("Server Booster","sb1",VIEW)];
const rolesCache = new Collection(roles.map((r) => [r.id, r]));
const cat = makeCh("💬 COMMUNITY","cat2",ChannelType.GuildCategory,null,[ow("g1",[],["ViewChannel"]),ow("mem1",[VIEW,SEND],[]),ow("pl1",[],["ViewChannel"]),ow("o1",[VIEW],[]),ow("a1",[VIEW],[]),ow("c1",[VIEW],[]),ow("m1",[VIEW],[])]);
// trade-reviews: channel has an EXPLICIT allow for Process Lab (the leak)
const ch = makeCh("📈・trade-reviews","g1c",ChannelType.GuildText,"cat2",[ow("pl1",[VIEW,SEND],[])]);
const channelsCache = new Collection([cat, ch].map((c) => [c.id, c]));
const ch_guild = { id:"g1", name:"KEEPGOING", systemChannelId:"sys1", rulesChannelId:"rules1",
  roles: { cache: rolesCache, fetch: async () => {} }, channels: { cache: channelsCache },
  members: { cache: new Collection([["u1",{ user:{username:"John"}, roles:{ cache: new Collection([["mem1",roles[5]],["sb1",roles[10]]]) } }]]) , fetch: async () => {} } };
for (const c of [cat, ch]) c.guild = ch_guild;
let reply = null; const interaction = { guild: ch_guild, options: { getChannel: () => ch }, deferred: false, replied: false, async deferReply() { this.deferred = true; }, async editReply(p) { reply = p; } };
try {
  await debugCmd.execute(interaction);
  const f = reply.embeds[0].data.fields.map((x) => `${x.name.split(" ")[0]}=${x.value.slice(0,40)}`).join(" | ");
  console.log("FIELDS:", f);
  const md = reply.files[0].attachment.toString();
  console.log("sync:", /Sync: (.*)/.exec(md)[1]);
  console.log("Process Lab mismatch in md:", md.includes("Process Lab") && md.includes("leakage"));
  console.log("summary fail:", /FAIL/.test(md));
  console.log("user analysis John:", md.includes("John"));
} catch (e) { console.error("THREW:", e); }
