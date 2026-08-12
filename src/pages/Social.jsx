import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import API from "../api";
import { useAuth } from "../context/AuthContext";
import PostCard from "../components/PostCard";
import Spinner from "../components/Spinner";
import EmptyState from "../components/EmptyState";
import ErrorState from "../components/ErrorState";
import { describeError } from "../utils/errors";
import { useToast } from "../hooks/useToast";
import Toast from "../components/Toast";
import { FiPlus, FiInfo } from "react-icons/fi";
import { LIMITS } from "../utils/security";

export default function Social() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast, show, showError, hide } = useToast();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [content, setContent] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const loadPosts = useCallback(async () => {
    setLoading(true);
    setLoadError("");
    try {
      const res = await API.posts.list();
      setPosts(res.posts || []);
    } catch (e) {
      setPosts([]);
      setLoadError(describeError("Postlar yuklenmedi", e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPosts();
  }, [loadPosts]);

  const submit = async (e) => {
    e.preventDefault();
    if (!user) return navigate("/login");
    if (!content.trim()) return;
    setSubmitting(true);
    try {
      const res = await API.posts.create({ content: content.trim() });
      setPosts((p) => [res.post, ...p]);
      setContent("");
      show("Post paylaşıldı", "success");
    } catch (e) {
      showError("Post paylasilmadi", e, "Post paylaşılmadı");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = (id) => {
    setPosts((p) => p.filter((x) => x.id !== id));
  };

  return (
    <div>
      <h1 className="text-xl sm:text-2xl font-bold text-gray-900 mb-5">Sosial</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        <div className="lg:col-span-2 order-2 lg:order-1">
          {user && (
            <form onSubmit={submit} className="card p-3 sm:p-4 mb-4">
              <textarea
                maxLength={LIMITS.postContent}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Fikirlərinizi bölüşün, sual verin, problemləri müzakirə edin..."
                className="input min-h-[100px] resize-y"
              />
              <div className="flex justify-end mt-2">
                <button
                  type="submit"
                  disabled={submitting || !content.trim()}
                  className="btn-primary"
                >
                  <FiPlus /> Paylaş
                </button>
              </div>
            </form>
          )}

          {loading ? (
            <Spinner />
          ) : loadError ? (
            <ErrorState message={loadError} onRetry={loadPosts} />
          ) : posts.length === 0 ? (
            <EmptyState
              title="Hələ post yoxdur"
              message="İlk postu siz paylaşın!"
              action={
                user ? null : (
                  <Link to="/login" className="btn-primary">
                    Daxil ol
                  </Link>
                )
              }
            />
          ) : (
            posts.map((p) => (
              <PostCard
                key={p.id}
                post={p}
                onDelete={handleDelete}
                onError={(message) => show(message, "error")}
              />
            ))
          )}
        </div>

        <div className="lg:col-span-1 order-1 lg:order-2">
          <div className="card p-4 sticky top-32">
            <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <FiInfo className="text-brand-600" /> Sosial qaydalar
            </h3>
            <ul className="text-sm text-gray-600 space-y-2 list-disc pl-5">
              <li>Hörmətli dil istifadə edin</li>
              <li>Sual və müzakirələrə açıq olun</li>
              <li>Spam və reklamlardan çəkinin</li>
              <li>Fermer cəmiyyətinə dəyər qatın</li>
            </ul>
            {!user && (
              <Link to="/login" className="btn-outline w-full mt-4 text-sm">
                Daxil olaraq paylaş
              </Link>
            )}
          </div>
        </div>
      </div>

      <Toast {...toast} onClose={hide} />
    </div>
  );
}
