import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import API from "../api";
import { useRequireAuth } from "../hooks/useRequireAuth";
import Avatar from "../components/Avatar";
import IconField from "../components/IconField";
import TypeBadge from "../components/TypeBadge";
import ListingCard from "../components/ListingCard";
import PostCard from "../components/PostCard";
import Spinner from "../components/Spinner";
import EmptyState from "../components/EmptyState";
import { useToast } from "../hooks/useToast";
import Toast from "../components/Toast";
import { formatPrice, formatDate } from "../utils/constants";
import { LIMITS } from "../utils/security";
import {
  FiList,
  FiMessageSquare,
  FiShoppingBag,
  FiBookmark,
  FiUser,
  FiEdit,
  FiSave,
  FiPlus,
  FiAlertCircle,
  FiTrash2,
  FiMapPin,
  FiPhone,
  FiMail,
  FiDollarSign,
} from "react-icons/fi";

const TABS = [
  { key: "listings", label: "Elanlarım", icon: FiList },
  { key: "posts", label: "Postlarım", icon: FiMessageSquare },
  { key: "orders", label: "Sifarişlərim", icon: FiShoppingBag },
  { key: "saved", label: "Saxlanılanlar", icon: FiBookmark },
  { key: "edit", label: "Məlumat", icon: FiUser },
];

