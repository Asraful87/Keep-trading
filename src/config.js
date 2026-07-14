import dotenv from "dotenv";

dotenv.config();

function getEnv(name, fallback = "") {
  const value = process.env[name];
  return value === undefined || value === "" ? fallback : value;
}

export const config = {
  token: getEnv("DISCORD_TOKEN"),
  clientId: getEnv("CLIENT_ID"),
  guildId: getEnv("GUILD_ID"),
  logsChannelId: getEnv("LOGS_CHANNEL_ID"),
  welcomeChannelId: getEnv("WELCOME_CHANNEL_ID"),
  antiRaid: {
    joinThreshold: Number(getEnv("ANTI_RAID_JOIN_THRESHOLD", "5")) || 5,
    timeWindowMs: Number(getEnv("ANTI_RAID_TIME_WINDOW_MS", "10000")) || 10000,
  },
  dashboard: {
    enabled: getEnv("DASHBOARD_ENABLED", "true") === "true",
    port: Number(getEnv("DASHBOARD_PORT", "3000")) || 3000,
    token: getEnv("EMBED_DASHBOARD_TOKEN", ""),
    mediaChannelId: getEnv("EMBED_MEDIA_CHANNEL_ID", ""),
  },
};

export function validateConfig() {
  const errors = [];
  if (!config.token) errors.push("DISCORD_TOKEN is missing");
  if (!config.clientId) errors.push("CLIENT_ID is missing");
  return errors;
}
