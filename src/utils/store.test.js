import { describe, it, expect, vi, afterEach } from "vitest";
import {
  STORAGE_KEYS,
  read,
  write,
  writeOrThrow,
  remove,
  genId,
  mergeDeleted,
  getDeletedSet,
  addDeleted,
} from "./store";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("read", () => {
  it("returns the parsed value stored under the key", () => {
    localStorage.setItem("k", JSON.stringify({ a: 1 }));
    expect(read("k")).toEqual({ a: 1 });
  });

  it("returns the fallback when the key is missing", () => {
    expect(read("missing")).toBeNull();
    expect(read("missing", [])).toEqual([]);
  });

  it("returns the fallback when the stored value is not valid JSON", () => {
    localStorage.setItem("broken", "{not json");
    expect(read("broken", "fallback")).toBe("fallback");
  });

  it("returns the fallback when localStorage throws", () => {
    localStorage.setItem("k", "1");
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("denied");
    });
    expect(read("k", 42)).toBe(42);
  });
});

describe("write", () => {
  it("serializes the value into localStorage", () => {
    write("k", [1, 2]);
    expect(localStorage.getItem("k")).toBe("[1,2]");
  });

  it("reports failure instead of pretending the value was stored", () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("quota");
    });
    expect(write("k", 1)).toBe(false);
    expect(error).toHaveBeenCalled();
  });

  it("returns true when the value is stored", () => {
    expect(write("k", 1)).toBe(true);
  });
});

describe("writeOrThrow", () => {
  it("throws when the value cannot be stored", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("quota");
    });
    expect(() => writeOrThrow("k", 1)).toThrow(/yadda/i);
  });

  it("stores the value when localStorage works", () => {
    writeOrThrow("k", { a: 1 });
    expect(localStorage.getItem("k")).toBe('{"a":1}');
  });
});

describe("remove", () => {
  it("deletes the key", () => {
    localStorage.setItem("k", "1");
    remove("k");
    expect(localStorage.getItem("k")).toBeNull();
  });

  it("swallows localStorage errors", () => {
    vi.spyOn(Storage.prototype, "removeItem").mockImplementation(() => {
      throw new Error("denied");
    });
    expect(() => remove("k")).not.toThrow();
  });
});

describe("genId", () => {
  it("prefixes the id and defaults the prefix to 'id'", () => {
    expect(genId("lst")).toMatch(/^lst_\d+_[a-z0-9]+$/);
    expect(genId()).toMatch(/^id_/);
  });

  it("generates distinct ids", () => {
    const ids = new Set(Array.from({ length: 50 }, () => genId()));
    expect(ids.size).toBe(50);
  });
});

describe("mergeDeleted", () => {
  it("drops items whose id is in the deleted set", () => {
    const items = [{ id: "a" }, { id: "b" }, { id: "c" }];
    expect(mergeDeleted(items, new Set(["b"]))).toEqual([
      { id: "a" },
      { id: "c" },
    ]);
  });

  it("returns non-array input untouched", () => {
    expect(mergeDeleted(null, new Set())).toBeNull();
    expect(mergeDeleted(undefined, new Set())).toBeUndefined();
  });
});

describe("deleted ids", () => {
  it("starts out empty", () => {
    expect(getDeletedSet().size).toBe(0);
  });

  it("persists added ids and de-duplicates them", () => {
    addDeleted("a");
    addDeleted("b");
    addDeleted("a");
    expect(Array.from(getDeletedSet())).toEqual(["a", "b"]);
    expect(read(STORAGE_KEYS.deletedItems)).toEqual(["a", "b"]);
  });
});
