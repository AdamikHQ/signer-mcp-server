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
