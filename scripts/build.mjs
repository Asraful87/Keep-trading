import {
  Client,
  GatewayIntentBits,
  ChannelType,
  PermissionFlagsBits,
} from "discord.js";
import { config } from "../src/config.js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REASON = "KEEPGOING final production build (approved structure)";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ---------------------------------------------------------------------------
// Permission templates
// ---------------------------------------------------------------------------
const PUBLIC_ALLOW = ["ViewChannel", "ReadMessageHistory"];
const READONLY_MEMBER = ["ViewChannel", "ReadMessageHistory"];
const MEMBER_CHAT = [
  "ViewChannel",
  "SendMessages",
  "ReadMessageHistory",
  "AttachFiles",
  "EmbedLinks",
  "CreatePublicThreads",
  "AddReactions",
];
const PL_ALLOW = [
  "ViewChannel",
  "SendMessages",
  "ReadMessageHistory",
  "AttachFiles",
  "EmbedLinks",
];
const STAFF_ALLOW = [
  "ViewChannel",
  "SendMessages",
  "ReadMessageHistory",
  "AttachFiles",
  "EmbedLinks",
  "CreatePublicThreads",
  "AddReactions",
];
const DENY_VIEW = ["ViewChannel"];
const DENY_ALL = [
  "ViewChannel",
  "SendMessages",
  "ReadMessageHistory",
  "AttachFiles",
  "EmbedLinks",
  "CreatePublicThreads",
  "AddReactions",
  "MentionEveryone",
  "ManageMessages",
  "Connect",
  "Speak",
];

const norm = (s) => String(s).toLowerCase().replace(/[^a-z0-9]/g, "");

// ---------------------------------------------------------------------------
// Declarative server specification (THE source of truth)
// ---------------------------------------------------------------------------
const STRUCTURE = [
  {
    name: "📌 START HERE",
    visibility: "public",
    channels: [
      { name: "👋・welcome", kind: "intro" },
      { name: "📜・community-rules", kind: "rules" },
      { name: "🧭・how-to-navigate", kind: "readonly" },
      { name: "🙋・introduce-yourself", kind: "intro" },
      { name: "📢・announcements", kind: "announcement" },
      { name: "❓・faq", kind: "readonly" },
    ],
  },
  {
    name: "🎓 EDUCATIONAL ROADMAP",
    visibility: "member",
    sendProfile: "readonly_members",
    channels: [
      { name: "📍・stage-1-market-foundation", kind: "lesson" },
      { name: "📍・stage-2-market-structure", kind: "lesson" },
      { name: "📍・stage-3-supply-demand", kind: "lesson" },
      { name: "📍・stage-4-multi-timeframe", kind: "lesson" },
      { name: "📍・stage-5-entries-risk-management", kind: "lesson" },
      { name: "📍・stage-6-record-yourself", kind: "lesson" },
      { name: "📍・stage-7-review-your-trades", kind: "lesson" },
      { name: "📍・stage-8-build-your-process", kind: "lesson" },
      { name: "📍・stage-9-30-day-challenge", kind: "lesson" },
      { name: "📍・stage-10-advanced-concepts", kind: "lesson" },
    ],
  },
  {
    name: "📊 TRADING FLOOR",
    visibility: "member",
    sendProfile: "chat",
    channels: [
      { name: "📊・daily-analysis", kind: "chat" },
      { name: "📈・trade-reviews", kind: "trade" },
      { name: "📝・process-journal", kind: "chat" },
      { name: "📸・chart-markups", kind: "chat" },
      { name: "💬・market-discussion", kind: "chat" },
      { name: "🎥・live-sessions", kind: "readonly" },
      { name: "📚・session-replays", kind: "readonly" },
    ],
  },
  {
    name: "🤝 COMMUNITY",
    visibility: "member",
    sendProfile: "chat",
    channels: [
      { name: "💬・general-chat", kind: "chat" },
      { name: "🏆・wins-progress", kind: "chat" },
      { name: "🔥・daily-check-in", kind: "chat" },
      { name: "☕・off-topic", kind: "chat" },
    ],
  },
  {
    name: "🧪 PROCESS LAB",
    visibility: "pl",
    sendProfile: "chat",
    channels: [
      { name: "📢・lab-announcements", kind: "pl_announcement" },
      { name: "📖・week-1-building-your-process", kind: "pl_readonly" },
      { name: "🎥・week-2-reviewing-trades", kind: "pl_readonly" },
      { name: "🧠・week-3-eliminating-mistakes", kind: "pl_readonly" },
      { name: "🚀・week-4-building-confidence", kind: "pl_readonly" },
      { name: "📤・homework-submissions", kind: "homework" },
      { name: "💬・cohort-chat", kind: "chat" },
      { name: "🎥・zoom-links", kind: "pl_readonly" },
      { name: "📂・resources", kind: "pl_readonly" },
    ],
  },
  {
    name: "🎓 PROCESS LAB ALUMNI",
    visibility: "alumni",
    sendProfile: "chat",
    channels: [
      { name: "💬・alumni-lounge", kind: "chat" },
      { name: "📈・continued-trade-reviews", kind: "trade" },
      { name: "🧠・process-improvements", kind: "chat" },
      { name: "🏆・success-stories", kind: "chat" },
    ],
  },
  {
    name: "🎫 SUPPORT",
    visibility: "member",
    sendProfile: "chat",
    channels: [
      { name: "🎫・open-ticket", kind: "chat" },
      { name: "💳・billing-support", kind: "chat" },
      { name: "❓・general-support", kind: "chat" },
    ],
  },
  {
    name: "🔒 STAFF",
    visibility: "staff",
    channels: [
      { name: "📋・staff-dashboard", kind: "staff" },
      { name: "💬・staff-chat", kind: "staff" },
      { name: "📝・mod-notes", kind: "staff" },
      { name: "📊・member-management", kind: "staff" },
      { name: "💳・whop-payment-logs", kind: "staff" },
      { name: "🤖・bot-logs", kind: "staff" },
    ],
  },
];

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
const client = new Client({ intents: [GatewayIntentBits.Guilds] });
await client.login(config.token);

