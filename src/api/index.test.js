import { describe, it, expect, beforeEach, vi } from "vitest";
import API from "./index";
import api from "./axios";
import { STORAGE_KEYS, read, write } from "../utils/store";

vi.mock("./axios", () => ({
  default: { get: vi.fn() },
}));

const serverUsers = [
  { id: "u_srv", fullName: "Server User", email: "srv@example.com" },
];

const serverListings = [
  {
    id: "l_srv",
    title: "Traktor",
    description: "güclü traktor",
    type: "rent",
    category: "cat_texnika",
    userId: "u_srv",
  },
  {
    id: "l_srv2",
    title: "Toxum",
    description: "buğda",
    type: "sale",
    category: "cat_bitkiler",
    subcategory: "sub_toxumlar",
    owner: { id: "u_other" },
  },
];

const serverPosts = [
  { id: "p_srv", content: "salam", userId: "u_srv", createdAt: "2024-01-01T00:00:00.000Z" },
];

/** Routes the mocked axios GET calls to canned collections. */
function mockServer(overrides = {}) {
  const data = {
    "/users": serverUsers,
    "/listings": serverListings,
    "/posts": serverPosts,
    "/comments": {},
    "/basket": {},
    "/categories": [],
    "/faq": [],
    "/contactInfo": [],
    "/about": [],
    ...overrides,
  };
  api.get.mockImplementation(async (path) => ({ data: data[path] }));
  return data;
}

function login(user = { id: "u_me", fullName: "Me" }) {
  write(STORAGE_KEYS.currentUser, user);
  return user;
}

/** Asserts the promise rejects with an HTTP-ish status on the attached response. */
async function expectStatus(promise, status) {
  await expect(promise).rejects.toMatchObject({ response: { status } });
}

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  mockServer();
});

describe("auth.login", () => {
  it("authenticates a server user with the demo password and stores the session", async () => {
    const res = await API.auth.login("srv@example.com", "demo123");
    expect(res.user).toEqual(serverUsers[0]);
    expect(res.user.password).toBeUndefined();
    expect(read(STORAGE_KEYS.token)).toBe(res.token);
    expect(read(STORAGE_KEYS.currentUser)).toEqual(res.user);
  });

  it("authenticates a locally registered user", async () => {
    write(STORAGE_KEYS.localUsers, [
      { id: "u_loc", email: "loc@example.com", password: "pw123", fullName: "Loc" },
    ]);
    const res = await API.auth.login("loc@example.com", "pw123");
    expect(res.user.id).toBe("u_loc");
  });

  it("rejects wrong credentials with 401 and leaves no session", async () => {
    await expectStatus(API.auth.login("srv@example.com", "wrong"), 401);
    expect(read(STORAGE_KEYS.token)).toBeNull();
  });
});

describe("auth.register", () => {
  it("creates a local user, hides the password and starts a session", async () => {
    const res = await API.auth.register({
      fullName: "New",
      email: "new@example.com",
      password: "pw",
    });
    expect(res.user.password).toBeUndefined();
    expect(res.user.balance).toBe(0);
    expect(read(STORAGE_KEYS.localUsers)).toHaveLength(1);
    expect(read(STORAGE_KEYS.currentUser).email).toBe("new@example.com");
  });

  it("rejects an email that already exists on the server with 409", async () => {
    await expectStatus(
      API.auth.register({ email: "srv@example.com", password: "pw" }),
      409
    );
  });

  it("rejects an email that already exists locally with 409", async () => {
    write(STORAGE_KEYS.localUsers, [{ id: "u_loc", email: "loc@example.com" }]);
    await expectStatus(
      API.auth.register({ email: "loc@example.com", password: "pw" }),
      409
    );
  });
});

