import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  HashRouter,
  Routes,
  Route,
  Link,
  useNavigate,
  Navigate,
} from "react-router-dom";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  signOut,
} from "firebase/auth";
// Fixed Firebase database imports by removing unused members (query, orderByChild) and standardizing named imports
import { ref, onValue, push, set, update } from "firebase/database";
import { auth, rtdb } from "./firebase";
import {
  Resource,
  Category,
  ShareRequest,
  User,
  Comment,
  ChatMessage,
} from "./types";
import { HYDERABAD_COLLEGES, CATEGORIES, INITIAL_RESOURCES } from "./constants";
import {
  getSmartRecommendations,
  autoCategorize,
} from "./services/geminiService";
import ResourceCard from "./components/ResourceCard";

// Helper to convert file to Base64
const BADGE_META: Record<
  string,
  { title: string; icon: string; bg: string }
> = {
  "First Upload": {
    title: "First Upload",
    icon: "📚",
    bg: "bg-indigo-100",
  },
  "10 Comments": {
    title: "10 Comments",
    icon: "💬",
    bg: "bg-green-100",
  },
  "10 Ratings Given": {
    title: "10 Ratings Given",
    icon: "⭐",
    bg: "bg-yellow-100",
  },
  "100 Points Club": {
    title: "100 Points Club",
    icon: "🔥",
    bg: "bg-red-100",
  },
};

const calculateTier = (points: number): string => {
  if (points >= 500) return "Gold I";
  if (points >= 350) return "Gold II";
  if (points >= 250) return "Gold III";
  if (points >= 175) return "Silver I";
  if (points >= 125) return "Silver II";
  if (points >= 75) return "Silver III";
  if (points >= 50) return "Bronze I";
  if (points >= 25) return "Bronze II";
  return "Bronze III";
};
const awardPoints = async (
  userId: string,
  delta: number,
  statKey?: "uploads" | "comments" | "ratingsGiven" | "ratingsReceived",
  badgeCheck?: "upload" | "comment" | "rating"
) => {
  const userRef = ref(rtdb, `users/${userId}`);

  onValue(
    userRef,
    async (snap) => {
      const data = snap.val();
      let newlyEarned: string | null = null;
      if (!data) return;

      const newPoints = (data.points || 0) + delta;
      const newTier = calculateTier(newPoints);

      const updates: any = {
        points: newPoints,
        tier: newTier,
      };

      if (statKey) {
        updates[`stats/${statKey}`] = (data.stats?.[statKey] || 0) + 1;
      }

      // Badge logic
      const badges = data.badges || {};
if (badgeCheck === "upload" && !badges["First Upload"]) {
  badges["First Upload"] = true;
  newlyEarned = "First Upload";
}
if (
  badgeCheck === "comment" &&
  (data.stats?.comments || 0) + 1 >= 10 &&
  !badges["10 Comments"]
) {
  badges["10 Comments"] = true;
  newlyEarned = "10 Comments";
}
if (
  badgeCheck === "rating" &&
  (data.stats?.ratingsGiven || 0) + 1 >= 10 &&
  !badges["10 Ratings Given"]
) {
  badges["10 Ratings Given"] = true;
  newlyEarned = "10 Ratings Given";
}

if (newPoints >= 100 && !badges["100 Points Club"]) {
  badges["100 Points Club"] = true;
  newlyEarned = "100 Points Club";
}

      updates.badges = badges;

      await update(userRef, updates);
      if (newlyEarned) {
  setTimeout(() => {
    window.dispatchEvent(
      new CustomEvent("badge-earned", { detail: newlyEarned })
    );
  }, 100);
}


    },
    { onlyOnce: true }
  );
};

const getTierStyle = (tier?: string) => {
  switch (tier) {
    case "Bronze III":
      return "bg-[#cd7f32] text-white";
    case "Bronze II":
      return "bg-[#b87333] text-white";
    case "Bronze I":
      return "bg-[#a97142] text-white";
    case "Silver III":
      return "bg-slate-300 text-slate-900";
    case "Silver II":
      return "bg-slate-200 text-slate-900";
    case "Silver I":
      return "bg-slate-100 text-slate-900";
    case "Gold III":
      return "bg-yellow-400 text-yellow-900";
    case "Gold II":
      return "bg-yellow-300 text-yellow-900";
    case "Gold I":
      return "bg-yellow-200 text-yellow-900 shadow-lg";
    default:
      return "bg-slate-100 text-slate-500";
  }
};

const calculatePopularity = (resource: any): number => {
  const ratings: number[] = resource.ratings
    ? Object.values(resource.ratings).map((r) => Number(r))
    : [];

  const avgRating =
    ratings.length > 0
      ? ratings.reduce((sum, r) => sum + r, 0) / ratings.length
      : 0;

  const commentsCount = resource.comments
    ? Object.keys(resource.comments).length
    : 0;

  return ratings.length * 5 + avgRating * 10 + commentsCount * 2;
};

const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => reject(error);
  });
};

// --- Star Rating Component ---
const RatingStars = ({
  rating,
  onRate,
  size = "md",
}: {
  rating: number;
  onRate?: (r: number) => void;
  size?: "sm" | "md";
}) => {
  const [hover, setHover] = useState(0);
  const stars = [1, 2, 3, 4, 5];
  const sz = size === "sm" ? "w-3 h-3" : "w-6 h-6";

  return (
    <div className="flex items-center gap-1">
      {stars.map((star) => (
        <button
          key={star}
          type="button"
          disabled={!onRate}
          onClick={(e) => {
            e.stopPropagation();
            if (onRate) onRate(star);
          }}
          onMouseEnter={() => onRate && setHover(star)}
          onMouseLeave={() => onRate && setHover(0)}
          className={`${
            onRate
              ? "cursor-pointer hover:scale-110 active:scale-90"
              : "cursor-default"
          } transition-all ${
            star <= (hover || rating) ? "text-amber-500" : "text-slate-200"
          }`}
        >
          <svg className={sz} fill="currentColor" viewBox="0 0 20 20">
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
        </button>
      ))}
    </div>
  );
};

// --- Header Component ---
const Header = ({
  user,
  onLogout,
}: {
  user: User | null;
  onLogout: () => void;
}) => (
  <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-slate-100 px-4 py-3">
    <div className="max-w-7xl mx-auto flex items-center justify-between">
      <Link to="/" className="flex items-center gap-2 group">
        <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg group-hover:scale-105 transition-transform">
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"
            ></path>
          </svg>
        </div>
        <div>
          <h1 className="text-xl font-bold text-slate-900 leading-tight">
            HydraShare
          </h1>
          <p className="text-[10px] text-indigo-600 font-bold uppercase tracking-widest">
            Campus Exchange
          </p>
        </div>
      </Link>

      <nav className="hidden md:flex items-center gap-8">
        <Link
          to="/"
          className="text-sm font-semibold text-slate-500 hover:text-indigo-600 transition-colors"
        >
          Browse
        </Link>
        <Link
          to="/post"
          className="text-sm font-semibold text-slate-500 hover:text-indigo-600 transition-colors"
        >
          Post Item
        </Link>
        <Link
          to="/my-items"
          className="text-sm font-semibold text-slate-500 hover:text-indigo-600 transition-colors"
        >
          Dashboard
        </Link>
      </nav>

      <div className="flex items-center gap-4">
        {user ? (
          <div className="flex items-center gap-4">
            <Link
              to="/profile"
              className="flex items-center gap-3 group px-3 py-1.5 rounded-2xl hover:bg-slate-50 transition-all border border-transparent hover:border-slate-100"
            >
              <div className="text-right hidden sm:block">
                <p className="text-xs font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                  {user.name}
                </p>
                <p className="text-[9px] text-slate-400 font-bold uppercase tracking-tighter truncate max-w-[100px]">
                  {user.college.split(" ")[0]}
                </p>
              </div>
              <img
                src={`https://ui-avatars.com/api/?name=${encodeURIComponent(
                  user.name
                )}&background=6366f1&color=fff`}
                className="w-8 h-8 rounded-xl border-2 border-white shadow-md"
                alt="profile"
              />
            </Link>
            <button
              onClick={onLogout}
              className="p-2 text-slate-400 hover:text-red-500 transition-colors bg-white rounded-xl border border-slate-100 shadow-sm"
              title="Log Out"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                ></path>
              </svg>
            </button>
          </div>
        ) : (
          <Link
            to="/auth"
            className="bg-indigo-600 text-white px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-100 active:scale-95"
          >
            Get Started
          </Link>
        )}
      </div>
    </div>
  </header>
);