const guild = await client.guilds.fetch(config.guildId);
await guild.fetch();
await guild.roles.fetch();
await guild.channels.fetch();

// Resolve roles
const findRole = (name) =>
  guild.roles.cache.find((r) => norm(r.name) === norm(name)) || null;
const everyoneId = guild.id;
const memberRole = findRole("📈 Member");
const processLabRole = findRole("💎 Process Lab");
const alumniRole = findRole("🎓 Alumni");
const staffRoles = [
  findRole("👑 Owner"),
  findRole("🛡️ Admin"),
  findRole("🎓 Coach"),
  findRole("🔨 Moderator"),
].filter(Boolean);

if (!memberRole || !processLabRole) {
  throw new Error("Missing required base role (Member / Process Lab).");
}
if (!staffRoles.length) {
  throw new Error("No staff roles resolved.");
}

console.log("Roles resolved:");
console.log("  Member:", memberRole?.id, "Process Lab:", processLabRole?.id);
console.log("  Alumni:", alumniRole?.id || "(to be created)");
console.log("  Staff:", staffRoles.map((r) => r.name).join(", "));

// ---- 1. Backup current structure ----------------------------------------
const backup = {
  guild: { id: guild.id, name: guild.name },
  generatedAt: new Date().toISOString(),
  roles: [...guild.roles.cache.values()]
    .sort((a, b) => b.position - a.position)
    .map((r) => ({
      id: r.id,
      name: r.name,
      position: r.position,
      permissions: r.permissions.toArray(),
    })),
  channels: [...guild.channels.cache.values()]
    .sort((a, b) => a.position - b.position)
    .map((c) => ({
      id: c.id,
      name: c.name,
      type: Object.keys(ChannelType).find((k) => ChannelType[k] === c.type),
      parentId: c.parentId || null,
      position: c.position,
    })),
};
const backupPath = path.join(
  __dirname,
  `backup-before-final-build-${Date.now()}.json`
);
fs.writeFileSync(backupPath, JSON.stringify(backup, null, 2));
console.log("Backup written to", backupPath);

// ---- 2. Create Alumni role if missing -----------------------------------
let alumni = alumniRole;
if (!alumni) {
  alumni = await guild.roles.create({
    name: "🎓 Alumni",
    color: 0x99aab5,
    hoist: false,
    mentionable: false,
    permissions: [],
    reason: REASON,
  });
  console.log("Created role 🎓 Alumni:", alumni.id);
  await sleep(400);
}

