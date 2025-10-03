import { useEffect, useRef, useState } from "react";
import { Play } from "lucide-react";

interface VideoThumbnailProps {
  videoUrl: string;
  fallbackThumbnail?: string | null;
  alt: string;
  className?: string;
}

export function VideoThumbnail({ videoUrl, fallbackThumbnail, alt, className }: VideoThumbnailProps) {
  const [thumbnail, setThumbnail] = useState<string | null>(fallbackThumbnail || null);
  const [isLoading, setIsLoading] = useState(!fallbackThumbnail);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (fallbackThumbnail) return;

    const video = videoRef.current;
    if (!video) return;

    const generateThumbnail = () => {
      try {
        // Seek to 2 seconds into the video to avoid black frames
        video.currentTime = Math.min(2, video.duration * 0.1);
      } catch (error) {
        console.error("Error seeking video:", error);
        setIsLoading(false);
      }
    };

    const captureThumbnail = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const thumbnailUrl = canvas.toDataURL("image/jpeg", 0.8);
        
        setThumbnail(thumbnailUrl);
        setIsLoading(false);
      } catch (error) {
        console.error("Error generating thumbnail:", error);
        setIsLoading(false);
      }
    };

    video.addEventListener("loadedmetadata", generateThumbnail);
    video.addEventListener("seeked", captureThumbnail);
    
    return () => {
      video.removeEventListener("loadedmetadata", generateThumbnail);
      video.removeEventListener("seeked", captureThumbnail);
    };
  }, [fallbackThumbnail, videoUrl]);

  return (
    <>
      {!fallbackThumbnail && (
        <video
          ref={videoRef}
          src={videoUrl}
          className="hidden"
          preload="metadata"
          crossOrigin="anonymous"
          muted
        />
      )}
      
      {isLoading ? (
        <div className={`flex items-center justify-center bg-muted ${className}`}>
          <Play className="w-12 h-12 text-muted-foreground animate-pulse" />
        </div>
      ) : thumbnail ? (
        <img
          src={thumbnail}
          alt={alt}
          className={className}
        />
      ) : (
        <div className={`flex items-center justify-center bg-muted ${className}`}>
          <Play className="w-12 h-12 text-muted-foreground" />
        </div>
      )}
    </>
  );
}
