import * as utils from "@noble/curves/abstract/utils";

import { DfnsApiClient } from "@dfns/sdk";
import { AsymmetricKeySigner } from "@dfns/sdk-keysigner";
import { ethers, sha256 } from "ethers";
import { extractSignature } from "../utils";
import { BaseSigner } from "./types";
import { SignerSpec, Curve, HashFunction } from '../schemas';

const STARK_HASH_MAX_VALUE = 1n << 251n;

export class DfnsSigner implements BaseSigner {
  private dfnsApi: DfnsApiClient;
  private walletIdByCurve: Map<Curve, string> = new Map();

  static isConfigValid(): boolean {
    return [
      "DFNS_CRED_ID",
      "DFNS_PRIVATE_KEY",
      "DFNS_APP_ID",
      "DFNS_AUTH_TOKEN",
      "DFNS_API_URL",
    ].every(key => key in process.env);
  }

  constructor() {
    if (!DfnsSigner.isConfigValid()) {
      throw new Error("Missing required DFNS_* environment variables")
    }

    const signer = new AsymmetricKeySigner({
      credId: process.env.DFNS_CRED_ID!,
      privateKey: process.env.DFNS_PRIVATE_KEY!,
    });

    this.dfnsApi = new DfnsApiClient({
      appId: process.env.DFNS_APP_ID!,
      authToken: process.env.DFNS_AUTH_TOKEN!,
      baseUrl: process.env.DFNS_API_URL!,
      signer,
    });
  }

  private convertAdamikCurveToDfnsCurve(curve: Curve): "KeyECDSAStark" | "KeyEdDSA" | "KeyECDSA" {
    switch (curve) {
      case "stark": return "KeyECDSAStark";
      case "ed25519": return "KeyEdDSA";
      case "secp256k1": return "KeyECDSA";
      default: throw new Error(`Unsupported curve: ${curve}`);
    }
  }

  private async getOrCreateWallet(curve: Curve): Promise<string> {
    if (this.walletIdByCurve.has(curve)) {
      return this.walletIdByCurve.get(curve)!;
    }

    const wallets = await this.dfnsApi.wallets.listWallets();
    const network = this.convertAdamikCurveToDfnsCurve(curve);
    const existing = wallets.items.find((w) => w.network === network);

    if (existing) {
      this.walletIdByCurve.set(curve, existing.id);
      return existing.id;
    }

    const created = await this.dfnsApi.wallets.createWallet({ body: { network } });
    this.walletIdByCurve.set(curve, created.id);
    return created.id;
  }

  private async formatPubkey(pubkey: string, curve: Curve): Promise<string> {
    if (curve === "stark") {
      const stripped = pubkey.replace(/^0x/, "").replace(/^0+/g, "");
      return `0x${stripped}`;
    }
    return pubkey;
  }

  async getPubkey(spec: SignerSpec): Promise<string> {
    const curve = spec.curve;
    const walletId = await this.getOrCreateWallet(curve);
    const wallet = await this.dfnsApi.wallets.getWallet({ walletId });
    return this.formatPubkey(wallet.signingKey.publicKey, curve);
  }

  async signTransaction(encodedMessage: string, spec: SignerSpec): Promise<string> {
    const walletId = await this.getOrCreateWallet(spec.curve);
    const messageToSign = await this.hashTransactionPayload(
      spec.hashFunction,
      spec.curve,
      encodedMessage
    );

    const response = spec.curve === "ed25519"
      ? await this.dfnsApi.wallets.generateSignature({ walletId, body: { kind: "Message", message: messageToSign } })
      : await this.dfnsApi.wallets.generateSignature({ walletId, body: { kind: "Hash", hash: messageToSign } });

    if (response.status !== "Signed") {
      throw new Error(`Failed to sign: ${response.reason}`);
    }

    return extractSignature(spec.signatureFormat, {
      r: response.signature?.r || "",
      s: response.signature?.s || "",
      v: response.signature?.recid?.toString(16),
    });
  }

  // === Internals ===

  private async hashTransactionPayload(
    hashAlgo: HashFunction,
    curve: Curve,
    payload: string
  ): Promise<string> {
    if (curve === "stark") {
      return Buffer.from(this.checkStarkRange(payload)).toString("hex");
    }

    if (curve !== "secp256k1") {
      return payload.startsWith("0x") ? payload : `0x${payload}`;
    }

    switch (hashAlgo) {
      case "sha256":
        return sha256(Buffer.from(payload, "hex"));
      case "keccak256":
        return ethers.keccak256(ethers.getBytes(payload));
      default:
        throw new Error(`Unsupported hash function: ${hashAlgo} - ${curve}`);
    }
  }


  private checkStarkRange(hex: string): Uint8Array {
    const bytes = utils.ensureBytes("", this.hexToBytes(hex));
    const num = utils.bytesToNumberBE(bytes);
    if (num >= STARK_HASH_MAX_VALUE) {
      throw new Error(`msgHash must be < 0x${STARK_HASH_MAX_VALUE.toString(16)}`);
    }
    return bytes;
  }

  private hexToBytes(hex: string): Uint8Array {
    hex = hex.replace(/^0x/i, "");
    hex = hex.padStart(hex.length + hex.length % 2, '0');
    return new Uint8Array(Buffer.from(hex, 'hex'));
  }
}
