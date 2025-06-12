# Adamik Signer MCP Server

This is an [MCP (Model Context Protocol)](https://github.com/modelcontextprotocol/spec) server that provides digital signature capabilities for blockchain transactions. It is designed to work **in tandem with** the [`adamik-mcp-server`](https://github.com/AdamikHQ/adamik-mcp-server), which handles transaction encoding and state introspection. This signer server provides a secure interface to sign transactions after confirming user intent.

---

## 🚀 Features

- 🔐 **Single Wallet Session**: Only one wallet can be connected per session to avoid ambiguity in signature requests.
- 🔎 **Introspect Wallet State**: Check whether a wallet is connected and what types of signers are available.
- 🔑 **Key Derivation**: Derive public keys from a given signer specification.
- ✍️ **Transaction Signing**: Sign encoded payloads in accordance with the Adamik protocol.
- 📖 **Usage Guidance**: The `readMeFirst` tool helps orient LLMs or developers before invoking sensitive actions.

---

## Quick Start

### Prerequisites

- **Node.js** (v20 or higher)
- **MCP Client** such as:
  - Claude Desktop ([download](https://claude.ai/download)) with Claude Pro subscription
  - FastAgent
  - NextChat
- **Signer Provider Account** (choose one):
  - [Turnkey](https://turnkey.com/) for production
  - [Dfns](https://dfns.co/) for enterprise
  - [Sodot](https://sodot.dev/) for MPC solutions
  - Local seed (testing only)

### Installation

```bash
npx @adamik/signer-mcp-server
```

### Configuration

Add the signer server to your MCP client configuration and choose **one** of the following provider setups:

#### For Claude Desktop / NextChat (JSON)

```json
{
  "mcpServers": {
    "adamik-signer": {
      "command": "npx",
      "args": ["@adamik/signer-mcp-server"],
      "env": {
        // Add provider-specific environment variables (see sections below)
      }
    }
  }
}
```

#### For FastAgent (YAML)

```yaml
mcp:
  servers:
    adamik-signer:
      command: "npx"
      args: ["@adamik/signer-mcp-server"]
      env:
        # Add provider-specific environment variables (see sections below)
```

---

## Signer Provider Setup

Choose **one** of the following providers and add their environment variables to your MCP client configuration:

### Local Seed (For Testing Only)

```env
UNSECURE_LOCAL_SEED="your 24 word BIP39 mnemonic phrase here"
```

⚠️ **Warning:** Only use for testing. Not secure for production.

**Example Configuration:**

```json
{
  "mcpServers": {
    "adamik-signer": {
      "command": "npx",
      "args": ["@adamik/signer-mcp-server"],
      "env": {
        "UNSECURE_LOCAL_SEED": "abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about"
      }
    }
  }
}
```

### Turnkey

```env
TURNKEY_BASE_URL="https://api.turnkey.com"
TURNKEY_API_PUBLIC_KEY="<your-turnkey-public-key>"
TURNKEY_API_PRIVATE_KEY="<your-turnkey-private-key>"
TURNKEY_ORGANIZATION_ID="<your-organization-id>"
TURNKEY_WALLET_ID="<your-wallet-id>"
```

**Example Configuration:**

```json
{
  "mcpServers": {
    "adamik-signer": {
      "command": "npx",
      "args": ["@adamik/signer-mcp-server"],
      "env": {
        "TURNKEY_BASE_URL": "https://api.turnkey.com",
        "TURNKEY_API_PUBLIC_KEY": "02abcd1234...",
        "TURNKEY_API_PRIVATE_KEY": "your-private-key",
        "TURNKEY_ORGANIZATION_ID": "your-org-id",
        "TURNKEY_WALLET_ID": "your-wallet-id"
      }
    }
  }
}
```

### Dfns

```env
DFNS_CRED_ID="<your-credential-id>"
DFNS_PRIVATE_KEY="<your-private-key>"
DFNS_APP_ID="<your-app-id>"
DFNS_AUTH_TOKEN="<your-auth-token>"
DFNS_API_URL="<your-api-url>"
```

**Example Configuration:**

```json
{
  "mcpServers": {
    "adamik-signer": {
      "command": "npx",
      "args": ["@adamik/signer-mcp-server"],
      "env": {
        "DFNS_CRED_ID": "your-credential-id",
        "DFNS_PRIVATE_KEY": "your-private-key",
        "DFNS_APP_ID": "your-app-id",
        "DFNS_AUTH_TOKEN": "your-auth-token",
        "DFNS_API_URL": "https://api.dfns.ninja"
      }
    }
  }
}
```

### Sodot

```env
SODOT_VERTEX_URL_0="https://vertex-demo-0.sodot.dev"
SODOT_VERTEX_API_KEY_0="<your-vertex-api-key-0>"
SODOT_VERTEX_URL_1="https://vertex-demo-1.sodot.dev"
SODOT_VERTEX_API_KEY_1="<your-vertex-api-key-1>"
SODOT_VERTEX_URL_2="https://vertex-demo-2.sodot.dev"
SODOT_VERTEX_API_KEY_2="<your-vertex-api-key-2>"
SODOT_EXISTING_ECDSA_KEY_IDS="<comma-separated-ecdsa-key-ids>"
SODOT_EXISTING_ED25519_KEY_IDS="<comma-separated-ed25519-key-ids>"
```

**Example Configuration:**

```json
{
  "mcpServers": {
    "adamik-signer": {
      "command": "npx",
      "args": ["@adamik/signer-mcp-server"],
      "env": {
        "SODOT_VERTEX_URL_0": "https://vertex-demo-0.sodot.dev",
        "SODOT_VERTEX_API_KEY_0": "your-api-key-0",
        "SODOT_VERTEX_URL_1": "https://vertex-demo-1.sodot.dev",
        "SODOT_VERTEX_API_KEY_1": "your-api-key-1",
        "SODOT_VERTEX_URL_2": "https://vertex-demo-2.sodot.dev",
        "SODOT_VERTEX_API_KEY_2": "your-api-key-2",
        "SODOT_EXISTING_ECDSA_KEY_IDS": "key1,key2,key3",
        "SODOT_EXISTING_ED25519_KEY_IDS": "key4,key5,key6"
      }
    }
  }
}
```

> **Note:** Contact each provider directly for authentication setup instructions and API access.

---

## Local Development

### 1. Clone Repository

```bash
git clone git@github.com:AdamikHQ/signer-mcp-server.git
cd signer-mcp-server
```

### 2. Install Dependencies

```bash
pnpm install
pnpm run build
```

### 3. Configure Your MCP Client

Update your client configuration to point to the local installation instead of using `npx`.

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

---

## Complete Setup

For the full blockchain interaction experience, combine this signer server with the [Adamik MCP Server](https://github.com/AdamikHQ/adamik-mcp-server):

1. **Adamik MCP Server** - Transaction encoding, account insights, and blockchain interactions
2. **Adamik Signer MCP Server** - Transaction signing and key management

Together, these enable:

- 🪙 Transfer native currencies and tokens
- 🥩 Stake and unstake across supported networks
- 🔍 View real-time account balances
- 🌐 Execute complex multi-chain operations
- 💬 All through natural language commands in your LLM interface
