import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { FiMail, FiLock, FiUser, FiPhone, FiMapPin } from "react-icons/fi";
import ErrorAlert from "../components/ErrorAlert";
import IconField from "../components/IconField";
import { REGIONS } from "../utils/constants";

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    fullName: "",
    email: "",
    password: "",
    phone: "",
    region: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    if (form.password.length < 6) {
      setError("Şifrə ən azından 6 simvoldan ibarət olmalıdır");
      return;
    }
    setLoading(true);
    try {
      await register(form);
      navigate("/");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto mt-6 sm:mt-10 px-4">
      <div className="card p-6 sm:p-8">
        <h1 className="text-2xl font-bold text-gray-900 text-center mb-2">
          Qeydiyyat
        </h1>
        <p className="text-sm text-gray-500 text-center mb-6">Yeni hesab yaradın</p>

        <ErrorAlert message={error} />

        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="label">Ad Soyad</label>
            <IconField icon={FiUser}>
              <input
                required
                value={form.fullName}
                onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                placeholder="Ad Soyad"
                className="input pl-10"
              />
            </IconField>
          </div>
          <div>
            <label className="label">Email</label>
            <IconField icon={FiMail}>
              <input
                type="email"
                required
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="name@example.com"
                className="input pl-10"
              />
            </IconField>
          </div>
          <div>
            <label className="label">Şifrə</label>
            <IconField icon={FiLock}>
              <input
                type="password"
                required
                minLength={6}
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder="ən az 6 simvol"
                className="input pl-10"
              />
            </IconField>
          </div>
          <div>
            <label className="label">Telefon</label>
            <IconField icon={FiPhone}>
              <input
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
              <select
                value={form.region}
                onChange={(e) => setForm({ ...form, region: e.target.value })}
                className="input pl-10"
              >
                <option value="">Seçin</option>
                {REGIONS.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </IconField>
          </div>
          <button type="submit" disabled={loading} className="btn-primary w-full">
            {loading ? "Yaradılır..." : "Qeydiyyatdan keç"}
          </button>
        </form>

        <p className="text-sm text-gray-500 text-center mt-4">
          Hesabın var?{" "}
          <Link to="/login" className="text-brand-700 hover:underline font-medium">
            Daxil ol
          </Link>
        </p>
      </div>
    </div>
  );
}
