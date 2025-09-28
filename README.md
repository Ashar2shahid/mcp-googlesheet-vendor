# Google Sheets x402 MCP Server

An MCP (Model Context Protocol) server that provides access to Google Sheets data through the x402 payment protocol. This server acts as a bridge between Claude Desktop (or any MCP-compatible client) and a paid Google Sheets API, automatically handling payments using your Ethereum wallet.

## Features

- **Two MCP Tools**:
  - `get_sheet`: Fetch specific Google Sheet data with optional range parameter
  - `list-sheets`: List all available sheets from the API
- **Automatic Payment Handling**: Uses x402 protocol to handle HTTP 402 payment requests
- **Ethereum-based Payments**: Payments are made with USDC on Base (Sepolia testnet or Mainnet)

## Prerequisites

- Node.js (v20 or higher)
- An x402-compatible Google Sheets API server
- An Ethereum wallet with USDC (on Base Sepolia or Base Mainnet)
- Claude Desktop with MCP support

## Installation

1. Clone this repository:
```bash
git clone <your-repo-url>
cd mcp-googlesheet-vendor
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file based on `.env.example`:
```bash
cp .env.example .env
```

4. Configure your environment variables in `.env`:
```env
PRIVATE_KEY=0xYourEthereumPrivateKeyHere
GOOGLESHEET_API_URL=http://localhost:4021
```

## Configuration

### Environment Variables

- `PRIVATE_KEY`: Your Ethereum wallet's private key (for signing payments)
- `GOOGLESHEET_API_URL`: The base URL of your x402-compatible Google Sheets API

## Usage

### Development Mode

Run the server in development mode with auto-reload:
```bash
npm run dev
```

### Production Mode

Build and run the compiled server:
```bash
npm run build
npm start
```

## Adding to Claude Desktop

To use this MCP server with Claude Desktop:

1. Open Claude Desktop and navigate to MCP settings
2. Add the following configuration to your `mcp_settings.json`:

```json
{
  "mcpServers": {
    "googlesheet-x402": {
      "command": "npm",
      "args": [
        "run",
        "--silent",
        "dev"
      ],
      "cwd": "/absolute/path/to/mcp-googlesheet-vendor",
      "env": {
        "PRIVATE_KEY": "0xYourEthereumPrivateKeyHere",
        "GOOGLESHEET_API_URL": "http://localhost:4021"
      }
    }
  }
}
```

3. Restart Claude Desktop
4. The tools will now be available in Claude's tool palette

## Available MCP Tools

### get_sheet

Fetches data from a specific Google Sheet.

**Parameters:**
- `sheetId` (string, required): The Google Sheet ID to fetch data from
- `range` (string, optional): The range to fetch (e.g., 'Sheet1!A1:D10'). If not provided, fetches all data.

**Example usage in Claude:**
```
Can you fetch data from sheet ID "abc123" with range "Sheet1!A1:D10"?
```

### list-sheets

Lists all available sheets from the Google Sheets API.

**Parameters:** None

**Example usage in Claude:**
```
Show me all available sheets
```

## How It Works

1. When Claude (or another MCP client) calls a tool, the MCP server sends a request to your x402-compatible Google Sheets API
2. If the API requires payment (HTTP 402), the x402-axios interceptor automatically:
   - Detects the payment requirement
   - Creates and signs a payment transaction using your wallet
   - Submits the payment
   - Retries the original request
3. The API returns the requested data
4. The MCP server forwards the data back to Claude

## Security Notes

- Never commit your `.env` file or expose your private key
- Use testnet (Base Sepolia) for development
- Ensure your wallet has sufficient USDC for API payments
- Store your private key securely

## Development

### Project Structure

```
mcp-googlesheet-vendor/
├── server.ts           # Main MCP server implementation
├── package.json        # Dependencies and scripts
├── tsconfig.json       # TypeScript configuration
├── .env.example        # Environment variables template
├── .gitignore         # Git ignore rules
└── README.md          # This file
```

### Building the x402 Google Sheets API

This MCP server requires an x402-compatible API that serves Google Sheets data. You'll need to:

1. Create an API that integrates with Google Sheets API
2. Implement x402 payment requirements (HTTP 402 responses)
3. Accept payments in USDC on Base network
4. Return sheet data after successful payment

Refer to the [x402 protocol documentation](https://github.com/coinbase/x402) for implementation details.

## Troubleshooting

- **Module not found errors**: Run `npm install` to ensure all dependencies are installed
- **Payment failures**: Check your wallet has sufficient USDC and the correct network is configured
- **API connection errors**: Verify your `GOOGLESHEET_API_URL` is correct and the API is running
- **MCP connection issues**: Ensure the `cwd` path in your MCP settings points to the correct directory

## License

MIT