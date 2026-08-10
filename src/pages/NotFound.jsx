import { Link } from "react-router-dom";

export default function NotFound() {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center text-center">
      <div className="text-7xl font-bold text-brand-200">404</div>
      <h1 className="text-2xl font-bold text-gray-800 mt-2">Sehife tapılmadı</h1>
      <p className="text-gray-500 mt-2 mb-6">
        Axtardığınız sehife mövcud deyil və ya silinib.
      </p>
      <Link to="/" className="btn-primary">
        Ana sehifeye qayıt
      </Link>
    </div>
  );
}
