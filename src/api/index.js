import api from "./axios";
import { read, write, genId, getDeletedSet, addDeleted } from "../utils/store";
import { STORAGE_KEYS } from "../utils/store";
import {
  DEMO_EMAIL,
  DEMO_PASSWORD,
  LIMITS,
  forbidden,
  hashPassword,
  randomToken,
  safeImageUrls,
  sanitizeText,
  unauthorized,
  verifyPassword,
} from "../utils/security";

function requireUser() {
  const current = read(STORAGE_KEYS.currentUser);
  if (!current) throw unauthorized();
  return current;
}

function ownerIdOf(item) {
  return item?.owner?.id ?? item?.author?.id ?? item?.userId ?? null;
}

function requireOwnership(item, current) {
  const owner = ownerIdOf(item);
  if (!owner || owner !== current.id) throw forbidden();
}

function publicUser(user) {
  const { password: _p, passwordHash: _h, passwordSalt: _s, ...safe } = user;
  return safe;
}

function profilePatch(data = {}) {
  const patch = {};
  if ("fullName" in data) patch.fullName = sanitizeText(data.fullName, LIMITS.name);
  if ("phone" in data) patch.phone = sanitizeText(data.phone, LIMITS.phone);
  if ("region" in data) patch.region = sanitizeText(data.region, LIMITS.region);
  if ("bio" in data) patch.bio = sanitizeText(data.bio, LIMITS.bio);
  if ("avatar" in data) patch.avatar = safeImageUrls([data.avatar])[0] || "";
  return patch;
}

function listingPayload(data = {}) {
  return {
    title: sanitizeText(data.title, LIMITS.title),
    description: sanitizeText(data.description, LIMITS.description),
    type: data.type === "rent" ? "rent" : "sale",
    category: sanitizeText(data.category, LIMITS.name),
    subcategory: data.subcategory ? sanitizeText(data.subcategory, LIMITS.name) : null,
    price: Number.isFinite(Number(data.price)) ? Math.max(0, Number(data.price)) : 0,
    currency: ["AZN", "USD", "EUR"].includes(data.currency) ? data.currency : "AZN",
    priceUnit: data.priceUnit ? sanitizeText(data.priceUnit, LIMITS.name) : null,
    region: sanitizeText(data.region, LIMITS.region),
    images: safeImageUrls(data.images),
  };
}

async function fetchCollection(path, fallback = []) {
  const res = await api.get(path);
  return res.data ?? fallback;
}

function withLocal(serverItems, localKey, deleted = null) {
  const deletedSet = deleted === null ? getDeletedSet() : deleted;
  const local = read(localKey, []);
  let filtered = (serverItems || []).filter((x) => !deletedSet.has(x.id));
  return [...local, ...filtered];
}

function withLocalDict(serverDict, localKey) {
  const deletedSet = getDeletedSet();
  const local = read(localKey, {});
  const out = {};
  for (const k of Object.keys(serverDict || {})) {
    out[k] = (serverDict[k] || []).filter((x) => !deletedSet.has(x.id));
  }
  for (const k of Object.keys(local)) {
    out[k] = [...(local[k] || []), ...(out[k] || [])];
  }
  return out;
}

function loadLocal(key) {
  return read(key, []);
}

