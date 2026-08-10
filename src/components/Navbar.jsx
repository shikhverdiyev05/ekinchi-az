import { Link, NavLink, useNavigate } from "react-router-dom";
import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import {
  FiHome,
  FiList,
  FiMessageSquare,
  FiShoppingCart,
  FiUser,
  FiLogOut,
  FiPlus,
  FiMenu,
  FiX,
} from "react-icons/fi";

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const linkClass = ({ isActive }) =>
    `px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
      isActive ? "bg-brand-100 text-brand-700" : "text-gray-700 hover:bg-gray-100"
    }`;

  const handleLogout = () => {
    logout();
    setOpen(false);
    navigate("/");
  };

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-gray-200">
      <nav className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 flex items-center justify-between h-14 sm:h-16">
        <div className="flex items-center gap-2 shrink-0">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center text-white font-bold text-sm sm:text-base">
              A
            </div>
            <span className="font-bold text-base sm:text-lg text-gray-900">
              AqrarBazar
            </span>
          </Link>
        </div>

        <div className="hidden md:flex items-center gap-1">
          <NavLink to="/" className={linkClass} end>
            <FiHome className="inline mr-1" /> Ana
          </NavLink>
          <NavLink to="/listings" className={linkClass}>
            <FiList className="inline mr-1" /> Elanlar
          </NavLink>
          <NavLink to="/social" className={linkClass}>
            <FiMessageSquare className="inline mr-1" /> Sosial
          </NavLink>
          <NavLink to="/cart" className={linkClass}>
            <FiShoppingCart className="inline mr-1" /> Səbət
          </NavLink>
        </div>

        <div className="flex items-center gap-1 sm:gap-2">
          {user ? (
            <>
              <Link
                to="/listings/new"
                className="hidden sm:inline-flex btn-primary text-xs sm:text-sm py-1.5 px-3"
              >
                <FiPlus size={14} /> <span className="hidden md:inline">Elan yerləşdir</span>
              </Link>
              <div className="hidden md:flex items-center gap-2">
                <Link
                  to="/profile"
                  className="flex items-center gap-2 px-2 py-1 rounded-lg hover:bg-gray-100"
                >
                  <div className="w-8 h-8 rounded-full bg-brand-600 text-white flex items-center justify-center font-semibold text-sm overflow-hidden">
                    {user.avatar ? (
                      <img src={user.avatar} alt="" className="w-full h-full object-cover" />
                    ) : (
                      user.fullName?.charAt(0).toUpperCase()
                    )}
                  </div>
                  <span className="text-sm font-medium text-gray-700 max-w-[100px] truncate">
                    {user.fullName?.split(" ")[0]}
                  </span>
                </Link>
                <button
                  onClick={handleLogout}
                  className="btn-ghost py-2 text-gray-600"
                  title="Çıxış"
                >
                  <FiLogOut />
                </button>
              </div>
            </>
          ) : (
            <div className="hidden md:flex items-center gap-2">
              <Link to="/login" className="btn-ghost text-sm">Giriş</Link>
              <Link to="/register" className="btn-primary text-sm">Qeydiyyat</Link>
            </div>
          )}

          <button
            className="md:hidden btn-ghost px-2"
            onClick={() => setOpen((s) => !s)}
            aria-label="Menyu"
          >
            {open ? <FiX size={22} /> : <FiMenu size={22} />}
          </button>
        </div>
      </nav>

      {open && (
        <div className="md:hidden border-t border-gray-200 bg-white px-3 py-3 space-y-1">
          <NavLink to="/" className={linkClass} end onClick={() => setOpen(false)}>
            <FiHome className="inline mr-2" /> Ana
          </NavLink>
          <NavLink to="/listings" className={linkClass} onClick={() => setOpen(false)}>
            <FiList className="inline mr-2" /> Elanlar
          </NavLink>
          <NavLink to="/social" className={linkClass} onClick={() => setOpen(false)}>
            <FiMessageSquare className="inline mr-2" /> Sosial
          </NavLink>
          <NavLink to="/cart" className={linkClass} onClick={() => setOpen(false)}>
            <FiShoppingCart className="inline mr-2" /> Səbət
          </NavLink>
          {user ? (
            <>
              <NavLink to="/profile" className={linkClass} onClick={() => setOpen(false)}>
                <FiUser className="inline mr-2" /> Profilim
              </NavLink>
              <NavLink to="/listings/new" className={linkClass} onClick={() => setOpen(false)}>
                <FiPlus className="inline mr-2" /> Elan yerləşdir
              </NavLink>
              <button onClick={handleLogout} className="btn-ghost w-full justify-start">
                <FiLogOut className="inline mr-2" /> Çıxış
              </button>
            </>
          ) : (
            <div className="flex gap-2 pt-2">
              <Link to="/login" className="btn-outline flex-1 text-sm text-center">
                Giriş
              </Link>
              <Link to="/register" className="btn-primary flex-1 text-sm text-center">
                Qeydiyyat
              </Link>
            </div>
          )}
        </div>
      )}
    </header>
  );
}
