import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { FiMail, FiLock, FiAlertCircle, FiInfo } from "react-icons/fi";

const DEMO = { email: "elvin.memmedov@example.com", password: "demo123" };

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(form.email.trim(), form.password);
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
          Hesaba daxil ol
        </h1>
        <p className="text-sm text-gray-500 text-center mb-6">
          AqrarBazar hesabınıza daxil olun
        </p>

        {error && (
          <div className="mb-4 flex items-center gap-2 bg-red-50 text-red-700 px-3 py-2 rounded-lg text-sm">
            <FiAlertCircle /> {error}
          </div>
        )}

        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="label">Email</label>
            <div className="relative">
              <FiMail className="absolute left-3 top-3 text-gray-400" />
              <input
                type="email"
                required
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="name@example.com"
                className="input pl-10"
              />
            </div>
          </div>
          <div>
            <label className="label">Şifrə</label>
            <div className="relative">
              <FiLock className="absolute left-3 top-3 text-gray-400" />
              <input
                type="password"
                required
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder="••••••••"
                className="input pl-10"
              />
            </div>
          </div>
          <button type="submit" disabled={loading} className="btn-primary w-full">
            {loading ? "Giriş edilir..." : "Daxil ol"}
          </button>
        </form>

        <p className="text-sm text-gray-500 text-center mt-4">
          Hesabın yoxdur?{" "}
          <Link to="/register" className="text-brand-700 hover:underline font-medium">
            Qeydiyyatdan keç
          </Link>
        </p>

        <div className="mt-6 pt-4 border-t border-gray-100">
          <div className="flex items-start gap-2 text-xs text-gray-500 bg-brand-50 rounded-lg p-3">
            <FiInfo className="mt-0.5 shrink-0 text-brand-600" />
            <div>
              <p className="font-medium text-gray-700 mb-1">Demo istifadəçi:</p>
              <p className="font-mono text-[11px]">{DEMO.email}</p>
              <p className="font-mono text-[11px]">Şifrə: {DEMO.password}</p>
              <p className="mt-2 text-gray-500">
                <strong>Qeydiyyat</strong> edib öz istifadəçinizi yarada bilərsiniz.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
