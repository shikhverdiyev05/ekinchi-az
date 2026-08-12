import { Outlet } from "react-router-dom";
import { FiAlertCircle } from "react-icons/fi";
import Navbar from "./Navbar";
import Footer from "./Footer";
import { useAuth } from "../context/AuthContext";

export default function Layout() {
  const { error } = useAuth();
  return (
    <div className="min-h-screen flex flex-col bg-[#f8faf7]">
      <Navbar />
      {error && (
        <div className="bg-red-50 text-red-700 text-sm px-4 py-2 flex items-center justify-center gap-2">
          <FiAlertCircle /> {error}
        </div>
      )}
      <main className="flex-1 max-w-7xl mx-auto w-full px-3 sm:px-4 lg:px-6 py-4 sm:py-6">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}
