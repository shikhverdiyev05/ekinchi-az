import { Link } from "react-router-dom";
import { CATEGORIES } from "../utils/constants";
import { FiMapPin, FiPhone, FiMail } from "react-icons/fi";

export default function Footer() {
  return (
    <footer className="bg-gray-900 text-gray-300 mt-10 sm:mt-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-10 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-8">
        <div>
          <div className="flex items-center gap-2 mb-3">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center text-white font-bold">
              A
            </div>
            <span className="font-bold text-lg text-white">AqrarBazar</span>
          </div>
          <p className="text-sm text-gray-400">
            Aqrar məhsulların, texnikaların və tarla satışı/icarəsi üçün online bazar.
          </p>
        </div>

        <div>
          <h4 className="text-white font-semibold mb-3">Kategoriyalar</h4>
          <ul className="space-y-1 text-sm">
            {CATEGORIES.slice(0, 5).map((c) => (
              <li key={c.id}>
                <Link
                  to={`/listings?category=${c.id}`}
                  className="hover:text-brand-400 transition-colors"
                >
                  {c.name}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h4 className="text-white font-semibold mb-3">Platforma</h4>
          <ul className="space-y-1 text-sm">
            <li>
              <Link to="/listings" className="hover:text-brand-400">Elanlar</Link>
            </li>
            <li>
              <Link to="/social" className="hover:text-brand-400">Sosial</Link>
            </li>
            <li>
              <Link to="/listings/new" className="hover:text-brand-400">Elan yerləşdir</Link>
            </li>
            <li>
              <Link to="/profile" className="hover:text-brand-400">Profilim</Link>
            </li>
          </ul>
        </div>

        <div>
          <h4 className="text-white font-semibold mb-3">Əlaqə</h4>
          <ul className="space-y-2 text-sm text-gray-400">
            <li className="flex items-center gap-2">
              <FiMail /> info@aqro.az
            </li>
            <li className="flex items-center gap-2">
              <FiPhone /> +994 12 555 00 00
            </li>
            <li className="flex items-center gap-2">
              <FiMapPin /> Bakı, Azərbaycan
            </li>
          </ul>
        </div>
      </div>

      <div className="border-t border-gray-800 py-4 text-center text-xs text-gray-500">
        © {new Date().getFullYear()} AqrarBazar. Bütün hüquqlar qorunur.
      </div>
    </footer>
  );
}
