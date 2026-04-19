import { EncryptedText } from "../types";

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();
const PBKDF2_ITERATIONS = 250000;

const toBufferSource = (value: Uint8Array): BufferSource => value as unknown as BufferSource;

const toBase64 = (bytes: Uint8Array) => {
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return window.btoa(binary);
};

const fromBase64 = (value: string) =>
  Uint8Array.from(window.atob(value), (char) => char.charCodeAt(0));

const deriveKey = async (passphrase: string, salt: Uint8Array) => {
  const material = await window.crypto.subtle.importKey(
    "raw",
    textEncoder.encode(passphrase),
    "PBKDF2",
    false,
    ["deriveKey"],
  );

  return window.crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: toBufferSource(salt),
      iterations: PBKDF2_ITERATIONS,
      hash: "SHA-256",
    },
    material,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
};

export const encryptText = async (value: string, passphrase: string): Promise<EncryptedText> => {
  const salt = window.crypto.getRandomValues(new Uint8Array(16));
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(passphrase, salt);
  const ciphertext = await window.crypto.subtle.encrypt(
    { name: "AES-GCM", iv: toBufferSource(iv) },
    key,
    textEncoder.encode(value),
  );

  return {
    ciphertext: toBase64(new Uint8Array(ciphertext)),
    iv: toBase64(iv),
    salt: toBase64(salt),
  };
};

export const decryptText = async (value: EncryptedText, passphrase: string) => {
  const salt = fromBase64(value.salt);
  const iv = fromBase64(value.iv);
  const ciphertext = fromBase64(value.ciphertext);
  const key = await deriveKey(passphrase, salt);
  const plaintext = await window.crypto.subtle.decrypt(
    { name: "AES-GCM", iv: toBufferSource(iv) },
    key,
    toBufferSource(ciphertext),
  );

  return textDecoder.decode(plaintext);
};

export const createPasswordVerifier = (groupId: string, passphrase: string) =>
  encryptText(`group:${groupId}`, passphrase);

export const verifyPassword = async (
  verifier: EncryptedText | null,
  groupId: string,
  passphrase: string,
) => {
  if (!verifier) return false;

  try {
    const plaintext = await decryptText(verifier, passphrase);
    return plaintext === `group:${groupId}`;
  } catch {
    return false;
  }
};
