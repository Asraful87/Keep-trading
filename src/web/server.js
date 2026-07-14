// Local Embed Builder web server. Runs in the SAME process as the bot so it
// can use the already-authenticated discord.js `client` to publish.
// Uses Node's built-in `http` — no Express dependency.

import http from "http";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
} from "discord.js";
import {
  listTemplates,
  getTemplate,
  createTemplate,
  updateTemplate,
  deleteTemplate,
} from "./db.js";
import { requireToken } from "./auth.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const INDEX_HTML = path.join(__dirname, "static", "index.html");

// ---- Discord limits -------------------------------------------------------
const LIMITS = {
  title: 256,
  description: 4096,
  fieldName: 256,
  fieldValue: 1024,
  footer: 2048,
  author: 256,
  maxFields: 25,
  maxButtons: 25,
  maxEmbeds: 10,
};

function mapStyle(style) {
  switch (style) {
    case "primary":
      return ButtonStyle.Primary;
    case "secondary":
      return ButtonStyle.Secondary;
    case "success":
      return ButtonStyle.Success;
    case "danger":
      return ButtonStyle.Danger;
    case "link":
      return ButtonStyle.Link;
    default:
      return ButtonStyle.Success;
  }
}

// discord.js strictly validates URLs; only pass values that are real http(s) URLs.
function isValidUrl(v) {
  if (typeof v !== "string" || !v.trim()) return false;
  try {
    const u = new URL(v);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

function buildEmbed(data = {}) {
  const embed = new EmbedBuilder();
  const a = data.author;
  if (a && a.name)
    embed.setAuthor({
      name: a.name.slice(0, LIMITS.author),
      iconURL: isValidUrl(a.iconUrl) ? a.iconUrl : undefined,
      url: isValidUrl(a.url) ? a.url : undefined,
    });
  if (data.title) embed.setTitle(data.title.slice(0, LIMITS.title));
  if (isValidUrl(data.url)) embed.setURL(data.url);
  if (data.description)
    embed.setDescription(data.description.slice(0, LIMITS.description));
  if (typeof data.color === "number") embed.setColor(data.color);
  for (const f of data.fields || []) {
    if (!f.name && !f.value) continue;
    embed.addFields({
      name: (f.name || "‌").slice(0, LIMITS.fieldName),
      value: (f.value || "‌").slice(0, LIMITS.fieldValue),
      inline: !!f.inline,
    });
    if (embed.data.fields && embed.data.fields.length >= LIMITS.maxFields) break;
  }
  if (isValidUrl(data.thumbnail)) embed.setThumbnail(data.thumbnail);
  // When a banner is set in "footer" mode it occupies the embed image slot;
  // otherwise the standalone image field is used.
  const bannerFooter =
    isValidUrl(data.banner) && (data.bannerPosition || "header") === "footer";
  if (isValidUrl(data.image) && !bannerFooter) embed.setImage(data.image);
  if (data.footer && data.footer.text)
    embed.setFooter({
      text: data.footer.text.slice(0, LIMITS.footer),
      iconURL: isValidUrl(data.footer.iconUrl) ? data.footer.iconUrl : undefined,
    });
  if (data.timestamp) embed.setTimestamp(new Date());
  return embed;
}

function buildComponents(buttons = []) {
  if (!buttons || !buttons.length) return [];
  const rows = [];
  const slice = buttons.slice(0, LIMITS.maxButtons);
  for (let i = 0; i < slice.length; i += 5) {
    const row = new ActionRowBuilder();
    for (const b of slice.slice(i, i + 5)) {
      const style = mapStyle(b.style);
      const btn = new ButtonBuilder()
        .setLabel((b.label || "Button").slice(0, 80))
        .setStyle(style);
      if (style === ButtonStyle.Link)
        btn.setURL(isValidUrl(b.url) ? b.url : "https://discord.com");
      else btn.setCustomId(b.customId || `embed_btn_${Date.now()}_${i}`);
      row.addComponents(btn);
    }
    rows.push(row);
  }
  return rows;
}

function resolveTargets(guild, target = {}) {
  if (target.categoryId) {
    const cat = guild.channels.cache.get(target.categoryId);
    if (!cat || cat.type !== ChannelType.GuildCategory) return [];
    return [...cat.children.cache.values()].filter((c) => c.isTextBased());
  }
  if (target.channelId) {
    const ch = guild.channels.cache.get(target.channelId);
    return ch && ch.isTextBased() ? [ch] : [];
  }
  return [];
}

// ---- HTTP helpers ---------------------------------------------------------
function sendJson(res, status, obj) {
  const body = JSON.stringify(obj);
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": Buffer.byteLength(body),
  });
  res.end(body);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = "";
    let size = 0;
    req.on("data", (chunk) => {
      size += chunk.length;
      if (size > 20 * 1024 * 1024) {
        reject(new Error("Payload too large"));
        req.destroy();
        return;
      }
      data += chunk;
    });
    req.on("end", () => {
      if (!data) return resolve({});
      try {
        resolve(JSON.parse(data));
      } catch (e) {
        reject(new Error("Invalid JSON body"));
      }
    });
    req.on("error", reject);
  });
}

