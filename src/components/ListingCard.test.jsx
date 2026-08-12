import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import ListingCard from "./ListingCard";

const baseListing = {
  id: "l1",
  title: "Traktor",
  description: "güclü traktor",
  type: "sale",
  category: "cat_texnika",
  price: 1200,
  currency: "AZN",
  region: "Bakı",
  owner: { fullName: "Ali" },
};

function renderCard(listing) {
  return render(
    <MemoryRouter>
      <ListingCard listing={listing} />
    </MemoryRouter>
  );
}

describe("ListingCard", () => {
  it("renders nothing without a listing", () => {
    const { container } = renderCard(undefined);
    expect(container.innerHTML).toBe("");
  });

  it("links to the listing detail page and shows its core fields", () => {
    renderCard(baseListing);
    expect(screen.getByRole("link").getAttribute("href")).toBe("/listings/l1");
    expect(screen.getByText("Traktor")).toBeTruthy();
    expect(screen.getByText("güclü traktor")).toBeTruthy();
    expect(screen.getByText("Bakı")).toBeTruthy();
    expect(screen.getByText("Kənd təsərrüfatı texnikaları")).toBeTruthy();
    expect(screen.getByText("Satış")).toBeTruthy();
    expect(screen.getByText(/1.200 AZN/)).toBeTruthy();
  });

  it("shows the price unit for rentals, defaulting to a daily rate", () => {
    renderCard({ ...baseListing, type: "rent" });
    expect(screen.getByText("İcarə")).toBeTruthy();
    expect(screen.getByText("/gün")).toBeTruthy();
  });

  it("uses the configured price unit for rentals", () => {
    renderCard({ ...baseListing, type: "rent", priceUnit: "saat" });
    expect(screen.getByText("/saat")).toBeTruthy();
  });

  it("renders the first image when one is provided", () => {
    renderCard({ ...baseListing, images: ["a.png", "b.png"] });
    const img = screen.getByRole("img");
    expect(img.getAttribute("src")).toBe("a.png");
    expect(img.getAttribute("alt")).toBe("Traktor");
  });

  it("falls back to a placeholder owner, region and avatar initial", () => {
    renderCard({ ...baseListing, owner: undefined, region: "" });
    expect(screen.getByText("İstifadeci")).toBeTruthy();
    expect(screen.getByText("—")).toBeTruthy();
    expect(screen.getByText("İ")).toBeTruthy();
  });
});
