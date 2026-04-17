-- IceTube Supabase Schema Migration

-- USERS TABLE
CREATE TABLE IF NOT EXISTS public.users (
  id UUID REFERENCES auth.users NOT NULL PRIMARY KEY,
  uid TEXT UNIQUE NOT NULL, -- Keep UID for backwards compatibility/migration
  email TEXT NOT NULL,
  display_name TEXT NOT NULL,
  pseudonym TEXT,
  photo_url TEXT,
  banner_url TEXT,
  subscribers INTEGER DEFAULT 0,
  ices INTEGER DEFAULT 0,
  primary_channel_id TEXT, -- This will be a reference to a channel
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- CHANNELS TABLE
CREATE TABLE IF NOT EXISTS public.channels (
  id TEXT PRIMARY KEY, -- We'll use UUID strings or the existing IDs
  owner_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL,
  photo_url TEXT,
  banner_url TEXT,
  is_primary BOOLEAN DEFAULT false,
  subscribers INTEGER DEFAULT 0,
  ices INTEGER DEFAULT 0,
  competitors TEXT[], -- Array of strings
  pinned_achievements TEXT[], -- Array of strings
  is_banned BOOLEAN DEFAULT false,
  bio TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- VIDEOS TABLE
CREATE TABLE IF NOT EXISTS public.videos (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT,
  video_url TEXT NOT NULL,
  thumbnail_url TEXT NOT NULL,
  author_id TEXT NOT NULL, -- Reference to channel id
  author_name TEXT,
  author_photo_url TEXT,
  views BIGINT DEFAULT 0,
  likes BIGINT DEFAULT 0,
  ices BIGINT DEFAULT 0,
  duration TEXT,
  sound_name TEXT,
  hashtags TEXT[],
  is_short BOOLEAN DEFAULT false,
  is_music BOOLEAN DEFAULT false,
  is_photo BOOLEAN DEFAULT false,
  music_metadata JSONB, -- Nested object for music data
  recommendation_score FLOAT DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- PLAYLISTS TABLE
CREATE TABLE IF NOT EXISTS public.playlists (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  author_id TEXT NOT NULL,
  video_ids TEXT[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- COMMUNITY POSTS TABLE
CREATE TABLE IF NOT EXISTS public.community_posts (
  id TEXT PRIMARY KEY,
  author_id TEXT NOT NULL,
  author_name TEXT,
  author_photo_url TEXT,
  text TEXT NOT NULL,
  type TEXT CHECK (type IN ('text', 'poll')),
  poll_options JSONB, -- Array of options with votes
  likes INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- HISTORY TABLE
CREATE TABLE IF NOT EXISTS public.history (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  video_id TEXT NOT NULL,
  watched_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- WATCH LATER TABLE
CREATE TABLE IF NOT EXISTS public.watch_later (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  video_id TEXT NOT NULL,
  added_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- FAVORITES TABLE
CREATE TABLE IF NOT EXISTS public.favorites (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  video_id TEXT NOT NULL,
  added_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- HIDDEN CHANNELS TABLE
CREATE TABLE IF NOT EXISTS public.hidden_channels (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  channel_id TEXT NOT NULL,
  added_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- NOTIFICATIONS TABLE
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL,
  type TEXT NOT NULL,
  video_id TEXT,
  video_title TEXT,
  from_user_id TEXT,
  from_user_name TEXT,
  from_user_avatar TEXT,
  comment_text TEXT,
  read BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- RLS RULES (Basic patterns)

-- USERS: Everyone can read public profiles, but only owners can update their own
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public users are viewable by everyone." ON public.users FOR SELECT USING (true);
CREATE POLICY "Users can update own document." ON public.users FOR UPDATE USING (auth.uid() = id);

-- CHANNELS: Everyone can read, owners can modify
ALTER TABLE public.channels ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Channels are viewable by everyone." ON public.channels FOR SELECT USING (true);
CREATE POLICY "Owners can modify their own channels." ON public.channels FOR ALL USING (auth.uid()::text = owner_id::text);

-- VIDEOS: Everyone can read, owners can modify
ALTER TABLE public.videos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Videos are viewable by everyone." ON public.videos FOR SELECT USING (true);
CREATE POLICY "Authors can modify their own videos." ON public.videos FOR ALL USING (true); -- Simplify for now, refine later

-- Refine policies as needed...