describe("auth.getMe", () => {
  it("rejects with 401 when no user is stored", async () => {
    await expectStatus(API.auth.getMe(), 401);
  });

  it("returns the stored user when it is not a local user", async () => {
    login({ id: "u_me", fullName: "Me" });
    await expect(API.auth.getMe()).resolves.toEqual({
      user: { id: "u_me", fullName: "Me" },
    });
  });

  it("refreshes the session from the local users list without the password", async () => {
    login({ id: "u_loc", fullName: "Stale" });
    write(STORAGE_KEYS.localUsers, [
      { id: "u_loc", fullName: "Fresh", password: "pw" },
    ]);
    const res = await API.auth.getMe();
    expect(res.user).toEqual({ id: "u_loc", fullName: "Fresh" });
    expect(read(STORAGE_KEYS.currentUser)).toEqual(res.user);
  });
});

describe("auth.updateProfile", () => {
  it("throws when not authenticated", async () => {
    await expect(API.auth.updateProfile({ bio: "x" })).rejects.toThrow("auth");
  });

  it("merges the patch into the local user record", async () => {
    login({ id: "u_loc", fullName: "Loc" });
    write(STORAGE_KEYS.localUsers, [
      { id: "u_loc", fullName: "Loc", password: "pw", bio: "" },
    ]);
    const res = await API.auth.updateProfile({ bio: "salam" });
    expect(res.user).toEqual({ id: "u_loc", fullName: "Loc", bio: "salam" });
    expect(read(STORAGE_KEYS.localUsers)[0].password).toBe("pw");
  });

  it("merges the patch into the session for non-local users", async () => {
    login({ id: "u_me", fullName: "Me" });
    const res = await API.auth.updateProfile({ region: "Bakı" });
    expect(res.user).toEqual({ id: "u_me", fullName: "Me", region: "Bakı" });
    expect(read(STORAGE_KEYS.currentUser).region).toBe("Bakı");
  });
});

describe("listings.list", () => {
  it("returns local listings before server listings", async () => {
    write(STORAGE_KEYS.localListings, [{ id: "l_loc", title: "Local" }]);
    const res = await API.listings.list();
    expect(res.listings.map((l) => l.id)).toEqual(["l_loc", "l_srv", "l_srv2"]);
    expect(res.total).toBe(3);
  });

  it("hides listings that were deleted locally", async () => {
    write(STORAGE_KEYS.deletedItems, ["l_srv"]);
    const res = await API.listings.list();
    expect(res.listings.map((l) => l.id)).toEqual(["l_srv2"]);
  });

  it("filters by owner id, falling back to userId", async () => {
    await expect(API.listings.list({ userId: "u_srv" })).resolves.toMatchObject({
      total: 1,
    });
    const res = await API.listings.list({ userId: "u_other" });
    expect(res.listings[0].id).toBe("l_srv2");
  });

  it("filters by type", async () => {
    const res = await API.listings.list({ type: "rent" });
    expect(res.listings.map((l) => l.id)).toEqual(["l_srv"]);
  });

  it("filters by category or subcategory", async () => {
    await expect(
      API.listings.list({ category: "cat_texnika" })
    ).resolves.toMatchObject({ total: 1 });
    const res = await API.listings.list({ category: "sub_toxumlar" });
    expect(res.listings[0].id).toBe("l_srv2");
  });

  it("searches title and description case-insensitively", async () => {
    await expect(API.listings.list({ q: "TRAKTOR" })).resolves.toMatchObject({
      total: 1,
    });
    const res = await API.listings.list({ q: "buğda" });
    expect(res.listings[0].id).toBe("l_srv2");
    await expect(API.listings.list({ q: "yoxdur" })).resolves.toMatchObject({
      total: 0,
    });
  });
});

describe("listings.get", () => {
  it("resolves the listing together with its owner", async () => {
    const res = await API.listings.get("l_srv");
    expect(res.listing.id).toBe("l_srv");
    expect(res.owner).toEqual(serverUsers[0]);
  });

  it("falls back to the embedded owner when the user is unknown", async () => {
    const res = await API.listings.get("l_srv2");
    expect(res.owner).toEqual({ id: "u_other" });
  });

  it("rejects an unknown id with 404", async () => {
    await expectStatus(API.listings.get("nope"), 404);
  });
});

