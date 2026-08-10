import {
  FiTruck,
  FiPackage,
  FiFeather,
  FiMap,
  FiSun,
} from "react-icons/fi";

export const CATEGORIES = [
  { id: "cat_texnika", name: "Kənd təsərrüfatı texnikaları", icon: FiTruck, appliesTo: ["sale", "rent"] },
  { id: "cat_agrar", name: "Aqrar məhsullar və vasitələr", icon: FiPackage, appliesTo: ["sale"], subcategories: [
    { id: "sub_gubreler", name: "Gübrələr" },
    { id: "sub_bagcilig", name: "Bağçılıq məhsulları" },
    { id: "sub_ariciliq", name: "Arıçılıq məhsulları" },
  ] },
  { id: "cat_bitkiler", name: "Bitkilər", icon: FiFeather, appliesTo: ["sale"], subcategories: [
    { id: "sub_agac_tingleri", name: "Ağac tingləri" },
    { id: "sub_guller", name: "Güllər" },
    { id: "sub_kol_bitkileri", name: "Kol bitkiləri" },
    { id: "sub_taxil_bitkileri", name: "Taxıl bitkiləri" },
    { id: "sub_toxumlar", name: "Toxumlar" },
  ] },
  { id: "cat_torpaq", name: "Torpaq və əkin sahələri", icon: FiMap, appliesTo: ["sale", "rent"] },
  { id: "cat_bag", name: "Bağ sahələri", icon: FiSun, appliesTo: ["sale", "rent"] },
];

export const REGIONS = [
  "Bakı", "Gəncə", "Sumqayıt", "Lənkəran", "Quba", "Qusar", "Şəki", "Şamaxı",
  "İsmayıllı", "Tərtər", "Beyləqan", "İmişli", "Salyan", "Kürdəmir", "Bərdə",
  "Ağdam", "Ağdaş", "Zaqatala", "Balakən", "Xaçmaz", "Cəlilabad", "Masallı",
];

export function formatDate(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("az-AZ", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function timeAgo(iso) {
  if (!iso) return "";
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return "yeni";
  if (diff < 3600) return `${Math.floor(diff / 60)} dəq iqimli`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} saat iqimli`;
  if (diff < 86400 * 30) return `${Math.floor(diff / 86400)} gün iqimli`;
  return formatDate(iso);
}

export function formatPrice(price, currency = "AZN") {
  if (price == null) return "";
  return `${Number(price).toLocaleString("az-AZ")} ${currency}`;
}

export function listingTypeLabel(type) {
  if (type === "rent" || type === "icare") return "İcarə";
  return "Satış";
}

export function categoryById(id) {
  return CATEGORIES.find((c) => c.id === id);
}

export function categoryName(id) {
  for (const c of CATEGORIES) {
    if (c.id === id) return c.name;
    const sub = c.subcategories?.find((s) => s.id === id);
    if (sub) return sub.name;
  }
  return id;
}
