export default function Toast({ message, type = "success", onClose }) {
  if (!message) return null;
  const colors = {
    success: "bg-brand-600",
    error: "bg-red-600",
    info: "bg-blue-600",
  };
  return (
    <div className="fixed top-20 right-4 z-50 animate-fade-in">
      <div
        className={`${colors[type]} text-white px-4 py-3 rounded-lg shadow-lg flex items-center justify-between gap-4 max-w-sm`}
      >
        <span className="text-sm">{message}</span>
        {onClose && (
          <button onClick={onClose} className="text-white/80 hover:text-white">
            ×
          </button>
        )}
      </div>
    </div>
  );
}