const API = {
  auth: {
    async login(email, password) {
      const normalizedEmail = String(email || "").trim().toLowerCase();
      const invalid = () => {
        const e = new Error("Email və ya şifrə yanlışdır");
        e.response = { status: 401, data: { message: e.message } };
        return e;
      };

      const localUsers = read(STORAGE_KEYS.localUsers, []);
      const local = localUsers.find(
        (u) => String(u.email || "").toLowerCase() === normalizedEmail
      );
      if (local) {
        const ok = await verifyPassword(password, local.passwordSalt, local.passwordHash);
        if (!ok) throw invalid();
        const safe = publicUser(local);
        write(STORAGE_KEYS.token, randomToken());
        write(STORAGE_KEYS.currentUser, safe);
        return { token: read(STORAGE_KEYS.token), user: safe };
      }

      // Mock backend has no credential store; only the documented demo account
      // can be signed into, and never with another user's identity.
      if (normalizedEmail !== DEMO_EMAIL || password !== DEMO_PASSWORD) {
        throw invalid();
      }
      const serverUsers = await fetchCollection("/users");
      const demo = serverUsers.find(
        (u) => String(u.email || "").toLowerCase() === DEMO_EMAIL
      );
      if (!demo) throw invalid();
      const safe = publicUser(demo);
      write(STORAGE_KEYS.token, randomToken());
      write(STORAGE_KEYS.currentUser, safe);
      return { token: read(STORAGE_KEYS.token), user: safe };
    },

    async register(data) {
      const email = String(data.email || "").trim().toLowerCase();
      const password = String(data.password || "");
      if (!email || password.length < 6) {
        const e = new Error("Email və ən azı 6 simvollu şifrə tələb olunur");
        e.response = { status: 400, data: { message: e.message } };
        throw e;
      }
      const serverUsers = await fetchCollection("/users");
      const localUsers = read(STORAGE_KEYS.localUsers, []);
      const all = [...serverUsers, ...localUsers];
      if (all.some((u) => String(u.email || "").toLowerCase() === email)) {
        const e = new Error("Bu email artıq istifade olunur");
        e.response = { status: 409, data: { message: e.message } };
        throw e;
      }
      const { salt, hash } = await hashPassword(password);
      const user = {
        id: genId("usr"),
        fullName: sanitizeText(data.fullName, LIMITS.name),
        email,
        passwordSalt: salt,
        passwordHash: hash,
        phone: sanitizeText(data.phone, LIMITS.phone),
        avatar: safeImageUrls([data.avatar])[0] || "",
        region: sanitizeText(data.region, LIMITS.region),
        balance: 0,
        bio: sanitizeText(data.bio, LIMITS.bio),
        createdAt: new Date().toISOString(),
      };
      localUsers.push(user);
      write(STORAGE_KEYS.localUsers, localUsers);
      const safe = publicUser(user);
      write(STORAGE_KEYS.token, randomToken());
      write(STORAGE_KEYS.currentUser, safe);
      return { token: read(STORAGE_KEYS.token), user: safe };
    },

    async getMe() {
      const current = requireUser();
      const localUsers = read(STORAGE_KEYS.localUsers, []);
      const updated = localUsers.find((u) => u.id === current.id);
      if (updated) {
        const safe = publicUser(updated);
        write(STORAGE_KEYS.currentUser, safe);
        return { user: safe };
      }
      return { user: publicUser(current) };
    },

    async updateProfile(data) {
      const current = requireUser();
      const patch = profilePatch(data);
      let localUsers = read(STORAGE_KEYS.localUsers, []);
      const idx = localUsers.findIndex((u) => u.id === current.id);
      if (idx >= 0) {
        localUsers[idx] = { ...localUsers[idx], ...patch };
        write(STORAGE_KEYS.localUsers, localUsers);
        const safe = publicUser(localUsers[idx]);
        write(STORAGE_KEYS.currentUser, safe);
        return { user: safe };
      }
      const updated = publicUser({ ...current, ...patch });
      write(STORAGE_KEYS.currentUser, updated);
      return { user: updated };
    },
  },

  listings: {
    async list(params = {}) {
      const serverItems = await fetchCollection("/listings");
      const deleted = getDeletedSet();
      let items = withLocal(serverItems, STORAGE_KEYS.localListings, deleted);
      if (params.userId) {
        items = items.filter((l) => (l.owner?.id || l.userId) === params.userId);
      }
      if (params.type) items = items.filter((l) => l.type === params.type);
      if (params.category) {
        items = items.filter(
          (l) => l.category === params.category || l.subcategory === params.category
        );
      }
      if (params.q) {
        const q = params.q.toLowerCase();
        items = items.filter(
          (l) =>
            l.title?.toLowerCase().includes(q) ||
            l.description?.toLowerCase().includes(q)
        );
      }
      return { listings: items, total: items.length };
    },

    async get(id) {
      const serverItems = await fetchCollection("/listings");
      const local = read(STORAGE_KEYS.localListings, []);
      const all = [...local, ...serverItems];
      const listing = all.find((l) => l.id === id);
      if (!listing) {
        const e = new Error("Not found");
        e.response = { status: 404 };
        throw e;
      }
      const usersRes = await fetchCollection("/users");
      const localUsers = read(STORAGE_KEYS.localUsers, []);
      const allUsers = [...localUsers, ...usersRes];
      const ownerId = listing.owner?.id || listing.userId;
      const owner = allUsers.find((u) => u.id === ownerId) || listing.owner;
      return { listing, owner: owner ? publicUser(owner) : owner };
    },

    async create(data) {
      const current = requireUser();
      const payload = listingPayload(data);
      const listing = {
        id: genId("lst"),
        ...payload,
        priceUnit: payload.priceUnit || (payload.type === "rent" ? "gün" : null),
        owner: {
          id: current.id,
          fullName: current.fullName,
        },
        userId: current.id,
        status: "active",
        createdAt: new Date().toISOString(),
      };
      const local = read(STORAGE_KEYS.localListings, []);
      local.push(listing);
      write(STORAGE_KEYS.localListings, local);
      return { listing };
    },

    async update(id, data) {
      const current = requireUser();
      const local = read(STORAGE_KEYS.localListings, []);
      const idx = local.findIndex((l) => l.id === id);
      if (idx >= 0) {
        requireOwnership(local[idx], current);
        local[idx] = { ...local[idx], ...listingPayload({ ...local[idx], ...data }) };
        write(STORAGE_KEYS.localListings, local);
        return { listing: local[idx] };
      }
      const serverItems = await fetchCollection("/listings");
      const remote = serverItems.find((l) => l.id === id);
      if (!remote) {
        const e = new Error("Not found");
        e.response = { status: 404 };
        throw e;
      }
      requireOwnership(remote, current);
      const updated = { ...remote, ...listingPayload({ ...remote, ...data }) };
      local.push(updated);
      write(STORAGE_KEYS.localListings, local);
      addDeleted(id);
      return { listing: updated };
    },

    async remove(id) {
      const current = requireUser();
      const local = read(STORAGE_KEYS.localListings, []);
      const owned = local.find((l) => l.id === id);
      if (owned) {
        requireOwnership(owned, current);
        write(
          STORAGE_KEYS.localListings,
          local.filter((l) => l.id !== id)
        );
        addDeleted(id);
        return { success: true };
      }
      const serverItems = await fetchCollection("/listings");
      const remote = serverItems.find((l) => l.id === id);
      if (!remote) {
        const e = new Error("Not found");
        e.response = { status: 404 };
        throw e;
      }
      requireOwnership(remote, current);
      addDeleted(id);
      return { success: true };
    },
  },

  posts: {
    async list() {
      const serverItems = await fetchCollection("/posts");
      const deleted = getDeletedSet();
      const local = read(STORAGE_KEYS.localPosts, []);
      const likedIds = new Set(read(STORAGE_KEYS.likedPosts, []));
      const savedIds = new Set(read(STORAGE_KEYS.savedPosts, []));
      const serverFiltered = (serverItems || []).filter(
        (p) => !deleted.has(p.id)
      );
      const all = [...local, ...serverFiltered];
      const enriched = all.map((p) => ({
        ...p,
        author: p.author || { id: p.userId, fullName: "İstifadeci" },
        likesCount: p.likesCount ?? 0,
        commentsCount: p.commentsCount ?? 0,
        isLikedByMe: likedIds.has(p.id),
        isSavedByMe: savedIds.has(p.id),
      }));
      enriched.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      return { posts: enriched };
    },

    async create(data) {
      const current = requireUser();
      const post = {
        id: genId("post"),
        author: {
          id: current.id,
          fullName: current.fullName,
          avatar: safeImageUrls([current.avatar])[0] || "",
        },
        content: sanitizeText(data.content, LIMITS.postContent),
        images: safeImageUrls(data.images),
        likesCount: 0,
        commentsCount: 0,
        isLikedByMe: false,
        isSavedByMe: false,
        createdAt: new Date().toISOString(),
      };
      const local = read(STORAGE_KEYS.localPosts, []);
      local.push(post);
      write(STORAGE_KEYS.localPosts, local);
      return { post };
    },

    async remove(id) {
      const current = requireUser();
      const local = read(STORAGE_KEYS.localPosts, []);
      const owned = local.find((p) => p.id === id);
      if (owned) {
        requireOwnership(owned, current);
        write(
          STORAGE_KEYS.localPosts,
          local.filter((p) => p.id !== id)
        );
        addDeleted(id);
        return { success: true };
      }
      const serverItems = await fetchCollection("/posts");
      const remote = serverItems.find((p) => p.id === id);
      if (!remote) {
        const e = new Error("Not found");
        e.response = { status: 404 };
        throw e;
      }
      requireOwnership(remote, current);
      addDeleted(id);
      return { success: true };
    },

    async toggleLike(id) {
      requireUser();
      let liked = read(STORAGE_KEYS.likedPosts, []);
      const has = liked.includes(id);
      if (has) liked = liked.filter((x) => x !== id);
      else liked = [...liked, id];
      write(STORAGE_KEYS.likedPosts, liked);
      return { liked: !has };
    },

    async toggleSave(id) {
      requireUser();
      let saved = read(STORAGE_KEYS.savedPosts, []);
      const has = saved.includes(id);
      if (has) saved = saved.filter((x) => x !== id);
      else saved = [...saved, id];
      write(STORAGE_KEYS.savedPosts, saved);
      return { saved: !has };
    },

    async comments(postId) {
      const serverMap = await fetchCollection("/comments", {});
      const localMap = read(STORAGE_KEYS.localComments, {});
      const server = serverMap[postId] || [];
      const deletedSet = getDeletedSet();
      const all = [
        ...(localMap[postId] || []),
        ...server.filter((c) => !deletedSet.has(c.id)),
      ];
      return { comments: all };
    },

    async addComment(postId, content) {
      const current = requireUser();
      const text = sanitizeText(content, LIMITS.comment);
      if (!text) {
        const e = new Error("Şərh boş ola bilməz");
        e.response = { status: 400, data: { message: e.message } };
        throw e;
      }
      const comment = {
        id: genId("cmt"),
        postId,
        author: {
          id: current.id,
          fullName: current.fullName,
        },
        text,
        createdAt: new Date().toISOString(),
      };
      const localMap = read(STORAGE_KEYS.localComments, {});
      const arr = localMap[postId] || [];
      arr.push(comment);
      localMap[postId] = arr;
      write(STORAGE_KEYS.localComments, localMap);
      return { comment };
    },

    async deleteComment(commentId, postId) {
      const current = requireUser();
      const localMap = read(STORAGE_KEYS.localComments, {});
      const arr = localMap[postId] || [];
      const owned = arr.find((c) => c.id === commentId);
      if (owned) {
        requireOwnership(owned, current);
        localMap[postId] = arr.filter((c) => c.id !== commentId);
        write(STORAGE_KEYS.localComments, localMap);
        addDeleted(commentId);
        return { success: true };
      }
      const serverMap = await fetchCollection("/comments", {});
      const remote = (serverMap[postId] || []).find((c) => c.id === commentId);
      if (!remote) {
        const e = new Error("Not found");
        e.response = { status: 404 };
        throw e;
      }
      requireOwnership(remote, current);
      addDeleted(commentId);
      return { success: true };
    },

    async saved() {
      const serverItems = await fetchCollection("/posts");
      const deleted = getDeletedSet();
      const local = read(STORAGE_KEYS.localPosts, []);
      const savedIds = new Set(read(STORAGE_KEYS.savedPosts, []));
      const all = [...local, ...(serverItems || []).filter((p) => !deleted.has(p.id))];
      const saved = all.filter((p) => savedIds.has(p.id));
      return { posts: saved };
    },
  },

  basket: {
    async list() {
      const current = read(STORAGE_KEYS.currentUser);
      if (!current) {
        const e = new Error("auth");
        e.response = { status: 401 };
        throw e;
      }
      const serverItems = await fetchCollection("/basket");
      const serverUserBasket = serverItems?.[current.id] || [];
      const localMap = read(STORAGE_KEYS.basket, {});
      const localUserBasket = localMap[current.id] || [];
      const ids = new Set();
      const items = [];
      for (const i of [...localUserBasket, ...serverUserBasket]) {
        if (ids.has(i.listingId)) continue;
        ids.add(i.listingId);
        items.push(i);
      }
      const allListings = await API.listings.list();
      return {
        basket: items.map((i) => ({
          ...i,
          listing: allListings.listings.find((l) => l.id === i.listingId),
        })),
      };
    },

    async add(listingId) {
      const current = requireUser();
      const localMap = read(STORAGE_KEYS.basket, {});
      const arr = localMap[current.id] || [];
      if (!arr.some((i) => i.listingId === listingId)) {
        arr.push({ listingId, addedAt: new Date().toISOString() });
        localMap[current.id] = arr;
        write(STORAGE_KEYS.basket, localMap);
      }
      return { success: true };
    },

    async remove(listingId) {
      const current = requireUser();
      const localMap = read(STORAGE_KEYS.basket, {});
      const arr = localMap[current.id] || [];
      localMap[current.id] = arr.filter((i) => i.listingId !== listingId);
      write(STORAGE_KEYS.basket, localMap);
      return { success: true };
    },

    async clear() {
      const current = requireUser();
      const localMap = read(STORAGE_KEYS.basket, {});
      localMap[current.id] = [];
      write(STORAGE_KEYS.basket, localMap);
      return { success: true };
    },
  },

  orders: {
    async list() {
      const current = read(STORAGE_KEYS.currentUser);
      if (!current) {
        const e = new Error("auth");
        e.response = { status: 401 };
        throw e;
      }
      const all = read(STORAGE_KEYS.orders, []);
      const serverListings = await fetchCollection("/listings");
      const localListings = read(STORAGE_KEYS.localListings, []);
      const allListings = [...localListings, ...serverListings];
      const orders = all
        .filter((o) => o.userId === current.id)
        .map((o) => ({
          ...o,
          listing: allListings.find((l) => l.id === o.listingId),
        }))
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      return { orders };
    },

    async createSale(payload) {
      const current = read(STORAGE_KEYS.currentUser);
      if (!current) {
        const e = new Error("auth");
        e.response = { status: 401 };
        throw e;
      }
      const order = {
        id: genId("ord"),
        userId: current.id,
        type: "sale",
        items: payload.items || [],
        total: payload.total || 0,
        status: "pending",
        createdAt: new Date().toISOString(),
      };
      const all = read(STORAGE_KEYS.orders, []);
      all.push(order);
      write(STORAGE_KEYS.orders, all);
      await API.basket.clear();
      return { order };
    },

    async createRental(payload) {
      const current = read(STORAGE_KEYS.currentUser);
      if (!current) {
        const e = new Error("auth");
        e.response = { status: 401 };
        throw e;
      }
      const order = {
        id: genId("ord"),
        userId: current.id,
        type: "rent",
        listingId: payload.listingId,
        startDate: payload.startDate,
        endDate: payload.endDate,
        notes: payload.notes || "",
        status: "pending",
        createdAt: new Date().toISOString(),
      };
      const all = read(STORAGE_KEYS.orders, []);
      all.push(order);
      write(STORAGE_KEYS.orders, all);
      return { order };
    },
  },

  categories: {
    async list() {
      const items = await fetchCollection("/categories");
      return { categories: items };
    },
  },

  misc: {
    async faq() {
      return { faq: await fetchCollection("/faq") };
    },
    async contact() {
      return { contact: await fetchCollection("/contactInfo") };
    },
    async about() {
      return { about: await fetchCollection("/about") };
    },
  },
};

export default API;
