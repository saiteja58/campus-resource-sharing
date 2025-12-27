
export type Category = 'Books' | 'Notes' | 'Lab Equipment' | 'Electronics' | 'Others';

export interface User {
  id: string;
  name: string;
  email: string;
  college: string;
  points?: number;
  tier?: string;
  badges?: Record<string, boolean>;
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
  imageUrl: string;
  documentUrl?: string;
  ownerId: string;
  ownerName: string;
  college: string;
  status: 'available' | 'borrowed';
  imageUrl: string;
  documentUrl?: string;
  genre?: string;
  createdAt: number;

  comments?: Record<string, Comment>;
  ratings?: Record<string, number>;

    viewCount?: number;       // 👁️ views
  downloadCount?: number;   // ⬇️ downloads (PDF only)

}


export interface ShareRequest {
  id: string;
  resourceId: string;
  requesterId: string;
  requesterName: string;
  status: 'pending' | 'accepted' | 'rejected';
  message: string;
  timestamp: number;
  messages?: Record<string, ChatMessage>;
}

export interface Recommendation {
  resourceId: string;
  reason: string;
}
