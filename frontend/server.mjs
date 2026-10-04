import http from "node:http";
import https from "node:https";
import { readFile, readdir } from "node:fs/promises";
const backend = new URL(process.env.API_ORIGIN || "http://127.0.0.1:3000");
const files = new Map([
  ["/", ["index.html", "text/html"]],
  ["/app.js", ["app.js", "text/javascript"]],
  ["/core.js", ["core.js", "text/javascript"]],
  ["/style.css", ["style.css", "text/css"]],
]);
for (const name of await readdir(
  new URL("./assets/images/", import.meta.url),
)) {
  if (/^[a-zA-Z0-9_-]+\.(png|jpg)$/.test(name)) {
    files.set("/assets/images/" + name, [
      "assets/images/" + name,
      name.endsWith(".png") ? "image/png" : "image/jpeg",
    ]);
  }
}
const server = http.createServer(async (req, res) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Referrer-Policy", "same-origin");
  res.setHeader(
    "Content-Security-Policy",
    "default-src 'self'; img-src 'self' https: http: data:; style-src 'self'; script-src 'self'; connect-src 'self'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'",
  );
  let requestUrl;
  try {
    requestUrl = new URL(req.url, "http://localhost");
  } catch {
    res.writeHead(400);
    res.end("Bad request");
    return;
  }
  const path = requestUrl.pathname;
  if (path.startsWith("/api/v1/")) {
    const upstream = (backend.protocol === "https:" ? https : http).request(
      new URL(path + requestUrl.search, backend),
      { method: req.method, headers: { ...req.headers, host: backend.host } },
      (response) => {
        res.writeHead(response.statusCode, {
          ...response.headers,
          "cache-control": "no-store",
        });
        response.pipe(res);
      },
    );
    upstream.setTimeout(15000, () => upstream.destroy(new Error("Timeout")));
    upstream.on("error", () => {
      if (!res.headersSent) {
        res.writeHead(502, { "Content-Type": "application/json" });
        res.end(
          JSON.stringify({
            error: {
              message:
                "Không kết nối được backend. Kiểm tra API_ORIGIN và máy chủ API.",
            },
          }),
        );
      } else res.destroy();
    });
    req.pipe(upstream);
    return;
  }
  const file = files.get(path);
  if (!file || !["GET", "HEAD"].includes(req.method)) {
    res.writeHead(404);
    res.end("Not found");
    return;
  }
  try {
    const data = await readFile(new URL(file[0], import.meta.url));
    res.writeHead(200, {
      "Content-Type": file[1] + "; charset=utf-8",
      "Cache-Control": "no-cache",
    });
    res.end(req.method === "HEAD" ? undefined : data);
  } catch {
    res.writeHead(500);
    res.end("Không tải được giao diện");
  }
});
server.listen(Number(process.env.PORT || 5173), "127.0.0.1", () =>
  console.log("Giao diện: http://127.0.0.1:" + (process.env.PORT || 5173)),
);
