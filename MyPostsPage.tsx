import { useState } from "react";
import { ref, remove, update } from "firebase/database";
import { rtdb } from "./firebase";
import { Resource, User } from "./types";

type Props = {
  user: User;
  resources: Resource[];
};

const MyPostsPage = ({ user, resources }: Props) => {
  const myPosts = resources.filter((r) => r.ownerId === user.id);

  const [editingPost, setEditingPost] = useState<Resource | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");

  // DELETE
  const handleDelete = async (id: string) => {
    const ok = window.confirm("Delete this post?");
    if (!ok) return;

    await remove(ref(rtdb, `resources/${id}`));
  };

  // OPEN EDIT MODAL
  const openEdit = (post: Resource) => {
    setEditingPost(post);
    setTitle(post.title);
    setDescription(post.description);
    setCategory(post.category);
  };

  // SAVE EDIT
  const saveEdit = async () => {
    if (!editingPost) return;

    await update(ref(rtdb, `resources/${editingPost.id}`), {
      title,
      description,
      category,
    });

    setEditingPost(null);
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-14">
      <h1 className="text-4xl font-black mb-10">My Posts</h1>

      {myPosts.length === 0 && (
        <p className="text-gray-500 font-semibold">
          You have not posted anything yet.
        </p>
      )}

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
        {myPosts.map((post) => (
          <div
            key={post.id}
            className="bg-white rounded-3xl shadow border p-6"
          >
            <img
              src={post.imageUrl}
              className="h-44 w-full object-cover rounded-xl mb-4"
            />

            <h3 className="font-bold text-lg">{post.title}</h3>
            <p className="text-sm text-gray-500 line-clamp-2 mb-4">
              {post.description}
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => openEdit(post)}
                className="flex-1 bg-indigo-600 text-white py-2 rounded-xl font-bold"
              >
                Edit
              </button>

              <button
                onClick={() => handleDelete(post.id)}
                className="flex-1 bg-red-600 text-white py-2 rounded-xl font-bold"
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* EDIT MODAL */}
     {editingPost && (
  <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
    <div className="bg-white p-8 rounded-3xl w-full max-w-lg">
      <h2 className="text-2xl font-black mb-6">Edit Post</h2>

      <input
        className="w-full mb-4 p-3 border rounded-xl"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Title"
      />

      <textarea
        className="w-full mb-4 p-3 border rounded-xl"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Description"
      />

      {/* ✅ FIXED SELECT */}
      <select
        className="w-full mb-6 p-3 border rounded-xl"
        value={category}
        onChange={(e) =>
          setCategory(
            e.target.value as
              | "Books"
              | "Notes"
              | "Lab Equipment"
              | "Electronics"
              | "Others"
          )
        }
      >
        <option value="Books">Books</option>
        <option value="Notes">Notes</option>
        <option value="Lab Equipment">Lab Equipment</option>
        <option value="Electronics">Electronics</option>
        <option value="Others">Others</option>
      </select>

      <div className="flex gap-3">
        <button
          onClick={saveEdit}
          className="flex-1 bg-indigo-600 text-white py-3 rounded-xl font-bold"
        >
          Save
        </button>

        <button
          onClick={() => setEditingPost(null)}
          className="flex-1 bg-gray-300 py-3 rounded-xl font-bold"
        >
          Cancel
        </button>
      </div>
    </div>
  </div>
)}

    </div>
  );
};

export default MyPostsPage;
