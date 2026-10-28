export type Reaction = 'Like' | 'Love' | 'Haha' | 'Wow' | 'Sad' | 'Angry';

export type Post = {
  id: string;
  author: {
    id?: string;
    name: string;
    username: string;
    initials: string;
    accent: string;
    avatarUrl?: string;
  };
  body: string;
  createdAt: string;
  reactions: number;
  comments: number;
  shares: number;
  viewerReaction?: Reaction;
  viewerSaved?: boolean;
  pinned?: boolean;
  recommendationReason?: string;
  contentWarning?: string;
  group?: { id: string; name: string; visibility?: string; coverUrl?: string; memberCount?: number };
  media?: { url: string; type: 'image' | 'video'; thumbnailUrl?: string }[];
  repostOf?: {
    id: string;
    author: Post['author'];
    body: string;
    createdAt: string;
    media?: { url: string; type: 'image' | 'video'; thumbnailUrl?: string }[];
  };
};

export type AppUser = {
  id: string;
  name: string;
  username: string;
  email: string;
};
