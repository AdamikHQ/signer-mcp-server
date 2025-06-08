import { Turnkey } from "@turnkey/sdk-server";
import {
  Curve,
  HashFunction,
  SignerSpec,
} from "../schemas";
import {
  extractSignature,
  getCoinTypeFromDerivationPath,
} from "../utils";
import { BaseSigner } from "./types";

export class TurnkeySigner implements BaseSigner {
  private turnkeyClient: Turnkey;
  private pubkeyCache: Map<string, string> = new Map();

  static isConfigValid(): boolean {
    return [
      'TURNKEY_BASE_URL',
      'TURNKEY_API_PUBLIC_KEY',
      'TURNKEY_API_PRIVATE_KEY',
      'TURNKEY_ORGANIZATION_ID',
      'TURNKEY_WALLET_ID'
    ].every(key => key in process.env);
  }

  constructor() {
    if (!TurnkeySigner.isConfigValid()) {
      throw new Error("Missing required TURNKEY_* environment variables");
    }
    this.turnkeyClient = new Turnkey({
      apiBaseUrl: process.env.TURNKEY_BASE_URL!,
      apiPublicKey: process.env.TURNKEY_API_PUBLIC_KEY!,
      apiPrivateKey: process.env.TURNKEY_API_PRIVATE_KEY!,
      defaultOrganizationId: process.env.TURNKEY_ORGANIZATION_ID!,
    });
  }

  private keyForSpec(spec: SignerSpec): string {
    return `${spec.curve}-${spec.coinType}`;
  }

  public async getPubkey(spec: SignerSpec): Promise<string> {
    const cacheKey = this.keyForSpec(spec);
    if (this.pubkeyCache.has(cacheKey)) {
      return this.pubkeyCache.get(cacheKey)!;
    }

    const { accounts } = await this.turnkeyClient.apiClient().getWalletAccounts({
      walletId: process.env.TURNKEY_WALLET_ID!,
      paginationOptions: { limit: "100" },
    });

    const curve = this.convertAdamikCurveToTurnkeyCurve(spec.curve);
    const coinType = Number(spec.coinType);

    const account = accounts.find(
      (a) =>
        a.curve === curve &&
        getCoinTypeFromDerivationPath(a.path) === coinType &&
        a.addressFormat === "ADDRESS_FORMAT_COMPRESSED"
    );

    if (account) {
      this.pubkeyCache.set(cacheKey, account.address);
      return account.address;
    }

    const create = await this.turnkeyClient.apiClient().createWalletAccounts({
      walletId: process.env.TURNKEY_WALLET_ID!,
      accounts: [
        {
          curve,
          path: `m/44'/${spec.coinType}'/0'/0/0`,
          pathFormat: "PATH_FORMAT_BIP32",
          addressFormat: "ADDRESS_FORMAT_COMPRESSED",
        },
      ],
    });

    const address = create.addresses[0];
    this.pubkeyCache.set(cacheKey, address);
    return address;
  }

  public async signTransaction(encodedMessage: string, spec: SignerSpec): Promise<string> {
    const pubkey = await this.getPubkey(spec);
    const hashFn = this.convertHashFunctionToTurnkeyHashFunction(spec.hashFunction, spec.curve);

    const result = await this.turnkeyClient.apiClient().signRawPayload({
      signWith: pubkey,
      payload: encodedMessage,
      encoding: "PAYLOAD_ENCODING_HEXADECIMAL",
      hashFunction: hashFn,
    });

    return extractSignature(spec.signatureFormat, result);
  }

  private convertAdamikCurveToTurnkeyCurve(curve: Curve) {
    switch (curve) {
      case "secp256k1":
        return "CURVE_SECP256K1";
      case "ed25519":
        return "CURVE_ED25519";
      default:
        throw new Error(`Unsupported curve: ${curve}`);
    }
  }

  private convertHashFunctionToTurnkeyHashFunction(hashFunction: HashFunction, curve: Curve) {
    if (curve === "ed25519") return "HASH_FUNCTION_NOT_APPLICABLE";

    switch (hashFunction) {
      case "sha256":
        return "HASH_FUNCTION_SHA256";
      case "keccak256":
        return "HASH_FUNCTION_KECCAK256";
      default:
        return "HASH_FUNCTION_NOT_APPLICABLE";
    }
  }
}
