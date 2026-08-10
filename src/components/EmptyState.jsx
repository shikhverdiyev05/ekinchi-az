import { FiInbox } from "react-icons/fi";

export default function EmptyState({ title = "Heç bir melumat yoxdur", message, action }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-gray-400">
      <FiInbox size={48} />
      <h3 className="mt-3 text-lg font-semibold text-gray-600">{title}</h3>
      {message && <p className="text-sm mt-1 max-w-md text-center">{message}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
