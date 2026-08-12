import api from "./axios";
import {
  read,
  write,
  addDeleted,
  getDeletedSet,
  STORAGE_KEYS,
} from "../utils/store";

export function httpError(message, status) {
  const e = new Error(message);
  e.response = { status, data: { message } };
  return e;
}

export function withoutPassword(user) {
  if (!user) return user;
  const { password: _password, ...safe } = user;
  return safe;
}

export function persistCurrentUser(user) {
  const safe = withoutPassword(user);
  write(STORAGE_KEYS.currentUser, safe);
  return safe;
}

export async function fetchCollection(path, fallback = []) {
  const res = await api.get(path);
  return res.data ?? fallback;
}

export function requireCurrentUser() {
  const current = read(STORAGE_KEYS.currentUser);
  if (!current) throw httpError("auth", 401);
  return current;
}

export function notDeleted(items, deletedSet = getDeletedSet()) {
  return (items || []).filter((x) => !deletedSet.has(x.id));
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
