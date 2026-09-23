import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createServer } from "node:http";
import { once } from "node:events";
import { after, before, test } from "node:test";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
async function startEchoServer(extraEnv = {}) {
  const child = spawn(process.execPath, ["server.mjs"], {
    cwd: root,
    env: { ...process.env, PORT: "0", OPENAI_API_KEY: "", ...extraEnv },
    stdio: ["ignore", "pipe", "pipe"],
  });
  let buffer = "";
  const ready = new Promise((resolveReady, reject) => {
    const timer = setTimeout(() => reject(new Error(`Server did not start: ${buffer}`)), 5_000);
    child.stdout.on("data", (chunk) => {
      buffer += chunk.toString();
      const match = buffer.match(/http:\/\/localhost:(\d+)/);
      if (match) {
        clearTimeout(timer);
        resolveReady(`http://localhost:${match[1]}`);
      }
    });
    child.once("error", reject);
    child.once("exit", (code) => reject(new Error(`Server exited early (${code}): ${buffer}`)));
  });
  return { child, origin: await ready };
}

async function stopChild(child) {
  if (child && child.exitCode === null) {
    child.kill("SIGTERM");
    await once(child, "exit");
  }
}

let demoServer;
before(async () => { demoServer = await startEchoServer(); });

after(async () => {
  await stopChild(demoServer?.child);
});

test("serves the playable game shell", async () => {
  const response = await fetch(demoServer.origin);
  assert.equal(response.status, 200);
  assert.match(await response.text(), /回声档案/);
});

test("runs the evidence-aware MoonBit dialogue when no model key is configured", async () => {
  const response = await fetch(`${demoServer.origin}/api/chat`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      suspect: "林岚",
      question: "照片里的人是谁？",
      evidence: ["现场照片"],
    }),
  });
  assert.equal(response.status, 200);
  const result = await response.json();
  assert.equal(result.mode, "scripted");
  assert.match(result.text, /维护服/);
});

test("clearly reports that demo mode ignores uploaded images", async () => {
  const response = await fetch(`${demoServer.origin}/api/chat`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      suspect: "林岚",
      question: "你能看到这张图吗？",
      evidence: [],
      imageDataUrl: "data:image/png;base64,aGVsbG8=",
    }),
  });
  assert.equal(response.status, 200);
  assert.equal((await response.json()).imageIgnored, true);
});

test("forwards attached images only through the configured vision-model adapter", async () => {
  let receivedRequest;
  const provider = createServer(async (req, res) => {
    let body = "";
    for await (const chunk of req) body += chunk;
    receivedRequest = { url: req.url, authorization: req.headers.authorization, payload: JSON.parse(body) };
    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify({ choices: [{ message: { content: "这张图片里有一台控制台。" } }] }));
  });
  provider.listen(0, "127.0.0.1");
  await once(provider, "listening");
  const providerPort = provider.address().port;
  const modelServer = await startEchoServer({
    OPENAI_API_KEY: "local-test-secret",
    OPENAI_BASE_URL: `http://127.0.0.1:${providerPort}/v1`,
    OPENAI_MODEL: "test-vision-model",
  });
  try {
    const response = await fetch(`${modelServer.origin}/api/chat`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        suspect: "林岚",
        question: "请看一下这张图。",
        evidence: ["现场照片"],
        imageDataUrl: "data:image/png;base64,aGVsbG8=",
      }),
    });
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { text: "这张图片里有一台控制台。", mode: "model" });
    assert.equal(receivedRequest.url, "/v1/chat/completions");
    assert.equal(receivedRequest.authorization, "Bearer local-test-secret");
    assert.equal(receivedRequest.payload.model, "test-vision-model");
    assert.deepEqual(receivedRequest.payload.messages[1].content[1], {
      type: "image_url",
      image_url: { url: "data:image/png;base64,aGVsbG8=", detail: "low" },
    });
  } finally {
    await stopChild(modelServer.child);
    await new Promise((resolveClose) => provider.close(resolveClose));
  }
});
