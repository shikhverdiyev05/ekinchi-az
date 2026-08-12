import { safeImageUrl } from "../utils/security";

export default function Avatar({
  name,
  src,
  className = "w-10 h-10 font-bold",
  bgClassName = "bg-brand-600",
  fallback = "?",
}) {
  const image = safeImageUrl(src);
  return (
    <div
      className={`rounded-full ${bgClassName} text-white flex items-center justify-center overflow-hidden shrink-0 ${className}`}
    >
      {image ? (
        <img src={image} alt="" className="w-full h-full object-cover" />
      ) : (
        name?.charAt(0).toUpperCase() || fallback
      )}
    </div>
  );
}
