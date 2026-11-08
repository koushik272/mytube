import React, { useRef, useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { CATEGORIES } from '../../data/categories';
import { useVideo } from '../../context/VideoContext';
import { Category } from '../../types/video';

export const CategoryBar: React.FC = () => {
  const { currentCategory, setCurrentCategory } = useVideo();
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [showLeftArrow, setShowLeftArrow] = useState(false);
  const [showRightArrow, setShowRightArrow] = useState(true);

  const checkScroll = () => {
    if (!scrollContainerRef.current) return;
    const { scrollLeft, scrollWidth, clientWidth } = scrollContainerRef.current;
    setShowLeftArrow(scrollLeft > 10);
    setShowRightArrow(scrollLeft < scrollWidth - clientWidth - 10);
  };

  useEffect(() => {
    checkScroll();
    window.addEventListener('resize', checkScroll);
    return () => window.removeEventListener('resize', checkScroll);
  }, []);

  const scroll = (direction: 'left' | 'right') => {
    if (!scrollContainerRef.current) return;
    const scrollAmount = 240;
    scrollContainerRef.current.scrollBy({
      left: direction === 'left' ? -scrollAmount : scrollAmount,
      behavior: 'smooth',
    });
    setTimeout(checkScroll, 300);
  };

  return (
    <div className="relative sticky top-14 z-30 bg-white/95 dark:bg-[#0f0f0f]/95 backdrop-blur-xs py-3 px-3 sm:px-6 flex items-center transition-colors">
      {/* Left Scroll Arrow */}
      {showLeftArrow && (
        <div className="absolute left-0 top-0 bottom-0 flex items-center bg-gradient-to-r from-white dark:from-[#0f0f0f] via-white/80 dark:via-[#0f0f0f]/80 to-transparent pr-8 pl-2 z-10">
          <button
            onClick={() => scroll('left')}
            className="p-1.5 rounded-full hover:bg-neutral-200 dark:hover:bg-neutral-800 text-neutral-800 dark:text-neutral-200 transition-colors cursor-pointer shadow-xs bg-white dark:bg-neutral-800"
            aria-label="Scroll left"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Pills Container */}
      <div
        ref={scrollContainerRef}
        onScroll={checkScroll}
        className="flex items-center gap-2.5 overflow-x-auto no-scrollbar py-0.5 scroll-smooth"
      >
        {CATEGORIES.map((category) => {
          const isActive = currentCategory === category;
          return (
            <button
              key={category}
              onClick={() => setCurrentCategory(category as Category)}
              className={`px-3.5 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-all duration-150 cursor-pointer select-none ${
                isActive
                  ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 shadow-xs'
                  : 'bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-800 dark:text-neutral-200'
              }`}
            >
              {category}
            </button>
          );
        })}
      </div>

      {/* Right Scroll Arrow */}
      {showRightArrow && (
        <div className="absolute right-0 top-0 bottom-0 flex items-center bg-gradient-to-l from-white dark:from-[#0f0f0f] via-white/80 dark:via-[#0f0f0f]/80 to-transparent pl-8 pr-2 z-10">
          <button
            onClick={() => scroll('right')}
            className="p-1.5 rounded-full hover:bg-neutral-200 dark:hover:bg-neutral-800 text-neutral-800 dark:text-neutral-200 transition-colors cursor-pointer shadow-xs bg-white dark:bg-neutral-800"
            aria-label="Scroll right"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
};
