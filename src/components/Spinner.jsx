export default function Spinner({ size = 32, label }) {
  return (
    <div className="flex flex-col items-center justify-center py-10 text-gray-500">
      <div
        className="animate-spin rounded-full border-2 border-brand-200 border-t-brand-600"
        style={{ width: size, height: size }}
      />
      {label && <p className="mt-2 text-sm">{label}</p>}
    </div>
  );
}