describe("listings.create", () => {
  it("rejects with 401 when not authenticated", async () => {
    await expectStatus(API.listings.create({ title: "x" }), 401);
  });

  it("applies defaults and persists the listing locally", async () => {
    login();
    const { listing } = await API.listings.create({ title: "Kotan", price: "80" });
    expect(listing).toMatchObject({
      title: "Kotan",
      type: "sale",
      price: 80,
      currency: "AZN",
      priceUnit: null,
      status: "active",
      owner: { id: "u_me", fullName: "Me" },
      userId: "u_me",
    });
    expect(read(STORAGE_KEYS.localListings)).toEqual([listing]);
  });

  it("defaults the price unit for rentals and coerces an unparsable price to 0", async () => {
    login();
    const { listing } = await API.listings.create({
      title: "İcarə",
      type: "rent",
      price: "abc",
    });
    expect(listing.priceUnit).toBe("gün");
    expect(listing.price).toBe(0);
  });
});

describe("listings.update", () => {
  it("patches a local listing in place", async () => {
    write(STORAGE_KEYS.localListings, [{ id: "l_loc", title: "Old", price: 1 }]);
    const res = await API.listings.update("l_loc", { title: "New" });
    expect(res.listing).toEqual({ id: "l_loc", title: "New", price: 1 });
    expect(read(STORAGE_KEYS.localListings)[0].title).toBe("New");
  });

  it("echoes the patch for listings that are not stored locally", async () => {
    const res = await API.listings.update("l_srv", { title: "New" });
    expect(res.listing).toEqual({ id: "l_srv", title: "New" });
    expect(read(STORAGE_KEYS.localListings, [])).toEqual([]);
  });
});

describe("listings.remove", () => {
  it("drops the local copy and records the id as deleted", async () => {
    write(STORAGE_KEYS.localListings, [{ id: "l_loc" }]);
    await expect(API.listings.remove("l_loc")).resolves.toEqual({ success: true });
    expect(read(STORAGE_KEYS.localListings)).toEqual([]);
    expect(read(STORAGE_KEYS.deletedItems)).toEqual(["l_loc"]);
  });
});

describe("posts.list", () => {
  it("enriches posts with author, counters and like/save flags, newest first", async () => {
    write(STORAGE_KEYS.localPosts, [
      { id: "p_loc", content: "yeni", createdAt: "2024-05-01T00:00:00.000Z" },
    ]);
    write(STORAGE_KEYS.likedPosts, ["p_srv"]);
    write(STORAGE_KEYS.savedPosts, ["p_loc"]);
    const { posts } = await API.posts.list();
    expect(posts.map((p) => p.id)).toEqual(["p_loc", "p_srv"]);
    expect(posts[0]).toMatchObject({
      likesCount: 0,
      commentsCount: 0,
      isLikedByMe: false,
      isSavedByMe: true,
    });
    expect(posts[1]).toMatchObject({
      isLikedByMe: true,
      isSavedByMe: false,
      author: { id: "u_srv", fullName: "İstifadeci" },
    });
  });

  it("hides deleted posts", async () => {
    write(STORAGE_KEYS.deletedItems, ["p_srv"]);
    await expect(API.posts.list()).resolves.toEqual({ posts: [] });
  });
});

describe("posts.create", () => {
  it("rejects with 401 when not authenticated", async () => {
    await expectStatus(API.posts.create({ content: "x" }), 401);
  });

  it("stores a post authored by the current user", async () => {
    login({ id: "u_me", fullName: "Me", avatar: "a.png" });
    const { post } = await API.posts.create({ content: "salam" });
    expect(post).toMatchObject({
      content: "salam",
      images: [],
      likesCount: 0,
      author: { id: "u_me", fullName: "Me", avatar: "a.png" },
    });
    expect(read(STORAGE_KEYS.localPosts)).toEqual([post]);
  });
});

