import { FiAlertCircle, FiRefreshCw } from "react-icons/fi";
import { GENERIC_ERROR } from "../utils/errors";

export default function ErrorState({
  title = "Məlumat yüklənmədi",
  message = GENERIC_ERROR,
  onRetry,
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <FiAlertCircle size={44} className="text-red-500" />
      <h3 className="mt-3 text-lg font-semibold text-gray-700">{title}</h3>
      <p className="text-sm text-gray-500 mt-1 max-w-md">{message}</p>
      {onRetry && (
        <button onClick={onRetry} className="btn-outline mt-4 text-sm">
          <FiRefreshCw /> Yenidən cəhd et
        </button>
      )}
    </div>
  );
}