// ---- 3. Reorder roles (Member above Process Lab above Alumni) -----------
const desiredOrder = [
  "KEEPGOING TRADING BOT",
  "👑 Owner",
  "Whop Bot",
  "🛡️ Admin",
  "🎓 Coach",
  "🔨 Moderator",
  "📈 Member",
  "💎 Process Lab",
  "🎓 Alumni",
  "🤖 Bots",
  "Server Booster",
  "Kova",
  "Paid",
];
const rolePositions = [];
let pos = desiredOrder.length; // top -> bottom
for (const name of desiredOrder) {
  const r = findRole(name) || (norm(name) === "alumni" ? alumni : null);
  if (r) rolePositions.push({ id: r.id, position: pos });
  pos--;
}
// @everyone stays at the bottom automatically; do not include it.
try {
  await guild.roles.setPositions(rolePositions);
  console.log("Role positions set:", rolePositions.length, "roles");
} catch (e) {
  console.warn("Role reposition warning:", e.message);
}
await sleep(500);

// ---- 4. Wipe all existing channels & categories -------------------------
// NOTE: COMMUNITY is preserved per explicit instruction (do NOT delete/recreate).
const COMMUNITY_NAME = "💬 COMMUNITY";
const communityCat =
  [...guild.channels.cache.values()].find(
    (c) => c.type === ChannelType.GuildCategory && norm(c.name) === norm(COMMUNITY_NAME)
  ) || null;
const communityCatId = communityCat ? communityCat.id : null;

const allChannels = [...guild.channels.cache.values()];
const nonCats = allChannels.filter((c) => c.type !== ChannelType.GuildCategory);
const cats = allChannels.filter((c) => c.type === ChannelType.GuildCategory);
const wipeNonCats = nonCats.filter((c) => c.parentId !== communityCatId && c.id !== communityCatId);
const wipeCats = cats.filter((c) => c.id !== communityCatId);
console.log(
  `Wiping ${wipeNonCats.length} channels and ${wipeCats.length} categories... (preserving ${COMMUNITY_NAME})`
);
for (const ch of wipeNonCats) {
  try {
    await ch.delete(REASON);
    process.stdout.write(".");
  } catch (e) {
    console.warn(`\nFailed to delete ${ch.name}: ${e.message}`);
  }
  await sleep(250);
}
for (const cat of wipeCats) {
  try {
    await cat.delete(REASON);
    process.stdout.write(".");
  } catch (e) {
    console.warn(`\nFailed to delete category ${cat.name}: ${e.message}`);
  }
  await sleep(250);
}
console.log("\nWipe complete.");
await sleep(800);

// ---- 5. Build overwrite helpers -----------------------------------------
function ow(id, allow, deny) {
  return { id, type: "role", allow: allow || [], deny: deny || [] };
}

function categoryOverwrites(spec) {
  const ows = [];
  if (spec.visibility === "public") {
    ows.push(ow(everyoneId, PUBLIC_ALLOW, []));
  } else {
    ows.push(ow(everyoneId, [], DENY_VIEW));
  }
  for (const r of staffRoles) ows.push(ow(r.id, STAFF_ALLOW, []));

  if (spec.visibility === "member" || spec.visibility === "public") {
    const perms =
      spec.sendProfile === "readonly_members" ? READONLY_MEMBER : MEMBER_CHAT;
    for (const r of [memberRole, processLabRole, alumni]) {
      if (r) ows.push(ow(r.id, perms, []));
    }
  }
  if (spec.visibility === "pl") {
    ows.push(ow(processLabRole.id, PL_ALLOW, []));
    ows.push(ow(memberRole.id, [], DENY_ALL));
    if (alumni) ows.push(ow(alumni.id, [], DENY_ALL));
  }
  if (spec.visibility === "alumni") {
    ows.push(ow(alumni.id, PL_ALLOW, []));
    ows.push(ow(memberRole.id, [], DENY_ALL));
    ows.push(ow(processLabRole.id, [], DENY_ALL));
  }
  if (spec.visibility === "staff") {
    ows.push(ow(memberRole.id, [], DENY_ALL));
    ows.push(ow(processLabRole.id, [], DENY_ALL));
    if (alumni) ows.push(ow(alumni.id, [], DENY_ALL));
  }
  return ows;
}

