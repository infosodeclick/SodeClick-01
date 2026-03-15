import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { 
  Play, 
  Pause, 
  Volume2, 
  VolumeX, 
  Download, 
  ExternalLink,
  Image as ImageIcon,
  Video,
  Music,
  FileText,
  X
} from 'lucide-react';
import { 
  getMediaType, 
  getYouTubeVideoId, 
  extractDomain, 
  formatFileSize,
  generateLinkPreview 
} from '../utils/linkUtils';

const MediaPreview = ({ url, attachment, onClose, className = '' }) => {
  const [linkPreview, setLinkPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);

  useEffect(() => {
    if (url && !attachment) {
      generatePreview();
    }
  }, [url]);

  const generatePreview = async () => {
    setLoading(true);
    try {
      const preview = await generateLinkPreview(url);
      setLinkPreview(preview);
    } catch (error) {
      console.error('Error generating preview:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePlayPause = () => {
    setIsPlaying(!isPlaying);
  };

  const handleMuteToggle = () => {
    setIsMuted(!isMuted);
  };

  // Render attachment preview
  if (attachment) {
    const { type, url: attachmentUrl, filename, size, mimeType } = attachment;

    switch (type) {
      case 'image':
        return (
          <div className={`relative group ${className}`}>
            <img
              src={attachmentUrl}
              alt={filename}
              className="max-w-full max-h-64 rounded-lg shadow-sm hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => window.open(attachmentUrl, '_blank')}
            />
            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8 bg-black/50 hover:bg-black/70 text-white"
                onClick={() => window.open(attachmentUrl, '_blank')}
              >
                <ExternalLink className="h-4 w-4" />
              </Button>
            </div>
            <div className="mt-2 text-xs text-gray-500">
              <div className="flex items-center space-x-2">
                <ImageIcon className="h-3 w-3" />
                <span>{filename}</span>
                <span>•</span>
                <span>{formatFileSize(size)}</span>
              </div>
            </div>
          </div>
        );

      case 'video':
        return (
          <div className={`relative ${className}`}>
            <video
              src={attachmentUrl}
              controls
              className="max-w-full max-h-64 rounded-lg shadow-sm"
              preload="metadata"
            >
              Your browser does not support the video tag.
            </video>
            <div className="mt-2 text-xs text-gray-500">
              <div className="flex items-center space-x-2">
                <Video className="h-3 w-3" />
                <span>{filename}</span>
                <span>•</span>
                <span>{formatFileSize(size)}</span>
              </div>
            </div>
          </div>
        );

      case 'audio':
        return (
          <div className={`bg-gray-50 rounded-lg p-4 ${className}`}>
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-gradient-to-r from-pink-500 to-violet-500 rounded-lg flex items-center justify-center">
                <Music className="h-6 w-6 text-white" />
              </div>
              <div className="flex-1">
                <div className="font-medium text-sm text-gray-900">{filename}</div>
                <div className="text-xs text-gray-500">{formatFileSize(size)}</div>
              </div>
              <Button
                size="icon"
                variant="ghost"
                onClick={handlePlayPause}
                className="text-gray-600 hover:text-gray-900"
              >
                {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
              </Button>
            </div>
            <audio
              src={attachmentUrl}
              controls
              className="w-full mt-3"
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
            />
          </div>
        );

      default:
        return (
          <div className={`bg-gray-50 rounded-lg p-4 ${className}`}>
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-gray-200 rounded-lg flex items-center justify-center">
                <FileText className="h-6 w-6 text-gray-600" />
              </div>
              <div className="flex-1">
                <div className="font-medium text-sm text-gray-900">{filename}</div>
                <div className="text-xs text-gray-500">
                  {mimeType} • {formatFileSize(size)}
                </div>
              </div>
              <Button
                size="icon"
                variant="ghost"
                onClick={() => window.open(attachmentUrl, '_blank')}
                className="text-gray-600 hover:text-gray-900"
              >
                <Download className="h-4 w-4" />
              </Button>
            </div>
          </div>
        );
    }
  }

  // Render URL preview
  if (url && linkPreview) {
    const { mediaType, title, description, image, embedUrl, domain } = linkPreview;

    switch (mediaType) {
      case 'youtube':
        return (
          <div className={`bg-white rounded-lg shadow-sm border overflow-hidden ${className}`}>
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
            <div className="aspect-video">
              <iframe
                src={embedUrl}
                title={title}
                className="w-full h-full"
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
            <div className="p-3">
              <div className="font-medium text-sm text-gray-900 mb-1">{title}</div>
              <div className="text-xs text-gray-500">youtube.com</div>
            </div>
          </div>
        );

      case 'image':
        return (
          <div className={`relative group ${className}`}>
            <img
              src={url}
              alt="Shared image"
              className="max-w-full max-h-64 rounded-lg shadow-sm hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => window.open(url, '_blank')}
            />
            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
              {onClose && (
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={onClose}
                  className="h-8 w-8 bg-black/50 hover:bg-black/70 text-white mr-2"
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8 bg-black/50 hover:bg-black/70 text-white"
                onClick={() => window.open(url, '_blank')}
              >
                <ExternalLink className="h-4 w-4" />
              </Button>
            </div>
          </div>
        );

      case 'video':
        return (
          <div className={`relative ${className}`}>
            {onClose && (
              <div className="flex justify-end mb-2">
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
            <video
              src={url}
              controls
              className="max-w-full max-h-64 rounded-lg shadow-sm"
              preload="metadata"
            >
              Your browser does not support the video tag.
            </video>
          </div>
        );

      case 'audio':
        return (
          <div className={`bg-gray-50 rounded-lg p-4 ${className}`}>
            {onClose && (
              <div className="flex justify-end mb-2">
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
            <div className="flex items-center space-x-3 mb-3">
              <div className="w-12 h-12 bg-gradient-to-r from-pink-500 to-violet-500 rounded-lg flex items-center justify-center">
                <Music className="h-6 w-6 text-white" />
              </div>
              <div className="flex-1">
                <div className="font-medium text-sm text-gray-900">Audio File</div>
                <div className="text-xs text-gray-500">{domain}</div>
              </div>
            </div>
            <audio
              src={url}
              controls
              className="w-full"
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
            />
          </div>
        );

      default:
        return (
          <div className={`bg-white rounded-lg shadow-sm border p-4 hover:shadow-md transition-shadow cursor-pointer ${className}`}>
            {onClose && (
              <div className="flex justify-end mb-2">
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
            <div 
              className="flex items-start space-x-3"
              onClick={() => window.open(url, '_blank')}
            >
              {image && (
                <img
                  src={image}
                  alt={title}
                  className="w-16 h-16 object-cover rounded-lg flex-shrink-0"
                />
              )}
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm text-gray-900 mb-1 line-clamp-2">
                  {title}
                </div>
                {description && (
                  <div className="text-xs text-gray-600 mb-2 line-clamp-2">
                    {description}
                  </div>
                )}
                <div className="flex items-center text-xs text-gray-500">
                  <ExternalLink className="h-3 w-3 mr-1" />
                  <span>{domain}</span>
                </div>
              </div>
            </div>
          </div>
        );
    }
  }

  // Loading state
  if (loading) {
    return (
      <div className={`bg-gray-50 rounded-lg p-4 ${className}`}>
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 bg-gray-200 rounded-lg animate-pulse"></div>
          <div className="flex-1">
            <div className="h-4 bg-gray-200 rounded animate-pulse mb-2"></div>
            <div className="h-3 bg-gray-200 rounded animate-pulse w-2/3"></div>
          </div>
        </div>
      </div>
    );
  }

  return null;
};

export default MediaPreview;