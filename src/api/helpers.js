import api from "./axios";
import {
  read,
  write,
  addDeleted,
  getDeletedSet,
  mergeDeleted,
  STORAGE_KEYS,
} from "../utils/store";
import {
  forbidden,
  randomToken,
  unauthorized,
  LIMITS,
  safeImageUrls,
  sanitizeText,
} from "../utils/security";

export function httpError(message, status) {
  const e = new Error(message);
  e.response = { status, data: { message } };
  return e;
}

export function notFound() {
  return httpError("Not found", 404);
}

export function publicUser(user) {
  if (!user) return user;
  const { password: _p, passwordHash: _h, passwordSalt: _s, ...safe } = user;
  return safe;
}

export function persistCurrentUser(user) {
  const safe = publicUser(user);
  write(STORAGE_KEYS.currentUser, safe);
  return safe;
}

export function startSession(user) {
  const token = randomToken();
  write(STORAGE_KEYS.token, token);
  return { token, user: persistCurrentUser(user) };
}

export async function fetchCollection(path, fallback = []) {
  const res = await api.get(path);
  return res.data ?? fallback;
}

export function requireCurrentUser() {
  const current = read(STORAGE_KEYS.currentUser);
  if (!current) throw unauthorized();
  return current;
}

export function ownerIdOf(item) {
  return item?.owner?.id ?? item?.author?.id ?? item?.userId ?? null;
}

export function requireOwnership(item, current) {
  const owner = ownerIdOf(item);
  if (!owner || owner !== current.id) throw forbidden();
  return item;
}

export function notDeleted(items, deletedSet = getDeletedSet()) {
  return mergeDeleted(items || [], deletedSet);
}

export async function mergedCollection(path, localKey) {
  const serverItems = await fetchCollection(path);
  return [...read(localKey, []), ...notDeleted(serverItems)];
}

export function pushLocal(localKey, item) {
  const local = read(localKey, []);
  local.push(item);
  write(localKey, local);
  return item;
}

export function updateLocal(localKey, id, data) {
  const local = read(localKey, []);
  const idx = local.findIndex((x) => x.id === id);
  if (idx < 0) return null;
  local[idx] = { ...local[idx], ...data };
  write(localKey, local);
  return local[idx];
}

export function removeLocal(localKey, id) {
  const local = read(localKey, []);
  write(
    localKey,
    local.filter((x) => x.id !== id)
  );
  addDeleted(id);
}

export function toggleInList(localKey, id) {
  const list = read(localKey, []);
  const has = list.includes(id);
  write(localKey, has ? list.filter((x) => x !== id) : [...list, id]);
  return !has;
}

export function newestFirst(a, b) {
  return new Date(b.createdAt) - new Date(a.createdAt);
}

export function readIdSet(localKey) {
  return new Set(read(localKey, []));
}

export function sanitizedFields(data, fields) {
  const out = {};
  for (const [key, limit] of Object.entries(fields)) {
    if (key in data) out[key] = sanitizeText(data[key], limit);
  }
  return out;
}

export function safeAvatar(value) {
  return safeImageUrls([value])[0] || "";
}

export const PROFILE_FIELDS = {
  fullName: LIMITS.name,
  phone: LIMITS.phone,
  region: LIMITS.region,
  bio: LIMITS.bio,
};