const Footer = () => (
  <footer className="bg-white border-t border-slate-100 py-12 px-4 mt-20">
    <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-8">
      <div>
        <h2 className="text-xl font-black text-slate-900 mb-2">HydraShare</h2>
        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
          Empowering Campus Collaboration
        </p>
      </div>
      <div className="flex gap-10">
        <div className="text-center md:text-left">
          <h4 className="text-[10px] font-black text-slate-300 uppercase mb-4 tracking-widest">
            Product
          </h4>
          <ul className="text-xs font-bold text-slate-600 space-y-2">
            <li>
              <Link to="/" className="hover:text-indigo-600">
                Home
              </Link>
            </li>
            <li>
              <Link to="/post" className="hover:text-indigo-600">
                Post Item
              </Link>
            </li>
          </ul>
        </div>
      </div>
    </div>
  </footer>
);

// --- Post Resource Page ---
const PostResourcePage = ({ user }: { user: User }) => {
  const navigate = useNavigate();
const [formData, setFormData] = useState({
  title: "",
  description: "",
  category: "Books" as Category,
  genre: "",
});
  const [img, setImg] = useState<File | null>(null);
  const [pdf, setPdf] = useState<File | null>(null);
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState<string | null>(null);
  const [isPosting, setIsPosting] = useState(false);
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [existingGenres, setExistingGenres] = useState<string[]>([]);


  useEffect(() => {
    if (pdf) {
      const url = URL.createObjectURL(pdf);
      setPdfPreviewUrl(url);
      return () => URL.revokeObjectURL(url);
    } else {
      setPdfPreviewUrl(null);
    }
  }, [pdf]);

  useEffect(() => {
  onValue(ref(rtdb, "resources"), (snap) => {
    const data = snap.val();
    if (!data) return;

    const genres = new Set<string>();
    Object.values(data).forEach((r: any) => {
      if (r.category === "Books" && r.genre) {
        genres.add(r.genre);
      }
    });

    setExistingGenres(Array.from(genres).sort());
  });
}, []);


  const handleAutoCategorize = async () => {
    if (!formData.title || !formData.description) return;
    setIsSuggesting(true);
    try {
      const suggested = await autoCategorize(
        formData.title,
        formData.description
      );
      const cleanSuggested = suggested.trim();
      if (CATEGORIES.includes(cleanSuggested as Category)) {
        setFormData((prev) => ({
          ...prev,
          category: cleanSuggested as Category,
        }));
      }
    } catch (e) {
      console.error("Auto-categorization failed", e);
    } finally {
      setIsSuggesting(false);
    }
  };

const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  setIsPosting(true);

  try {
    const resRef = push(ref(rtdb, "resources"));

    const imageUrl = img
      ? await fileToBase64(img)
      : `https://picsum.photos/seed/${formData.title.replace(/\s/g, "")}/400/300`;

    let documentUrl = "";
    if (pdf) {
      documentUrl = await fileToBase64(pdf);
    }

   await set(resRef, {
  ...formData,
  imageUrl,
  documentUrl,
  ownerId: user.id,
  ownerName: user.name,
  college: user.college,
  status: "available",
  createdAt: Date.now(),
  viewCount: 0,
...(pdf ? { downloadCount: 0 } : {}),
 // 👁️ ADD THIS
}
);
// ✅ AWARD POINTS FOR UPLOAD
await awardPoints(user.id, 10, "uploads", "upload");



    navigate("/"); // ✅ IMPORTANT
  } catch (e) {
    console.error(e);
  } finally {
    setIsPosting(false);
  }
};



  return (
    <div className="max-w-6xl mx-auto px-4 py-16">
      <div className="bg-white rounded-[3rem] p-10 md:p-16 shadow-2xl shadow-indigo-100/30 border border-slate-100">
        <div className="mb-12">
          <h2 className="text-4xl font-black text-slate-900 mb-3 tracking-tight">
            List a Resource
          </h2>
          <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">
            Share with students across Hyderabad
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-10">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
            <div className="space-y-8">
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block ml-1">
                  Item Title
                </label>
                <input
                  placeholder="e.g. Calculus Vol. 1 or Lab Kit"
                  required
                  className="w-full px-5 py-4 rounded-2xl bg-slate-50 border border-slate-100 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none text-slate-900 text-sm font-bold transition-all placeholder:text-slate-300 shadow-sm"
                  value={formData.title}
                  onChange={(e) =>
                    setFormData({ ...formData, title: e.target.value })
                  }
                />
              </div>
              <div>
                <div className="flex justify-between items-center mb-2 ml-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">
                    Description
                  </label>
                  <button
                    type="button"
                    onClick={handleAutoCategorize}
                    disabled={
                      isSuggesting || !formData.title || !formData.description
                    }
                    className="text-[9px] font-black text-indigo-600 uppercase tracking-widest hover:text-indigo-800 disabled:opacity-30 flex items-center gap-1"
                  >
                    <svg
                      className={`w-3 h-3 ${
                        isSuggesting ? "animate-spin" : ""
                      }`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="3"
                        d="M13 10V3L4 14h7v7l9-11h-7z"
                      ></path>
                    </svg>
                    AI Magic Categorize
                  </button>
                </div>
                <textarea
                  placeholder="Details about condition, semester, or requirements..."
                  rows={4}
                  required
                  className="w-full px-5 py-4 rounded-2xl bg-slate-50 border border-slate-100 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none text-slate-900 text-sm font-bold transition-all placeholder:text-slate-300 shadow-sm"
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                />
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block ml-1">
                  Classification
                </label>
                <select
                  className="w-full px-5 py-4 rounded-2xl bg-slate-50 border border-slate-100 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none text-slate-900 text-sm font-bold transition-all appearance-none shadow-sm"
                  value={formData.category}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      category: e.target.value as Category,
                    })
                  }
                >
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
              {formData.category === "Books" && (
  <div>
    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block ml-1">
      Book Genre
    </label>

    <input
      list="book-genre-list"
      placeholder="e.g. Engineering Mathematics"
      className="w-full px-5 py-4 rounded-2xl bg-slate-50 border border-slate-100 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none text-slate-900 text-sm font-bold"
      value={formData.genre}
      onChange={(e) =>
        setFormData({ ...formData, genre: e.target.value })
      }
      required
    />

    <datalist id="book-genre-list">
      {existingGenres.map((g) => (
        <option key={g} value={g} />
      ))}
    </datalist>
  </div>
)}

              <div className="grid grid-cols-2 gap-6">
                <div className="group relative border-2 border-dashed border-slate-100 rounded-[2rem] p-6 text-center bg-slate-50/30 hover:bg-white hover:border-indigo-200 transition-all cursor-pointer">
                  <input
                    type="file"
                    accept="image/*"
                    className="absolute inset-0 opacity-0 cursor-pointer"
                    onChange={(e) => setImg(e.target.files?.[0] || null)}
                  />
                  <div className="w-10 h-10 bg-white rounded-xl shadow-sm flex items-center justify-center mx-auto mb-3 text-indigo-500">
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                      ></path>
                    </svg>
                  </div>
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest truncate">
                    {img ? img.name : "Photo"}
                  </p>
                </div>

                <div className="group relative border-2 border-dashed border-slate-100 rounded-[2rem] p-6 text-center bg-slate-50/30 hover:bg-white hover:border-red-200 transition-all cursor-pointer">
                  <input
                    type="file"
                    accept=".pdf"
                    className="absolute inset-0 opacity-0 cursor-pointer"
                    onChange={(e) => setPdf(e.target.files?.[0] || null)}
                  />
                  <div className="w-10 h-10 bg-white rounded-xl shadow-sm flex items-center justify-center mx-auto mb-3 text-red-500">
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
                      ></path>
                    </svg>
                  </div>
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest truncate">
                    {pdf ? pdf.name : "PDF Attachment"}
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block ml-1">
                Document Preview
              </label>
              <div className="bg-slate-50 rounded-[2.5rem] border border-slate-100 overflow-hidden h-[450px] flex items-center justify-center relative shadow-inner">
                {pdfPreviewUrl ? (
                  <div className="w-full h-full relative group">
                    <iframe
                      src={pdfPreviewUrl}
                      className="w-full h-full border-none"
                      title="PDF Preview"
                    ></iframe>
                    <button
                      type="button"
                      onClick={() => setPdf(null)}
                      className="absolute top-4 right-4 bg-red-600 text-white p-3 rounded-full shadow-xl hover:scale-110 transition-transform z-10"
                    >
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2.5"
                          d="M6 18L18 6M6 6l12 12"
                        />
                      </svg>
                    </button>
                  </div>
                ) : (
                  <div className="text-center px-10 opacity-20">
                    <svg
                      className="w-16 h-16 mx-auto mb-4 text-slate-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                      ></path>
                    </svg>
                    <p className="text-xs font-black uppercase tracking-widest">
                      Attach a PDF to preview content
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="pt-10 border-t border-slate-50 flex items-center justify-between">
            <div className="hidden md:block">
              <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">
                Cross-Campus Network
              </p>
              <p className="text-[8px] font-bold text-slate-300 uppercase mt-1">
                Verified listing on HydraShare
              </p>
            </div>
            <button
              type="submit"
              disabled={isPosting}
              className="w-full md:w-auto px-16 py-6 bg-indigo-600 text-white rounded-[1.75rem] font-black uppercase tracking-[0.2em] text-[10px] shadow-2xl hover:bg-indigo-700 transition-all shadow-indigo-100 active:scale-95 disabled:opacity-50"
            >
              {isPosting ? "Uploading..." : "Publish Resource"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// --- Chat Window Component ---
const ChatWindow = ({
  request,
  user,
  onClose,
  resource,
}: {
  request: ShareRequest;
  user: User;
  onClose: () => void;
  resource?: Resource;
}) => {
  const [msg, setMsg] = useState("");
  const chatEndRef = useRef<HTMLDivElement>(null);
  const messages = request.messages
    ? Object.values(request.messages).sort((a, b) => a.timestamp - b.timestamp)
    : [];

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    if (!msg.trim()) return;
    const msgRef = push(ref(rtdb, `requests/${request.id}/messages`));
    await set(msgRef, {
      id: msgRef.key,
      senderId: user.id,
      senderName: user.name,
      text: msg,
      timestamp: Date.now(),
    });
    setMsg("");
  };

  return (
    <div className="flex flex-col h-full bg-white animate-in slide-in-from-right duration-300">
      <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-white/80 backdrop-blur-md sticky top-0 z-10">
        <div className="flex items-center gap-4">
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-50 rounded-xl lg:hidden"
          >
            <svg
              className="w-5 h-5 text-slate-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M15 19l-7-7 7-7"
              ></path>
            </svg>
          </button>
          <div className="w-10 h-10 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 font-black text-sm">
            {request.requesterId === user.id
              ? resource?.ownerName[0]
              : request.requesterName[0]}
          </div>
          <div>
            <p className="text-sm font-black text-slate-900">
              {request.requesterId === user.id
                ? resource?.ownerName
                : request.requesterName}
            </p>
            <p className="text-[9px] font-black text-indigo-400 uppercase tracking-widest">
              Active Chat
            </p>
          </div>
        </div>
        <div className="hidden sm:block text-right">
          <p className="text-[10px] font-black text-slate-300 uppercase tracking-tighter">
            Resource
          </p>
          <p className="text-[10px] font-black text-slate-900">
            {resource?.title}
          </p>
        </div>
      </div>

      <div className="flex-grow overflow-y-auto p-6 space-y-4 no-scrollbar">
        <div className="text-center py-6">
          <span className="px-4 py-1.5 rounded-full bg-slate-50 text-[9px] font-black text-slate-300 uppercase tracking-widest border border-slate-100">
            Inquiry accepted on{" "}
            {new Date(request.timestamp).toLocaleDateString()}
          </span>
        </div>

        {messages.map((m) => {
          const isMe = m.senderId === user.id;
          return (
            <div
              key={m.id}
              className={`flex ${isMe ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[80%] px-5 py-4 rounded-3xl text-sm font-bold shadow-sm ${
                  isMe
                    ? "bg-indigo-600 text-white rounded-tr-none"
                    : "bg-slate-50 text-slate-900 border border-slate-100 rounded-tl-none"
                }`}
              >
                <p>{m.text}</p>
                <p
                  className={`text-[8px] mt-1 font-black uppercase opacity-50 ${
                    isMe ? "text-white" : "text-slate-400"
                  }`}
                >
                  {new Date(m.timestamp).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </div>
            </div>
          );
        })}
        <div ref={chatEndRef} />
      </div>

      <div className="p-6 border-t border-slate-100 bg-slate-50/50">
        <div className="flex gap-3">
          <input
            placeholder="Type message..."
            className="flex-grow px-6 py-4 rounded-2xl bg-white border border-slate-100 text-sm font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none transition-all shadow-sm placeholder:text-slate-300"
            value={msg}
            onChange={(e) => setMsg(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
          />
          <button
            onClick={handleSend}
            className="w-14 h-14 bg-slate-900 text-white rounded-2xl flex items-center justify-center hover:bg-indigo-600 transition-all shadow-xl shadow-slate-100"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="3"
                d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
              ></path>
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
};

// --- Detail Modal ---

const ResourceDetailModal = ({
  resource,
  onClose,
  onAction,
  isOwner,
  user,
}: {
  resource: Resource;
  onClose: () => void;
  onAction: (id: string) => void;
  isOwner: boolean;
  user: User | null;
}) => {
  const [commentText, setCommentText] = useState("");
  const [isRating, setIsRating] = useState(false);
  const [viewed, setViewed] = useState(false);
  useEffect(() => {
  setViewed(false);
}, [resource.id]);

    useEffect(() => {
    if (viewed) return;

    const incrementView = async () => {
      try {
        const count = resource.viewCount || 0;
        await update(
          ref(rtdb, `resources/${resource.id}`),
          { viewCount: count + 1 }
        );
        setViewed(true); // prevent multiple increments
      } catch (e) {
        console.error("View count failed", e);
      }
    };

    incrementView();
  }, [resource.id]);

  const handlePostComment = async () => {
    if (!user || !commentText.trim()) return;
    try {
      const commentRef = ref(rtdb, `resources/${resource.id}/comments`);
      const newCommentRef = push(commentRef);
      await set(newCommentRef, {
        userId: user.id,
        userName: user.name,
        text: commentText,
        timestamp: Date.now(),
      });
      await awardPoints(user.id, 1, "comments", "comment");
      setCommentText("");
    } catch (e) {
      console.error(e);
    }
  };
  //added
  const handleDownload = async () => {
  try {
    const count = resource.downloadCount || 0;

    await update(
      ref(rtdb, `resources/${resource.id}`),
      { downloadCount: count + 1 }
    );

    // Trigger file download manually
    const link = document.createElement("a");
    link.href = resource.documentUrl!;
    link.download = `${resource.title.replace(/\s/g, "_")}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } catch (e) {
    console.error("Download failed", e);
  }
};
//till here

  const handleRate = async (score: number) => {
    if (!user) {
      alert("Please login to rate!");
      return;
    }
    setIsRating(true);
    try {
      // Ensure the exact path is correct: resources/{id}/ratings/{userId}
      await set(
        ref(rtdb, `resources/${resource.id}/ratings/${user.id}`),
        score
      );
      await awardPoints(user.id, 1, "ratingsGiven", "rating");
await awardPoints(resource.ownerId, 2, "ratingsReceived");

    } catch (e) {
      console.error("Failed to add rating", e);
      alert("Rating failed. Please check your connection.");
    } finally {
      setIsRating(false);
    }
  };

  const comments = resource.comments
    ? Object.values(resource.comments).sort((a, b) => b.timestamp - a.timestamp)
    : [];
  const ratings = resource.ratings ? Object.values(resource.ratings) : [];
  const avgRatingValue =
    ratings.length > 0
      ? (ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(1)
      : "0";
  const userRating = user ? resource.ratings?.[user.id] || 0 : 0;

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 md:p-8 bg-slate-900/95 backdrop-blur-xl animate-in fade-in duration-500 overflow-y-auto">
      {/* Modal Container: Set h-[90vh] on all screens to ensure internal scrolling works correctly */}
      <div className="relative bg-white rounded-[3rem] shadow-[0_0_100px_rgba(0,0,0,0.2)] w-full max-w-6xl h-[90vh] overflow-hidden flex flex-col md:flex-row animate-in zoom-in-95 duration-300">
        <button
          onClick={onClose}
          className="absolute top-6 right-6 z-[160] w-12 h-12 bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center text-white md:text-slate-900 md:bg-slate-100 transition-all shadow-lg"
        >
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="3"
              d="M6 18L18 6M6 6l12 12"
            ></path>
          </svg>
        </button>

        <div className="w-full md:w-[58%] bg-slate-100 flex items-center justify-center relative min-h-[300px] md:min-h-0">
          <img
            src={resource.imageUrl}
            className="w-full h-full object-cover md:absolute inset-0"
            alt={resource.title}
          />
        </div>

        {/* Right Side: Content Panel - This now handles all vertical scrolling */}
        <div className="w-full md:w-[42%] flex flex-col h-full bg-white border-l border-slate-50 overflow-hidden">
          {/* Static Header */}
          <div className="p-8 md:p-10 border-b border-slate-50 bg-white/80 backdrop-blur-sm z-10 flex-shrink-0">
            <div className="flex items-center gap-3 mb-6">
              <span className="bg-indigo-50 text-indigo-600 px-3.5 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest">
                {resource.category}
              </span>
              <RatingStars rating={Number(avgRatingValue)} />
              <span className="text-[10px] font-black text-amber-600 uppercase tracking-tighter">
                {avgRatingValue} / 5
              </span>
              <span className="text-[10px] font-bold text-slate-300">
                ({ratings.length} reviews)
              </span>
            </div>
            <h2 className="text-3xl font-black text-slate-900 leading-tight mb-4">
              {resource.title}
            </h2>
            <p className="text-sm text-slate-400 font-bold leading-relaxed line-clamp-2">
              {resource.description}
            </p>
            <div className="flex items-center gap-4 mt-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">
  <span>👁️ {resource.viewCount || 0} views</span>

  {resource.documentUrl && (
    <span>⬇️ {resource.downloadCount || 0} downloads</span>
  )}
</div>



          </div>

          {/* Scrollable Area: Keeps middle content scrollable and footer buttons accessible */}
          <div className="flex-grow overflow-y-auto p-8 md:p-10 space-y-10 bg-white min-h-0">
            {!isOwner && user && (
              <div className="bg-slate-50 p-6 rounded-[2rem] border border-slate-100 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-[9px] font-black text-slate-400 uppercase tracking-widest block ml-1">
                    Rate this Resource
                  </h4>
                  {isRating && (
                    <div className="animate-spin w-3 h-3 border-2 border-indigo-500 border-t-transparent rounded-full"></div>
                  )}
                </div>
                <div className="flex justify-between items-center bg-white px-5 py-4 rounded-2xl border border-slate-100">
                  <RatingStars rating={userRating} onRate={handleRate} />
                  <span className="text-[9px] font-black text-indigo-500 uppercase tracking-tighter">
                    {userRating > 0 ? `Rated ${userRating}/5` : "Tap to rate"}
                  </span>
                </div>
              </div>
            )}

            <div>
              <h4 className="text-[10px] font-black text-slate-300 uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-pulse"></div>
                Community Inquiry Thread
              </h4>
              <div className="space-y-5">
                {comments.map((c) => (
                  <div key={c.timestamp} className="flex gap-4 group">
                    <div className="w-8 h-8 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-[10px] font-black text-indigo-500 flex-shrink-0">
                      {c.userName[0]}
                    </div>
                    <div className="flex-grow">
                      <div className="flex justify-between items-center mb-1.5">
                        <span className="text-[10px] font-black text-slate-900">
                          {c.userName}
                        </span>
                        <span className="text-[8px] font-bold text-slate-300 uppercase">
                          {new Date(c.timestamp).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 font-bold bg-slate-50 p-4 rounded-2xl rounded-tl-none border border-slate-100 leading-relaxed">
                        {c.text}
                      </p>
                    </div>
                  </div>
                ))}
                {comments.length === 0 && (
                  <div className="text-center py-10">
                    <p className="text-[9px] font-black text-slate-200 uppercase tracking-widest">
                      No inquiries yet
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Action Footer: Static at the bottom, ensuring buttons are always reachable after scrolling */}
          <div className="p-8 md:p-10 border-t border-slate-50 bg-white shadow-[0_-10px_30px_rgba(0,0,0,0.02)] flex-shrink-0 z-20">
            {user ? (
              <div className="flex gap-3 mb-6">
                <input
                  placeholder="Ask the owner..."
                  className="flex-grow px-5 py-3.5 rounded-2xl border border-slate-100 bg-slate-50 text-sm font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all placeholder:text-slate-300 shadow-sm"
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handlePostComment()}
                />
                <button
                  onClick={handlePostComment}
                  className="w-12 h-12 bg-indigo-600 text-white rounded-2xl flex items-center justify-center hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100"
                >
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2.5"
                      d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                    ></path>
                  </svg>
                </button>
              </div>
            ) : (
              <div className="text-center mb-6">
                <p className="text-[9px] font-black text-slate-300 uppercase tracking-[0.2em]">
                  Sign in to comment
                </p>
              </div>
            )}

            <div className="flex flex-col gap-3">
              {/* changed */}

              {resource.documentUrl && (
  <button
    onClick={handleDownload}
    className="w-full py-5 bg-red-600 text-white rounded-2xl font-black text-center text-[10px] uppercase tracking-[0.2em] hover:bg-red-700 transition-all flex items-center justify-center gap-3 shadow-xl shadow-red-100"
  >
    <svg
      className="w-5 h-5"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2.5"
        d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
      />
    </svg>
    Get Study Material (PDF)
  </button>
)}

              {!isOwner && (
                <button
                  onClick={() => {
                    onAction(resource.id);
                    onClose();
                  }}
                  className="w-full py-5 bg-indigo-600 text-white rounded-[1.5rem] font-black text-[10px] uppercase tracking-[0.2em] shadow-2xl shadow-indigo-100 hover:bg-indigo-700 transition-all active:scale-95"
                >
                  Instant Inquiry
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// --- Auth Page Component ---
const AuthPage = ({ onDemoLogin }: { onDemoLogin: (u: User) => void }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [college, setCollege] = useState(HYDERABAD_COLLEGES[0]);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        const cred = await createUserWithEmailAndPassword(
          auth,
          email,
          password
        );
        await updateProfile(cred.user, { displayName: name });
await set(ref(rtdb, `users/${cred.user.uid}`), {
  name,
  email,
  college,
  points: 0,
  tier: "Bronze III",
  badges: {},
  stats: {
    uploads: 0,
    comments: 0,
    ratingsGiven: 0,
    ratingsReceived: 0,
  },
});
      }
      navigate("/");
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto px-4 py-20">
      <div className="bg-white rounded-[3rem] p-10 shadow-2xl shadow-indigo-100/30 border border-slate-100">
        <h2 className="text-3xl font-black text-slate-900 mb-8">
          {isLogin ? "Welcome Back" : "Create Account"}
        </h2>
        <form onSubmit={handleSubmit} className="space-y-6">
          {!isLogin && (
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block ml-1">
                Full Name
              </label>
              <input
                required
                className="w-full px-5 py-4 rounded-2xl bg-slate-50 border border-slate-100 focus:bg-white outline-none font-bold text-sm text-slate-900"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
          )}
          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block ml-1">
              College
            </label>
            <select
              className="w-full px-5 py-4 rounded-2xl bg-slate-50 border border-slate-100 focus:bg-white outline-none font-bold text-sm text-slate-900"
              value={college}
              onChange={(e) => setCollege(e.target.value)}
            >
              {HYDERABAD_COLLEGES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block ml-1">
              Email
            </label>
            <input
              type="email"
              required
              className="w-full px-5 py-4 rounded-2xl bg-slate-50 border border-slate-100 focus:bg-white outline-none font-bold text-sm text-slate-900"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block ml-1">
              Password
            </label>
            <input
              type="password"
              required
              className="w-full px-5 py-4 rounded-2xl bg-slate-50 border border-slate-100 focus:bg-white outline-none font-bold text-sm text-slate-900"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <button
            disabled={loading}
            className="w-full bg-indigo-600 text-white py-5 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all"
          >
            {loading ? "Processing..." : isLogin ? "Sign In" : "Sign Up"}
          </button>
        </form>
        <button
          onClick={() => setIsLogin(!isLogin)}
          className="w-full mt-6 text-indigo-600 font-bold text-[10px] uppercase tracking-widest"
        >
          {isLogin
            ? "Need an account? Sign Up"
            : "Already have an account? Sign In"}
        </button>
        <button
          onClick={() => {
            const demoUser: User = {
              id: "demo_user",
              name: "Demo Student",
              email: "demo@example.com",
              college: HYDERABAD_COLLEGES[0],
            };
            onDemoLogin(demoUser);
            navigate("/");
          }}
          className="w-full mt-4 text-slate-400 font-bold text-[9px] uppercase tracking-widest border border-slate-100 py-3 rounded-xl hover:bg-slate-50 transition-all"
        >
          Try Demo Account
        </button>
      </div>
    </div>
  );
};

// --- Profile Page Component ---
const ProfilePage = ({
  user,
  onUpdate,
}: {
  user: User;
  onUpdate: (d: Partial<User>) => void;
}) => {
  const [college, setCollege] = useState(user.college);
  const [saving, setSaving] = useState(false);

  const handleUpdate = async () => {
    setSaving(true);
    try {
      await update(ref(rtdb, `users/${user.id}`), { college });
      onUpdate({ college });
      alert("Profile updated!");
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-20">
      <div className="bg-white rounded-[3rem] p-12 shadow-2xl shadow-indigo-100/30 border border-slate-100 text-center">
<div className="flex flex-col items-center mb-8">
  <div
    className={`w-24 h-24 rounded-[2rem] flex items-center justify-center text-3xl font-black shadow-inner ${
      getTierStyle(user.tier)
    }`}
  >
    {user.name[0]}
  </div>

  <div className="mt-4 flex items-center gap-3">
    <span className="px-4 py-1.5 rounded-full bg-indigo-600 text-white text-[10px] font-black uppercase tracking-widest">
      {user.points} Points
    </span>

    <span
      className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${getTierStyle(
        user.tier
      )}`}
    >
      {user.tier}
    </span>
  </div>
</div>
        <h2 className="text-3xl font-black text-slate-900 mb-2">{user.name}</h2>
        <p className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-10">
          {user.email}
        </p>
<div className="mt-8">
  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">
    Badges Earned
  </h4>

  {user.badges && Object.keys(user.badges).length > 0 ? (
    <div className="flex flex-wrap gap-3 justify-center">
{Object.keys(user.badges).map((b) => {
  const meta = BADGE_META[b] || {
    icon: "🏅",
    bg: "bg-slate-100",
  };

  return (
    <div
      key={b}
      className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest ${meta.bg}`}
    >
      <span className="text-lg">{meta.icon}</span>
      <span>{b}</span>
    </div>
  );
})}
    </div>
  ) : (
    <p className="text-[10px] text-slate-300 font-bold uppercase tracking-widest">
      No badges yet
    </p>
  )}
</div>

        <div className="text-left space-y-8 max-w-sm mx-auto">
          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block ml-1">
              Current College
            </label>
            <select
              className="w-full px-6 py-4 rounded-2xl bg-slate-50 border border-slate-100 focus:bg-white outline-none font-bold text-sm text-slate-900 transition-all"
              value={college}
              onChange={(e) => setCollege(e.target.value)}
            >
              {HYDERABAD_COLLEGES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <button
            onClick={handleUpdate}
            disabled={saving}
            className="w-full bg-slate-900 text-white py-5 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl hover:bg-indigo-600 transition-all"
          >
            {saving ? "Updating..." : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
};

// --- App Main ---
const App: React.FC = () => {
  const [earnedBadge, setEarnedBadge] = useState<string | null>(null);

  useEffect(() => {
const handler = (e: any) => {
  console.log("BADGE EVENT RECEIVED:", e.detail);
  setEarnedBadge(e.detail);

  // 👇 FORCE USER STATE REFRESH
  setCurrentUser((prev) => (prev ? { ...prev } : prev));
};

    window.addEventListener("badge-earned", handler);

    return () => {
      window.removeEventListener("badge-earned", handler);
    };
  }, []);

  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const saved = sessionStorage.getItem("hydrashare_user");
    return saved ? JSON.parse(saved) : null;
  });

  const [resources, setResources] = useState<Resource[]>([]);
  const [requests, setRequests] = useState<ShareRequest[]>([]);
  const [showRequestModal, setShowRequestModal] = useState<string | null>(null);
  const [selectedDetailId, setSelectedDetailId] = useState<string | null>(null);
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [reqMsg, setReqMsg] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, (fbUser) => {
      if (fbUser) {
        onValue(ref(rtdb, `users/${fbUser.uid}`), (snap) => {
          const d = snap.val();
const userData: User = {
  id: fbUser.uid,
  name: fbUser.displayName || d?.name || "Student",
  email: fbUser.email || "",
  college: d?.college || HYDERABAD_COLLEGES[0],

  points: d?.points ?? 0,
  tier: d?.tier ?? "Bronze III",

  badges: d?.badges ?? {},
  stats: d?.stats ?? {
    uploads: 0,
    comments: 0,
    ratingsGiven: 0,
    ratingsReceived: 0,
  },
};
          setCurrentUser(userData);
          sessionStorage.setItem("hydrashare_user", JSON.stringify(userData));
        });
      } else {
        setCurrentUser(null);
        sessionStorage.removeItem("hydrashare_user");
      }
      setLoading(false);
    });

    onValue(ref(rtdb, "resources"), (snap) => {
      const d = snap.val();
      if (d)
        setResources(
          Object.keys(d)
            .map((k) => ({ id: k, ...d[k] }))
            .sort((a, b) => b.createdAt - a.createdAt)
        );
      else setResources(INITIAL_RESOURCES);
    });

    onValue(ref(rtdb, "requests"), (snap) => {
      const d = snap.val();
      if (d) setRequests(Object.keys(d).map((k) => ({ id: k, ...d[k] })));
    });
  }, []);

  const handleLogout = async () => {
    await signOut(auth);
    setCurrentUser(null);
    sessionStorage.removeItem("hydrashare_user");
    window.location.href = "#/";
  };

  const handleSendReq = async () => {
  if (!showRequestModal || !currentUser || !reqMsg.trim()) return;

  const requestRef = push(ref(rtdb, "requests"));

  const messageRef = push(ref(rtdb, `requests/${requestRef.key}/messages`));

  await set(requestRef, {
    resourceId: showRequestModal,
    requesterId: currentUser.id,
    requesterName: currentUser.name,
    status: "pending",
    timestamp: Date.now(),
  });

  await set(messageRef, {
    id: messageRef.key,
    senderId: currentUser.id,
    senderName: currentUser.name,
    text: reqMsg,
    timestamp: Date.now(),
  });

  setShowRequestModal(null);
  setReqMsg("");
};


  const handleAcceptRequest = async (reqId: string) => {
    await update(ref(rtdb, `requests/${reqId}`), { status: "accepted" });
  };

  if (loading)
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );

  return (
    <HashRouter>
      <div className="min-h-screen flex flex-col bg-[#fafafa]">
        <Header user={currentUser} onLogout={handleLogout} />
        <main className="flex-grow">
          <Routes>
            <Route
              path="/"
              element={
                <HomePage
                  resources={resources}
                  onSelectDetail={setSelectedDetailId}
                  onRequest={setShowRequestModal}
                />
              }
            />
            <Route
              path="/auth"
              element={<AuthPage onDemoLogin={setCurrentUser} />}
            />
            <Route
              path="/post"
              element={
                currentUser ? (
                  <PostResourcePage user={currentUser} />
                ) : (
                  <Navigate to="/auth" />
                )
              }
            />
            <Route
              path="/profile"
              element={
                currentUser ? (
                  <ProfilePage
                    user={currentUser}
                    onUpdate={(d) => setCurrentUser({ ...currentUser, ...d })}
                  />
                ) : (
                  <Navigate to="/auth" />
                )
              }
            />
            <Route
              path="/my-items"
              element={
                currentUser ? (
                  <div className="max-w-7xl mx-auto px-4 py-16">
                    <div className="flex flex-col md:flex-row justify-between items-end gap-6 mb-12">
                      <div>
                        <h2 className="text-5xl font-black text-slate-900 mb-2">
                          My Hub
                        </h2>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">
                          Coordination Center
                        </p>
                      </div>
                      <Link
                        to="/post"
                        className="bg-indigo-600 text-white px-8 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all"
                      >
                        New Listing
                      </Link>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 h-[700px]">
                      <div className="lg:col-span-4 flex flex-col gap-6 overflow-y-auto no-scrollbar pr-2">
                        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
                          <h4 className="font-black text-slate-300 uppercase text-[9px] mb-6 tracking-widest flex items-center gap-2">
                            <div className="w-1.5 h-1.5 bg-amber-500 rounded-full"></div>
                            Pending Inquiries
                          </h4>
                          <div className="space-y-3">
                            {requests.filter(
                              (r) =>
                                r.status === "pending" &&
                                resources.find((res) => res.id === r.resourceId)
                                  ?.ownerId === currentUser.id
                            ).length > 0 ? (
                              requests
                                .filter(
                                  (r) =>
                                    r.status === "pending" &&
                                    resources.find(
                                      (res) => res.id === r.resourceId
                                    )?.ownerId === currentUser.id
                                )
                                .map((r) => (
                                  <div
                                    key={r.id}
                                    className="p-4 bg-slate-50 rounded-2xl border border-slate-100"
                                  >
                                    <div className="flex justify-between items-start mb-2">
                                      <p className="text-xs font-black text-slate-900">
                                        {r.requesterName}
                                      </p>
                                      <span className="text-[8px] font-black text-slate-300 uppercase">
                                        {new Date(
                                          r.timestamp
                                        ).toLocaleDateString()}
                                      </span>
                                    </div>
                                    <p className="text-[10px] text-indigo-600 font-bold mb-3 uppercase tracking-tighter truncate">
                                      Wants:{" "}
                                      {
                                        resources.find(
                                          (res) => res.id === r.resourceId
                                        )?.title
                                      }
                                    </p>
                                    <div className="flex gap-2">
                                      <button
                                        onClick={() =>
                                          handleAcceptRequest(r.id)
                                        }
                                        className="flex-1 py-2 bg-indigo-600 text-white rounded-lg text-[9px] font-black uppercase tracking-widest"
                                      >
                                        Accept
                                      </button>
                                      <button className="flex-1 py-2 bg-slate-200 text-slate-400 rounded-lg text-[9px] font-black uppercase tracking-widest">
                                        Deny
                                      </button>
                                    </div>
                                  </div>
                                ))
                            ) : (
                              <p className="text-[10px] text-center py-4 font-black text-slate-200 uppercase tracking-widest">
                                No pending items
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm flex-grow">
                          <h4 className="font-black text-slate-300 uppercase text-[9px] mb-6 tracking-widest flex items-center gap-2">
                            <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></div>
                            Active Conversations
                          </h4>
                          <div className="space-y-3">
                            {requests.filter(
                              (r) =>
                                r.status === "accepted" &&
                                (r.requesterId === currentUser.id ||
                                  resources.find(
                                    (res) => res.id === r.resourceId
                                  )?.ownerId === currentUser.id)
                            ).length > 0 ? (
                              requests
                                .filter(
                                  (r) =>
                                    r.status === "accepted" &&
                                    (r.requesterId === currentUser.id ||
                                      resources.find(
                                        (res) => res.id === r.resourceId
                                      )?.ownerId === currentUser.id)
                                )
                                .map((r) => {
                                  const res = resources.find(
                                    (res) => res.id === r.resourceId
                                  );
                                  const isMeOwner =
                                    res?.ownerId === currentUser.id;
                                  return (
                                    <div
                                      key={r.id}
                                      onClick={() => setSelectedChatId(r.id)}
                                      className={`p-4 rounded-2xl cursor-pointer transition-all border ${
                                        selectedChatId === r.id
                                          ? "bg-indigo-600 text-white border-indigo-600 shadow-xl"
                                          : "bg-slate-50 text-slate-900 border-slate-100 hover:bg-white hover:shadow-md"
                                      }`}
                                    >
                                      <div className="flex justify-between items-center mb-1">
                                        <p className="text-xs font-black">
                                          {isMeOwner
                                            ? r.requesterName
                                            : res?.ownerName}
                                        </p>
                                        <div
                                          className={`w-2 h-2 rounded-full ${
                                            selectedChatId === r.id
                                              ? "bg-white"
                                              : "bg-indigo-500"
                                          }`}
                                        ></div>
                                      </div>
                                      <p
                                        className={`text-[9px] font-bold uppercase tracking-tight truncate ${
                                          selectedChatId === r.id
                                            ? "text-indigo-100"
                                            : "text-slate-400"
                                        }`}
                                      >
                                        {res?.title}
                                      </p>
                                    </div>
                                  );
                                })
                            ) : (
                              <p className="text-[10px] text-center py-8 font-black text-slate-200 uppercase tracking-widest">
                                No active chats
                              </p>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="lg:col-span-8 bg-white rounded-[3rem] border border-slate-100 shadow-xl overflow-hidden relative">
                        {selectedChatId ? (
                          <ChatWindow
                            request={
                              requests.find((r) => r.id === selectedChatId)!
                            }
                            user={currentUser}
                            onClose={() => setSelectedChatId(null)}
                            resource={resources.find(
                              (res) =>
                                res.id ===
                                requests.find((r) => r.id === selectedChatId)
                                  ?.resourceId
                            )}
                          />
                        ) : (
                          <div className="h-full flex flex-col items-center justify-center text-center p-12 opacity-30">
                            <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center mb-6">
                              <svg
                                className="w-10 h-10 text-slate-300"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth="2"
                                  d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                                ></path>
                              </svg>
                            </div>
                            <h4 className="text-xl font-black text-slate-900">
                              Select a Conversation
                            </h4>
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-2">
                              Chat with peers to coordinate hand-offs
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  <Navigate to="/auth" />
                )
              }
            />
          </Routes>
        </main>
        <Footer />

        {selectedDetailId && (
          <ResourceDetailModal
            resource={resources.find((r) => r.id === selectedDetailId)!}
            onClose={() => setSelectedDetailId(null)}
            onAction={setShowRequestModal}
            isOwner={
              currentUser?.id ===
              resources.find((r) => r.id === selectedDetailId)?.ownerId
            }
            user={currentUser}
          />
        )}

        {showRequestModal && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md animate-in fade-in duration-300">
            <div className="bg-white rounded-[3rem] w-full max-w-md p-10 md:p-14 shadow-2xl animate-in zoom-in duration-300">
              <div className="text-center mb-10">
                <h3 className="text-3xl font-black text-slate-900 mb-2">
                  Send Inquiry
                </h3>
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                  Private Message to Owner
                </p>
              </div>

              <div className="space-y-2 mb-8">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                  Your Message
                </label>
                <textarea
                  placeholder="Hey, I'm interested! Can we connect for a quick exchange?"
                  className="w-full p-6 rounded-[2rem] border border-slate-100 bg-slate-50 text-sm font-bold text-slate-900 min-h-[160px] focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all placeholder:text-slate-300 shadow-sm"
                  value={reqMsg}
                  onChange={(e) => setReqMsg(e.target.value)}
                />
              </div>

              <div className="flex flex-col gap-3">
                <button
                  onClick={handleSendReq}
                  className="w-full bg-indigo-600 text-white py-5 rounded-[1.5rem] font-black uppercase tracking-[0.2em] text-[10px] shadow-2xl shadow-indigo-100 hover:bg-indigo-700 transition-all"
                >
                  Send Inquiry
                </button>
                <button
                  onClick={() => setShowRequestModal(null)}
                  className="w-full py-4 text-slate-400 font-black uppercase text-[10px] tracking-widest hover:text-slate-600 transition-colors"
                >
                  Discard
                </button>
              </div>
            </div>
          </div>
        )}
        {earnedBadge && (
  <BadgeCongratsModal
    badge={earnedBadge}
    onClose={() => setEarnedBadge(null)}
  />
)}

      </div>
    </HashRouter>
  );
};

// --- HomePage Component ---
const HomePage = ({
  resources,
  onRequest,
  onSelectDetail,
}: {
  resources: Resource[];
  onRequest: (id: string) => void;
  onSelectDetail: (id: string) => void;
}) => {
  const [query, setQuery] = useState("");
  const [selectedCat, setSelectedCat] = useState<string>("All");
  const [recommendations, setRecommendations] = useState<
    { resourceId: string; reason: string }[]
  >([]);
  const [loadingRecs, setLoadingRecs] = useState(false);
  const [selectedGenre, setSelectedGenre] = useState("All");
type SortOption = "newest" | "rating" | "comments" | "popularity";

const [sortBy, setSortBy] = useState<SortOption>("newest");



  // Use Gemini to get smart recommendations based on search query
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (query.trim().length > 3) {
        setLoadingRecs(true);
        try {
          const recs = await getSmartRecommendations(query, resources);
          setRecommendations(recs || []);
        } catch (e) {
          console.error("Failed to get recommendations", e);
        } finally {
          setLoadingRecs(false);
        }
      } else {
        setRecommendations([]);
      }
    }, 1000);
    return () => clearTimeout(timer);
  }, [query, resources]);
const bookGenres = useMemo(() => {
  const set = new Set<string>();
  resources.forEach((r) => {
    if (r.category === "Books" && r.genre) {
      set.add(r.genre);
    }
  });
  return Array.from(set).sort();
}, [resources]);

const filtered = resources.filter((r) => {
  const matchesSearch =
    r.title.toLowerCase().includes(query.toLowerCase()) ||
    r.description.toLowerCase().includes(query.toLowerCase());

  const matchesCat = selectedCat === "All" || r.category === selectedCat;

  const matchesGenre =
    selectedCat !== "Books" ||
    selectedGenre === "All" ||
    r.genre === selectedGenre;

  return matchesSearch && matchesCat && matchesGenre;
});
<div className="mb-10 flex justify-end">
  <select
    value={sortBy}
    onChange={(e) => setSortBy(e.target.value as SortOption)}
    className="px-6 py-3 rounded-2xl border border-slate-100 bg-white text-xs font-bold shadow-sm"
  >
    <option value="newest">Newest First</option>
    <option value="rating">Highest Rated</option>
    <option value="comments">Most Commented</option>
    <option value="popularity">Most Popular</option>
  </select>
</div>

const sortedResources = useMemo(() => {
  const arr = [...filtered];
if (sortBy === "popularity") {
  return arr.sort((a, b) => {
    const aRatings = a.ratings
      ? Object.values(a.ratings).map((r) => Number(r))
      : [];
    const bRatings = b.ratings
      ? Object.values(b.ratings).map((r) => Number(r))
      : [];

    const aAvg =
      aRatings.length > 0
        ? aRatings.reduce((s, r) => s + r, 0) / aRatings.length
        : 0;
    const bAvg =
      bRatings.length > 0
        ? bRatings.reduce((s, r) => s + r, 0) / bRatings.length
        : 0;

    const aComments = a.comments ? Object.keys(a.comments).length : 0;
    const bComments = b.comments ? Object.keys(b.comments).length : 0;

    const aScore = aRatings.length * 5 + aAvg * 10 + aComments * 2;
    const bScore = bRatings.length * 5 + bAvg * 10 + bComments * 2;

    return bScore - aScore;
  });
}

  if (sortBy === "rating") {
    return arr.sort((a, b) => {
      const aRatings = a.ratings
        ? Object.values(a.ratings).map((r) => Number(r))
        : [];
      const bRatings = b.ratings
        ? Object.values(b.ratings).map((r) => Number(r))
        : [];

      const aAvg =
        aRatings.length > 0
          ? aRatings.reduce((s, r) => s + r, 0) / aRatings.length
          : 0;
      const bAvg =
        bRatings.length > 0
          ? bRatings.reduce((s, r) => s + r, 0) / bRatings.length
          : 0;

      return bAvg - aAvg;
    });
  }

  if (sortBy === "comments") {
    return arr.sort((a, b) => {
      const aCount = a.comments ? Object.keys(a.comments).length : 0;
      const bCount = b.comments ? Object.keys(b.comments).length : 0;
      return bCount - aCount;
    });
  }

  // newest (default)
  return arr.sort((a, b) => b.createdAt - a.createdAt);
}, [filtered, sortBy]);

  return (
    <div className="max-w-7xl mx-auto px-4 py-12">
      <section className="mb-20 bg-white p-12 md:p-24 rounded-[4rem] shadow-2xl shadow-indigo-100/30 border border-slate-50 flex flex-col lg:flex-row items-center gap-16 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-50 rounded-full -mr-32 -mt-32 blur-3xl opacity-50"></div>
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-pink-50 rounded-full -ml-32 -mb-32 blur-3xl opacity-50"></div>

        <div className="lg:w-3/5 z-10 relative">
          <div className="inline-block px-4 py-1.5 rounded-full bg-indigo-50 text-indigo-600 text-[10px] font-black uppercase tracking-[0.2em] mb-8">
            Official Hyderabad Student Hub
          </div>
          <h2 className="text-6xl lg:text-7xl font-black text-slate-900 mb-10 leading-[1] tracking-tight">
            Exchange. <br />
            <span className="text-indigo-600">Empower.</span> <br />
            Excel.
          </h2>
          <div className="relative max-w-lg">
            <input
              placeholder="Search Books, Kits, Components..."
              className="w-full pl-16 pr-8 py-6 rounded-[2.5rem] border border-slate-100 bg-white font-bold text-slate-900 shadow-xl shadow-slate-100/50 focus:ring-2 focus:ring-indigo-500 outline-none transition-all placeholder:text-slate-300"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <svg
              className="absolute left-6 top-1/2 -translate-y-1/2 w-6 h-6 text-slate-300"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="3"
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              ></path>
            </svg>
          </div>

          {/* Smart AI Recommendations display */}
          {query.trim().length > 3 && (
            <div className="mt-6 animate-in fade-in slide-in-from-top-2 duration-500">
              <h4 className="text-[10px] font-black text-indigo-600 uppercase tracking-widest mb-3 flex items-center gap-2">
                <div className="w-1 h-1 bg-indigo-600 rounded-full animate-ping"></div>
                {loadingRecs ? "AI is thinking..." : "Gemini Recommends"}
              </h4>
              <div className="space-y-2">
                {recommendations.map((rec) => {
                  const res = resources.find((r) => r.id === rec.resourceId);
                  if (!res) return null;
                  return (
                    <div
                      key={rec.resourceId}
                      onClick={() => onSelectDetail(res.id)}
                      className="bg-indigo-50/50 border border-indigo-100 p-3 rounded-2xl cursor-pointer hover:bg-white transition-all group"
                    >
                      <p className="text-[11px] font-black text-slate-900 group-hover:text-indigo-600 transition-colors">
                        {res.title}
                      </p>
                      <p className="text-[9px] text-indigo-400 font-bold mt-0.5">
                        {rec.reason}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
        <div className="lg:w-2/5 z-10">
          <img
            src="https://picsum.photos/seed/campus_exchange/800/800"
            className="rounded-[4rem] shadow-[0_40px_100_rgba(0,0,0,0.1)] rotate-3 hover:rotate-0 transition-transform duration-700"
            alt="Community"
          />
        </div>
      </section>

      <div className="mb-12">
        <div className="flex overflow-x-auto pb-4 gap-3 no-scrollbar">
          <button
            onClick={() => setSelectedCat("All")}
            className={`whitespace-nowrap px-8 py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${
              selectedCat === "All"
                ? "bg-slate-900 text-white shadow-xl"
                : "bg-white text-slate-400 border border-slate-100 hover:border-indigo-300"
            }`}
          >
            Everything
          </button>
          {CATEGORIES.map((c) => (
            <button
              key={c}
              onClick={() => setSelectedCat(c)}
              className={`whitespace-nowrap px-8 py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${
                selectedCat === c
                  ? "bg-indigo-600 text-white shadow-xl shadow-indigo-100"
                  : "bg-white text-slate-400 border border-slate-100 hover:border-indigo-300"
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      </div>
{selectedCat === "Books" && (
  <div className="mb-10 flex justify-start">
    <select
      value={selectedGenre}
      onChange={(e) => setSelectedGenre(e.target.value)}
      className="px-6 py-3 rounded-2xl border border-slate-100 bg-white text-xs font-bold shadow-sm"
    >
      <option value="All">All Genres</option>
      {bookGenres.map((g) => (
        <option key={g} value={g}>
          {g}
        </option>
      ))}
    </select>
  </div>
)}
{/* Sorting Dropdown */}
<div className="mb-10 flex justify-end">
  <select
    value={sortBy}
    onChange={(e) => setSortBy(e.target.value as SortOption)}
    className="px-6 py-3 rounded-2xl border border-slate-100 bg-white text-xs font-bold shadow-sm"
  >
    <option value="newest">Newest First</option>
    <option value="rating">Highest Rated</option>
    <option value="comments">Most Commented</option>
    <option value="popularity">Most Popular</option>
  </select>
</div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10">
        {sortedResources.map((res) => (
          <ResourceCard
            key={res.id}
            resource={res}
            onAction={onRequest}
            onClick={() => onSelectDetail(res.id)}
          />
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-32">
          <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6 text-slate-200">
            <svg
              className="w-10 h-10"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M9.172 9.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              ></path>
            </svg>
          </div>
          <h3 className="text-xl font-black text-slate-900">No items found</h3>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-2">
            Try searching for something else
          </p>
        </div>
      )}
    </div>
  );
};
const BadgeCongratsModal = ({
  badge,
  onClose,
}: {
  badge: string;
  onClose: () => void;
}) => {
const meta =
  BADGE_META[badge] || {
    title: badge,
    icon: "🏅",
    bg: "bg-slate-100",
  };

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/70 backdrop-blur-md">
      <ConfettiRain />
      <div className="relative bg-white rounded-[3rem] p-16 text-center shadow-2xl">
        <h2 className="text-4xl font-black text-slate-900 mb-4">
          🎉 Congratulations!
        </h2>

        <div
          className={`w-32 h-32 mx-auto mb-6 rounded-full flex items-center justify-center text-6xl ${meta.bg}`}
        >
          {meta.icon}
        </div>

        <p className="text-xl font-black text-indigo-600 mb-8">
          {meta.title} Badge Earned
        </p>

        <button
          onClick={onClose}
          className="px-10 py-4 bg-indigo-600 text-white rounded-2xl font-black uppercase tracking-widest"
        >
          Close
        </button>
      </div>
    </div>
  );
};
const ConfettiRain = () => {
  const emojis = ["🎉", "🎊", "✨", "📚", "⭐", "🔥"];

  return (
    <>
      <style>
        {`
          @keyframes confetti-fall {
            0% {
              transform: translateY(-20px);
              opacity: 1;
            }
            100% {
              transform: translateY(100vh);
              opacity: 0;
            }
          }
        `}
      </style>

      <div className="pointer-events-none fixed inset-0 z-[998] overflow-hidden">
        {Array.from({ length: 40 }).map((_, i) => {
          const left = Math.random() * 100;
          const delay = Math.random() * 1;
          const duration = 2 + Math.random() * 2;

          return (
            <span
              key={i}
              style={{
                position: "absolute",
                top: "-30px",
                left: `${left}%`,
                fontSize: "28px",
                animation: `confetti-fall ${duration}s linear ${delay}s infinite`,
              }}
            >
              {emojis[i % emojis.length]}
            </span>
          );
        })}
      </div>
    </>
  );
};


export default App;
