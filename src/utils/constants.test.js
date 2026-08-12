import { describe, it, expect, vi, afterEach } from "vitest";
import {
  CATEGORIES,
  REGIONS,
  formatDate,
  timeAgo,
  formatPrice,
  listingTypeLabel,
  categoryById,
  categoryName,
} from "./constants";

afterEach(() => {
  vi.useRealTimers();
});

describe("CATEGORIES / REGIONS", () => {
  it("exposes unique category ids with an icon and appliesTo", () => {
    const ids = CATEGORIES.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const c of CATEGORIES) {
      expect(c.icon).toBeTruthy();
      expect(c.appliesTo.length).toBeGreaterThan(0);
      expect(c.appliesTo.every((t) => ["sale", "rent"].includes(t))).toBe(true);
    }
  });

  it("exposes unique subcategory ids", () => {
    const subIds = CATEGORIES.flatMap((c) =>
      (c.subcategories || []).map((s) => s.id)
    );
    expect(new Set(subIds).size).toBe(subIds.length);
  });

  it("exposes unique non-empty regions", () => {
    expect(REGIONS.length).toBeGreaterThan(0);
    expect(new Set(REGIONS).size).toBe(REGIONS.length);
    expect(REGIONS.every((r) => typeof r === "string" && r.length > 0)).toBe(
      true
    );
  });
});

describe("formatDate", () => {
  it("returns an empty string for missing or invalid dates", () => {
    expect(formatDate(null)).toBe("");
    expect(formatDate("")).toBe("");
    expect(formatDate("not-a-date")).toBe("");
  });

  it("formats a valid ISO date", () => {
    const out = formatDate("2024-03-05T10:20:00.000Z");
    expect(out).not.toBe("");
    expect(out).toContain("2024");
  });
});

describe("timeAgo", () => {
  const now = new Date("2024-03-10T12:00:00.000Z");
  const ago = (ms) => new Date(now.getTime() - ms).toISOString();

  it("returns an empty string when no date is given", () => {
    expect(timeAgo(null)).toBe("");
  });

  it("bucketizes by minutes, hours and days", () => {
    vi.useFakeTimers();
    vi.setSystemTime(now);
    expect(timeAgo(ago(30 * 1000))).toBe("yeni");
    expect(timeAgo(ago(5 * 60 * 1000))).toBe("5 dəq iqimli");
    expect(timeAgo(ago(3 * 3600 * 1000))).toBe("3 saat iqimli");
    expect(timeAgo(ago(4 * 86400 * 1000))).toBe("4 gün iqimli");
  });

  it("falls back to a formatted date past 30 days", () => {
    vi.useFakeTimers();
    vi.setSystemTime(now);
    const old = ago(60 * 86400 * 1000);
    expect(timeAgo(old)).toBe(formatDate(old));
  });
});

describe("formatPrice", () => {
  it("returns an empty string for null or undefined", () => {
    expect(formatPrice(null)).toBe("");
    expect(formatPrice(undefined)).toBe("");
  });

  it("appends the default currency and honours an override", () => {
    expect(formatPrice(1500)).toMatch(/AZN$/);
    expect(formatPrice(1500, "USD")).toMatch(/USD$/);
  });

  it("formats zero and numeric strings", () => {
    expect(formatPrice(0)).toBe("0 AZN");
    expect(formatPrice("250")).toBe("250 AZN");
  });
});

describe("listingTypeLabel", () => {
  it("labels rentals", () => {
    expect(listingTypeLabel("rent")).toBe("İcarə");
    expect(listingTypeLabel("icare")).toBe("İcarə");
  });

  it("labels everything else as a sale", () => {
    expect(listingTypeLabel("sale")).toBe("Satış");
    expect(listingTypeLabel(undefined)).toBe("Satış");
  });
});

describe("categoryById", () => {
  it("finds a top-level category", () => {
    expect(categoryById("cat_texnika")).toBe(CATEGORIES[0]);
  });

  it("returns undefined for unknown ids and for subcategory ids", () => {
    expect(categoryById("nope")).toBeUndefined();
    expect(categoryById("sub_gubreler")).toBeUndefined();
  });
});

describe("categoryName", () => {
  it("resolves top-level and subcategory names", () => {
    expect(categoryName("cat_bitkiler")).toBe("Bitkilər");
    expect(categoryName("sub_gubreler")).toBe("Gübrələr");
  });

  it("echoes the id back when it is unknown", () => {
    expect(categoryName("cat_unknown")).toBe("cat_unknown");
  });
});
