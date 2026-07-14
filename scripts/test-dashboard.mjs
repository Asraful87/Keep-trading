const BASE = "http://localhost:3000";
const T = "8984aa04b3f616257889a55a7f2267ffb81c7830c45575e3";
const H = { "Content-Type": "application/json", Authorization: "Bearer " + T };

async function call(method, path, body) {
  const r = await fetch(BASE + path, {
    method,
    headers: body ? H : { Authorization: "Bearer " + T },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await r.json().catch(() => ({}));
  return { status: r.status, data };
}

const out = {};

out.health = await call("GET", "/api/health");

// no-auth should 401
const noAuth = await fetch(BASE + "/api/templates");
out.noAuthStatus = noAuth.status;

// create
const created = await call("POST", "/api/templates", {
  name: "Welcome Onboarding",
  data: {
    title: "Welcome!",
    description: "Hello <@&1525120538375094333>",
    color: "#5865f2",
    fields: [{ name: "Step 1", value: "Read the rules", inline: true }],
    buttons: [{ label: "Start", style: "success", customId: "start" }],
    timestamp: true,
  },
});
out.createStatus = created.status;
out.createdId = created.data.template?.id;

// list
out.list = await call("GET", "/api/templates");

// get
out.get = await call("GET", "/api/templates/" + out.createdId);

// duplicate
out.dup = await call("POST", "/api/templates/" + out.createdId + "/duplicate");
out.dupId = out.dup.data.template?.id;

// update
out.update = await call("PUT", "/api/templates/" + out.createdId, {
  data: { title: "Welcome (updated)", description: "x" },
});

// channels
out.channels = await call("GET", "/api/channels");
out.channelCount = out.channels.data.categories?.length;

// upload (1x1 png)
const png =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==";
out.upload = await call("POST", "/api/upload", { filename: "px.png", data: png });

// publish to bot-logs channel (staff-only test channel)
out.publish = await call("POST", "/api/publish", {
  data: {
    title: "Embed Builder Test",
    description: "Validation message from dashboard test.",
    color: "#23a559",
    footer: { text: "KEEPGOING Embed Builder" },
    timestamp: true,
  },
  target: { channelId: "1526355679399510179" },
});

// delete both
out.del1 = (await call("DELETE", "/api/templates/" + out.createdId)).status;
out.del2 = (await call("DELETE", "/api/templates/" + out.dupId)).status;

console.log(JSON.stringify(out, null, 2));
