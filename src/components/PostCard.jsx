import { useState } from "react";
import {
  FiHeart,
  FiMessageSquare,
  FiBookmark,
  FiTrash2,
  FiSend,
  FiClock,
} from "react-icons/fi";
import { useAuth } from "../context/AuthContext";
import API from "../api";
import { timeAgo } from "../utils/constants";

export default function PostCard({ post, onDelete }) {
  const { user } = useAuth();
  const [liked, setLiked] = useState(post.isLikedByMe || false);
  const [likesCount, setLikesCount] = useState(post.likesCount || 0);
  const [saved, setSaved] = useState(post.isSavedByMe || false);
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState("");
  const [loadingComments, setLoadingComments] = useState(false);
  const [commentCount, setCommentCount] = useState(post.commentsCount || 0);

  const toggleLike = async () => {
    if (!user) return;
    const prevLiked = liked;
    setLiked(!prevLiked);
    setLikesCount((n) => n + (prevLiked ? -1 : 1));
    try {
      await API.posts.toggleLike(post.id);
    } catch (e) {
      setLiked(prevLiked);
      setLikesCount((n) => n + (prevLiked ? 1 : -1));
    }
  };

  const toggleSave = async () => {
    if (!user) return;
    const prev = saved;
    setSaved(!prev);
    try {
      await API.posts.toggleSave(post.id);
    } catch (e) {
      setSaved(prev);
    }
  };

  const loadComments = async () => {
    setLoadingComments(true);
    try {
      const res = await API.posts.comments(post.id);
      setComments(res.comments || []);
    } catch (e) {
    } finally {
      setLoadingComments(false);
    }
  };

  const toggleComments = () => {
    setShowComments((s) => !s);
    if (!showComments && comments.length === 0) loadComments();
  };

  const submitComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    try {
      const res = await API.posts.addComment(post.id, newComment.trim());
      setComments((c) => [...c, res.comment]);
      setCommentCount((n) => n + 1);
      setNewComment("");
    } catch (err) {}
  };

  const deleteComment = async (id) => {
    if (!confirm("Şərhi silmək istədiyinizə əminsiz?")) return;
    try {
      await API.posts.deleteComment(id, post.id);
      setComments((c) => c.filter((x) => x.id !== id));
      setCommentCount((n) => Math.max(0, n - 1));
    } catch (e) {}
  };

  const deletePost = async () => {
    if (!confirm("Bu postu silmək istədiyinizə əminsiz?")) return;
    try {
      await API.posts.remove(post.id);
      onDelete?.(post.id);
    } catch (e) {}
  };

  const author = post.author;
  const authorName = author?.fullName || "İstifadeci";
  const isMyPost = author?.id === user?.id;

  return (
    <div className="card p-3 sm:p-4 mb-4">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-full bg-brand-600 text-white flex items-center justify-center font-bold overflow-hidden shrink-0">
          {author?.avatar ? (
            <img src={author.avatar} alt="" className="w-full h-full object-cover" />
          ) : (
            authorName.charAt(0).toUpperCase()
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <span className="font-semibold text-gray-900 truncate block">
                {authorName}
              </span>
              <span className="text-xs text-gray-400 flex items-center gap-1">
                <FiClock /> {timeAgo(post.createdAt)}
              </span>
            </div>
            {isMyPost && (
              <button
                onClick={deletePost}
                className="text-gray-400 hover:text-red-600 p-1"
                title="Sil"
              >
                <FiTrash2 />
              </button>
            )}
          </div>
        </div>
      </div>

      <p className="mt-3 text-gray-700 whitespace-pre-wrap break-words text-sm sm:text-base">
        {post.content}
      </p>

      {post.images?.length > 0 && (
        <div
          className={`mt-3 grid gap-2 ${
            post.images.length === 1
              ? "grid-cols-1"
              : "grid-cols-2"
          }`}
        >
          {post.images.map((img, i) => (
            <img
              key={i}
              src={img}
              alt=""
              loading="lazy"
              className={`rounded-lg w-full object-cover ${
                post.images.length === 1 ? "max-h-[500px]" : "max-h-72"
              }`}
            />
          ))}
        </div>
      )}

      <div className="mt-4 flex items-center gap-4 border-t border-gray-100 pt-3">
        <button
          onClick={toggleLike}
          className={`flex items-center gap-1 text-sm hover:text-red-500 transition-colors ${
            liked ? "text-red-500" : "text-gray-500"
          }`}
        >
          <FiHeart fill={liked ? "currentColor" : "none"} />
          <span>{likesCount}</span>
        </button>
        <button
          onClick={toggleComments}
          className="flex items-center gap-1 text-sm text-gray-500 hover:text-brand-600"
        >
          <FiMessageSquare />
          <span>{commentCount}</span>
        </button>
        <button
          onClick={toggleSave}
          className={`flex items-center gap-1 text-sm hover:text-brand-600 ${
            saved ? "text-brand-600" : "text-gray-500"
          }`}
        >
          <FiBookmark fill={saved ? "currentColor" : "none"} />
        </button>
      </div>

      {showComments && (
        <div className="mt-4 pt-3 border-t border-gray-100 space-y-3">
          {loadingComments && <p className="text-sm text-gray-400">Yüklənir...</p>}
          {!loadingComments && comments.length === 0 && (
            <p className="text-sm text-gray-400">Hələ şərh yoxdur</p>
          )}
          {comments.map((c) => (
            <div key={c.id} className="flex gap-2">
              <div className="w-7 h-7 shrink-0 rounded-full bg-brand-600 text-white flex items-center justify-center text-xs font-bold">
                {c.author?.fullName?.charAt(0).toUpperCase() || "?"}
              </div>
              <div className="flex-1 bg-gray-50 rounded-lg px-3 py-2 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-semibold text-gray-800 truncate">
                    {c.author?.fullName || "İstifadeci"}
                  </span>
                  {c.author?.id === user?.id && (
                    <button
                      onClick={() => deleteComment(c.id)}
                      className="text-xs text-gray-400 hover:text-red-500 shrink-0"
                    >
                      sil
                    </button>
                  )}
                </div>
                <p className="text-sm text-gray-700 mt-0.5 break-words">{c.text}</p>
                <span className="text-[10px] text-gray-400">
                  {timeAgo(c.createdAt)}
                </span>
              </div>
            </div>
          ))}

          {user && (
            <form onSubmit={submitComment} className="flex gap-2">
              <input
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Şərh yaz..."
                className="input flex-1 py-1.5 text-sm"
              />
              <button type="submit" className="btn-primary px-3 py-1.5">
                <FiSend />
              </button>
            </form>
          )}
        </div>
      )}
    </div>
  );
}
