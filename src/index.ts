import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import z from "zod";
import { SignerWrapper } from './signer-wrapper';
import { isSignerType, SignerSpecSchema } from './schemas';

const server = new McpServer({
  name: "adamik-signer-mcp-server",
  version: "0.0.1",
});

server.tool(
  "readMeFirst",
  [
    "Get information about how this tool is supposed to be used. Use this tool first before any other tool from this",
    "MCP server",
  ].join(' '),
  {},
  async () => {
    return {
      content: [{
        type: "text",
        text: [
          "This MCP server was built for being used together with 'adamik-mcp-server'. Before moving forward with any",
          "operation, make sure that server is also available, otherwise you might end up signing arbitrary data that",
          "does not reflect the transaction expressed by the user's intent.\n",
          "When using this MCP server, there can only be one wallet connection per session. This is done in order to",
          "avoid any possible confusion from the LLM as to which wallet should sign which payload.\n",
        ].join(' '),
      }]
    }
  }
)

server.tool(
  "getWalletStatus",
  "Check if a wallet is connected",
  {},
  async () => {
    const instance = SignerWrapper.getInstance();
    const isConnected = instance !== null;
    const text = isConnected ? `Wallet is connected using ${instance.signerType}` : `No wallet connected`;
    return {
      content: [{
        type: "text",
        text
      }]
    };
  }
);

server.tool(
  "getAvailableWalletSigners",
  "Get a list of available wallet signers. This will condition what wallets can be connected using the tool 'connectWallet'",
  {},
  async () => {
    const text = JSON.stringify(SignerWrapper.getAvailableProviders());
    return {
      content: [{
        type: "text",
        text,
      }],
    };
  }
)

server.tool(
  "connectWallet",
  "Connect a wallet with a given signer type. This can only be done once per session.",
  {
    signerType: z.string(),
  },
  async ({ signerType }) => {
    if (!isSignerType(signerType)) {
      const error = `${signerType} is not a supported signer`;
      throw new Error(error);
    }
    SignerWrapper.connect(signerType);
    const text = `Wallet connected using ${signerType}`;
    return {
      content: [{
        type: "text",
        text,
      }]
    };
  }
)

server.tool(
  "getPubKey",
  "Derive the public key of the connected wallet using a provided signerSpec",
  {
    signerSpec: SignerSpecSchema,
  },
  async ({ signerSpec }) => {
    const wallet = SignerWrapper.getInstance();
    if (wallet === null) {
      const error = "No wallet is connected";
      throw new Error(error);
    }
    const pubkey = await wallet.signer.getPubkey(signerSpec);
    const text = `Loaded public key using the connected ${wallet.signerType} signer`;
    return {
      content: [
        {
          type: "text",
          text,
        },
        {
          type: "text",
          text: pubkey,
        },
      ],
    };
  }
);

server.tool(
  "signTransaction",
  [
    "Sign an encoded transaction as returned by the Adamik API.",
    "This actions may have effect on the user's digital assets. Always request confirmation from the user before using",
    "this tool."
  ].join(' '),
  {
    payload: z.string(),
    signerSpec: SignerSpecSchema,
  },
  async ({ payload, signerSpec }) => {
    const wallet = SignerWrapper.getInstance();
    if (wallet === null) {
      const error = "No wallet is connected";
      throw new Error(error);
    }
    const signature = await wallet.signer.signTransaction(payload, signerSpec);
    return {
      content: [
        {
          type: "text",
          text: `Signed payload using the connected ${wallet.signerType} signer`,
        },
        {
          type: "text",
          text: signature,
        },
      ],
    };
  }
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((error) => {
  console.error("Fatal error in main():", error);
  process.exit(1);
});