function channelOverwrites(kind) {
  const ows = [];
  if (kind === "intro") {
    for (const r of [memberRole, processLabRole, alumni]) {
      if (r) ows.push(ow(r.id, ["SendMessages"], []));
    }
  } else if (kind === "announcement") {
    ows.push(ow(memberRole.id, [], ["SendMessages"]));
  } else if (kind === "pl_announcement" || kind === "pl_readonly") {
    ows.push(
      ow(processLabRole.id, [], ["SendMessages", "CreatePublicThreads", "AddReactions"])
    );
  }
  return ows;
}

const isCommunity = (name) => norm(name) === norm(COMMUNITY_NAME); // preserved intentionally
// Channels Discord may refuse to delete (community-server protected). Reuse instead of duplicating.
const REUSE_NAMES = new Set(["📜・community-rules", "🤖・bot-logs"]);

// ---- 6. Create categories + channels ------------------------------------
const created = []; // {category, channels:[{name, id}]}
const catIdByName = {}; // name -> id (for final repositioning)
let catIndex = 0;
for (const spec of STRUCTURE) {
  // COMMUNITY is preserved: do not recreate it.
  if (norm(spec.name) === norm(COMMUNITY_NAME)) {
    if (communityCat) {
      catIdByName[spec.name] = communityCat.id;
      console.log(`Preserved category #${communityCat.name} (not rebuilt)`);
      created.push({
        category: communityCat.name,
        id: communityCat.id,
        channels: [...guild.channels.cache.values()]
          .filter((c) => c.parentId === communityCat.id)
          .sort((a, b) => a.position - b.position)
          .map((c) => ({ name: c.name, id: c.id, kind: "preserved" })),
      });
    } else {
      // Should not happen, but create if missing.
      const cat = await guild.channels.create({
        name: spec.name,
        type: ChannelType.GuildCategory,
        permissionOverwrites: categoryOverwrites(spec),
        position: catIndex,
        reason: REASON,
      });
      catIdByName[spec.name] = cat.id;
      created.push({ category: cat.name, id: cat.id, channels: [] });
      console.log(`Created category #${cat.name}`);
    }
    catIndex++;
    continue;
  }

  const cat = await guild.channels.create({
    name: spec.name,
    type: ChannelType.GuildCategory,
    permissionOverwrites: categoryOverwrites(spec),
    position: catIndex,
    reason: REASON,
  });
  catIndex++;
  catIdByName[spec.name] = cat.id;
  console.log(`Created category #${cat.name}`);
  await sleep(400);

  const channelIds = [];
  let chIndex = 0;
  for (const ch of spec.channels) {
    let createdCh;
    const existing = REUSE_NAMES.has(ch.name)
      ? [...guild.channels.cache.values()].find(
          (c) => c.type !== ChannelType.GuildCategory && norm(c.name) === norm(ch.name)
        )
      : null;
    if (existing) {
      await existing.edit({
        parent: cat.id,
        position: chIndex,
        permissionOverwrites: channelOverwrites(ch.kind),
        reason: REASON,
      });
      createdCh = existing;
      console.log(`  Reused protected channel #${createdCh.name}`);
    } else {
      createdCh = await guild.channels.create({
        name: ch.name,
        type: ChannelType.GuildText,
        parent: cat.id,
        position: chIndex,
        permissionOverwrites: channelOverwrites(ch.kind),
        reason: REASON,
      });
    }
    channelIds.push({ name: createdCh.name, id: createdCh.id, kind: ch.kind });
    try {
      await createdCh.setPosition(chIndex, { lockPermissions: false });
    } catch (e) {
      console.warn(`  setPosition warning for ${createdCh.name}: ${e.message}`);
    }
    chIndex++;
    process.stdout.write(".");
    await sleep(350);
  }
  console.log(` (${spec.channels.length} channels)`);
  created.push({ category: cat.name, id: cat.id, channels: channelIds });
  await sleep(400);
}

// ---- 6b. Enforce exact category order (sequential, reliable) ------------
for (let i = 0; i < STRUCTURE.length; i++) {
  const spec = STRUCTURE[i];
  const id = catIdByName[spec.name];
  const c = id ? guild.channels.cache.get(id) : null;
  if (!c) continue;
  try {
    await c.setPosition(i, { lockPermissions: false });
  } catch (e) {
    console.warn(`Reposition warning for ${c.name}: ${e.message}`);
  }
  await sleep(250);
}
console.log("Category positions enforced to spec order.");
await sleep(500);

