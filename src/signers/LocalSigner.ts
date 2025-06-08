import { Slip10, Slip10Curve, stringToPath } from "@cosmjs/crypto";
import { ethers, HDNodeWallet } from "ethers";
import { ec } from "starknet";
import nacl from "tweetnacl";
import { extractSignature } from "../utils";
import { BaseSigner } from "./types";
import { SignerSpec } from '../schemas';

/**
 * LocalSigner implements key derivation and signing for multiple curves:
 *
 * SECP256K1: Using ethers.js HD wallet (BIP32/BIP39/BIP44)
 *   - Industry standard implementation
 *   - Well tested with Ethereum and Bitcoin
 *
 * ED25519: Using chain-specific derivation
 *   - Direct seed for TON and similar chains
 *   - SLIP-0010 for chains that follow BIP32-ED25519
 *   - Compatible with hardware wallets
 *
 * STARK: Using starknet.js
 *   - Official StarkNet implementation
 *   - Handles curve-specific requirements
 */
export class LocalSigner implements BaseSigner {
  private walletCache = new Map<string, HDNodeWallet>();
  private ed25519Cache = new Map<string, nacl.SignKeyPair>();
  private starkKeyCache = new Map<string, string>();

  static isConfigValid(): boolean {
    return Boolean(process.env.SEED_PHRASE);
  }
  constructor() {
    if (!LocalSigner.isConfigValid()) {
      throw new Error("SEED_PHRASE is not set");
    }
  }

  private getSeed(): string {
    return process.env.SEED_PHRASE!;
  }

  private getCacheKey(spec: SignerSpec): string {
    return `${spec.curve}:${spec.coinType}`;
  }

  async getPubkey(spec: SignerSpec): Promise<string> {
    switch (spec.curve) {
      case "secp256k1":
        return (await this.getSecp256k1Wallet(spec)).publicKey.slice(2);
      case "ed25519":
        return Buffer.from((await this.getEd25519KeyPair(spec)).publicKey).toString("hex");
      case "stark":
        return ec.starkCurve.getStarkKey(await this.getStarkPrivateKey(spec));
      default:
        throw new Error(`Unsupported curve: ${spec.curve}`);
    }
  }

  async signTransaction(encoded: string, spec: SignerSpec): Promise<string> {
    const messageBytes = Buffer.from(encoded.replace(/^0x/, ""), "hex");
    const messageHash = await this.hashMessage(messageBytes, spec);

    switch (spec.curve) {
      case "secp256k1": {
        const wallet = await this.getSecp256k1Wallet(spec);
        const sig = wallet.signingKey.sign(messageHash);
        return extractSignature(spec.signatureFormat, {
          r: sig.r.slice(2),
          s: sig.s.slice(2),
          v: sig.v.toString(16),
        });
      }

      case "ed25519": {
        const keyPair = await this.getEd25519KeyPair(spec);
        const sig = nacl.sign.detached(messageBytes, keyPair.secretKey);
        return extractSignature(spec.signatureFormat, {
          r: Buffer.from(sig.slice(0, 32)).toString("hex"),
          s: Buffer.from(sig.slice(32, 64)).toString("hex"),
        });
      }

      case "stark": {
        const key = await this.getStarkPrivateKey(spec);
        const sig = ec.starkCurve.sign(messageHash, key);
        return extractSignature(spec.signatureFormat, {
          r: sig.r.toString(16),
          s: sig.s.toString(16),
        });
      }

      default:
        throw new Error(`Unsupported curve: ${spec.curve}`);
    }
  }

  // === Internal helpers ===

  private async getSecp256k1Wallet(spec: SignerSpec): Promise<HDNodeWallet> {
    const key = this.getCacheKey(spec);
    if (this.walletCache.has(key)) return this.walletCache.get(key)!;

    const mnemonic = ethers.Mnemonic.fromPhrase(this.getSeed());
    const path = `m/44'/${spec.coinType}'/0'/0/0`;
    const wallet = ethers.HDNodeWallet.fromMnemonic(mnemonic, path);

    this.walletCache.set(key, wallet);
    return wallet;
  }

  private async getEd25519KeyPair(spec: SignerSpec): Promise<nacl.SignKeyPair> {
    const key = this.getCacheKey(spec);
    if (this.ed25519Cache.has(key)) return this.ed25519Cache.get(key)!;

    const seedWords = this.getSeed().split(" ");
    const tonMnemonic = require("tonweb-mnemonic");
    const seed = await tonMnemonic.mnemonicToSeed(seedWords);

    if (spec.coinType === "607") {
      const pair = nacl.sign.keyPair.fromSeed(seed);
      this.ed25519Cache.set(key, pair);
      return pair;
    }

    const hdPath = stringToPath(`m/44'/${spec.coinType}'/0'/0'/0'`);
    const { privkey } = Slip10.derivePath(Slip10Curve.Ed25519, seed, hdPath);
    const pair = nacl.sign.keyPair.fromSeed(Buffer.from(privkey));

    this.ed25519Cache.set(key, pair);
    return pair;
  }

  private async getStarkPrivateKey(spec: SignerSpec): Promise<string> {
    const key = this.getCacheKey(spec);
    if (this.starkKeyCache.has(key)) return this.starkKeyCache.get(key)!;

    const master = ethers.HDNodeWallet.fromPhrase(this.getSeed());
    const path = `m/44'/${spec.coinType}'/0'/0/0`;
    const derived = master.derivePath(path);

    const hashed = ethers.sha256(derived.privateKey);
    const keyBigInt = BigInt(hashed);
    const order = BigInt("3618502788666131213697322783095070105526743751716087489154079457884512865583");
    const validKey = ((keyBigInt % (order - 1n)) + 1n).toString(16).padStart(64, "0");

    this.starkKeyCache.set(key, validKey);
    return validKey;
  }

  private async hashMessage(data: Buffer, spec: SignerSpec): Promise<Buffer> {
    switch (spec.hashFunction) {
      case "sha256":
        return Buffer.from(ethers.sha256(data).slice(2), "hex");

      case "keccak256":
        return Buffer.from(ethers.keccak256(data).slice(2), "hex");

      case "pedersen": {
        const x = data;
        const y = Buffer.from("00", "hex");
        const pedersenHash = ec.starkCurve.pedersen(x, y);
        return Buffer.from(pedersenHash.slice(2), "hex");
      }

      case "none":
        return data;

      case "sha512_256":
        throw new Error("SHA512_256 not implemented");

      default:
        throw new Error(`Unsupported hash function: ${spec.hashFunction}`);
    }
  }
}
