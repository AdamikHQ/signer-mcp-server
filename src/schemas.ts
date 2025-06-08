import { z } from 'zod';

export const CurveSchema = z.enum(["secp256k1", "ed25519", "stark"]);
export type Curve = z.infer<typeof CurveSchema>;

export const HashFunctionSchema = z.enum(["sha256", "keccak256", "sha512_256", "pedersen", "none"]);
export type HashFunction = z.infer<typeof HashFunctionSchema>;

export const SignatureFormatSchema = z.enum(["rsv", "rs"]);
export type SignatureFormat = z.infer<typeof SignatureFormatSchema>;

export const SignerSpecSchema = z.object({
  curve: CurveSchema,
  hashFunction: HashFunctionSchema,
  signatureFormat: SignatureFormatSchema,
  coinType: z.string(),
});
export type SignerSpec = z.infer<typeof SignerSpecSchema>;

export const SignerTypeSchema = z.enum([
  "DFNS",
  "LOCAL",
  "SODOT",
  "TURNKEY",
]);

export type SignerType = z.infer<typeof SignerTypeSchema>;

export function isSignerType(type: string): type is SignerType {
  return [
    "DFNS",
    "LOCAL",
    "SODOT",
    "TURNKEY",
  ].includes(type);
}