// ---- 7. Rules channel + .env update -------------------------------------
const rulesChannel = created
  .find((c) => c.category === "📌 START HERE")
  .channels.find((x) => x.name === "📜・community-rules");
if (rulesChannel) {
  try {
    await guild.setRulesChannel(rulesChannel.id);
    console.log("Set rules channel ->", rulesChannel.name);
  } catch (e) {
    console.warn("setRulesChannel warning:", e.message);
  }
}
const welcomeChannel = created
  .find((c) => c.category === "📌 START HERE")
  .channels.find((x) => x.name === "👋・welcome");
const botLogsChannel = created
  .find((c) => c.category === "🔒 STAFF")
  .channels.find((x) => x.name === "🤖・bot-logs");

// ---- 8. Validation -------------------------------------------------------
await guild.channels.fetch();
await guild.roles.fetch();

const auditRoles = {
  "@everyone": { id: everyoneId, role: guild.roles.cache.get(everyoneId) },
  Member: { id: memberRole.id, role: memberRole },
  "Process Lab": { id: processLabRole.id, role: processLabRole },
  Alumni: alumni ? { id: alumni.id, role: alumni } : null,
  Staff: { id: staffRoles[staffRoles.length - 1].id, role: staffRoles[staffRoles.length - 1] },
};

const catsNow = [...guild.channels.cache.values()]
  .filter((c) => c.type === ChannelType.GuildCategory)
  .sort((a, b) => a.position - b.position);

const issues = [];
const matrix = {};
for (const cat of catsNow) {
  matrix[cat.name] = {};
  for (const [label, info] of Object.entries(auditRoles)) {
    if (!info) continue;
    let canView = false;
    try {
      canView = cat.permissionsFor(info.role).has(PermissionFlagsBits.ViewChannel);
    } catch {
      canView = false;
    }
    matrix[cat.name][label] = canView;
  }
}

// Expected access matrix
const EXPECTED = {
  "📌 START HERE": { "@everyone": true, Member: true, "Process Lab": true, Alumni: true, Staff: true },
  "🎓 EDUCATIONAL ROADMAP": { "@everyone": false, Member: true, "Process Lab": true, Alumni: true, Staff: true },
  "📊 TRADING FLOOR": { "@everyone": false, Member: true, "Process Lab": true, Alumni: true, Staff: true },
  "🤝 COMMUNITY": { "@everyone": false, Member: true, "Process Lab": true, Alumni: true, Staff: true },
  "🧪 PROCESS LAB": { "@everyone": false, Member: false, "Process Lab": true, Alumni: false, Staff: true },
  "🎓 PROCESS LAB ALUMNI": { "@everyone": false, Member: false, "Process Lab": false, Alumni: true, Staff: true },
  "🎫 SUPPORT": { "@everyone": false, Member: true, "Process Lab": true, Alumni: true, Staff: true },
  "🔒 STAFF": { "@everyone": false, Member: false, "Process Lab": false, Alumni: false, Staff: true },
};

for (const cat of catsNow) {
  if (isCommunity(cat.name)) continue; // preserved intentionally; skip strict check
  const exp = EXPECTED[cat.name];
  if (!exp) {
    issues.push(`Unexpected category present: ${cat.name}`);
    continue;
  }
  for (const [label, want] of Object.entries(exp)) {
    if (matrix[cat.name][label] !== want) {
      issues.push(
        `Leak/isolation failure in ${cat.name}: ${label} should be ${
          want ? "VISIBLE" : "HIDDEN"
        } but is ${matrix[cat.name][label] ? "VISIBLE" : "HIDDEN"}`
      );
    }
  }
}

// Duplicate channel / category names (exclude preserved COMMUNITY children)
const catNames = catsNow.map((c) => c.name);
const dupCats = catNames.filter((n, i) => catNames.indexOf(n) !== i);
if (dupCats.length) issues.push(`Duplicate categories: ${dupCats.join(", ")}`);
const allChNow = [...guild.channels.cache.values()].filter(
  (c) => c.type !== ChannelType.GuildCategory
);
const chNames = allChNow
  .filter((c) => c.parentId !== communityCatId)
  .map((c) => c.name);
