import { FiAlertCircle } from "react-icons/fi";

export default function ErrorAlert({ message }) {
  if (!message) return null;
  return (
    <div className="mb-4 flex items-center gap-2 bg-red-50 text-red-700 px-3 py-2 rounded-lg text-sm">
      <FiAlertCircle /> {message}
    </div>
  );
}
