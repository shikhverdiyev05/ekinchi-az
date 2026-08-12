import { AppError, logError } from "./errors";

export const STORAGE_KEYS = {
  token: "aqro_token",
  currentUser: "aqro_current_user",
  localUsers: "aqro_local_users",
  localListings: "aqro_local_listings",
  localPosts: "aqro_local_posts",
  localComments: "aqro_local_comments",
  basket: "aqro_basket",
  savedPosts: "aqro_saved_posts",
  savedListings: "aqro_saved_listings",
  likedPosts: "aqro_liked_posts",
  orders: "aqro_orders",
  deletedItems: "aqro_deleted_ids",
};

export function read(key, fallback = null) {
  let raw;
  try {
    raw = localStorage.getItem(key);
  } catch (e) {
    logError(`LocalStorage oxunmadi (${key})`, e);
    return fallback;
  }
  if (!raw) return fallback;
  try {
    return JSON.parse(raw);
  } catch (e) {
    logError(`LocalStorage-daki melumat zedelenmisdir (${key})`, e);
    remove(key);
    return fallback;
  }
}

export function write(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (e) {
    logError(`LocalStorage yazilmadi (${key})`, e);
    return false;
  }
}

export function remove(key) {
  try {
    localStorage.removeItem(key);
  } catch (e) {
    logError(`LocalStorage silinmedi (${key})`, e);
  }
}

export function writeOrThrow(key, value) {
  if (!write(key, value)) {
    throw new AppError(
      "Məlumat brauzer yaddaşına yazıla bilmədi. Yaddaş dolu ola bilər.",
      { code: "STORAGE_WRITE_FAILED" }
    );
  }
}

export function genId(prefix = "id") {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export function mergeDeleted(items, deletedSet) {
  if (!Array.isArray(items)) return items;
  return items.filter((i) => !deletedSet.has(i.id));
}

export function getDeletedSet() {
  return new Set(read(STORAGE_KEYS.deletedItems, []));
}

export function addDeleted(id) {
  const set = getDeletedSet();
  set.add(id);
  write(STORAGE_KEYS.deletedItems, Array.from(set));
}
