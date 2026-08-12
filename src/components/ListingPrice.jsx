import { formatPrice, listingPriceUnit } from "../utils/constants";

export default function ListingPrice({
  listing,
  className = "",
  unitClassName = "text-xs",
}) {
  return (
    <div className={className}>
      {formatPrice(listing.price, listing.currency)}
      {listing.type === "rent" && (
        <span className={`${unitClassName} text-gray-500 font-normal`}>
          /{listingPriceUnit(listing)}
        </span>
      )}
    </div>
  );
}