async function getGuild(client, guildId) {
  let guild = client.guilds.cache.get(guildId);
  if (!guild) guild = await client.guilds.fetch(guildId);
  await guild.channels.fetch();
  return guild;
}

export function startWebServer(client, config) {
  const dash = config.dashboard || {};
  if (dash.enabled === false) {
    console.log("[dashboard] disabled (DASHBOARD_ENABLED=false)");
    return;
  }

  const server = http.createServer(async (req, res) => {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const pathname = url.pathname;

    // Static SPA
    if (req.method === "GET" && (pathname === "/" || pathname === "/index.html")) {
      try {
        const html = fs.readFileSync(INDEX_HTML, "utf-8");
        res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
        res.end(html);
      } catch {
        res.writeHead(404);
        res.end("Dashboard UI not found.");
      }
      return;
    }

    if (!pathname.startsWith("/api/")) {
      res.writeHead(404);
      res.end("Not found");
      return;
    }

    // Health (no auth)
    if (req.method === "GET" && pathname === "/api/health") {
      sendJson(res, 200, { ok: true, kind: requireToken({ headers: {} }, url).ok ? "secured" : "unsecured" });
      return;
    }

    // Auth for everything else
    const auth = requireToken(req, url);
    if (!auth.ok) {
      sendJson(res, auth.status, { error: auth.error });
      return;
    }

    try {
      const guildId = url.searchParams.get("guildId") || config.guildId;

      // ---- Templates ----
      if (pathname === "/api/templates" && req.method === "GET") {
        return sendJson(res, 200, { templates: await listTemplates(guildId) });
      }

      if (pathname === "/api/templates" && req.method === "POST") {
        const body = await readBody(req);
        if (!body.name || !body.data)
          return sendJson(res, 400, { error: "name and data are required" });
        const tpl = await createTemplate({
          name: String(body.name),
          guildId,
          data: body.data,
          createdBy: body.createdBy,
        });
        return sendJson(res, 201, { template: tpl });
      }

      const tplMatch = pathname.match(/^\/api\/templates\/(\d+)$/);
      if (tplMatch) {
        const id = tplMatch[1];
        if (req.method === "GET") {
          const tpl = await getTemplate(id);
          return tpl
            ? sendJson(res, 200, { template: tpl })
            : sendJson(res, 404, { error: "Template not found" });
        }
        if (req.method === "PUT") {
          const body = await readBody(req);
          const tpl = await updateTemplate(id, {
            name: body.name,
            data: body.data,
            createdBy: body.createdBy,
          });
          return tpl
            ? sendJson(res, 200, { template: tpl })
            : sendJson(res, 404, { error: "Template not found" });
        }
        if (req.method === "DELETE") {
          await deleteTemplate(id);
          return sendJson(res, 200, { ok: true });
        }
      }

      const dupMatch = pathname.match(/^\/api\/templates\/(\d+)\/duplicate$/);
      if (dupMatch && req.method === "POST") {
        const src = await getTemplate(dupMatch[1]);
        if (!src) return sendJson(res, 404, { error: "Template not found" });
        const copy = await createTemplate({
          name: `${src.name} (copy)`,
          guildId: src.guildId,
          data: src.data,
          createdBy: src.createdBy,
        });
        return sendJson(res, 201, { template: copy });
      }

      // ---- Channels (publish target picker) ----
      if (pathname === "/api/channels" && req.method === "GET") {
        const guild = await getGuild(client, guildId);
        const cats = [...guild.channels.cache.values()]
          .filter((c) => c.type === ChannelType.GuildCategory)
          .sort((a, b) => a.position - b.position);
        const out = cats.map((cat) => ({
          id: cat.id,
          name: cat.name,
          channels: [...cat.children.cache.values()]
            .filter((c) => c.isTextBased())
            .sort((a, b) => a.position - b.position)
            .map((ch) => ({ id: ch.id, name: ch.name })),
        }));
        return sendJson(res, 200, { categories: out });
      }

      // ---- Image upload -> Discord CDN URL ----
      if (pathname === "/api/upload" && req.method === "POST") {
        const body = await readBody(req);
        if (!dash.mediaChannelId)
          return sendJson(res, 400, {
            error: "EMBED_MEDIA_CHANNEL_ID is not set. Configure it to enable uploads.",
          });
        if (!body.data)
          return sendJson(res, 400, { error: "data (base64) is required" });
        const guild = await getGuild(client, guildId);
        const media = guild.channels.cache.get(dash.mediaChannelId);
        if (!media)
          return sendJson(res, 400, { error: "Media channel not found." });
        const buf = Buffer.from(body.data, "base64");
        const msg = await media.send({
          files: [
            { attachment: buf, name: body.filename || "embed-image.png" },
          ],
        });
        const url = msg.attachments.first()?.url;
        if (!url) return sendJson(res, 500, { error: "Upload failed." });
        return sendJson(res, 200, { url });
      }

      // ---- Publish ----
      if (pathname === "/api/publish" && req.method === "POST") {
        const body = await readBody(req);
        const data = body.data || {};
        if (data.fields && data.fields.length > LIMITS.maxFields)
          return sendJson(res, 400, { error: `Max ${LIMITS.maxFields} fields.` });
        if (data.buttons && data.buttons.length > LIMITS.maxButtons)
          return sendJson(res, 400, { error: `Max ${LIMITS.maxButtons} buttons.` });

        const guild = await getGuild(client, guildId);
        const targets = resolveTargets(guild, body.target || {});
        if (!targets.length)
          return sendJson(res, 400, {
            error: "No valid text channel(s) resolved for the target.",
          });

        const embed = buildEmbed(data);
        const components = buildComponents(data.buttons);

        // Banner as a header: send the image as a leading attachment so it
        // renders ABOVE the embed (image-first, then text). Banner as a footer
        // reuses the embed image slot (handled in buildEmbed).
        const bannerUrl = isValidUrl(data.banner) ? data.banner : null;
        const bannerHeader =
          bannerUrl && (data.bannerPosition || "header") !== "footer";
        if (bannerUrl && !bannerHeader) embed.setImage(bannerUrl);

        let sent = 0;
        const errors = [];
        for (const t of targets) {
          try {
            const opts = { embeds: [embed], components };
            if (bannerHeader) {
              opts.files = [{ attachment: bannerUrl, name: "banner.png" }];
            }
            await t.send(opts);
            sent++;
          } catch (e) {
            errors.push(`${t.name}: ${e.message}`);
          }
        }
        return sendJson(res, 200, {
          sent,
          total: targets.length,
          errors: errors.slice(0, 5),
        });
      }

      return sendJson(res, 404, { error: "Unknown route" });
    } catch (e) {
      console.error("[dashboard] API error:", e);
      return sendJson(res, 500, { error: e.message || "Internal error" });
    }
  });

  // On Heroku a web dyno must bind to the port Heroku assigns ($PORT);
  // fall back to the configured EMBED_DASHBOARD_PORT locally.
  const listenPort = process.env.PORT || dash.port;
  server.listen(listenPort, () => {
    console.log(`[dashboard] Embed Builder running on port ${listenPort}`);
  });
  server.on("error", (e) => {
    console.error("[dashboard] server error:", e.message);
  });

  // Self keep-alive: on Heroku a web dyno sleeps after 30 min of inactivity.
  // Ping our own /api/health on an interval to count as activity. Disable
  // with KEEPALIVE=false. No-op when there is no $PORT (local dev).
  if (process.env.PORT && process.env.KEEPALIVE !== "false") {
    const intervalMs = Number(process.env.KEEPALIVE_INTERVAL_MS || 20 * 60 * 1000);
    const timer = setInterval(() => {
      fetch(`http://localhost:${listenPort}/api/health`).catch(() => {});
    }, intervalMs);
    if (timer.unref) timer.unref();
    console.log(`[dashboard] Keep-alive ping enabled every ${Math.round(intervalMs / 60000)} min.`);
  }
  return server;
}
