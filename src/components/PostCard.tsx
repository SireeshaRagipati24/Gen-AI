import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Heart,
  MessageCircle,
  Bookmark,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

interface PostCardProps {
  post: {
    id: string;
    media_type: string;
    media_url: string;
    media_urls?: string[];
    like_count: number;
    comments_count: number;
    timestamp: string;
    insights?: {
      saved: number;
      reach: number;
      impressions: number;
    };
  };
}

export function PostCard({ post }: PostCardProps) {
  const mediaUrls = post.media_urls || [post.media_url];
  const [currentMediaIndex, setCurrentMediaIndex] = useState(0);

  const engagementRate = post.insights
    ? (
        ((post.like_count || 0) +
          (post.comments_count || 0) +
          (post.insights.saved || 0)) /
        (post.insights.reach || 1)
      ).toFixed(2)
    : "0";

  const nextMedia = () => {
    setCurrentMediaIndex((prev) => 
      prev === mediaUrls.length - 1 ? 0 : prev + 1
    );
  };

  const prevMedia = () => {
    setCurrentMediaIndex((prev) => 
      prev === 0 ? mediaUrls.length - 1 : prev - 1
    );
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowLeft') {
      e.stopPropagation();
      prevMedia();
    } else if (e.key === 'ArrowRight') {
      e.stopPropagation();
      nextMedia();
    }
  };

  return (
    <Card className="group overflow-hidden transition-all duration-200 hover:shadow-lg bg-white border border-slate-200">
      {/* Media Carousel */}
      <div 
        className="relative aspect-square overflow-hidden"
        onKeyDown={handleKeyDown}
        tabIndex={0}
      >
        {post.media_type === "IMAGE" && (
          <>
            <img
              src={mediaUrls[currentMediaIndex]}
              alt="Post"
              className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-105"
              loading="lazy"
            />
            
            {/* Media Navigation - only show if multiple images */}
            {mediaUrls.length > 1 && (
              <>
                {/* Left Arrow */}
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute left-2 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full bg-black/50 text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/70"
                  onClick={prevMedia}
                  aria-label="Previous image"
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>

                {/* Right Arrow */}
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full bg-black/50 text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/70"
                  onClick={nextMedia}
                  aria-label="Next image"
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>

                {/* Dot Indicators */}
                <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1">
                  {mediaUrls.map((_, index) => (
                    <button
                      key={index}
                      className={`w-2 h-2 rounded-full transition-all ${
                        index === currentMediaIndex
                          ? 'bg-white'
                          : 'bg-white/50'
                      }`}
                      onClick={() => setCurrentMediaIndex(index)}
                      aria-label={`View image ${index + 1}`}
                    />
                  ))}
                </div>
              </>
            )}
          </>
        )}
      </div>

      <CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1 text-slate-600">
              <Heart className="w-4 h-4" />
              {post.like_count}
            </span>
            <span className="flex items-center gap-1 text-slate-600">
              <MessageCircle className="w-4 h-4" />
              {post.comments_count}
            </span>
            <span className="flex items-center gap-1 text-slate-600">
              <Bookmark className="w-4 h-4" />
              {post.insights?.saved || 0}
            </span>
          </div>
        </div>
        
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-slate-600">Reach</span>
            <span className="font-medium text-slate-800">{post.insights?.reach?.toLocaleString() || 0}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-slate-600">Impressions</span>
            <span className="font-medium text-slate-800">{post.insights?.impressions?.toLocaleString() || 0}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-slate-600">Engagement Rate</span>
            <Badge variant="outline" className="bg-slate-50 text-slate-700 border-slate-200">{engagementRate}%</Badge>
          </div>
        </div>
        
        <p className="text-xs text-slate-500">
          {new Date(post.timestamp).toLocaleDateString()}
        </p>
      </CardContent>
    </Card>
  );
}