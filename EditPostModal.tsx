import { useState } from "react";
import { Resource } from "./types";

type Category =
  | "Books"
  | "Notes"
  | "Lab Equipment"
  | "Electronics"
  | "Others";

export default function EditPostModal({
  post,
  onClose,
  onSave,
}: {
  post: Resource;
  onClose: () => void;
  onSave: (data: Partial<Resource>) => void;
}) {
  const [title, setTitle] = useState(post.title);
  const [description, setDescription] = useState(post.description);
  const [category, setCategory] = useState<Category>(post.category);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white p-8 rounded-3xl w-full max-w-lg">
        <h2 className="text-2xl font-black mb-6">Edit Resource</h2>

        {/* TITLE */}
        <input
          className="w-full mb-4 p-3 border rounded-xl"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Title"
        />

        {/* DESCRIPTION */}
        <textarea
          className="w-full mb-4 p-3 border rounded-xl"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Description"
        />

        {/* CATEGORY SELECT (FIXED) */}
        <select
          className="w-full mb-6 p-3 border rounded-xl"
          value={category}
          onChange={(e) =>
            setCategory(e.target.value as Category)
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
            onClick={() => onSave({ title, description, category })}
            className="flex-1 bg-indigo-600 text-white py-3 rounded-xl font-bold"
          >
            Save
          </button>

          <button
            onClick={onClose}
            className="flex-1 bg-gray-200 py-3 rounded-xl font-bold"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
