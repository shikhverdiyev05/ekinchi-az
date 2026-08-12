import { listingTypeLabel } from "../utils/constants";

export default function TypeBadge({ type, className = "" }) {
  const isRent = type === "rent" || type === "icare";
  return (
    <span
      className={`badge ${
        isRent ? "bg-blue-100 text-blue-700" : "bg-brand-100 text-brand-700"
      } ${className}`}
    >
      {listingTypeLabel(type)}
    </span>
  );
}
