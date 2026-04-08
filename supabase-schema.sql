-- Run this in your Supabase SQL Editor

CREATE TABLE videos (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  title text NOT NULL,
  description text,
  category text,
  "videoUrl" text NOT NULL,
  "thumbnailUrl" text NOT NULL,
  "authorId" uuid REFERENCES auth.users(id),
  "authorName" text,
  "authorPhotoUrl" text,
  views integer DEFAULT 0,
  likes integer DEFAULT 0,
  "createdAt" timestamp with time zone DEFAULT timezone('utc'::text, now()),
  duration text
);

-- Set up Row Level Security (RLS)
ALTER TABLE videos ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read videos
CREATE POLICY "Anyone can read videos" ON videos FOR SELECT USING (true);

-- Allow authenticated users to insert videos
CREATE POLICY "Authenticated users can insert videos" ON videos FOR INSERT WITH CHECK (auth.uid() = "authorId");

-- Allow users to update their own videos (or anyone to increment views - simplified for now)
CREATE POLICY "Anyone can update videos (for views)" ON videos FOR UPDATE USING (true);