const dupCh = chNames.filter((n, i) => chNames.indexOf(n) !== i);
if (dupCh.length) issues.push(`Duplicate channels: ${dupCh.join(", ")}`);

// Channel count vs spec (exclude preserved COMMUNITY)
const specChannelCount = STRUCTURE.filter((c) => !isCommunity(c.name)).reduce(
  (s, c) => s + c.channels.length,
  0
);
const actualChannelCount = allChNow.filter(
  (c) => c.parentId !== communityCatId
).length;
if (specChannelCount !== actualChannelCount) {
  issues.push(
    `Channel count mismatch: spec=${specChannelCount}, actual=${actualChannelCount}`
  );
}
const specCatCount = STRUCTURE.length;
if (specCatCount !== catsNow.length) {
  issues.push(`Category count mismatch: spec=${specCatCount}, actual=${catsNow.length}`);
}

// Order verification (compare by normalized name to tolerate emoji variants)
const specCatOrder = STRUCTURE.map((c) => norm(c.name));
const actualCatOrder = catsNow.map((c) => norm(c.name));
if (JSON.stringify(specCatOrder) !== JSON.stringify(actualCatOrder)) {
  issues.push("Category order does not match spec");
}
for (const spec of STRUCTURE) {
  if (isCommunity(spec.name)) continue; // preserved; skip strict order check
  const cat = catsNow.find((c) => norm(c.name) === norm(spec.name));
  if (!cat) continue;
  const children = [...guild.channels.cache.values()]
    .filter((c) => c.parentId === cat.id)
    .sort((a, b) => a.position - b.position)
    .map((c) => norm(c.name));
  const specChildren = spec.channels.map((c) => norm(c.name));
  if (JSON.stringify(children) !== JSON.stringify(specChildren)) {
    issues.push(`Channel order mismatch in ${spec.name}`);
  }
}

// ---- 9. Report -----------------------------------------------------------
console.log("\n========================================");
console.log("FINAL BUILD VALIDATION");
console.log("========================================");
console.log("\nCATEGORIES CREATED (" + catsNow.length + "):");
catsNow.forEach((c, i) => console.log(`  ${i + 1}. ${c.name}`));

console.log("\nCHANNELS CREATED (" + actualChannelCount + "):");
for (const entry of created) {
  console.log(`  # ${entry.category}`);
  entry.channels.forEach((c) => console.log(`     - ${c.name}`));
}

console.log("\nPERMISSION MATRIX (ViewChannel):");
const roleLabels = ["@everyone", "Member", "Process Lab", "Alumni", "Staff"];
console.log("  " + "Category".padEnd(26) + roleLabels.map((r) => r.padStart(10)).join(""));
for (const cat of catsNow) {
  const row = roleLabels
    .map((r) => (matrix[cat.name][r] ? "  ALLOW" : "  DENY ").padStart(10))
    .join("");
  console.log("  " + cat.name.padEnd(26) + row);
}

console.log("\nISSUES FOUND: " + (issues.length ? issues.length : "NONE"));
for (const i of issues) console.log("  - " + i);

// ---- 10. Persist outputs -------------------------------------------------
const report = {
  generatedAt: new Date().toISOString(),
  categories: catsNow.map((c) => c.name),
  channels: created,
  permissionMatrix: matrix,
  issues,
};
const reportPath = path.join(__dirname, `final-build-report-${Date.now()}.json`);
fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
console.log("\nReport written to", reportPath);

// Update .env welcome + logs ids
if (welcomeChannel || botLogsChannel) {
  try {
    const envPath = path.join(__dirname, "..", ".env");
    let env = fs.readFileSync(envPath, "utf-8");
    if (welcomeChannel)
      env = env.replace(
        /WELCOME_CHANNEL_ID=.*/,
        `WELCOME_CHANNEL_ID=${welcomeChannel.id}`
      );
    if (botLogsChannel)
      env = env.replace(
        /LOGS_CHANNEL_ID=.*/,
        `LOGS_CHANNEL_ID=${botLogsChannel.id}`
      );
    fs.writeFileSync(envPath, env);
    console.log("Updated .env WELCOME_CHANNEL_ID / LOGS_CHANNEL_ID");
  } catch (e) {
    console.warn(".env update warning:", e.message);
  }
}

await client.destroy();
console.log("\nDONE.");
