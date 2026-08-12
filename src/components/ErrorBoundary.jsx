import { Component } from "react";
import { FiAlertCircle } from "react-icons/fi";
import { logError } from "../utils/errors";

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    logError(`React render xetasi (${info?.componentStack?.trim() || "?"})`, error);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="max-w-md mx-auto mt-16 text-center px-4">
        <FiAlertCircle className="mx-auto text-red-500" size={48} />
        <h1 className="text-xl font-bold text-gray-900 mt-3">
          Gözlənilməz xəta baş verdi
        </h1>
        <p className="text-sm text-gray-500 mt-2">
          {this.state.error.message || "Səhifə yüklənə bilmədi."}
        </p>
        <button
          onClick={() => window.location.reload()}
          className="btn-primary mt-5"
        >
          Səhifəni yenilə
        </button>
      </div>
    );
  }
}
