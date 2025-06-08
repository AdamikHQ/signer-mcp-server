import { extractSignature } from "../utils";
import { BaseSigner } from "./types";
import * as process from 'node:process';
import { SignerSpec, Curve, HashFunction } from '../schemas';

type SodotSignatureResponse =
  | {
      r: string;
      s: string;
      v: number;
      der: string;
    }
  | { signature: string };

export class SodotSigner implements BaseSigner {
  private SODOT_VERTICES = [
    {
      url: process.env.SODOT_VERTEX_URL_0!,
      apiKey: process.env.SODOT_VERTEX_API_KEY_0!,
    },
    {
      url: process.env.SODOT_VERTEX_URL_1!,
      apiKey: process.env.SODOT_VERTEX_API_KEY_1!,
    },
    {
      url: process.env.SODOT_VERTEX_URL_2!,
      apiKey: process.env.SODOT_VERTEX_API_KEY_2!,
    },
  ];
  private n = 3;
  private t = 2;

  private keyCache: Map<string, string[]> = new Map();

  static isConfigValid(): boolean {
    const keys = [];
    for (let i = 0; i < 3; i++) {
      keys.push(`SODOT_VERTEX_URL_${i}`, `SODOT_VERTEX_API_KEY_${i}`);
    }
    return keys.every(key => key in process.env);
  }

  constructor() {
    if (!SodotSigner.isConfigValid()) {
      throw new Error("Missing required SODOT_* environment variables");
    }
  }

  private getKeyCacheKey(spec: SignerSpec): string {
    return `${spec.curve}`;
  }

  public async getPubkey(spec: SignerSpec): Promise<string> {
    const keyIds = await this.getOrGenerateKeyIds(spec);

    return await this.derivePubkeyWithVertex(
      0,
      keyIds[0],
      [44, Number(spec.coinType), 0, 0, 0],
      this.adamikCurveToSodotCurve(spec.curve)
    );
  }

  public async signTransaction(
    encodedMessage: string,
    spec: SignerSpec
  ): Promise<string> {
    const keyIds = await this.getOrGenerateKeyIds(spec);
    const signature = await this.sign(
      encodedMessage,
      keyIds,
      [44, Number(spec.coinType), 0, 0, 0],
      spec.curve,
      this.adamikHashFunctionToSodotHashMethod(spec.hashFunction, spec.curve)
    );

    if (!signature) throw new Error("Failed to sign message with Vertex");

    return "signature" in signature
      ? signature.signature
      : extractSignature(spec.signatureFormat, { ...signature, v: signature.v.toString(16) });
  }

  private async getOrGenerateKeyIds(spec: SignerSpec): Promise<string[]> {
    const cacheKey = this.getKeyCacheKey(spec);
    let keyIds = this.keyCache.get(cacheKey);
    const envVar =
      spec.curve === "secp256k1"
        ? process.env.SODOT_EXISTING_ECDSA_KEY_IDS
        : process.env.SODOT_EXISTING_ED25519_KEY_IDS;

    if (envVar) {
      keyIds = envVar.split(",").map((id) => id.trim());
      this.keyCache.set(cacheKey, keyIds);
    } else {
      keyIds = await this.keygenVertex(this.adamikCurveToSodotCurve(spec.curve));
      this.keyCache.set(cacheKey, keyIds);
    }
    return keyIds;
  }

  private adamikCurveToSodotCurve(adamikCurve: Curve): "ecdsa" | "ed25519" {
    switch (adamikCurve) {
      case "ed25519": return "ed25519";
      case "secp256k1": return "ecdsa";
      default: throw new Error(`Unsupported curve: ${adamikCurve}`);
    }
  }

  private adamikHashFunctionToSodotHashMethod(
    hashAlgo: HashFunction,
    curve: Curve,
  ): "sha256" | "keccak256" | "none" | undefined {
    if (curve === "ed25519") return undefined;
    if (hashAlgo === "sha512_256" || hashAlgo === "pedersen") {
      throw new Error(`Unsupported hash algorithm: ${hashAlgo}`);
    }
    return hashAlgo;
  }

