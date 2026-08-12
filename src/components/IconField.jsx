export default function IconField({ icon: Icon, className = "", children }) {
  return (
    <div className={`relative ${className}`}>
      <Icon className="absolute left-3 top-3 text-gray-400" />
      {children}
    </div>
  );
}
