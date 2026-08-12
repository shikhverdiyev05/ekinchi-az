import { Link } from "react-router-dom";
import { FiMapPin, FiTag } from "react-icons/fi";
import { categoryName, timeAgo } from "../utils/constants";
import Avatar from "./Avatar";
import ListingPrice from "./ListingPrice";
import TypeBadge from "./TypeBadge";

export default function ListingCard({ listing }) {
  if (!listing) return null;
  const ownerName = listing.owner?.fullName || "İstifadeci";
  return (
    <Link to={`/listings/${listing.id}`} className="card overflow-hidden group block">
      <div className="aspect-[4/3] bg-gradient-to-br from-brand-100 to-brand-50 relative flex items-center justify-center overflow-hidden">
        {listing.images?.[0] ? (
          <img
            src={listing.images[0]}
            alt={listing.title}
            loading="lazy"
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="text-6xl text-brand-300">🌾</div>
        )}
        <TypeBadge type={listing.type} className="absolute top-2 left-2" />
      </div>
      <div className="p-3 sm:p-4">
        <h3 className="font-semibold text-gray-900 group-hover:text-brand-700 transition-colors line-clamp-1 text-sm sm:text-base">
          {listing.title}
        </h3>
        <p className="text-xs sm:text-sm text-gray-500 line-clamp-2 mt-1 min-h-[2.5rem]">
          {listing.description}
        </p>
        <div className="flex items-center justify-between mt-3">
          <ListingPrice
            listing={listing}
            className="text-brand-700 font-bold text-sm sm:text-base"
          />
          <div className="text-xs text-gray-500 flex items-center gap-1">
            <FiTag /> {categoryName(listing.category)}
          </div>
        </div>
        <div className="flex items-center justify-between mt-2 text-[11px] sm:text-xs text-gray-400">
          <span className="flex items-center gap-1 truncate">
            <FiMapPin /> {listing.region || "—"}
          </span>
          <span className="shrink-0">{timeAgo(listing.createdAt)}</span>
        </div>
        <div className="mt-3 pt-3 border-t border-gray-100 text-xs text-gray-500 flex items-center gap-2">
          <Avatar name={ownerName} className="w-6 h-6 text-[10px] font-bold" />
          <span className="truncate">{ownerName}</span>
        </div>
      </div>
    </Link>
  );
}