  private async keygenVertex(curve: "ecdsa" | "ed25519"): Promise<string[]> {
    const roomUuid = await this.createRoomWithVertex(0, this.n);
    const initKeygenResults = await Promise.all(
      [...Array(this.n).keys()].map((i) => this.keygenInitWithVertex(i, curve))
    );
    const keygenIds = initKeygenResults.map((r) => r.keygen_id);
    const keyIds = initKeygenResults.map((r) => r.key_id);
    await Promise.all(
      [...Array(this.n).keys()].map((i) =>
        this.keygenWithVertex(
          i,
          roomUuid,
          keyIds[i],
          this.n,
          this.t,
          keygenIds.filter((_, j) => j !== i),
          curve
        )
      )
    );
    return keyIds;
  }

  private async createRoomWithVertex(vertexId: number, roomSize: number) {
    const response = await fetch(`${this.SODOT_VERTICES[vertexId].url}/create-room`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: this.SODOT_VERTICES[vertexId].apiKey,
      },
      body: JSON.stringify({ room_size: roomSize }),
    });
    const json = await response.json();
    return json.room_uuid;
  }

  private async keygenInitWithVertex(vertexId: number, curve: "ecdsa" | "ed25519") {
    const response = await fetch(`${this.SODOT_VERTICES[vertexId].url}/${curve}/create`, {
      headers: { Authorization: this.SODOT_VERTICES[vertexId].apiKey },
    });
    return await response.json();
  }

  private async keygenWithVertex(
    vertexId: number,
    roomUuid: string,
    keyId: string,
    n: number,
    t: number,
    othersKeygenIds: string[],
    curve: "ecdsa" | "ed25519"
  ) {
    const response = await fetch(`${this.SODOT_VERTICES[vertexId].url}/${curve}/keygen`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: this.SODOT_VERTICES[vertexId].apiKey,
      },
      body: JSON.stringify({
        room_uuid: roomUuid,
        key_id: keyId,
        num_parties: n,
        threshold: t,
        others_keygen_ids: othersKeygenIds,
      }),
    });

    if (response.status !== 200) {
      throw new Error(`Vertex ${vertexId} keygen failed: ${await response.text()}`);
    }
  }

  private async signWithVertex(
    vertexId: number,
    roomUuid: string,
    keyId: string,
    msg: string,
    derivationPath: number[],
    curve: "ecdsa" | "ed25519",
    hashMethod?: string
  ) {
    const body: any = {
      room_uuid: roomUuid,
      key_id: keyId,
      msg: msg.replace(/^0x/, ""),
      derivation_path: derivationPath,
    };

    if (curve === "ecdsa" && hashMethod) body.hash_algo = hashMethod;

    const response = await fetch(`${this.SODOT_VERTICES[vertexId].url}/${curve}/sign`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: this.SODOT_VERTICES[vertexId].apiKey,
      },
      body: JSON.stringify(body),
    });

    if (response.status !== 200) {
      console.error(`signWithVertex ${vertexId} failed:`, await response.text());
      return undefined;
    }

    return (await response.json()) as SodotSignatureResponse;
  }

  private async sign(
    message: string,
    keyIds: string[],
    derivationPath: number[],
    curve: Curve,
    hashAlgo?: string
  ) {
    const roomUuid = await this.createRoomWithVertex(0, this.n);
    const curveStr = this.adamikCurveToSodotCurve(curve);
    const signatures = await Promise.all(
      keyIds.map((keyId, i) =>
        this.signWithVertex(i, roomUuid, keyId, message, derivationPath, curveStr, hashAlgo)
      )
    );
    return signatures[0];
  }

  private async derivePubkeyWithVertex(
    vertexId: number,
    keyId: string,
    derivationPath: number[],
    curve: "ecdsa" | "ed25519"
  ) {
    const url = `${this.SODOT_VERTICES[vertexId].url}/${curve}/derive-pubkey`;
    const body = JSON.stringify({ key_id: keyId, derivation_path: derivationPath }, null, 2);
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: this.SODOT_VERTICES[vertexId].apiKey,
      },
      body,
    });

    const pubkey = await response.json();
    return "pubkey" in pubkey ? pubkey.pubkey : pubkey.compressed;
  }
}
