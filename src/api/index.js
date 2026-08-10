import api from "./axios";
import { read, write, genId, getDeletedSet, addDeleted } from "../utils/store";
import { STORAGE_KEYS } from "../utils/store";

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
      const serverUsers = await fetchCollection("/users");
      const localUsers = read(STORAGE_KEYS.localUsers, []);
      // Demo user-ə default password təyin edirik (server user-lərində password yoxdur)
      const DEMO_PW = "demo123";
      const serverWithPw = serverUsers.map((u) => ({
        ...u,
        password: u.password || DEMO_PW,
      }));
      const allUsers = [
        ...serverWithPw,
        ...localUsers.filter((u) => !serverUsers.some((x) => x.id === u.id)),
      ];
      const found = allUsers.find(
        (u) => u.email === email && u.password === password
      );
      if (!found) {
        const e = new Error("Email və ya şifrə yanlışdır");
        e.response = { status: 401, data: { message: e.message } };
        throw e;
      }
      const { password: p, ...safe } = found;
      const token = genId("tok");
      write(STORAGE_KEYS.token, token);
      write(STORAGE_KEYS.currentUser, safe);
      return { token, user: safe };
    },

    async register(data) {
      const serverUsers = await fetchCollection("/users");
      const localUsers = read(STORAGE_KEYS.localUsers, []);
      const all = [...serverUsers, ...localUsers];
      if (all.some((u) => u.email === data.email)) {
        const e = new Error("Bu email artıq istifade olunur");
        e.response = { status: 409, data: { message: e.message } };
        throw e;
      }
      const user = {
        id: data.id || genId("usr"),
        fullName: data.fullName,
        email: data.email,
        password: data.password,
        phone: data.phone || "",
        avatar: data.avatar || "",
        region: data.region || "",
        balance: 0,
        bio: data.bio || "",
        createdAt: new Date().toISOString(),
      };
      localUsers.push(user);
      write(STORAGE_KEYS.localUsers, localUsers);
      const { password, ...safe } = user;
      const token = genId("tok");
      write(STORAGE_KEYS.token, token);
      write(STORAGE_KEYS.currentUser, safe);
      return { token, user: safe };
    },

    async getMe() {
      const current = read(STORAGE_KEYS.currentUser);
      if (!current) {
        const e = new Error("Not authenticated");
        e.response = { status: 401 };
        throw e;
      }
      const localUsers = read(STORAGE_KEYS.localUsers, []);
      const updated = localUsers.find((u) => u.id === current.id);
      if (updated) {
        const { password, ...safe } = updated;
        write(STORAGE_KEYS.currentUser, safe);
        return { user: safe };
      }
      return { user: current };
    },

    async updateProfile(data) {
      const current = read(STORAGE_KEYS.currentUser);
      if (!current) throw new Error("auth");
      let localUsers = read(STORAGE_KEYS.localUsers, []);
      const idx = localUsers.findIndex((u) => u.id === current.id);
      if (idx >= 0) {
        localUsers[idx] = { ...localUsers[idx], ...data };
        write(STORAGE_KEYS.localUsers, localUsers);
        const { password, ...safe } = localUsers[idx];
        write(STORAGE_KEYS.currentUser, safe);
        return { user: safe };
      }
      const updated = { ...current, ...data };
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
      return { listing, owner };
    },

    async create(data) {
      const current = read(STORAGE_KEYS.currentUser);
      if (!current) {
        const e = new Error("auth");
        e.response = { status: 401 };
        throw e;
      }
      const listing = {
        id: genId("lst"),
        title: data.title,
        description: data.description || "",
        type: data.type || "sale",
        category: data.category || "",
        subcategory: data.subcategory || null,
        price: Number(data.price) || 0,
        currency: data.currency || "AZN",
        priceUnit: data.priceUnit || (data.type === "rent" ? "gün" : null),
        region: data.region || "",
        images: data.images || [],
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
      const local = read(STORAGE_KEYS.localListings, []);
      const idx = local.findIndex((l) => l.id === id);
      if (idx >= 0) {
        local[idx] = { ...local[idx], ...data };
        write(STORAGE_KEYS.localListings, local);
        return { listing: local[idx] };
      }
      return { listing: { id, ...data } };
    },

    async remove(id) {
      const local = read(STORAGE_KEYS.localListings, []);
      const filtered = local.filter((l) => l.id !== id);
      write(STORAGE_KEYS.localListings, filtered);
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
      const current = read(STORAGE_KEYS.currentUser);
      if (!current) {
        const e = new Error("auth");
        e.response = { status: 401 };
        throw e;
      }
      const post = {
        id: genId("post"),
        author: {
          id: current.id,
          fullName: current.fullName,
          avatar: current.avatar || "",
        },
        content: data.content || "",
        images: data.images || [],
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
      const local = read(STORAGE_KEYS.localPosts, []);
      write(
        STORAGE_KEYS.localPosts,
        local.filter((p) => p.id !== id)
      );
      addDeleted(id);
      return { success: true };
    },

    async toggleLike(id) {
      let liked = read(STORAGE_KEYS.likedPosts, []);
      const has = liked.includes(id);
      if (has) liked = liked.filter((x) => x !== id);
      else liked = [...liked, id];
      write(STORAGE_KEYS.likedPosts, liked);
      return { liked: !has };
    },

    async toggleSave(id) {
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
      const current = read(STORAGE_KEYS.currentUser);
      if (!current) {
        const e = new Error("auth");
        e.response = { status: 401 };
        throw e;
      }
      const comment = {
        id: genId("cmt"),
        postId,
        author: {
          id: current.id,
          fullName: current.fullName,
        },
        text: content,
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
      const localMap = read(STORAGE_KEYS.localComments, {});
      const arr = localMap[postId] || [];
      localMap[postId] = arr.filter((c) => c.id !== commentId);
      write(STORAGE_KEYS.localComments, localMap);
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
      const current = read(STORAGE_KEYS.currentUser);
      if (!current) {
        const e = new Error("auth");
        e.response = { status: 401 };
        throw e;
      }
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
      const current = read(STORAGE_KEYS.currentUser);
      const localMap = read(STORAGE_KEYS.basket, {});
      const arr = localMap[current.id] || [];
      localMap[current.id] = arr.filter((i) => i.listingId !== listingId);
      write(STORAGE_KEYS.basket, localMap);
      return { success: true };
    },

    async clear() {
      const current = read(STORAGE_KEYS.currentUser);
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
