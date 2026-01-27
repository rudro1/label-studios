'use client';

import { useState } from 'react';

interface VideoPlayerProps {
  videoUrl: string | null;
}

export default function VideoPlayer({ videoUrl }: VideoPlayerProps) {
  if (!videoUrl) return null;

  // Convert Google Drive link to embed format
  // Example input: https://drive.google.com/file/d/FILE_ID/view?usp=sharing
  // Example output: https://drive.google.com/file/d/FILE_ID/preview
  const getEmbedUrl = (url: string) => {
    const fileId = url.match(/\/d\/(.*?)\//)![1];
    return `https://drive.google.com/file/d/${fileId}/preview`;
  };

  return (
    <div className='relative w-full aspect-video'>
      <iframe
        src={getEmbedUrl(videoUrl)}
        className='absolute inset-0 rounded-lg w-full h-full'
        allow='autoplay'
        allowFullScreen
      />
    </div>
  );
}
