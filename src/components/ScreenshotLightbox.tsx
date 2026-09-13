import React, { useState } from 'react';
import { X, ChevronLeft, ChevronRight, ExternalLink } from 'lucide-react';
import { Lead } from '../types';

interface ScreenshotLightboxProps {
  lead: Lead;
  initialIndex?: number;
  onClose: () => void;
  isDarkMode: boolean;
}

export const ScreenshotLightbox: React.FC<ScreenshotLightboxProps> = ({
  lead,
  initialIndex = 0,
  onClose,
}) => {
  const galleryItems: { type: 'Product Image' | 'DM Screenshot'; url: string }[] = [];

  if (lead.productImage) {
    galleryItems.push({ type: 'Product Image', url: lead.productImage });
  }

  lead.screenshots.forEach((url) => {
    galleryItems.push({ type: 'DM Screenshot', url });
  });

  const startIndex = initialIndex === -1 ? 0 : lead.productImage ? initialIndex + 1 : initialIndex;
  const [currentIndex, setCurrentIndex] = useState(
    Math.min(Math.max(startIndex, 0), Math.max(galleryItems.length - 1, 0))
  );

  if (galleryItems.length === 0) return null;

  const currentItem = galleryItems[currentIndex];

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : galleryItems.length - 1));
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev < galleryItems.length - 1 ? prev + 1 : 0));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/90 backdrop-blur-md p-4 font-sans animate-in fade-in duration-150">
      {/* Lightbox Controls Header */}
      <div className="absolute top-4 left-4 right-4 flex items-center justify-between text-white z-10">
        <div>
          <h4 className="font-bold text-sm tracking-tight">{lead.name}</h4>
          <p className="text-xs text-zinc-400 font-medium">
            {currentItem.type} ({currentIndex + 1} of {galleryItems.length})
          </p>
        </div>

        <div className="flex items-center gap-2">
          <a
            href={currentItem.url}
            target="_blank"
            rel="noreferrer"
            className="p-2 rounded-xl bg-zinc-900/80 hover:bg-zinc-800 text-zinc-200 border border-zinc-800 transition-colors"
            title="Open original image in new tab"
          >
            <ExternalLink className="w-4 h-4" />
          </a>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-zinc-900/80 hover:bg-zinc-800 text-zinc-200 border border-zinc-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Navigation Arrows */}
      {galleryItems.length > 1 && (
        <>
          <button
            onClick={handlePrev}
            className="absolute left-4 top-1/2 -translate-y-1/2 p-3 rounded-2xl bg-zinc-900/80 text-white border border-zinc-800 hover:bg-zinc-800 transition-all z-10"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          <button
            onClick={handleNext}
            className="absolute right-4 top-1/2 -translate-y-1/2 p-3 rounded-2xl bg-zinc-900/80 text-white border border-zinc-800 hover:bg-zinc-800 transition-all z-10"
          >
            <ChevronRight className="w-6 h-6" />
          </button>
        </>
      )}

      {/* Main Image Display */}
      <div className="max-w-4xl max-h-[80vh] flex items-center justify-center overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950 shadow-2xl">
        <img
          src={currentItem.url}
          alt={`Proof ${currentIndex + 1}`}
          className="max-w-full max-h-[80vh] object-contain"
        />
      </div>
    </div>
  );
};
