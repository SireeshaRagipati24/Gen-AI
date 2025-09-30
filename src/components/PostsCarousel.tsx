import { useRef, useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { PostCard } from "./PostCard";

interface PostsCarouselProps {
  posts: Array<{
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
  }>;
}

export function PostsCarousel({ posts }: PostsCarouselProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const checkScrollButtons = () => {
    if (!scrollRef.current) return;
    
    const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
    setCanScrollLeft(scrollLeft > 0);
    setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 1);
  };

  useEffect(() => {
    checkScrollButtons();
    const handleResize = () => checkScrollButtons();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [posts]);

  const scroll = (direction: 'left' | 'right') => {
    if (!scrollRef.current) return;
    
    const scrollAmount = scrollRef.current.clientWidth * 0.8;
    const newScrollLeft = scrollRef.current.scrollLeft + (direction === 'right' ? scrollAmount : -scrollAmount);
    
    scrollRef.current.scrollTo({
      left: newScrollLeft,
      behavior: 'smooth'
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowLeft' && canScrollLeft) {
      scroll('left');
    } else if (e.key === 'ArrowRight' && canScrollRight) {
      scroll('right');
    }
  };

  if (!posts || posts.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        No posts available
      </div>
    );
  }

  return (
    <div className="relative group" onKeyDown={handleKeyDown} tabIndex={0}>
      {/* Left Arrow */}
      {canScrollLeft && (
        <Button
          variant="outline"
          size="icon"
          className="absolute left-2 top-1/2 -translate-y-1/2 z-10 h-8 w-8 rounded-full bg-white/90 shadow-md opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={() => scroll('left')}
          aria-label="Previous posts"
        >
          <ChevronLeft className="w-4 h-4" />
        </Button>
      )}

      {/* Right Arrow */}
      {canScrollRight && (
        <Button
          variant="outline"
          size="icon"
          className="absolute right-2 top-1/2 -translate-y-1/2 z-10 h-8 w-8 rounded-full bg-white/90 shadow-md opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={() => scroll('right')}
          aria-label="Next posts"
        >
          <ChevronRight className="w-4 h-4" />
        </Button>
      )}

      {/* Scrollable Container */}
      <div
        ref={scrollRef}
        className="flex gap-6 overflow-x-auto scrollbar-hide scroll-smooth snap-x snap-mandatory pb-2"
        onScroll={checkScrollButtons}
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {posts.map((post) => (
          <div 
            key={post.id} 
            className="flex-none w-full md:w-[calc(50%-12px)] lg:w-[calc(33.333%-16px)] snap-start"
          >
            <PostCard post={post} />
          </div>
        ))}
      </div>
    </div>
  );
}