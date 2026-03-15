// Utility functions for link detection and media handling

export const detectLinks = (text) => {
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const parts = text.split(urlRegex);
  
  return parts.map((part, index) => {
    if (urlRegex.test(part)) {
      return {
        type: 'link',
        content: part,
        index
      };
    }
    return {
      type: 'text',
      content: part,
      index
    };
  });
};

export const extractYouTubeUrls = (text) => {
  const youtubeRegex = /(https?:\/\/)?(www\.)?(youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/g;
  const matches = [];
  let match;
  
  while ((match = youtubeRegex.exec(text)) !== null) {
    const fullUrl = match[0];
    const videoId = match[4];
    matches.push({
      url: fullUrl.startsWith('http') ? fullUrl : `https://${fullUrl}`,
      videoId,
      startIndex: match.index,
      endIndex: match.index + match[0].length
    });
  }
  
  return matches;
};

export const separateYouTubeFromText = (text) => {
  const youtubeUrls = extractYouTubeUrls(text);
  
  if (youtubeUrls.length === 0) {
    return { text, youtubeUrls: [] };
  }
  
  // Remove YouTube URLs from text
  let cleanText = text;
  youtubeUrls.reverse().forEach(({ startIndex, endIndex }) => {
    cleanText = cleanText.slice(0, startIndex) + cleanText.slice(endIndex);
  });
  
  return {
    text: cleanText.trim(),
    youtubeUrls: youtubeUrls.reverse()
  };
};

export const isYouTubeUrl = (url) => {
  const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+/;
  return youtubeRegex.test(url);
};

export const getYouTubeVideoId = (url) => {
  const regex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
  const match = url.match(regex);
  return match ? match[1] : null;
};

export const isImageUrl = (url) => {
  const imageExtensions = /\.(jpg|jpeg|png|gif|webp|svg)$/i;
  return imageExtensions.test(url);
};

export const isVideoUrl = (url) => {
  const videoExtensions = /\.(mp4|webm|ogg|mov|avi)$/i;
  return videoExtensions.test(url);
};

export const isAudioUrl = (url) => {
  const audioExtensions = /\.(mp3|wav|ogg|m4a|aac)$/i;
  return audioExtensions.test(url);
};

export const getMediaType = (url) => {
  if (isYouTubeUrl(url)) return 'youtube';
  if (isImageUrl(url)) return 'image';
  if (isVideoUrl(url)) return 'video';
  if (isAudioUrl(url)) return 'audio';
  return 'link';
};

export const extractDomain = (url) => {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname;
  } catch (error) {
    return url;
  }
};

export const generateLinkPreview = async (url) => {
  try {
    // In a real application, you would call a backend service to fetch metadata
    // For now, we'll return basic information
    const domain = extractDomain(url);
    const mediaType = getMediaType(url);
    
    let preview = {
      url,
      domain,
      mediaType,
      title: url,
      description: '',
      image: null
    };

    if (mediaType === 'youtube') {
      const videoId = getYouTubeVideoId(url);
      if (videoId) {
        preview.title = 'YouTube Video';
        preview.image = `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
        preview.embedUrl = `https://www.youtube.com/embed/${videoId}`;
      }
    } else if (mediaType === 'image') {
      preview.title = 'Image';
      preview.image = url;
    }

    return preview;
  } catch (error) {
    console.error('Error generating link preview:', error);
    return null;
  }
};

export const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

export const validateFileType = (file, allowedTypes = ['image', 'video', 'audio']) => {
  const fileType = file.type.split('/')[0];
  return allowedTypes.includes(fileType);
};

export const validateFileSize = (file, maxSizeInMB = 10) => {
  const maxSizeInBytes = maxSizeInMB * 1024 * 1024;
  return file.size <= maxSizeInBytes;
};

export const createFilePreview = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      resolve({
        name: file.name,
        size: file.size,
        type: file.type,
        preview: e.target.result,
        file
      });
    };
    
    reader.onerror = reject;
    
    if (file.type.startsWith('image/')) {
      reader.readAsDataURL(file);
    } else {
      resolve({
        name: file.name,
        size: file.size,
        type: file.type,
        preview: null,
        file
      });
    }
  });
};