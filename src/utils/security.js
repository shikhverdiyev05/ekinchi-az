export const DEMO_EMAIL = "elvin.memmedov@example.com";
export const DEMO_PASSWORD = "demo123";

export const LIMITS = {
  title: 120,
  description: 2000,
  postContent: 2000,
  comment: 500,
  name: 80,
  phone: 32,
  region: 64,
  bio: 500,
  images: 10,
  url: 2048,
};

const ALLOWED_IMAGE_PROTOCOLS = ["http:", "https:"];

export function safeImageUrl(value) {
  if (typeof value !== "string" || value.length > LIMITS.url) return "";
  const trimmed = value.trim();
  if (!trimmed) return "";
  try {
    const url = new URL(trimmed, window.location.origin);
    return ALLOWED_IMAGE_PROTOCOLS.includes(url.protocol) ? url.href : "";
  } catch {
    return "";
  }
}

export function safeImageUrls(values) {
  if (!Array.isArray(values)) return [];
  return values.map(safeImageUrl).filter(Boolean).slice(0, LIMITS.images);
}

function isControlChar(code) {
  const isNewlineOrTab = code === 9 || code === 10 || code === 13;
  return !isNewlineOrTab && (code < 32 || code === 127);
}

export function sanitizeText(value, max) {
  if (value == null) return "";
  return Array.from(String(value))
    .filter((ch) => !isControlChar(ch.codePointAt(0)))
    .join("")
    .trim()
    .slice(0, max);
}

function toHex(buffer) {
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function randomHex(bytes) {
  const arr = new Uint8Array(bytes);
  crypto.getRandomValues(arr);
  return toHex(arr);
}

const PBKDF2_ITERATIONS = 100000;

async function derive(password, salt) {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(password),
    "PBKDF2",
    false,
    ["deriveBits"]
  );
  const bits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt: enc.encode(salt),
      iterations: PBKDF2_ITERATIONS,
      hash: "SHA-256",
    },
    key,
    256
  );
  return toHex(bits);
}

export async function hashPassword(password) {
  const salt = randomHex(16);
  return { salt, hash: await derive(password, salt) };
}

export async function verifyPassword(password, salt, hash) {
  if (!salt || !hash) return false;
  const candidate = await derive(password, salt);
  return timingSafeEqual(candidate, hash);
}

function timingSafeEqual(a, b) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

export function randomToken() {
  return randomHex(32);
}

export function forbidden(message = "Bu əməliyyat üçün icazəniz yoxdur") {
  const e = new Error(message);
  e.response = { status: 403, data: { message } };
  return e;
}

export function unauthorized(message = "Daxil olmalısınız") {
  const e = new Error(message);
  e.response = { status: 401, data: { message } };
  return e;
}
