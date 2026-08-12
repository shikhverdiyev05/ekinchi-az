import { useEffect, useState } from "react";
import {
  useNavigate,
  useParams,
  Link,
} from "react-router-dom";
import API from "../api";
import { useAuth } from "../context/AuthContext";
import { categoryName, formatDate, listingOwnerId } from "../utils/constants";
import { safeImageUrls } from "../utils/security";
import Spinner from "../components/Spinner";
import Avatar from "../components/Avatar";
import BackButton from "../components/BackButton";
import ListingPrice from "../components/ListingPrice";
import TypeBadge from "../components/TypeBadge";
import { useToast } from "../hooks/useToast";
import Toast from "../components/Toast";
import {
  FiShoppingCart,
  FiPhone,
  FiMapPin,
  FiCalendar,
  FiEdit,
  FiTrash2,
  FiAlertCircle,
  FiCheck,
} from "react-icons/fi";

export default function ListingDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast, show } = useToast();
  const [listing, setListing] = useState(null);
  const [owner, setOwner] = useState(null);
  const [loading, setLoading] = useState(true);
  const [rental, setRental] = useState({ startDate: "", endDate: "", notes: "" });
  const [submitting, setSubmitting] = useState(false);
  const [activeImg, setActiveImg] = useState(0);
  const images = safeImageUrls(listing?.images);

  useEffect(() => {
    setLoading(true);
    setActiveImg(0);
    API.listings
      .get(id)
      .then((res) => {
        setListing(res.listing);
        setOwner(res.owner);
      })
      .catch(() => setListing(null))
      .finally(() => setLoading(false));
  }, [id]);

  const isOwner = user?.id === listingOwnerId(listing);
  const isSale = listing?.type === "sale";

  const addToCart = async () => {
    if (!user) return navigate("/login");
    try {
      await API.basket.add(listing.id);
      show("Səbətə əlavə edildi", "success");
    } catch (e) {
      show("Xəta baş verdi", "error");
    }
  };

  const submitRental = async (e) => {
    e.preventDefault();
    if (!user) return navigate("/login");
    if (!rental.startDate || !rental.endDate) {
      show("Tarixləri doldurun", "error");
      return;
    }
    setSubmitting(true);
    try {
      await API.orders.createRental({
        listingId: listing.id,
        ...rental,
      });
      show("İcarə sifarişi yaradıldı!", "success");
      setRental({ startDate: "", endDate: "", notes: "" });
      navigate("/profile?tab=orders");
    } catch (e) {
      show("Xəta baş verdi", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const del = async () => {
    if (!confirm("Bu elanı silmək istədiyinizə əminsiz?")) return;
    try {
      await API.listings.remove(listing.id);
      show("Elan silindi", "success");
      navigate("/listings");
    } catch (e) {
      show("Silinmədi", "error");
    }
  };

  if (loading) return <Spinner />;
  if (!listing)
    return (
      <div className="text-center py-16">
        <h2 className="text-2xl font-bold text-gray-800">Elan tapılmadı</h2>
        <Link to="/listings" className="btn-primary mt-4 inline-flex">
          Geri qayıt
        </Link>
      </div>
    );

  return (
    <div>
      <BackButton />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        <div className="lg:col-span-2">
          <div className="card overflow-hidden">
            <div className="aspect-video bg-gradient-to-br from-brand-100 to-brand-50 flex items-center justify-center">
              {images[activeImg] ? (
                <img
                  src={images[activeImg]}
                  alt={listing.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="text-8xl text-brand-200">🌾</div>
              )}
            </div>
            {images.length > 1 && (
              <div className="flex gap-2 p-3 overflow-x-auto">
                {images.map((img, i) => (
                  <button
                    key={i}
                    onClick={() => setActiveImg(i)}
                    className={`w-16 h-16 rounded-lg overflow-hidden shrink-0 border-2 ${
                      activeImg === i ? "border-brand-600" : "border-transparent"
                    }`}
                  >
                    <img src={img} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
            <div className="p-4 sm:p-6">
              <div className="flex items-start justify-between gap-3 mb-3 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
                  {listing.title}
                </h1>
                <TypeBadge type={listing.type} />
              </div>

              <div className="flex items-center gap-3 flex-wrap text-sm text-gray-500 mb-4">
                <span className="badge bg-gray-100 text-gray-700">
                  {categoryName(listing.category)}
                </span>
                {listing.region && (
                  <span className="flex items-center gap-1">
                    <FiMapPin /> {listing.region}
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <FiCalendar /> {formatDate(listing.createdAt)}
                </span>
              </div>

              <h3 className="font-semibold text-gray-800 mb-2">Təsvir</h3>
              <p className="text-gray-600 whitespace-pre-wrap mb-6">
                {listing.description || "Təsvir yoxdur."}
              </p>
            </div>
          </div>

          {isOwner && (
            <div className="card p-4 mt-4 flex gap-2">
              <Link
                to={`/listings/${listing.id}/edit`}
                className="btn-outline flex-1"
              >
                <FiEdit /> Redakte
              </Link>
              <button onClick={del} className="btn-danger flex-1">
                <FiTrash2 /> Sil
              </button>
            </div>
          )}
        </div>

        <div className="lg:col-span-1">
          <div className="card p-5 sm:p-6 sticky top-32">
            <ListingPrice
              listing={listing}
              className="text-2xl sm:text-3xl font-bold text-brand-700 mb-1"
              unitClassName="text-sm"
            />
            <div className="text-sm text-gray-500 mb-5">
              {isSale ? "Satış qiyməti" : "İcarə qiyməti"}
            </div>

            {isSale ? (
              <button
                onClick={addToCart}
                disabled={isOwner}
                className="btn-primary w-full mb-3"
              >
                <FiShoppingCart /> Səbətə at
              </button>
            ) : (
              <form onSubmit={submitRental} className="space-y-3">
                <div>
                  <label className="label">Başlanğıc tarix</label>
                  <input
                    type="date"
                    value={rental.startDate}
                    onChange={(e) =>
                      setRental({ ...rental, startDate: e.target.value })
                    }
                    className="input"
                    required
                  />
                </div>
                <div>
                  <label className="label">Bitmə tarixi</label>
                  <input
                    type="date"
                    value={rental.endDate}
                    onChange={(e) =>
                      setRental({ ...rental, endDate: e.target.value })
                    }
                    className="input"
                    required
                  />
                </div>
                <div>
                  <label className="label">Qeyd</label>
                  <textarea
                    value={rental.notes}
                    onChange={(e) =>
                      setRental({ ...rental, notes: e.target.value })
                    }
                    className="input min-h-[80px]"
                    placeholder="Əlaqədar qeydlər..."
                  />
                </div>
                <button
                  type="submit"
                  disabled={submitting || isOwner}
                  className="btn-primary w-full"
                >
                  <FiCheck /> {submitting ? "Sifariş edilir..." : "İcarə sifarişi et"}
                </button>
              </form>
            )}

            {isOwner && (
              <div className="mt-3 text-xs text-amber-600 bg-amber-50 rounded-lg px-3 py-2 flex items-center gap-1">
                <FiAlertCircle /> Bu sizin elanıntıdır
              </div>
            )}

            {owner && !isOwner && (
              <div className="mt-5 pt-5 border-t border-gray-100">
                <h3 className="font-semibold text-gray-800 mb-3">Elan sahibi</h3>
                <div className="flex items-center gap-3">
                  <Avatar
                    name={owner.fullName}
                    src={owner.avatar}
                    className="w-12 h-12 font-bold"
                  />
                  <div className="min-w-0">
                    <div className="font-medium text-gray-900 truncate">
                      {owner.fullName}
                    </div>
                    {owner.phone && (
                      <a
                        href={`tel:${encodeURIComponent(owner.phone)}`}
                        className="text-sm text-gray-500 hover:text-brand-700 flex items-center gap-1"
                      >
                        <FiPhone /> {owner.phone}
                      </a>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <Toast {...toast} onClose={() => {}} />
    </div>
  );
}
