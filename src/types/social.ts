export type Reaction = 'Like' | 'Love' | 'Haha' | 'Wow' | 'Sad' | 'Angry';

export type Post = {
  id: string;
  author: {id?: string; name: string; username: string; initials: string; accent: string; avatarUrl?: string};
  body: string;
  createdAt: string;
  reactions: number;
  comments: number;
  shares: number;
  viewerReaction?: Reaction;
  viewerSaved?: boolean;
  pinned?: boolean;
  media?: {url: string; type: 'image'|'video'; thumbnailUrl?: string}[];
};

export type AppUser = {id: string; name: string; username: string; email: string};