describe("posts.remove", () => {
  it("drops the local copy and records the id as deleted", async () => {
    write(STORAGE_KEYS.localPosts, [{ id: "p_loc" }]);
    await API.posts.remove("p_loc");
    expect(read(STORAGE_KEYS.localPosts)).toEqual([]);
    expect(read(STORAGE_KEYS.deletedItems)).toEqual(["p_loc"]);
  });
});

describe("posts.toggleLike / toggleSave", () => {
  it("toggles a like on and off", async () => {
    await expect(API.posts.toggleLike("p_srv")).resolves.toEqual({ liked: true });
    expect(read(STORAGE_KEYS.likedPosts)).toEqual(["p_srv"]);
    await expect(API.posts.toggleLike("p_srv")).resolves.toEqual({ liked: false });
    expect(read(STORAGE_KEYS.likedPosts)).toEqual([]);
  });

  it("toggles a save on and off", async () => {
    await expect(API.posts.toggleSave("p_srv")).resolves.toEqual({ saved: true });
    expect(read(STORAGE_KEYS.savedPosts)).toEqual(["p_srv"]);
    await expect(API.posts.toggleSave("p_srv")).resolves.toEqual({ saved: false });
    expect(read(STORAGE_KEYS.savedPosts)).toEqual([]);
  });
});

describe("posts comments", () => {
  it("returns local comments before server comments and hides deleted ones", async () => {
    mockServer({
      "/comments": { p_srv: [{ id: "c_srv" }, { id: "c_gone" }] },
    });
    write(STORAGE_KEYS.localComments, { p_srv: [{ id: "c_loc" }] });
    write(STORAGE_KEYS.deletedItems, ["c_gone"]);
    const { comments } = await API.posts.comments("p_srv");
    expect(comments.map((c) => c.id)).toEqual(["c_loc", "c_srv"]);
  });

  it("returns an empty list for a post without comments", async () => {
    await expect(API.posts.comments("p_srv")).resolves.toEqual({ comments: [] });
  });

  it("rejects adding a comment with 401 when not authenticated", async () => {
    await expectStatus(API.posts.addComment("p_srv", "hi"), 401);
  });

  it("stores a new comment under its post", async () => {
    login();
    const { comment } = await API.posts.addComment("p_srv", "salam");
    expect(comment).toMatchObject({
      postId: "p_srv",
      text: "salam",
      author: { id: "u_me", fullName: "Me" },
    });
    expect(read(STORAGE_KEYS.localComments)).toEqual({ p_srv: [comment] });
  });

  it("deletes a comment and records the id as deleted", async () => {
    write(STORAGE_KEYS.localComments, {
      p_srv: [{ id: "c_loc" }, { id: "c_keep" }],
    });
    await API.posts.deleteComment("c_loc", "p_srv");
    expect(read(STORAGE_KEYS.localComments).p_srv).toEqual([{ id: "c_keep" }]);
    expect(read(STORAGE_KEYS.deletedItems)).toEqual(["c_loc"]);
  });
});

describe("posts.saved", () => {
  it("returns only saved posts, ignoring deleted ones", async () => {
    write(STORAGE_KEYS.localPosts, [{ id: "p_loc" }]);
    write(STORAGE_KEYS.savedPosts, ["p_loc", "p_srv"]);
    write(STORAGE_KEYS.deletedItems, ["p_srv"]);
    const { posts } = await API.posts.saved();
    expect(posts.map((p) => p.id)).toEqual(["p_loc"]);
  });
});

