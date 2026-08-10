import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import API from "../api";
import { CATEGORIES } from "../utils/constants";
import ListingCard from "../components/ListingCard";
import Spinner from "../components/Spinner";
import EmptyState from "../components/EmptyState";
import {
  FiSearch,
  FiArrowRight,
  FiGrid,
  FiUsers,
  FiMessageCircle,
  FiPlus,
  FiTag,
} from "react-icons/fi";

export default function Home() {
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    API.listings
      .list()
      .then((res) => setListings((res.listings || []).slice(0, 8)))
      .catch(() => setListings([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-8 sm:space-y-10">
      {/* Hero */}
      <section className="rounded-xl sm:rounded-2xl bg-gradient-to-br from-brand-600 via-brand-700 to-brand-800 text-white p-6 sm:p-10 lg:p-12 relative overflow-hidden">
        <div className="relative z-10 max-w-3xl">
          <h1 className="text-2xl sm:text-4xl lg:text-5xl font-bold leading-tight mb-3">
            Aqrar bazarın online mərkəzi
          </h1>
          <p className="text-brand-100 text-base sm:text-lg mb-6 max-w-2xl">
            Məhsulların satışı, texnikaların icarəsi, tarla və bağ sahələri,
            gübrələr, dərmanlar və daha çox - hamısı bir platformada.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 max-w-xl">
            <Link to="/listings" className="btn-primary bg-white text-brand-700 hover:bg-brand-50 flex-1 justify-center">
              <FiSearch /> Elanlara bax
            </Link>
            <Link to="/listings/new" className="btn bg-brand-100 text-brand-700 hover:bg-brand-200 flex-1 justify-center">
              <FiPlus /> Elan yerləşdir
            </Link>
          </div>
        </div>
        <FiGrid className="absolute right-4 bottom-0 opacity-10 hidden sm:block" size={200} />
      </section>

      {/* Categories */}
      <section>
        <div className="flex items-center justify-between mb-4 sm:mb-5">
          <h2 className="text-lg sm:text-xl font-bold text-gray-900">Kategoriyalar</h2>
          <Link
            to="/listings"
            className="text-sm text-brand-700 hover:underline flex items-center gap-1"
          >
            Hamısı <FiArrowRight />
          </Link>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2 sm:gap-3">
          {CATEGORIES.map((cat) => {
            const Icon = cat.icon;
            return (
              <Link
                key={cat.id}
                to={`/listings?category=${cat.id}`}
                className="card p-3 sm:p-4 flex items-center gap-2 sm:flex-col sm:items-center text-left sm:text-center hover:border-brand-300 hover:bg-brand-50 group"
              >
                <div className="w-9 h-9 sm:w-12 sm:h-12 rounded-lg bg-brand-100 text-brand-700 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                  {Icon && <Icon size={20} />}
                </div>
                <span className="text-xs sm:text-sm font-medium text-gray-700 leading-tight">
                  {cat.name}
                </span>
              </Link>
            );
          })}
        </div>
      </section>

      {/* Features */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4">
        <div className="card p-4 sm:p-5">
          <div className="w-10 h-10 rounded-lg bg-brand-100 text-brand-700 flex items-center justify-center mb-3">
            <FiTag size={20} />
          </div>
          <h3 className="font-semibold text-gray-900 mb-1">Satış ve İcarə</h3>
          <p className="text-sm text-gray-500">
            Məhsulları səbətə atın, icarə üçün sifariş yaradın.
          </p>
        </div>
        <div className="card p-4 sm:p-5">
          <div className="w-10 h-10 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center mb-3">
            <FiUsers size={20} />
          </div>
          <h3 className="font-semibold text-gray-900 mb-1">Fermer cəmiyyəti</h3>
          <p className="text-sm text-gray-500">
            Postlar paylaşın, problemləri müzakirə edin, like və şərh verin.
          </p>
        </div>
        <div className="card p-4 sm:p-5">
          <div className="w-10 h-10 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center mb-3">
            <FiMessageCircle size={20} />
          </div>
          <h3 className="font-semibold text-gray-900 mb-1">Şəxsi profil</h3>
          <p className="text-sm text-gray-500">
            Elanlarınızı, postlarınızı və sifarişlərinizi idarə edin.
          </p>
        </div>
      </section>

      {/* Latest listings */}
      <section>
        <div className="flex items-center justify-between mb-4 sm:mb-5">
          <h2 className="text-lg sm:text-xl font-bold text-gray-900">Son elanlar</h2>
          <Link to="/listings" className="text-sm text-brand-700 hover:underline flex items-center gap-1">
            Hamısına bax <FiArrowRight />
          </Link>
        </div>
        {loading ? (
          <Spinner />
        ) : listings.length === 0 ? (
          <EmptyState
            title="Elan tapılmadı"
            message="Hələ elan yoxdur. İlk elanı siz yerləşdirin!"
            action={
              <Link to="/listings/new" className="btn-primary">
                Elan yerləşdir
              </Link>
            }
          />
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
            {listings.map((l) => (
              <ListingCard key={l.id} listing={l} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
