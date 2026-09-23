import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { extname, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { scripted_reply, suspect_ai_context } from "./web/engine.js";

const root = resolve(fileURLToPath(new URL("./web", import.meta.url)));
const port = Number(process.env.PORT ?? 4173);
const maxBody = 2_000_000;
const mime = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".svg": "image/svg+xml",
  ".json": "application/json; charset=utf-8",
};

function send(res, status, body, type = "application/json; charset=utf-8") {
  res.writeHead(status, { "content-type": type, "cache-control": "no-store" });
  res.end(body);
}

async function readJson(req) {
  let body = "";
  for await (const chunk of req) {
    body += chunk;
    if (body.length > maxBody) throw new Error("请求内容过大");
  }
  return JSON.parse(body || "{}");
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url ?? "/", `http://${req.headers.host ?? "localhost"}`);
  if (req.method === "POST" && url.pathname === "/api/chat") {
    try {
      const body = await readJson(req);
      const suspect = String(body.suspect ?? "林岚").slice(0, 20);
      const suspectId = Number.isInteger(body.suspectId) && body.suspectId >= 0 && body.suspectId <= 2 ? body.suspectId : 1;
      const question = String(body.question ?? "").slice(0, 2_000);
      const evidence = Array.isArray(body.evidence) ? body.evidence.map(String).slice(0, 8) : [];
      const imageDataUrl = typeof body.imageDataUrl === "string" && body.imageDataUrl.startsWith("data:image/")
        ? body.imageDataUrl
        : null;
      const apiKey = process.env.OPENAI_API_KEY;
      const baseUrl = (process.env.OPENAI_BASE_URL ?? "https://api.openai.com/v1").replace(/\/$/, "");
      const model = process.env.OPENAI_MODEL ?? "gpt-4o-mini";
      if (!apiKey) {
        const text = scripted_reply(suspect, question, +evidence.includes("录音波形"), +evidence.includes("现场照片"), +evidence.includes("机房日志"));
        return send(res, 200, JSON.stringify({ text, mode: "scripted", imageIgnored: Boolean(imageDataUrl) }));
      }
      const suspectContext = suspect_ai_context(
        suspectId,
        +evidence.includes("录音波形"),
        +evidence.includes("现场照片"),
        +evidence.includes("机房日志"),
      );
      const system = `你是互动推理游戏《回声档案》中的角色“${suspect}”。只用自然、简短的中文回答。${suspectContext}\n玩家已发现：${evidence.join("、") || "暂无线索"}。`;
      const userParts = [{ type: "text", text: question }];
      if (imageDataUrl) userParts.push({ type: "image_url", image_url: { url: imageDataUrl, detail: "low" } });
      const response = await fetch(`${baseUrl}/chat/completions`, {
        method: "POST",
        headers: { authorization: `Bearer ${apiKey}`, "content-type": "application/json" },
        body: JSON.stringify({
          model,
          temperature: 0.3,
          max_tokens: 180,
          messages: [{ role: "system", content: system }, { role: "user", content: userParts }],
        }),
        signal: AbortSignal.timeout(25_000),
      });
      if (!response.ok) {
        const detail = (await response.text()).slice(0, 300);
        return send(res, 502, JSON.stringify({ error: `模型服务返回 ${response.status}`, detail }));
      }
      const result = await response.json();
      const text = result.choices?.[0]?.message?.content;
      return send(res, 200, JSON.stringify({ text: typeof text === "string" ? text : "我暂时没有听清，再问一次吧。", mode: "model" }));
    } catch (error) {
      return send(res, 400, JSON.stringify({ error: error instanceof Error ? error.message : "对话请求失败" }));
    }
  }

  const pathname = decodeURIComponent(url.pathname === "/" ? "/index.html" : url.pathname);
  const file = resolve(root, `.${pathname}`);
  if (file !== root && !file.startsWith(root + sep)) return send(res, 403, "forbidden", "text/plain");
  try {
    if (!(await stat(file)).isFile()) return send(res, 404, "not found", "text/plain");
    const content = await readFile(file);
    send(res, 200, content, mime[extname(file)] ?? "application/octet-stream");
  } catch {
    send(res, 404, "not found", "text/plain");
  }
});

server.listen(port, () => {
  const address = server.address();
  console.log(`EchoCase is ready at http://localhost:${typeof address === "object" && address ? address.port : port}`);
});
