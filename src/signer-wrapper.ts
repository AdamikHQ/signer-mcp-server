import { BaseSigner } from './signers/types';
import { SodotSigner } from './signers/Sodot';
import { TurnkeySigner } from './signers/Turnkey';
import { LocalSigner } from './signers/LocalSigner';
import { DfnsSigner } from './signers/Dfns';
import { SignerType } from './schemas';

interface SignerConstructor {
  new (): BaseSigner;
  isConfigValid: () => boolean;
}

const signerConstructors: Record<SignerType, SignerConstructor> = {
  "SODOT": SodotSigner,
  "TURNKEY": TurnkeySigner,
  "DFNS": DfnsSigner,
  "LOCAL": LocalSigner,
}

export class SignerWrapper {
  private static instance: SignerWrapper | null = null;
  public signer: BaseSigner;
  public signerType: SignerType;

  private constructor(signerType: SignerType) {
    this.signerType = signerType;
    const signerConstructor = signerConstructors[signerType];
    this.signer = new signerConstructor();
  }

  public static connect(signerType: SignerType) {
    if (SignerWrapper.instance === null) {
      SignerWrapper.instance = new SignerWrapper(signerType);
    }
    if (!SignerWrapper.instance.is(signerType)) {
      throw new Error(`Signer was already instanciated as ${SignerWrapper.instance.signerType}`);
    }
  }

  public static getAvailableProviders(): Array<SignerType> {
    const availableProviders: Array<SignerType> = [];
    const supportedProviders = Object.keys(signerConstructors) as Array<SignerType>;
    for (const provider of supportedProviders) {
      if (signerConstructors[provider].isConfigValid()) availableProviders.push(provider);
    }
    return availableProviders;
  }

  public static getInstance(): SignerWrapper | null {
    return SignerWrapper.instance;
  }

  public static isConnected(signerType: SignerType): boolean {
    return SignerWrapper.instance !== null && SignerWrapper.instance.is(signerType);
  }

  private is(signerType: SignerType) {
    return this.signer instanceof signerConstructors[signerType];
  }
}
