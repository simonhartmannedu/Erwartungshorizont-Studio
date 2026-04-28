export interface SecurityTokenCard {
  groupId: string;
  subject: string;
  className: string;
  token: string;
}

const TOKEN_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export const generateSecurityToken = (segments = 4, segmentLength = 4) => {
  const randomValues = new Uint32Array(segments * segmentLength);
  crypto.getRandomValues(randomValues);

  const characters = Array.from(randomValues, (value) => TOKEN_ALPHABET[value % TOKEN_ALPHABET.length]);
  const parts: string[] = [];

  for (let index = 0; index < segments; index += 1) {
    const start = index * segmentLength;
    parts.push(characters.slice(start, start + segmentLength).join(""));
  }

  return parts.join("-");
};
