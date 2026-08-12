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
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

export function write(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.warn("LocalStorage yazilmadi", e);
  }
}

export function remove(key) {
  try {
    localStorage.removeItem(key);
  } catch {}
}

export function genId(prefix = "id") {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export function getDeletedSet() {
  return new Set(read(STORAGE_KEYS.deletedItems, []));
}

export function addDeleted(id) {
  const set = getDeletedSet();
  set.add(id);
  write(STORAGE_KEYS.deletedItems, Array.from(set));
}
