export type Category =
  | "Books"
  | "Notes"
  | "Lab Equipment"
  | "Electronics"
  | "Others";

export interface User {
  id: string;
  name: string;
  college: string;
  email: string;
  password?: string;
}

export interface Comment {
  id: string;
  userId: string;
  userName: string;
  text: string;
  timestamp: number;
}

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  text: string;
  timestamp: number;
}

export interface Resource {
  id: string;
  title: string;
  description: string;
  category: Category;

  imageUrl: string;          // ✅ keep ONE
  documentUrl?: string;      // ✅ keep ONE

  ownerId: string;
  ownerName: string;
  college: string;
  status: "available" | "borrowed";

  genre?: string;
  createdAt: number;

  comments?: Record<string, Comment>;
  ratings?: Record<string, number>;

  viewCount?: number;        // 👁️ views
  downloadCount?: number;    // ⬇️ downloads (PDF only)
}

export interface ShareRequest {
  id: string;
  resourceId: string;
  requesterId: string;
  requesterName: string;
  status: "pending" | "accepted" | "rejected";
  message: string;
  timestamp: number;
  messages?: Record<string, ChatMessage>;
}

export interface Recommendation {
  resourceId: string;
  reason: string;
}

export interface Event {
  id: number;
  name: string;
  venue: string;
  description: string;
  image: string;
  registrationLink: string;
  eventDate: string; // ✅ NEW (ISO date string)
}


