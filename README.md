# Adamik Signer MCP Server

This is an [MCP (Model Context Protocol)](https://github.com/modelcontextprotocol/spec) server that provides digital signature capabilities for blockchain transactions. It is designed to work **in tandem with** the `adamik-mcp-server`, which handles transaction encoding and state introspection. This signer server provides a secure interface to sign transactions after confirming user intent.

---

## 🚀 Features

- 🔐 **Single Wallet Session**: Only one wallet can be connected per session to avoid ambiguity in signature requests.
- 🔎 **Introspect Wallet State**: Check whether a wallet is connected and what types of signers are available.
- 🔑 **Key Derivation**: Derive public keys from a given signer specification.
- ✍️ **Transaction Signing**: Sign encoded payloads in accordance with the Adamik protocol.
- 📖 **Usage Guidance**: The `readMeFirst` tool helps orient LLMs or developers before invoking sensitive actions.

---

## Prerequisites

- Node.js (v20 or higher)
- pnpm
- Git
- Claude Desktop installed (https://claude.ai/download)
- Claude Pro subscription required

---

## Installation

### Adding Signer MCP Server to your MCP Client

Since this server is designed to work **in tandem with** the `adamik-mcp-server`, here are examples showing both servers configured together:

#### YAML (FastAgent Config File)

```yaml
mcp:
  servers:
    adamik:
      command: "npx"
      args: ["@adamik/api-mcp-server"]
      env:
        ADAMIK_API_KEY: "<your-adamik-api-key>"
    signer:
      command: "node"
      args: ["path/to/signer-mcp-server/build/index.js"]
```

#### JSON (Claude Desktop / NextChat)

```json
{
  "mcpServers": {
    "adamik": {
      "command": "npx",
      "args": ["@adamik/api-mcp-server"],
      "env": {
        "ADAMIK_API_KEY": "<your-adamik-api-key>"
      }
    },
    "signer": {
      "command": "node",
      "args": ["path/to/signer-mcp-server/build/index.js"]
    }
  }
}
```

**Note**: Replace `<your-adamik-api-key>` with your actual Adamik API key and adjust the path to your local signer-mcp-server build directory.

### Local Installation

#### 1. Clone Repository

```bash
git clone https://github.com/your-username/signer-mcp-server.git
cd signer-mcp-server
```

#### 2. Install dependencies and build

```bash
pnpm install
pnpm run build
```

#### 3. Configure your client

Add the server to your MCP client configuration using the paths shown above. The built server will be available at `build/index.js`.

---

## 📦 Tools

### `readMeFirst`

> Provides critical guidance on how to safely use this MCP server.

### `getWalletStatus`

> Check if a wallet is currently connected.

### `getAvailableWalletSigners`

> Lists all supported signer types available for wallet connection.

### `connectWallet`

> Connect a wallet with the specified `signerType`. Only one wallet can be connected per session.

**Input:**

```json
{
  "signerType": "string"
}
```

### `getPubKey`

> Derives the public key using the connected wallet and a provided signer specification.

**Input:**

```json
{
  "signerSpec": {
    "curve": "string",
    "path": "string",
    "hashFunction": "string"
  }
}
```

### `signTransaction`

> Signs an encoded payload. Use only after confirming user consent.

**Input:**

```json
{
  "payload": "string",
  "signerSpec": {
    "curve": "string",
    "path": "string",
    "hashFunction": "string"
  }
}
```