export default function Profile() {
  const { user, updateProfile } = useRequireAuth();
  const [params, setParams] = useSearchParams();
  const { toast, show } = useToast();
  const [tab, setTab] = useState(params.get("tab") || "listings");
  const [listings, setListings] = useState([]);
  const [posts, setPosts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [saved, setSaved] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({
    fullName: user?.fullName || "",
    phone: user?.phone || "",
    region: user?.region || "",
    bio: user?.bio || "",
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setForm({
      fullName: user?.fullName || "",
      phone: user?.phone || "",
      region: user?.region || "",
      bio: user?.bio || "",
    });
  }, [user]);

  useEffect(() => {
    setParams({ tab }, { replace: true });
    setLoading(true);
    let p;
    if (tab === "listings") p = API.listings.list({ userId: user?.id });
    else if (tab === "orders") p = API.orders.list();
    else if (tab === "saved") p = API.posts.saved();
    else p = Promise.resolve({});

    p.then((res) => {
      if (tab === "listings") setListings(res.listings || []);
      else if (tab === "orders") setOrders(res.orders || []);
      else if (tab === "saved") setSaved(res.posts || []);
    }).finally(() => setLoading(false));

    if (tab === "posts") {
      API.posts
        .list()
        .then((res) =>
          setPosts((res.posts || []).filter((p) => p.author?.id === user?.id))
        )
        .finally(() => setLoading(false));
    }
  }, [tab, user]);

  const saveProfile = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await updateProfile(form);
      show("Məlumat yenilendi", "success");
    } catch (err) {
      show("Yenilenmədi", "error");
    } finally {
      setSaving(false);
    }
  };

  const deleteListing = async (id) => {
    if (!confirm("Silinsin?")) return;
    try {
      await API.listings.remove(id);
      setListings((l) => l.filter((x) => x.id !== id));
      show("Elan silindi", "success");
    } catch (e) {
      show("Silinmədi", "error");
    }
  };

  const deletePost = (id) => {
    setPosts((p) => p.filter((x) => x.id !== id));
  };

  if (!user) return null;

  return (
    <div>
      {/* Profile Header */}
      <div className="card p-4 sm:p-6 mb-6 bg-gradient-to-br from-brand-50 to-white">
        <div className="flex items-center gap-4">
          <Avatar
            name={user.fullName}
            src={user.avatar}
            bgClassName="bg-gradient-to-br from-brand-500 to-brand-700"
            className="w-16 h-16 sm:w-20 sm:h-20 text-2xl sm:text-3xl font-bold"
          />
          <div className="flex-1 min-w-0">
            <h1 className="text-lg sm:text-2xl font-bold text-gray-900 truncate">
              {user.fullName}
            </h1>
            <p className="text-gray-500 text-sm truncate">{user.email}</p>
            <div className="flex items-center gap-3 mt-1 text-xs sm:text-sm text-gray-500 flex-wrap">
              {user.region && (
                <span className="flex items-center gap-1">
                  <FiMapPin /> {user.region}
                </span>
              )}
              {user.phone && (
                <span className="flex items-center gap-1">
                  <FiPhone /> {user.phone}
                </span>
              )}
              {user.balance != null && (
                <span className="flex items-center gap-1 text-brand-700 font-medium">
                  <FiDollarSign /> {user.balance} AZN
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6 flex flex-wrap gap-1 overflow-x-auto">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-3 sm:px-4 py-2.5 text-sm font-medium border-b-2 -mb-px flex items-center gap-1.5 transition-colors whitespace-nowrap ${
              tab === t.key
                ? "border-brand-600 text-brand-700"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            <t.icon size={16} /> {t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      {loading ? (
        <Spinner />
      ) : tab === "listings" ? (
        listings.length === 0 ? (
          <EmptyState
            title="Elanınız yoxdur"
            action={
              <Link to="/listings/new" className="btn-primary">
                <FiPlus /> Elan yerləşdir
              </Link>
            }
          />
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
            {listings.map((l) => (
              <div key={l.id} className="relative group">
                <ListingCard listing={l} />
                <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Link
                    to={`/listings/${l.id}/edit`}
                    className="bg-white shadow-md rounded-lg p-2 text-gray-600 hover:text-brand-700"
                  >
                    <FiEdit size={14} />
                  </Link>
                  <button
                    onClick={() => deleteListing(l.id)}
                    className="bg-white shadow-md rounded-lg p-2 text-gray-600 hover:text-red-600"
                  >
                    <FiTrash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )
      ) : tab === "posts" ? (
        posts.length === 0 ? (
          <EmptyState
            title="Postlarınız yoxdur"
            action={
              <Link to="/social" className="btn-primary">
                Post paylaş
              </Link>
            }
          />
        ) : (
          posts.map((p) => <PostCard key={p.id} post={p} onDelete={deletePost} />)
        )
      ) : tab === "orders" ? (
        orders.length === 0 ? (
          <EmptyState
            title="Sifariş yoxdur"
            message="Sifarişləriniz burada görünəcək"
            action={
              <Link to="/listings" className="btn-primary">
                Elanlara bax
              </Link>
            }
          />
        ) : (
          <div className="space-y-3">
            {orders.map((o) => (
              <div key={o.id} className="card p-3 sm:p-4">
                <div className="flex items-start justify-between gap-3 mb-2 flex-wrap">
                  <div className="flex gap-2 flex-wrap">
                    <TypeBadge type={o.type} />
                    <span className="badge bg-gray-100 text-gray-700">
                      {o.status}
                    </span>
                  </div>
                  <span className="text-xs text-gray-400">
                    {formatDate(o.createdAt)}
                  </span>
                </div>
                {o.type === "rent" ? (
                  <div className="text-sm text-gray-700">
                    <div className="font-medium">
                      {o.listing?.title || "Elan silinib"}
                    </div>
                    <div className="text-gray-500 mt-1">
                      {o.startDate} → {o.endDate}
                    </div>
                    {o.notes && <div className="text-gray-500 mt-1">{o.notes}</div>}
                  </div>
                ) : (
                  <div className="text-sm text-gray-700">
                    {(o.items || []).map((it, i) => (
                      <div key={i} className="flex justify-between py-1">
                        <span>{it.title}</span>
                        <span>{formatPrice(it.price, it.currency)}</span>
                      </div>
                    ))}
                    <div className="flex justify-between font-bold pt-2 border-t border-gray-100 mt-2">
                      <span>Cəmi</span>
                      <span>{formatPrice(o.total)}</span>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )
      ) : tab === "saved" ? (
        saved.length === 0 ? (
          <EmptyState
            title="Saxlanılan post yoxdur"
            action={
              <Link to="/social" className="btn-primary">
                Sosiala bax
              </Link>
            }
          />
        ) : (
          saved.map((p) => <PostCard key={p.id} post={p} />)
        )
      ) : (
        <form onSubmit={saveProfile} className="max-w-lg space-y-4">
          <div>
            <label className="label">Ad Soyad</label>
            <input
              required
              maxLength={LIMITS.name}
              value={form.fullName}
              onChange={(e) => setForm({ ...form, fullName: e.target.value })}
              className="input"
            />
          </div>
          <div>
            <label className="label">Email</label>
            <IconField icon={FiMail}>
              <input value={user.email} disabled className="input pl-10 bg-gray-50" />
            </IconField>
            <p className="text-xs text-gray-400 mt-1 flex items-center gap-1">
              <FiAlertCircle /> Email dəyişdirilə bilməz
            </p>
          </div>
          <div>
            <label className="label">Telefon</label>
            <IconField icon={FiPhone}>
              <input
                maxLength={LIMITS.phone}
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder="+994 50 000 00 00"
                className="input pl-10"
              />
            </IconField>
          </div>
          <div>
            <label className="label">Region</label>
            <IconField icon={FiMapPin}>
              <input
                maxLength={LIMITS.region}
                value={form.region}
                onChange={(e) => setForm({ ...form, region: e.target.value })}
                className="input pl-10"
              />
            </IconField>
          </div>
          <div>
            <label className="label">Haqqında</label>
            <textarea
              maxLength={LIMITS.bio}
              value={form.bio}
              onChange={(e) => setForm({ ...form, bio: e.target.value })}
              className="input min-h-[100px]"
              placeholder="Özünüz haqqında məlumat..."
            />
          </div>
          <button type="submit" disabled={saving} className="btn-primary">
            <FiSave /> {saving ? "Yadda saxlanılır..." : "Yadda saxla"}
          </button>
        </form>
      )}

      <Toast {...toast} onClose={() => {}} />
    </div>
  );
}
