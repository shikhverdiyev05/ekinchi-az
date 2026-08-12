import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import API from "../api";
import { useRequireAuth } from "../hooks/useRequireAuth";
import { formatPrice } from "../utils/constants";
import { safeImageUrl } from "../utils/security";
import Spinner from "../components/Spinner";
import EmptyState from "../components/EmptyState";
import BackButton from "../components/BackButton";
import { useToast } from "../hooks/useToast";
import Toast from "../components/Toast";
import { FiTrash2, FiShoppingCart, FiCheck } from "react-icons/fi";

export default function Cart() {
  const { user } = useRequireAuth();
  const navigate = useNavigate();
  const { toast, show } = useToast();
  const [cart, setCart] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const fetch = () => {
    setLoading(true);
    API.basket
      .list()
      .then((res) => setCart(res.basket || []))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (user) fetch();
  }, [user]);

  const remove = async (listingId) => {
    try {
      await API.basket.remove(listingId);
      setCart((c) => c.filter((x) => x.listingId !== listingId));
      show("Səbətdən silindi", "success");
    } catch (e) {
      show("Silinmədi", "error");
    }
  };

  const checkout = async () => {
    setSubmitting(true);
    try {
      const valid = cart.filter((c) => c.listing);
      const items = valid.map((c) => ({
        listingId: c.listing.id,
        title: c.listing.title,
        price: c.listing.price,
        currency: c.listing.currency,
      }));
      const total = valid.reduce(
        (sum, c) => sum + (Number(c.listing.price) || 0),
        0
      );
      await API.orders.createSale({ items, total });
      show("Sifariş uğurla yaradıldı!", "success");
      setCart([]);
      navigate("/profile?tab=orders");
    } catch (e) {
      show("Sifariş yaranmadı", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const total = cart.reduce((sum, c) => sum + (Number(c.listing?.price) || 0), 0);

  if (loading) return <Spinner />;

  return (
    <div>
      <BackButton />

      <h1 className="text-xl sm:text-2xl font-bold text-gray-900 mb-6">Səbətim</h1>

      {cart.length === 0 ? (
        <EmptyState
          title="Səbət boşdur"
          message="Elanları səbətə əlavə edin və sifariş verin."
          action={
            <Link to="/listings" className="btn-primary">
              Elanlara bax
            </Link>
          }
        />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
          <div className="lg:col-span-2 space-y-3">
            {cart.map((item) => (
              <div key={item.listingId} className="card p-3 sm:p-4 flex items-center gap-3 sm:gap-4">
                <Link
                  to={`/listings/${item.listingId}`}
                  className="w-16 h-16 rounded-lg bg-brand-100 flex items-center justify-center text-2xl shrink-0 overflow-hidden"
                >
                  {safeImageUrl(item.listing?.images?.[0]) ? (
                    <img
                      src={safeImageUrl(item.listing.images[0])}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    "🌾"
                  )}
                </Link>
                <div className="flex-1 min-w-0">
                  <Link
                    to={`/listings/${item.listingId}`}
                    className="font-medium text-gray-900 hover:text-brand-700 truncate block"
                  >
                    {item.listing?.title || "Elan tapılmadı"}
                  </Link>
                  <div className="text-brand-700 font-bold text-sm sm:text-base">
                    {item.listing ? formatPrice(item.listing.price, item.listing.currency) : "—"}
                  </div>
                  <div className="text-[11px] text-gray-400 hidden sm:block">
                    {item.addedAt ? new Date(item.addedAt).toLocaleString("az-AZ") : ""}
                  </div>
                </div>
                <button
                  onClick={() => remove(item.listingId)}
                  className="text-gray-400 hover:text-red-600 p-2"
                >
                  <FiTrash2 />
                </button>
              </div>
            ))}
          </div>

          <div className="lg:col-span-1">
            <div className="card p-5 sm:p-6 sticky top-32">
              <h3 className="font-semibold text-gray-900 mb-4">Yekun</h3>
              <div className="flex justify-between text-sm text-gray-600 mb-2">
                <span>Məbləğ</span>
                <span>{formatPrice(total)}</span>
              </div>
              <div className="flex justify-between text-sm text-gray-600 mb-4">
                <span>Çatdırılma</span>
                <span className="text-brand-700">Pulsuz</span>
              </div>
              <div className="border-t border-gray-100 pt-3 mb-4 flex justify-between font-bold text-gray-900">
                <span>Cəmi</span>
                <span>{formatPrice(total)}</span>
              </div>
              <button
                onClick={checkout}
                disabled={submitting}
                className="btn-primary w-full"
              >
                {submitting ? (
                  "Sifariş edilir..."
                ) : (
                  <>
                    <FiCheck /> Sifarişi təsdiqlə
                  </>
                )}
              </button>
              <Link to="/listings" className="btn-ghost w-full mt-2">
                <FiShoppingCart /> Davam et
              </Link>
            </div>
          </div>
        </div>
      )}

      <Toast {...toast} onClose={() => {}} />
    </div>
  );
}
