import { SignerSpec } from "../schemas";

export interface BaseSigner {

  getPubkey(signerSpec: SignerSpec): Promise<string>;
  signTransaction(
    encodedMessage: string,
    signerSpec: SignerSpec
  ): Promise<string>;
}