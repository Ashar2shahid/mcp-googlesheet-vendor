import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { WebSocketServerTransport } from "@modelcontextprotocol/sdk/server/websocket.js";
import { createServer } from "http";
import { WebSocketServer } from "ws";
import { fetch as undiciFetch } from "undici";

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

const mcp = new Server({
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

mcp.tool(
  {
    name: "get_indicator_sheet",
    description: "Fetch a paid CSV (Google Sheets via x402 vending URL) and return parsed rows.",
    inputSchema: {
      type: "object",
      properties: {
        url: { type: "string", description: "Override vending URL (optional)" },
        maxRows: { type: "number", default: 100 }
      }
    }
  },
  async (input) => {
    const url = (input as any).url || PAID_SHEET_URL!;
    const maxRows = Number((input as any).maxRows ?? 100);

    const res = await fetchWithPayment(url, { method: "GET" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const text = await res.text();

    const { header, rows } = parseCsv(text);
    const trimmed = rows.slice(0, maxRows);

    return {
      content: [{ type: "text", text: JSON.stringify({ header, rows: trimmed }, null, 2) }]
    };
  }
);

const httpServer = createServer((req, res) => {
  if (req.url === "/") {
    res.writeHead(200, { "content-type": "text/plain" });
    res.end("MCP x402 server alive\n");
  } else {
    res.writeHead(404).end();
  }
});

const wss = new WebSocketServer({ server: httpServer, path: "/ws" });

wss.on("connection", (socket) => {
  const transport = new WebSocketServerTransport({ socket });
  mcp.connect(transport);
});

httpServer.listen(Number(PORT), () => {
  console.log(`MCP x402 server listening on :${PORT} (ws path /ws)`);
});