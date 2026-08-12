import { read, write, genId, addDeleted, STORAGE_KEYS } from "../utils/store";
import { listingOwnerId } from "../utils/constants";
import {
  DEMO_EMAIL,
  DEMO_PASSWORD,
  LIMITS,
  hashPassword,
  safeImageUrls,
  sanitizeText,
  verifyPassword,
} from "../utils/security";
import {
  PROFILE_FIELDS,
  fetchCollection,
  httpError,
  mergedCollection,
  newestFirst,
  notDeleted,
  notFound,
  persistCurrentUser,
  publicUser,
  pushLocal,
  readIdSet,
  removeLocal,
  requireCurrentUser,
  requireOwnership,
  safeAvatar,
  sanitizedFields,
  startSession,
  toggleInList,
  updateLocal,
} from "./helpers";

function normalizeEmail(value) {
  return String(value || "").trim().toLowerCase();
}

function findByEmail(users, email) {
  return users.find((u) => normalizeEmail(u.email) === email);
}

function invalidCredentials() {
  return httpError("Email və ya şifrə yanlışdır", 401);
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

/** Resolves an item that may live locally or on the mock server, enforcing ownership. */
async function ownedItem(id, localKey, path, current) {
  const local = read(localKey, []);
  const owned = local.find((x) => x.id === id);
  if (owned) return { item: requireOwnership(owned, current), isLocal: true };
  const remote = (await fetchCollection(path)).find((x) => x.id === id);
  if (!remote) throw notFound();
  return { item: requireOwnership(remote, current), isLocal: false };
}

const API = {
  auth: {
    async login(email, password) {
      const normalizedEmail = normalizeEmail(email);

      const local = findByEmail(read(STORAGE_KEYS.localUsers, []), normalizedEmail);
      if (local) {
        const ok = await verifyPassword(password, local.passwordSalt, local.passwordHash);
        if (!ok) throw invalidCredentials();
        return startSession(local);
      }

      // Mock backend has no credential store; only the documented demo account
      // can be signed into, and never with another user's identity.
      if (normalizedEmail !== DEMO_EMAIL || password !== DEMO_PASSWORD) {
        throw invalidCredentials();
      }
      const demo = findByEmail(await fetchCollection("/users"), DEMO_EMAIL);
      if (!demo) throw invalidCredentials();
      return startSession(demo);
    },

    async register(data) {
      const email = normalizeEmail(data.email);
      const password = String(data.password || "");
      if (!email || password.length < 6) {
        throw httpError("Email və ən azı 6 simvollu şifrə tələb olunur", 400);
      }
      const localUsers = read(STORAGE_KEYS.localUsers, []);
      const all = [...(await fetchCollection("/users")), ...localUsers];
      if (findByEmail(all, email)) {
        throw httpError("Bu email artıq istifade olunur", 409);
      }
      const { salt, hash } = await hashPassword(password);
      const user = {
        id: genId("usr"),
        email,
        passwordSalt: salt,
        passwordHash: hash,
        ...sanitizedFields(
          { fullName: data.fullName, phone: data.phone, region: data.region, bio: data.bio },
          PROFILE_FIELDS
        ),
        avatar: safeAvatar(data.avatar),
        balance: 0,
        createdAt: new Date().toISOString(),
      };
      pushLocal(STORAGE_KEYS.localUsers, user);
      return startSession(user);
    },

    async getMe() {
      const current = requireCurrentUser();
      const updated = read(STORAGE_KEYS.localUsers, []).find((u) => u.id === current.id);
      return { user: updated ? persistCurrentUser(updated) : publicUser(current) };
    },

    async updateProfile(data) {
      const current = requireCurrentUser();
      const patch = sanitizedFields(data, PROFILE_FIELDS);
      if ("avatar" in data) patch.avatar = safeAvatar(data.avatar);
      const updated = updateLocal(STORAGE_KEYS.localUsers, current.id, patch);
      return { user: persistCurrentUser(updated || { ...current, ...patch }) };
    },
  },

  listings: {
    async list(params = {}) {
      let items = await mergedCollection("/listings", STORAGE_KEYS.localListings);
      if (params.userId) {
        items = items.filter((l) => listingOwnerId(l) === params.userId);
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
      const all = [
        ...read(STORAGE_KEYS.localListings, []),
        ...(await fetchCollection("/listings")),
      ];
      const listing = all.find((l) => l.id === id);
      if (!listing) throw notFound();
      const allUsers = [
        ...read(STORAGE_KEYS.localUsers, []),
        ...(await fetchCollection("/users")),
      ];
      const owner =
        allUsers.find((u) => u.id === listingOwnerId(listing)) || listing.owner;
      return { listing, owner: publicUser(owner) };
    },

    async create(data) {
      const current = requireCurrentUser();
      const payload = listingPayload(data);
      const listing = pushLocal(STORAGE_KEYS.localListings, {
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
      });
      return { listing };
    },

    async update(id, data) {
      const current = requireCurrentUser();
      const { item, isLocal } = await ownedItem(
        id,
        STORAGE_KEYS.localListings,
        "/listings",
        current
      );
      const payload = listingPayload({ ...item, ...data });
      if (isLocal) {
        return { listing: updateLocal(STORAGE_KEYS.localListings, id, payload) };
      }
      const updated = pushLocal(STORAGE_KEYS.localListings, { ...item, ...payload });
      addDeleted(id);
      return { listing: updated };
    },

    async remove(id) {
      const current = requireCurrentUser();
      const { isLocal } = await ownedItem(
        id,
        STORAGE_KEYS.localListings,
        "/listings",
        current
      );
      if (isLocal) removeLocal(STORAGE_KEYS.localListings, id);
      else addDeleted(id);
      return { success: true };
    },
  },

  posts: {
    async list() {
      const all = await mergedCollection("/posts", STORAGE_KEYS.localPosts);
      const likedIds = readIdSet(STORAGE_KEYS.likedPosts);
      const savedIds = readIdSet(STORAGE_KEYS.savedPosts);
      const enriched = all.map((p) => ({
        ...p,
        author: p.author || { id: p.userId, fullName: "İstifadeci" },
        likesCount: p.likesCount ?? 0,
        commentsCount: p.commentsCount ?? 0,
        isLikedByMe: likedIds.has(p.id),
        isSavedByMe: savedIds.has(p.id),
      }));
      enriched.sort(newestFirst);
      return { posts: enriched };
    },

    async create(data) {
      const current = requireCurrentUser();
      const post = pushLocal(STORAGE_KEYS.localPosts, {
        id: genId("post"),
        author: {
          id: current.id,
          fullName: current.fullName,
          avatar: safeAvatar(current.avatar),
        },
        content: sanitizeText(data.content, LIMITS.postContent),
        images: safeImageUrls(data.images),
        likesCount: 0,
        commentsCount: 0,
        isLikedByMe: false,
        isSavedByMe: false,
        createdAt: new Date().toISOString(),
      });
      return { post };
    },

    async remove(id) {
      const current = requireCurrentUser();
      const { isLocal } = await ownedItem(
        id,
        STORAGE_KEYS.localPosts,
        "/posts",
        current
      );
      if (isLocal) removeLocal(STORAGE_KEYS.localPosts, id);
      else addDeleted(id);
      return { success: true };
    },

    async toggleLike(id) {
      requireCurrentUser();
      return { liked: toggleInList(STORAGE_KEYS.likedPosts, id) };
    },

    async toggleSave(id) {
      requireCurrentUser();
      return { saved: toggleInList(STORAGE_KEYS.savedPosts, id) };
    },

    async comments(postId) {
      const serverMap = await fetchCollection("/comments", {});
      const localMap = read(STORAGE_KEYS.localComments, {});
      return {
        comments: [
          ...(localMap[postId] || []),
          ...notDeleted(serverMap[postId] || []),
        ],
      };
    },

    async addComment(postId, content) {
      const current = requireCurrentUser();
      const text = sanitizeText(content, LIMITS.comment);
      if (!text) throw httpError("Şərh boş ola bilməz", 400);
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
      localMap[postId] = [...(localMap[postId] || []), comment];
      write(STORAGE_KEYS.localComments, localMap);
      return { comment };
    },

    async deleteComment(commentId, postId) {
      const current = requireCurrentUser();
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
      if (!remote) throw notFound();
      requireOwnership(remote, current);
      addDeleted(commentId);
      return { success: true };
    },

    async saved() {
      const all = await mergedCollection("/posts", STORAGE_KEYS.localPosts);
      const savedIds = readIdSet(STORAGE_KEYS.savedPosts);
      return { posts: all.filter((p) => savedIds.has(p.id)) };
    },
  },

  basket: {
    async list() {
      const current = requireCurrentUser();
      const serverItems = await fetchCollection("/basket");
      const localMap = read(STORAGE_KEYS.basket, {});
      const ids = new Set();
      const items = [];
      for (const i of [...(localMap[current.id] || []), ...(serverItems?.[current.id] || [])]) {
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
      const current = requireCurrentUser();
      const localMap = read(STORAGE_KEYS.basket, {});
      const arr = localMap[current.id] || [];
      if (!arr.some((i) => i.listingId === listingId)) {
        localMap[current.id] = [...arr, { listingId, addedAt: new Date().toISOString() }];
        write(STORAGE_KEYS.basket, localMap);
      }
      return { success: true };
    },

    async remove(listingId) {
      const current = requireCurrentUser();
      const localMap = read(STORAGE_KEYS.basket, {});
      localMap[current.id] = (localMap[current.id] || []).filter(
        (i) => i.listingId !== listingId
      );
      write(STORAGE_KEYS.basket, localMap);
      return { success: true };
    },

    async clear() {
      const current = requireCurrentUser();
      const localMap = read(STORAGE_KEYS.basket, {});
      localMap[current.id] = [];
      write(STORAGE_KEYS.basket, localMap);
      return { success: true };
    },
  },

  orders: {
    async list() {
      const current = requireCurrentUser();
      const allListings = [
        ...read(STORAGE_KEYS.localListings, []),
        ...(await fetchCollection("/listings")),
      ];
      const orders = read(STORAGE_KEYS.orders, [])
        .filter((o) => o.userId === current.id)
        .map((o) => ({
          ...o,
          listing: allListings.find((l) => l.id === o.listingId),
        }))
        .sort(newestFirst);
      return { orders };
    },

    async createSale(payload) {
      const current = requireCurrentUser();
      const order = pushLocal(STORAGE_KEYS.orders, {
        id: genId("ord"),
        userId: current.id,
        type: "sale",
        items: payload.items || [],
        total: payload.total || 0,
        status: "pending",
        createdAt: new Date().toISOString(),
      });
      await API.basket.clear();
      return { order };
    },

    async createRental(payload) {
      const current = requireCurrentUser();
      const order = pushLocal(STORAGE_KEYS.orders, {
        id: genId("ord"),
        userId: current.id,
        type: "rent",
        listingId: payload.listingId,
        startDate: payload.startDate,
        endDate: payload.endDate,
        notes: payload.notes || "",
        status: "pending",
        createdAt: new Date().toISOString(),
      });
      return { order };
    },
  },

  categories: {
    async list() {
      return { categories: await fetchCollection("/categories") };
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