describe("basket", () => {
  it("rejects list and add with 401 when not authenticated", async () => {
    await expectStatus(API.basket.list(), 401);
    await expectStatus(API.basket.add("l_srv"), 401);
  });

  it("adds a listing once and ignores duplicates", async () => {
    login();
    await API.basket.add("l_srv");
    await API.basket.add("l_srv");
    expect(read(STORAGE_KEYS.basket).u_me).toHaveLength(1);
  });

  it("joins basket entries with their listing and de-duplicates server entries", async () => {
    login();
    mockServer({ "/basket": { u_me: [{ listingId: "l_srv" }, { listingId: "l_srv2" }] } });
    await API.basket.add("l_srv");
    const { basket } = await API.basket.list();
    expect(basket.map((i) => i.listingId)).toEqual(["l_srv", "l_srv2"]);
    expect(basket[0].listing.title).toBe("Traktor");
  });

  it("removes a single entry and clears the whole basket", async () => {
    login();
    await API.basket.add("l_srv");
    await API.basket.add("l_srv2");
    await API.basket.remove("l_srv");
    expect(read(STORAGE_KEYS.basket).u_me.map((i) => i.listingId)).toEqual([
      "l_srv2",
    ]);
    await API.basket.clear();
    expect(read(STORAGE_KEYS.basket).u_me).toEqual([]);
  });
});

describe("orders", () => {
  it("rejects with 401 when not authenticated", async () => {
    await expectStatus(API.orders.list(), 401);
    await expectStatus(API.orders.createSale({}), 401);
    await expectStatus(API.orders.createRental({}), 401);
  });

  it("returns only the current user's orders, newest first, joined with listings", async () => {
    login();
    write(STORAGE_KEYS.orders, [
      { id: "o1", userId: "u_me", listingId: "l_srv", createdAt: "2024-01-01T00:00:00.000Z" },
      { id: "o2", userId: "u_me", listingId: "l_srv2", createdAt: "2024-06-01T00:00:00.000Z" },
      { id: "o3", userId: "u_other", listingId: "l_srv" },
    ]);
    const { orders } = await API.orders.list();
    expect(orders.map((o) => o.id)).toEqual(["o2", "o1"]);
    expect(orders[1].listing.title).toBe("Traktor");
  });

  it("creates a sale order and empties the basket", async () => {
    login();
    await API.basket.add("l_srv");
    const { order } = await API.orders.createSale({
      items: [{ listingId: "l_srv" }],
      total: 100,
    });
    expect(order).toMatchObject({ type: "sale", status: "pending", total: 100 });
    expect(read(STORAGE_KEYS.orders)).toEqual([order]);
    expect(read(STORAGE_KEYS.basket).u_me).toEqual([]);
  });

  it("creates a rental order with its date range", async () => {
    login();
    const { order } = await API.orders.createRental({
      listingId: "l_srv",
      startDate: "2024-07-01",
      endDate: "2024-07-05",
    });
    expect(order).toMatchObject({
      type: "rent",
      listingId: "l_srv",
      startDate: "2024-07-01",
      endDate: "2024-07-05",
      notes: "",
      status: "pending",
    });
  });
});

describe("categories and misc", () => {
  it("wraps the server collections in their response envelopes", async () => {
    mockServer({
      "/categories": [{ id: "c1" }],
      "/faq": [{ q: "q" }],
      "/contactInfo": [{ email: "a@b.c" }],
      "/about": [{ text: "about" }],
    });
    await expect(API.categories.list()).resolves.toEqual({
      categories: [{ id: "c1" }],
    });
    await expect(API.misc.faq()).resolves.toEqual({ faq: [{ q: "q" }] });
    await expect(API.misc.contact()).resolves.toEqual({
      contact: [{ email: "a@b.c" }],
    });
    await expect(API.misc.about()).resolves.toEqual({ about: [{ text: "about" }] });
  });

  it("falls back to an empty collection when the server returns no data", async () => {
    api.get.mockResolvedValue({ data: null });
    await expect(API.categories.list()).resolves.toEqual({ categories: [] });
  });
});
