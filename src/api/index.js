import { read, write, genId, addDeleted, STORAGE_KEYS } from "../utils/store";
import { listingOwnerId } from "../utils/constants";
import {
  fetchCollection,
  httpError,
  mergedCollection,
  newestFirst,
  notDeleted,
  persistCurrentUser,
  pushLocal,
  readIdSet,
  removeLocal,
  requireCurrentUser,
  toggleInList,
  updateLocal,
} from "./helpers";

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
      if (!found) throw httpError("Email və ya şifrə yanlışdır", 401);
      const token = genId("tok");
      write(STORAGE_KEYS.token, token);
      return { token, user: persistCurrentUser(found) };
    },

    async register(data) {
      const serverUsers = await fetchCollection("/users");
      const localUsers = read(STORAGE_KEYS.localUsers, []);
      const all = [...serverUsers, ...localUsers];
      if (all.some((u) => u.email === data.email)) {
        throw httpError("Bu email artıq istifade olunur", 409);
      }
      const user = pushLocal(STORAGE_KEYS.localUsers, {
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
      });
      const token = genId("tok");
      write(STORAGE_KEYS.token, token);
      return { token, user: persistCurrentUser(user) };
    },

    async getMe() {
      const current = requireCurrentUser();
      const localUsers = read(STORAGE_KEYS.localUsers, []);
      const updated = localUsers.find((u) => u.id === current.id);
      if (updated) return { user: persistCurrentUser(updated) };
      return { user: current };
    },

    async updateProfile(data) {
      const current = requireCurrentUser();
      const updated = updateLocal(STORAGE_KEYS.localUsers, current.id, data);
      if (updated) return { user: persistCurrentUser(updated) };
      const merged = { ...current, ...data };
      write(STORAGE_KEYS.currentUser, merged);
      return { user: merged };
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
      const serverItems = await fetchCollection("/listings");
      const all = [...read(STORAGE_KEYS.localListings, []), ...serverItems];
      const listing = all.find((l) => l.id === id);
      if (!listing) throw httpError("Not found", 404);
      const usersRes = await fetchCollection("/users");
      const allUsers = [...read(STORAGE_KEYS.localUsers, []), ...usersRes];
      const ownerId = listingOwnerId(listing);
      const owner = allUsers.find((u) => u.id === ownerId) || listing.owner;
      return { listing, owner };
    },

    async create(data) {
      const current = requireCurrentUser();
      const listing = pushLocal(STORAGE_KEYS.localListings, {
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
      });
      return { listing };
    },

    async update(id, data) {
      const updated = updateLocal(STORAGE_KEYS.localListings, id, data);
      return { listing: updated || { id, ...data } };
    },

    async remove(id) {
      removeLocal(STORAGE_KEYS.localListings, id);
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
          avatar: current.avatar || "",
        },
        content: data.content || "",
        images: data.images || [],
        likesCount: 0,
        commentsCount: 0,
        isLikedByMe: false,
        isSavedByMe: false,
        createdAt: new Date().toISOString(),
      });
      return { post };
    },

    async remove(id) {
      removeLocal(STORAGE_KEYS.localPosts, id);
      return { success: true };
    },

    async toggleLike(id) {
      return { liked: toggleInList(STORAGE_KEYS.likedPosts, id) };
    },

    async toggleSave(id) {
      return { saved: toggleInList(STORAGE_KEYS.savedPosts, id) };
    },

    async comments(postId) {
      const serverMap = await fetchCollection("/comments", {});
      const localMap = read(STORAGE_KEYS.localComments, {});
      const all = [
        ...(localMap[postId] || []),
        ...notDeleted(serverMap[postId] || []),
      ];
      return { comments: all };
    },

    async addComment(postId, content) {
      const current = requireCurrentUser();
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
      localMap[postId] = [...(localMap[postId] || []), comment];
      write(STORAGE_KEYS.localComments, localMap);
      return { comment };
    },

    async deleteComment(commentId, postId) {
      const localMap = read(STORAGE_KEYS.localComments, {});
      localMap[postId] = (localMap[postId] || []).filter(
        (c) => c.id !== commentId
      );
      write(STORAGE_KEYS.localComments, localMap);
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
      const current = requireCurrentUser();
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
      const current = requireCurrentUser();
      const serverListings = await fetchCollection("/listings");
      const allListings = [
        ...read(STORAGE_KEYS.localListings, []),
        ...serverListings,
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
