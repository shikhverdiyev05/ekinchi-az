import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import API from "../api";
import ListingCard from "../components/ListingCard";
import Spinner from "../components/Spinner";
import EmptyState from "../components/EmptyState";
import { CATEGORIES } from "../utils/constants";
import { FiSearch, FiFilter, FiX, FiGrid } from "react-icons/fi";

export default function Listings() {
  const [params, setParams] = useSearchParams();
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState(params.get("q") || "");
  const [type, setType] = useState(params.get("type") || "");
  const [category, setCategory] = useState(params.get("category") || "");
  const [showFilters, setShowFilters] = useState(false);

  const fetchListings = async () => {
    setLoading(true);
    try {
      const res = await API.listings.list({ q, type, category });
      setListings(res.listings || []);
    } catch (e) {
      setListings([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const t = setTimeout(fetchListings, 250);
    return () => clearTimeout(t);
  }, [q, type, category]);

  useEffect(() => {
    const next = {};
    if (q) next.q = q;
    if (type) next.type = type;
    if (category) next.category = category;
    setParams(next, { replace: true });
  }, [q, type, category, setParams]);

  const reset = () => {
    setQ("");
    setType("");
    setCategory("");
  };

  return (
    <div>
      <div className="flex items-center justify-between flex-wrap gap-3 mb-5">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Elanlar</h1>
        <button
          onClick={() => setShowFilters((s) => !s)}
          className="btn-outline text-sm md:hidden"
        >
          <FiFilter /> Filterlər
        </button>
      </div>

      <div className="bg-white rounded-xl p-3 sm:p-4 shadow-sm border border-gray-100 mb-5 space-y-3 sticky top-16 z-20">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <FiSearch className="absolute left-3 top-3 text-gray-400" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Elan adı ilə axtar..."
              className="input pl-10"
            />
          </div>
          {(q || type || category) && (
            <button onClick={reset} className="btn-ghost" title="Təmizlə">
              <FiX />
            </button>
          )}
        </div>
        <div
          className={`grid md:grid-cols-2 gap-3 ${
            showFilters ? "grid" : "hidden md:grid"
          }`}
        >
          <select
            value={type}
            onChange={(e) => setType(e.target.value)}
            className="input"
          >
            <option value="">Bütün tiplər</option>
            <option value="sale">Satış</option>
            <option value="rent">İcarə</option>
          </select>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="input"
          >
            <option value="">Bütün kategoriyalar</option>
            {CATEGORIES.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <Spinner />
      ) : listings.length === 0 ? (
        <EmptyState
          title="Elan tapılmadı"
          message="Axtarış kriteriyalarını dəyişdirin və ya yeni elan yerləşdirin."
        />
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
          {listings.map((l) => (
            <ListingCard key={l.id} listing={l} />
          ))}
        </div>
      )}
    </div>
  );
}
