import React, { useState, useRef, useEffect, useCallback } from 'react';
import { X, RotateCw, ZoomIn, ZoomOut, Move, Crop } from 'lucide-react';
import { Button } from './ui/button';

const ImageCropModal = ({ 
  isOpen, 
  onClose, 
  imageFile, 
  onCropComplete,
  aspectRatio = 1, // 1 = square, 16/9 = landscape, 9/16 = portrait
  minCropSize = 100
}) => {
  const canvasRef = useRef(null);
  const imageRef = useRef(null);
  const containerRef = useRef(null);
  
  const [imageLoaded, setImageLoaded] = useState(false);
  const [scale, setScale] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [cropArea, setCropArea] = useState({ x: 0, y: 0, width: 200, height: 200 });
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [cropStart, setCropStart] = useState({ x: 0, y: 0, width: 0, height: 0 });

  // Load image when file changes
  useEffect(() => {
    if (imageFile && isOpen) {
      const img = new Image();
      img.onload = () => {
        imageRef.current = img;
        setImageLoaded(true);
        
        // Initialize crop area to center of image
        const isMobile = window.innerWidth < 640;
        const containerWidth = isMobile ? Math.min(window.innerWidth - 32, 400) : 500;
        const containerHeight = isMobile ? Math.min(window.innerHeight * 0.4, 400) : 500;
        const cropSize = Math.min(containerWidth * 0.6, containerHeight * 0.6);
        const cropX = (containerWidth - cropSize) / 2;
        const cropY = (containerHeight - cropSize) / 2;
        
        setCropArea({
          x: cropX,
          y: cropY,
          width: cropSize,
          height: cropSize / aspectRatio
        });
        
        // Calculate initial scale to fit image in container
        const scaleX = containerWidth / img.width;
        const scaleY = containerHeight / img.height;
        setScale(Math.min(scaleX, scaleY) * 0.8);
        
        setPosition({
          x: (containerWidth - img.width * Math.min(scaleX, scaleY) * 0.8) / 2,
          y: (containerHeight - img.height * Math.min(scaleX, scaleY) * 0.8) / 2
        });
      };
      img.src = URL.createObjectURL(imageFile);
    }
  }, [imageFile, isOpen, aspectRatio]);

  // Draw everything on canvas
  const drawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !imageRef.current || !imageLoaded) return;

    const ctx = canvas.getContext('2d');
    const img = imageRef.current;
    
    console.log('🔍 Drawing canvas with:', {
      scale,
      position,
      rotation,
      imageSize: { width: img.width, height: img.height }
    });
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Save context
    ctx.save();
    
    // Apply transformations
    ctx.translate(position.x + img.width * scale / 2, position.y + img.height * scale / 2);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.scale(scale, scale);
    
    // Draw image
    ctx.drawImage(img, -img.width / 2, -img.height / 2);
    
    // Restore context
    ctx.restore();
    
    // Draw overlay
    drawOverlay(ctx, canvas.width, canvas.height);
  }, [imageLoaded, scale, rotation, position, cropArea]);

  // Draw overlay with crop area
  const drawOverlay = (ctx, width, height) => {
    // Dark overlay
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.fillRect(0, 0, width, height);
    
    // Clear crop area
    ctx.clearRect(cropArea.x, cropArea.y, cropArea.width, cropArea.height);
    
    // Redraw image in crop area
    ctx.save();
    ctx.translate(position.x + imageRef.current.width * scale / 2, position.y + imageRef.current.height * scale / 2);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.scale(scale, scale);
    ctx.drawImage(imageRef.current, -imageRef.current.width / 2, -imageRef.current.height / 2);
    ctx.restore();
    
    // Crop area border with gradient effect
    ctx.strokeStyle = '#3b82f6';
    ctx.lineWidth = 3;
    ctx.setLineDash([]);
    ctx.strokeRect(cropArea.x, cropArea.y, cropArea.width, cropArea.height);
    
    // Inner border for better visibility
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1;
    ctx.strokeRect(cropArea.x + 1, cropArea.y + 1, cropArea.width - 2, cropArea.height - 2);
    
    // Corner handles with better styling
    const isMobile = window.innerWidth < 640;
    const handleSize = isMobile ? 16 : 12;
    const handleColor = '#3b82f6';
    const handleBorderColor = '#ffffff';
    
    // Draw handles with border
    const corners = [
      { x: cropArea.x, y: cropArea.y }, // top-left
      { x: cropArea.x + cropArea.width, y: cropArea.y }, // top-right
      { x: cropArea.x, y: cropArea.y + cropArea.height }, // bottom-left
      { x: cropArea.x + cropArea.width, y: cropArea.y + cropArea.height } // bottom-right
    ];
    
    corners.forEach(corner => {
      // Outer border
      ctx.fillStyle = handleBorderColor;
      ctx.fillRect(corner.x - handleSize/2 - 1, corner.y - handleSize/2 - 1, handleSize + 2, handleSize + 2);
      
      // Inner handle
      ctx.fillStyle = handleColor;
      ctx.fillRect(corner.x - handleSize/2, corner.y - handleSize/2, handleSize, handleSize);
    });
    
    // Center crosshair for better positioning
    const centerX = cropArea.x + cropArea.width / 2;
    const centerY = cropArea.y + cropArea.height / 2;
    const crosshairSize = 20;
    
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.lineWidth = 1;
    ctx.setLineDash([5, 5]);
    
    // Horizontal line
    ctx.beginPath();
    ctx.moveTo(centerX - crosshairSize, centerY);
    ctx.lineTo(centerX + crosshairSize, centerY);
    ctx.stroke();
    
    // Vertical line
    ctx.beginPath();
    ctx.moveTo(centerX, centerY - crosshairSize);
    ctx.lineTo(centerX, centerY + crosshairSize);
    ctx.stroke();
  };

  // Update canvas when dependencies change
  useEffect(() => {
    drawCanvas();
  }, [drawCanvas]);

  // Handle window resize for responsive canvas
  useEffect(() => {
    const handleResize = () => {
      if (imageRef.current && imageLoaded) {
        const isMobile = window.innerWidth < 640;
        const containerWidth = isMobile ? Math.min(window.innerWidth - 32, 400) : 500;
        const containerHeight = isMobile ? Math.min(window.innerHeight * 0.4, 400) : 500;
        
        // Update canvas size
        const canvas = canvasRef.current;
        if (canvas) {
          canvas.width = containerWidth;
          canvas.height = containerHeight;
          
          // Recalculate scale to fit image
          const img = imageRef.current;
          const scaleX = containerWidth / img.width;
          const scaleY = containerHeight / img.height;
          const newScale = Math.min(scaleX, scaleY) * 0.8;
          setScale(newScale);
          
          // Recalculate position
          setPosition({
            x: (containerWidth - img.width * newScale) / 2,
            y: (containerHeight - img.height * newScale) / 2
          });
          
          // Recalculate crop area
          const cropSize = Math.min(containerWidth * 0.6, containerHeight * 0.6);
          const cropX = (containerWidth - cropSize) / 2;
          const cropY = (containerHeight - cropSize) / 2;
          
          setCropArea({
            x: cropX,
            y: cropY,
            width: cropSize,
            height: cropSize / aspectRatio
          });
        }
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [imageLoaded, aspectRatio]);

  // Mouse event handlers
  const handleMouseDown = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // Check if clicking on crop area
    if (x >= cropArea.x && x <= cropArea.x + cropArea.width &&
        y >= cropArea.y && y <= cropArea.y + cropArea.height) {
      setIsDragging(true);
      setDragStart({ x: x - cropArea.x, y: y - cropArea.y });
    }
    
    // Check if clicking on corner handles
    const isMobile = window.innerWidth < 640;
    const handleSize = isMobile ? 16 : 12;
    const corners = [
      { x: cropArea.x, y: cropArea.y }, // top-left
      { x: cropArea.x + cropArea.width, y: cropArea.y }, // top-right
      { x: cropArea.x, y: cropArea.y + cropArea.height }, // bottom-left
      { x: cropArea.x + cropArea.width, y: cropArea.y + cropArea.height } // bottom-right
    ];
    
    for (let i = 0; i < corners.length; i++) {
      const corner = corners[i];
      if (Math.abs(x - corner.x) <= handleSize && Math.abs(y - corner.y) <= handleSize) {
        setIsResizing(true);
        setCropStart({ ...cropArea });
        setDragStart({ x, y });
        break;
      }
    }
  };

  const handleMouseMove = (e) => {
    if (!isDragging && !isResizing) return;
    
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    if (isDragging) {
      const newX = x - dragStart.x;
      const newY = y - dragStart.y;
      
      // Constrain to canvas bounds
      const canvasWidth = window.innerWidth < 640 ? Math.min(window.innerWidth - 32, 400) : 500;
      const canvasHeight = window.innerWidth < 640 ? Math.min(window.innerHeight * 0.4, 400) : 500;
      const constrainedX = Math.max(0, Math.min(canvasWidth - cropArea.width, newX));
      const constrainedY = Math.max(0, Math.min(canvasHeight - cropArea.height, newY));
      
      setCropArea(prev => ({
        ...prev,
        x: constrainedX,
        y: constrainedY
      }));
    } else if (isResizing) {
      const deltaX = x - dragStart.x;
      const deltaY = y - dragStart.y;
      
      const newWidth = Math.max(minCropSize, cropStart.width + deltaX);
      const newHeight = newWidth / aspectRatio;
      
      setCropArea(prev => ({
        ...prev,
        width: newWidth,
        height: newHeight
      }));
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    setIsResizing(false);
  };

  // Touch event handlers for mobile
  const handleTouchStart = (e) => {
    e.preventDefault();
    const touch = e.touches[0];
    const rect = canvasRef.current.getBoundingClientRect();
    const x = touch.clientX - rect.left;
    const y = touch.clientY - rect.top;
    
    // Check if touching on crop area
    if (x >= cropArea.x && x <= cropArea.x + cropArea.width &&
        y >= cropArea.y && y <= cropArea.y + cropArea.height) {
      setIsDragging(true);
      setDragStart({ x: x - cropArea.x, y: y - cropArea.y });
    }
    
    // Check if touching on corner handles
    const isMobile = window.innerWidth < 640;
    const handleSize = isMobile ? 16 : 12;
    const corners = [
      { x: cropArea.x, y: cropArea.y }, // top-left
      { x: cropArea.x + cropArea.width, y: cropArea.y }, // top-right
      { x: cropArea.x, y: cropArea.y + cropArea.height }, // bottom-left
      { x: cropArea.x + cropArea.width, y: cropArea.y + cropArea.height } // bottom-right
    ];
    
    for (let i = 0; i < corners.length; i++) {
      const corner = corners[i];
      if (Math.abs(x - corner.x) <= handleSize && Math.abs(y - corner.y) <= handleSize) {
        setIsResizing(true);
        setCropStart({ ...cropArea });
        setDragStart({ x, y });
        break;
      }
    }
  };

  const handleTouchMove = (e) => {
    e.preventDefault();
    if (!isDragging && !isResizing) return;
    
    const touch = e.touches[0];
    const rect = canvasRef.current.getBoundingClientRect();
    const x = touch.clientX - rect.left;
    const y = touch.clientY - rect.top;
    
    if (isDragging) {
      const newX = x - dragStart.x;
      const newY = y - dragStart.y;
      
      // Constrain to canvas bounds
      const canvasWidth = window.innerWidth < 640 ? Math.min(window.innerWidth - 32, 400) : 500;
      const canvasHeight = window.innerWidth < 640 ? Math.min(window.innerHeight * 0.4, 400) : 500;
      const constrainedX = Math.max(0, Math.min(canvasWidth - cropArea.width, newX));
      const constrainedY = Math.max(0, Math.min(canvasHeight - cropArea.height, newY));
      
      setCropArea(prev => ({
        ...prev,
        x: constrainedX,
        y: constrainedY
      }));
    } else if (isResizing) {
      const deltaX = x - dragStart.x;
      const deltaY = y - dragStart.y;
      
      const newWidth = Math.max(minCropSize, cropStart.width + deltaX);
      const newHeight = newWidth / aspectRatio;
      
      setCropArea(prev => ({
        ...prev,
        width: newWidth,
        height: newHeight
      }));
    }
  };

  const handleTouchEnd = (e) => {
    e.preventDefault();
    setIsDragging(false);
    setIsResizing(false);
  };

  // Zoom controls with better scaling and position adjustment
  const handleZoomIn = () => {
    if (!imageRef.current) return;
    
    setScale(prev => {
      const newScale = Math.min(prev * 1.1, 5);
      console.log('🔍 Zoom In - Scale changed from', prev, 'to', newScale);
      
      // อัพเดท position เพื่อให้รูปอยู่กลาง
      const img = imageRef.current;
      const containerWidth = window.innerWidth < 640 ? Math.min(window.innerWidth - 32, 400) : 500;
      const containerHeight = window.innerWidth < 640 ? Math.min(window.innerHeight * 0.4, 400) : 500;
      
      setPosition({
        x: (containerWidth - img.width * newScale) / 2,
        y: (containerHeight - img.height * newScale) / 2
      });
      
      return newScale;
    });
  };

  const handleZoomOut = () => {
    if (!imageRef.current) return;
    
    setScale(prev => {
      const newScale = Math.max(prev / 1.1, 0.05);
      console.log('🔍 Zoom Out - Scale changed from', prev, 'to', newScale);
      
      // อัพเดท position เพื่อให้รูปอยู่กลาง
      const img = imageRef.current;
      const containerWidth = window.innerWidth < 640 ? Math.min(window.innerWidth - 32, 400) : 500;
      const containerHeight = window.innerWidth < 640 ? Math.min(window.innerHeight * 0.4, 400) : 500;
      
      setPosition({
        x: (containerWidth - img.width * newScale) / 2,
        y: (containerHeight - img.height * newScale) / 2
      });
      
      return newScale;
    });
  };

  // เพิ่ม wheel zoom support
  const handleWheel = (e) => {
    e.preventDefault();
    console.log('🔍 Wheel event:', { deltaY: e.deltaY, currentScale: scale });
    
    if (e.deltaY < 0) {
      console.log('🔍 Zooming in via wheel');
      handleZoomIn();
    } else {
      console.log('🔍 Zooming out via wheel');
      handleZoomOut();
    }
  };

  const handleRotate = () => {
    setRotation(prev => (prev + 90) % 360);
  };

  // Crop and return result with high quality
  const handleCrop = () => {
    if (!imageRef.current) return;
    
    console.log('🔍 Starting crop process...');
    const img = imageRef.current;
    
    // คำนวณพื้นที่ที่จะ crop ในพิกัดของรูปภาพต้นฉบับ
    const sourceX = Math.max(0, (cropArea.x - position.x) / scale);
    const sourceY = Math.max(0, (cropArea.y - position.y) / scale);
    const sourceWidth = Math.min(img.width - sourceX, cropArea.width / scale);
    const sourceHeight = Math.min(img.height - sourceY, cropArea.height / scale);
    
    console.log('🔍 Crop area:', { sourceX, sourceY, sourceWidth, sourceHeight });
    console.log('🔍 Original image size:', { width: img.width, height: img.height });
    
    // สร้าง canvas ขนาดใหญ่เพื่อคุณภาพสูง (2x resolution)
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const pixelRatio = window.devicePixelRatio || 1;
    const outputWidth = Math.floor(sourceWidth * pixelRatio);
    const outputHeight = Math.floor(sourceHeight * pixelRatio);
    
    canvas.width = outputWidth;
    canvas.height = outputHeight;
    
    // ตั้งค่า context สำหรับคุณภาพสูง
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.scale(pixelRatio, pixelRatio);
    
    console.log('🔍 Output canvas size:', { width: outputWidth, height: outputHeight });
    
    // วาดรูปภาพด้วยคุณภาพสูง
    ctx.drawImage(
      img,
      sourceX, sourceY, sourceWidth, sourceHeight,
      0, 0, sourceWidth, sourceHeight
    );
    
    // กำหนด format และ quality
    const originalType = imageFile.type || 'image/jpeg';
    const outputType = originalType.includes('png') ? 'image/png' : 'image/jpeg';
    const quality = outputType === 'image/jpeg' ? 0.95 : undefined; // คุณภาพสูง
    
    console.log('🔍 Output format:', outputType, 'Quality:', quality);
    
    // Convert to blob ด้วยคุณภาพสูง
    canvas.toBlob((blob) => {
      if (blob) {
        console.log('✅ Crop completed. File size:', blob.size, 'bytes');
        const file = new File([blob], imageFile.name, { type: outputType });
        onCropComplete(file);
        onClose();
      } else {
        console.error('❌ Failed to create blob from canvas');
      }
    }, outputType, quality);
  };

  if (!isOpen || !imageFile) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-2 sm:p-4">
      <style jsx>{`
        .slider-thumb::-webkit-slider-thumb {
          appearance: none;
          height: 20px;
          width: 20px;
          border-radius: 50%;
          background: #3b82f6;
          border: 2px solid #ffffff;
          cursor: pointer;
          box-shadow: 0 2px 6px rgba(0, 0, 0, 0.2);
          transition: all 0.2s ease;
        }
        
        .slider-thumb::-webkit-slider-thumb:hover {
          background: #2563eb;
          transform: scale(1.1);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
        }
        
        .slider-thumb::-moz-range-thumb {
          height: 20px;
          width: 20px;
          border-radius: 50%;
          background: #3b82f6;
          border: 2px solid #ffffff;
          cursor: pointer;
          box-shadow: 0 2px 6px rgba(0, 0, 0, 0.2);
          transition: all 0.2s ease;
        }
        
        .slider-thumb::-moz-range-thumb:hover {
          background: #2563eb;
          transform: scale(1.1);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
        }
      `}</style>
      <div className="bg-white rounded-xl max-w-4xl w-full max-h-[95vh] overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-6 border-b bg-gradient-to-r from-blue-50 to-indigo-50">
          <div className="flex items-center space-x-2 sm:space-x-3">
            <div className="p-1.5 sm:p-2 bg-blue-100 rounded-lg">
              <Crop className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600" />
            </div>
            <div>
              <h3 className="text-lg sm:text-xl font-semibold text-gray-900">ปรับแต่งรูปภาพ</h3>
              <p className="text-xs sm:text-sm text-gray-600 hidden sm:block">ลากกรอบเพื่อเลือกพื้นที่ที่ต้องการ</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors group"
          >
            <X className="h-5 w-5 text-gray-500 group-hover:text-gray-700" />
          </button>
        </div>
        
        {/* Canvas Container */}
        <div className="p-3 sm:p-6">
          <div 
            ref={containerRef}
            className="relative bg-gray-100 rounded-xl overflow-hidden mx-auto shadow-lg border-2 border-gray-200"
            style={{ 
              width: window.innerWidth < 640 ? Math.min(window.innerWidth - 32, 400) : 500, 
              height: window.innerWidth < 640 ? Math.min(window.innerHeight * 0.4, 400) : 500 
            }}
          >
            <canvas
              ref={canvasRef}
              width={window.innerWidth < 640 ? Math.min(window.innerWidth - 32, 400) : 500}
              height={window.innerWidth < 640 ? Math.min(window.innerHeight * 0.4, 400) : 500}
              className="cursor-crosshair touch-none"
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              onWheel={handleWheel}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
            />
            {/* Loading overlay */}
            {!imageLoaded && (
              <div className="absolute inset-0 bg-gray-100 flex items-center justify-center">
                <div className="text-center">
                  <div className="animate-spin h-6 w-6 sm:h-8 sm:w-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-2"></div>
                  <p className="text-xs sm:text-sm text-gray-600">กำลังโหลดรูปภาพ...</p>
                </div>
              </div>
            )}
          </div>
        </div>
        
        {/* Controls */}
        <div className="p-4 sm:p-6 border-t bg-gradient-to-r from-gray-50 to-blue-50">
          {/* Zoom and Rotate Controls */}
          <div className="flex flex-col sm:flex-row items-center justify-between mb-4 sm:mb-6 space-y-4 sm:space-y-0">
            <div className="flex items-center space-x-3 sm:space-x-4">
              <div className="flex items-center space-x-2 sm:space-x-3 bg-white rounded-lg p-2 sm:p-3 shadow-sm border">
                <ZoomOut className="h-4 w-4 text-red-600" />
                <input
                  type="range"
                  min="5"
                  max="500"
                  value={Math.round(scale * 100)}
                  onChange={(e) => {
                    const newScalePercent = parseInt(e.target.value);
                    const newScale = newScalePercent / 100;
                    console.log('🔍 Slider changed from', scale, 'to', newScale);
                    
                    setScale(newScale);
                    
                    // อัพเดท position เพื่อให้รูปอยู่กลาง
                    if (imageRef.current) {
                      const img = imageRef.current;
                      const containerWidth = window.innerWidth < 640 ? Math.min(window.innerWidth - 32, 400) : 500;
                      const containerHeight = window.innerWidth < 640 ? Math.min(window.innerHeight * 0.4, 400) : 500;
                      
                      setPosition({
                        x: (containerWidth - img.width * newScale) / 2,
                        y: (containerHeight - img.height * newScale) / 2
                      });
                    }
                  }}
                  className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider-thumb"
                  style={{
                    background: `linear-gradient(to right, #ef4444 0%, #f59e0b 50%, #10b981 100%)`,
                    minWidth: '120px'
                  }}
                  title="เลื่อนซ้าย = ซูมออก, เลื่อนขวา = ซูมเข้า"
                />
                <ZoomIn className="h-4 w-4 text-green-600" />
                <div className="w-12 sm:w-14 text-center">
                  <span className="text-xs sm:text-sm font-medium text-gray-700">
                    {Math.round(scale * 100)}%
                  </span>
                </div>
              </div>
              
              <Button
                variant="outline"
                size="sm"
                onClick={handleRotate}
                className="bg-white hover:bg-gray-50 border-gray-200 text-xs sm:text-sm"
              >
                <RotateCw className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                <span className="hidden sm:inline">หมุน 90°</span>
                <span className="sm:hidden">หมุน</span>
              </Button>
            </div>
            
            <div className="text-center sm:text-right">
              <p className="text-xs sm:text-sm font-medium text-gray-700">คำแนะนำ</p>
              <p className="text-xs text-gray-500 hidden sm:block">
                ลากกรอบเพื่อปรับตำแหน่ง • ลากมุมเพื่อปรับขนาด<br />
                เลื่อน slider ซ้าย/ขวา เพื่อซูม หรือใช้ scroll wheel
              </p>
              <p className="text-xs text-gray-500 sm:hidden">
                แตะและลากเพื่อปรับแต่ง<br />
                เลื่อน slider เพื่อซูม
              </p>
            </div>
          </div>
          
          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-between space-y-3 sm:space-y-0">
            <div className="flex items-center space-x-2 text-xs sm:text-sm text-gray-600">
              <Move className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">ใช้เมาส์ลากเพื่อปรับแต่ง</span>
              <span className="sm:hidden">แตะและลากเพื่อปรับแต่ง</span>
            </div>
            
            <div className="flex space-x-2 sm:space-x-3 w-full sm:w-auto">
              <Button
                variant="outline"
                onClick={onClose}
                className="flex-1 sm:flex-none px-4 sm:px-6 py-2 border-gray-300 hover:bg-gray-50 text-sm"
              >
                ยกเลิก
              </Button>
              <Button
                onClick={handleCrop}
                className="flex-1 sm:flex-none px-4 sm:px-6 py-2 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white shadow-lg text-sm"
              >
                <Crop className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                ตัดรูป
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ImageCropModal;
