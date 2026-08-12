import { useNavigate } from "react-router-dom";
import { FiChevronLeft } from "react-icons/fi";

export default function BackButton({ label = "Geri" }) {
  const navigate = useNavigate();
  return (
    <button
      onClick={() => navigate(-1)}
      className="mb-4 text-sm text-gray-600 hover:text-brand-700 flex items-center gap-1"
    >
      <FiChevronLeft /> {label}
    </button>
  );
}
