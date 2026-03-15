import React, { useState } from 'react';
import { Button } from './ui/button';
import { Play, ExternalLink, X } from 'lucide-react';
import { getYouTubeVideoId } from '../utils/linkUtils';

const YouTubePreview = ({ url, onClose, className = '' }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const videoId = getYouTubeVideoId(url);

  if (!videoId) {
    return null;
  }

  const thumbnailUrl = `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
  const embedUrl = `https://www.youtube.com/embed/${videoId}`;

  const handlePlay = () => {
    setIsExpanded(true);
  };

  const handleClose = () => {
    setIsExpanded(false);
  };

  const handleOpenYouTube = () => {
    window.open(url, '_blank');
  };

  if (isExpanded) {
    return (
      <div className={`bg-white rounded-lg shadow-sm border overflow-hidden ${className}`}>
        {onClose && (
          <div className="flex justify-between items-center p-2 bg-gray-50">
            <span className="text-xs text-gray-600 font-medium">YouTube Video</span>
            <Button
              size="icon"
              variant="ghost"
              onClick={onClose}
              className="h-6 w-6 text-gray-400 hover:text-gray-600"
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        )}
        <div className="aspect-video">
          <iframe
            src={embedUrl}
            title="YouTube Video"
            className="w-full h-full"
            frameBorder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
        <div className="p-3 bg-gray-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="w-6 h-6 bg-red-600 rounded flex items-center justify-center">
                <Play className="h-3 w-3 text-white fill-white" />
              </div>
              <span className="text-xs text-gray-600 font-medium">YouTube</span>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={handleOpenYouTube}
              className="h-6 px-2 text-xs"
            >
              <ExternalLink className="h-3 w-3 mr-1" />
              เปิดใน YouTube
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-lg shadow-sm border overflow-hidden cursor-pointer hover:shadow-md transition-shadow ${className}`}>
      {onClose && (
        <div className="flex justify-end p-2">
          <Button
            size="icon"
            variant="ghost"
            onClick={onClose}
            className="h-6 w-6 text-gray-400 hover:text-gray-600"
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      )}
      
      <div className="relative" onClick={handlePlay}>
        <img
          src={thumbnailUrl}
          alt="YouTube Video Thumbnail"
          className="w-full h-48 object-cover"
          onError={(e) => {
            // Fallback to default thumbnail if maxresdefault fails
            e.target.src = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
          }}
        />
        
        {/* Play Button Overlay */}
        <div className="absolute inset-0 flex items-center justify-center bg-black/20 hover:bg-black/30 transition-colors">
          <div className="w-16 h-16 bg-red-600 rounded-full flex items-center justify-center shadow-lg hover:scale-110 transition-transform">
            <Play className="h-8 w-8 text-white fill-white ml-1" />
          </div>
        </div>
        
        {/* YouTube Logo */}
        <div className="absolute top-3 left-3 bg-red-600 text-white px-2 py-1 rounded text-xs font-medium">
          YouTube
        </div>
      </div>
      
      <div className="p-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 bg-red-600 rounded flex items-center justify-center">
              <Play className="h-2 w-2 text-white fill-white" />
            </div>
            <span className="text-xs text-gray-600">คลิกเพื่อเล่นวิดีโอ</span>
          </div>
          <Button
            size="sm"
            variant="ghost"
            onClick={(e) => {
              e.stopPropagation();
              handleOpenYouTube();
            }}
            className="h-6 px-2 text-xs text-gray-500 hover:text-gray-700"
          >
            <ExternalLink className="h-3 w-3 mr-1" />
            เปิด
          </Button>
        </div>
      </div>
    </div>
  );
};

export default YouTubePreview;
