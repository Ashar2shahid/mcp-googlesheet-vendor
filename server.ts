import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { createServer } from "http";
import { fetch as undiciFetch } from "undici";
import { z } from "zod";

import { createWalletClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { baseSepolia } from "viem/chains";

import { wrapFetchWithPayment } from "x402-fetch";

const {
  PAID_SHEET_URL,
  PRIVATE_KEY,
  PORT = "8080"
} = process.env;

if (!PAID_SHEET_URL) throw new Error("Missing PAID_SHEET_URL");
if (!PRIVATE_KEY) throw new Error("Missing PRIVATE_KEY");

const account = privateKeyToAccount(PRIVATE_KEY as `0x${string}`);
const wallet = createWalletClient({
  account,
  chain: baseSepolia,
  transport: http()
});

const fetchWithPayment = wrapFetchWithPayment(undiciFetch as any, account);

const mcp = new McpServer({
  name: "x402-mcp-sheets",
  version: "1.0.0"
});

function parseCsv(text: string) {
  const rows = text.trim().split(/\r?\n/).map(r =>
    r.split(/,(?=(?:[^"]*"[^"]*")*[^"]*$)/).map(c => c.replace(/^"|"$/g, ""))
  );
  const header = rows[0] ?? [];
  const data = rows.slice(1).map(r =>
    Object.fromEntries(r.map((v, i) => [header[i] ?? `col${i+1}`, v]))
  );
  return { header, rows: data };
}

mcp.registerTool("get_indicator_sheet", {
  description: "Fetch a paid CSV (Google Sheets via x402 vending URL) and return parsed rows.",
  inputSchema: {
    url: z.string().optional().describe("Override vending URL (optional)"),
    maxRows: z.number().optional().default(100).describe("Maximum rows to return")
  }
}, async (input) => {
    const url = input.url || PAID_SHEET_URL!;
    const maxRows = input.maxRows ?? 100;

    const res = await fetchWithPayment(url, { method: "GET" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const text = await res.text();

    const { header, rows } = parseCsv(text);
    const trimmed = rows.slice(0, maxRows);

  return {
    content: [{ type: "text", text: JSON.stringify({ header, rows: trimmed }, null, 2) }]
  };
});

const httpServer = createServer(async (req, res) => {
  if (req.url === "/") {
    res.writeHead(200, { "content-type": "text/plain" });
    res.end("MCP x402 server alive\n");
  } else if (req.url === "/sse") {
    const transport = new SSEServerTransport("/messages", res);
    await mcp.connect(transport);
  } else if (req.url === "/messages" && req.method === "POST") {
    let body = "";
    req.on("data", chunk => body += chunk);
    req.on("end", () => {
      res.writeHead(200);
      res.end();
    });
  } else {
    res.writeHead(404).end();
  }
});

httpServer.listen(Number(PORT), () => {
  console.log(`MCP x402 server listening on :${PORT} (SSE endpoint: /sse)`);
});