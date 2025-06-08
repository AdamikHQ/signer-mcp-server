import { SignatureFormat } from "./schemas";

/**
 * Checks if a string is a valid BIP44 derivation path
 * @param path - The string to check
 * @returns boolean indicating if the string is a valid derivation path
 * Example: "m/44'/60'/0'/0/0" -> true
 */
export const isDerivationPath = (path: string): boolean => {
  // Check if path starts with 'm/'
  if (!path.startsWith("m/")) {
    return false;
  }

  // Split the path and remove the 'm' element
  const segments = path.split("/").slice(1);

  // Check if we have at least 2 segments after 'm'
  if (segments.length < 2) {
    return false;
  }

  // Check if each segment is valid
  return segments.every((segment) => {
    // Remove hardened indicator
    const cleanSegment = segment.replace("'", "");
    // Check if it's a valid non-negative number
    const num = parseInt(cleanSegment);
    return !isNaN(num) && num >= 0;
  });
};

/**
 * Extracts the coinType from a BIP44 derivation path
 * @param derivationPath - The derivation path (e.g. "m/44'/60'/0'/0/0")
 * @returns The coinType number or null if invalid path
 * Example: "m/44'/60'/0'/0/0" -> 60
 */
export const getCoinTypeFromDerivationPath = (
  derivationPath: string
): number | null => {
  if (!isDerivationPath(derivationPath)) {
    return null;
  }

  const segments = derivationPath.split("/");
  const coinTypeSegment = segments[2];
  return parseInt(coinTypeSegment.replace("'", ""));
};

const sanitizeSignature = (signature: { r: string; s: string; v?: string }) => {
  return {
    r: signature.r.replace("0x", ""),
    s: signature.s.replace("0x", ""),
    v: signature.v?.replace("0x", ""),
  };
};

export const extractSignature = (
  signatureFormat: SignatureFormat,
  signature: { r: string; s: string; v?: string }
) => {
  const sanitizedSignature = sanitizeSignature(signature);

  switch (signatureFormat) {
    case "rs":
      return sanitizedSignature.r + sanitizedSignature.s;
    case "rsv":
      return sanitizedSignature.r + sanitizedSignature.s + sanitizedSignature.v;
    default:
      throw new Error(`Unsupported signature format: ${signatureFormat}`);
  }
};
