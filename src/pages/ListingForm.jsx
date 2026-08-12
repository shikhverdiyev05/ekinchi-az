import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import API from "../api";
import { useAuth } from "../context/AuthContext";
import { CATEGORIES, REGIONS } from "../utils/constants";
import { LIMITS } from "../utils/security";
import { describeError } from "../utils/errors";
import Spinner from "../components/Spinner";
import ErrorState from "../components/ErrorState";
import { useToast } from "../hooks/useToast";
import Toast from "../components/Toast";
import { FiSave, FiAlertCircle, FiChevronLeft } from "react-icons/fi";

export default function ListingForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast, show, showError, hide } = useToast();
  const [loading, setLoading] = useState(!!id);
  const [loadError, setLoadError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    title: "",
    description: "",
    price: "",
    currency: "AZN",
    type: "sale",
    category: CATEGORIES[0].id,
    subcategory: null,
    region: "",
    priceUnit: "gün",
    images: [],
  });

  useEffect(() => {
    if (!user) navigate("/login");
  }, [user, navigate]);

  const loadListing = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setLoadError("");
    try {
      const res = await API.listings.get(id);
      if ((res.listing.owner?.id || res.listing.userId) !== user?.id) {
        show("Bu elanı redaktə etmək olmaz", "error");
        navigate(`/listings/${id}`);
        return;
      }
      setForm(res.listing);
    } catch (e) {
      setLoadError(describeError(`Redakte edilecek elan yuklenmedi (${id})`, e));
    } finally {
      setLoading(false);
    }
  }, [id, user, navigate, show]);

  useEffect(() => {
    loadListing();
  }, [loadListing]);

  const currentCat = CATEGORIES.find((c) => c.id === form.category);

  const submit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const payload = {
        ...form,
        price: Number(form.price) || 0,
      };
      if (id) {
        await API.listings.update(id, payload);
        show("Elan yenilendi", "success");
      } else {
        await API.listings.create(payload);
        show("Elan yaradıldı", "success");
      }
      navigate("/profile?tab=listings");
    } catch (err) {
      showError(
        id ? `Elan yenilenmedi (${id})` : "Elan yaradilmadi",
        err,
        id ? "Elan yenilənmədi" : "Elan yaradılmadı"
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <Spinner />;
  if (loadError) return <ErrorState message={loadError} onRetry={loadListing} />;

  return (
    <div className="max-w-2xl mx-auto px-2">
      <button
        onClick={() => navigate(-1)}
        className="mb-4 text-sm text-gray-600 hover:text-brand-700 flex items-center gap-1"
      >
        <FiChevronLeft /> Geri
      </button>

      <h1 className="text-2xl font-bold text-gray-900 mb-6">
        {id ? "Elanı redakte et" : "Yeni elan yerləşdir"}
      </h1>

      <form onSubmit={submit} className="card p-4 sm:p-6 space-y-4">
        <div>
          <label className="label">Başlıq</label>
          <input
            required
            maxLength={LIMITS.title}
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            placeholder="Məs: 50 sot torpaq satılır"
            className="input"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="label">Tip</label>
            <select
              value={form.type}
              onChange={(e) => setForm({ ...form, type: e.target.value })}
              className="input"
            >
              <option value="sale">Satış</option>
              <option value="rent">İcarə</option>
            </select>
          </div>
          <div>
            <label className="label">Qiymət {form.type === "rent" && "(vahid başına)"}</label>
            <div className="flex gap-2">
              <input
                type="number"
                min="0"
                required
                value={form.price}
                onChange={(e) => setForm({ ...form, price: e.target.value })}
                placeholder="0"
                className="input flex-1"
              />
              <select
                value={form.currency}
                onChange={(e) => setForm({ ...form, currency: e.target.value })}
                className="input w-24"
              >
                <option value="AZN">AZN</option>
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
              </select>
            </div>
          </div>
        </div>

        {form.type === "rent" && (
          <div>
            <label className="label">Qiymət vahidi</label>
            <select
              value={form.priceUnit || "gün"}
              onChange={(e) => setForm({ ...form, priceUnit: e.target.value })}
              className="input"
            >
              <option value="gün">gün</option>
              <option value="ay">ay</option>
              <option value="hektar">hektar</option>
              <option value="saat">saat</option>
            </select>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="label">Kategoriya</label>
            <select
              value={form.category}
              onChange={(e) =>
                setForm({ ...form, category: e.target.value, subcategory: null })
              }
              className="input"
            >
              {CATEGORIES.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Subkategoriya</label>
            <select
              value={form.subcategory || ""}
              onChange={(e) =>
                setForm({ ...form, subcategory: e.target.value || null })
              }
              className="input"
              disabled={!currentCat?.subcategories?.length}
            >
              <option value="">—</option>
              {currentCat?.subcategories?.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="label">Region</label>
          <select
            value={form.region}
            onChange={(e) => setForm({ ...form, region: e.target.value })}
            className="input"
          >
            <option value="">Seçin</option>
            {REGIONS.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="label">Təsvir</label>
          <textarea
            maxLength={LIMITS.description}
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            className="input min-h-[120px]"
            placeholder="Elanınızın detallarını yazın..."
          />
        </div>

        <div>
          <label className="label">Şəkil URL-ləri (virgül ilə)</label>
          <textarea
            value={(form.images || []).join(", ")}
            onChange={(e) =>
              setForm({
                ...form,
                images: e.target.value
                  .split(",")
                  .map((s) => s.trim())
                  .filter(Boolean),
              })
            }
            className="input min-h-[80px]"
            placeholder="https://..., https://..."
          />
          <p className="text-xs text-gray-400 mt-1 flex items-center gap-1">
            <FiAlertCircle /> Bir neçə URL-ni vergül ilə ayırın
          </p>
        </div>

        <div className="flex gap-2 pt-2">
          <button type="submit" disabled={submitting} className="btn-primary flex-1">
            <FiSave /> {submitting ? "Yadda saxlanılır..." : "Yadda saxla"}
          </button>
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="btn-ghost"
          >
            İmtina
          </button>
        </div>
      </form>

      <Toast {...toast} onClose={hide} />
    </div>
  );
}
