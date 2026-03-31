import * as http from "http";
import * as fs from "fs";
import * as path from "path";
import { formatSQL, FormatOptions } from "./formatter";

export function startServer(port: number): void {
  const publicDir = path.resolve(__dirname, "..", "public");

  const server = http.createServer((req: http.IncomingMessage, res: http.ServerResponse) => {
    // API endpoint
    if (req.method === "POST" && req.url === "/api/format") {
      let body = "";
      req.on("data", (chunk: string) => (body += chunk));
      req.on("end", () => {
        try {
          const { sql, options } = JSON.parse(body) as {
            sql: string;
            options?: Partial<FormatOptions>;
          };
          const formatted = formatSQL(sql, options);
          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ formatted }));
        } catch (e: any) {
          res.writeHead(400, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: e.message }));
        }
      });
      return;
    }

    // Static files
    let filePath = req.url === "/" ? "/index.html" : req.url || "/index.html";
    filePath = path.join(publicDir, filePath);

    const ext = path.extname(filePath);
    const mimeTypes: Record<string, string> = {
      ".html": "text/html",
      ".css": "text/css",
      ".js": "application/javascript",
      ".json": "application/json",
      ".png": "image/png",
      ".svg": "image/svg+xml",
    };

    fs.readFile(filePath, (err: NodeJS.ErrnoException | null, data: Buffer) => {
      if (err) {
        res.writeHead(404, { "Content-Type": "text/plain" });
        res.end("Not found");
        return;
      }
      res.writeHead(200, { "Content-Type": mimeTypes[ext] || "text/plain" });
      res.end(data);
    });
  });

  server.listen(port, () => {
    console.log(`sqlfmt web UI running at http://localhost:${port}`);
  });
}
