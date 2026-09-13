import React, { useState } from 'react';
import { Camera, Edit3, X, Columns, Sparkles, Wand2 } from 'lucide-react';
import { Lead } from '../types';

interface LeadVirtualTryOnProps {
  lead: Lead;
  onUpdateLead: (updates: Partial<Lead>) => void;
  isDarkMode: boolean;
}

export const LeadVirtualTryOn: React.FC<LeadVirtualTryOnProps> = ({ lead, onUpdateLead, isDarkMode }) => {
  // Preselect garment ONLY from lead's product image
  const initialGarment = lead.productImage || null;
  
  const [featuredGarmentImage, setFeaturedGarmentImage] = useState<string | null>(initialGarment);
  // Person / Target photo is uploaded separately by the user
  const [featuredUserPhoto, setFeaturedUserPhoto] = useState<string | null>(null);
  
  const [isGeneratingFeatured, setIsGeneratingFeatured] = useState(false);
  const [featuredTryOnResult, setFeaturedTryOnResult] = useState<string | null>(null);
  const [featuredTryOnError, setFeaturedTryOnError] = useState<string | null>(null);
  
  const [featuredViewMode, setFeaturedViewMode] = useState<'after' | 'before' | 'compare' | 'product'>('after');
  
  const resizeImage = (file: File): Promise<string> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 1024;
          const MAX_HEIGHT = 1024;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width;
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height;
              height = MAX_HEIGHT;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', 0.85)); 
        };
      };
    });
  };

  const handleFeaturedGarmentUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const resized = await resizeImage(file);
    setFeaturedGarmentImage(resized);
    setFeaturedTryOnResult(null);
    setFeaturedTryOnError(null);
    setFeaturedViewMode('product');
  };

  const handleFeaturedPhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const resized = await resizeImage(file);
    setFeaturedUserPhoto(resized);
    setFeaturedTryOnResult(null);
    setFeaturedTryOnError(null);
    setFeaturedViewMode('before');
  };

  const handleGenerateFeaturedTryOn = async () => {
    if (!featuredUserPhoto || !featuredGarmentImage) return;
    setIsGeneratingFeatured(true);
    setFeaturedTryOnError(null);
    
    try {
      const response = await fetch('/api/vton/gemini', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          humanImage: featuredUserPhoto,
          garmImage: featuredGarmentImage,
        })
      });
      
      const data = await response.json();
      if (data.success && data.imageUrl) {
        setFeaturedTryOnResult(data.imageUrl);
        setFeaturedViewMode('after');
        
        // Save to lead
        const updatedVton = [...(lead.vtonResults || []), data.imageUrl];
        onUpdateLead({ vtonResults: updatedVton });
        
      } else {
        setFeaturedTryOnError(data.error || 'Failed to generate virtual try-on. Please try again.');
      }
    } catch (err) {
      setFeaturedTryOnError('Network error. Check your connection or API keys.');
    } finally {
      setIsGeneratingFeatured(false);
    }
  };

  return (
    <div className="bg-zinc-50 dark:bg-zinc-900/30 rounded-2xl p-4 border border-zinc-200 dark:border-zinc-800">
      <div className="flex items-center gap-2 mb-4">
        <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
          <Wand2 className="w-4 h-4" />
        </div>
        <div>
          <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-900 dark:text-white">AI Try-On Demo</h3>
          <p className="text-[10px] text-zinc-500">Generate a personalized virtual try-on for this lead</p>
        </div>
      </div>

      <div className="flex flex-col gap-4">
        
        {/* Step 1: Human Photo */}
        <div className="border border-zinc-200 dark:border-zinc-800 rounded-xl p-3 bg-white dark:bg-zinc-950">
          <label className="block text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-2">1. Person / Target</label>
          {!featuredUserPhoto ? (
            <label className="border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-lg p-4 flex flex-col items-center justify-center text-center hover:bg-zinc-50 dark:hover:bg-zinc-900 cursor-pointer transition">
              <input type="file" accept="image/*" className="hidden" onChange={handleFeaturedPhotoUpload} />
              <Camera className="w-5 h-5 text-zinc-400 mb-2" />
              <p className="text-[10px] font-semibold">Upload Photo of Lead</p>
            </label>
          ) : (
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-zinc-100 overflow-hidden shrink-0 border border-zinc-200">
                <img src={featuredUserPhoto} alt="Human" className="w-full h-full object-cover" />
              </div>
              <div className="flex-1">
                <p className="text-xs font-bold truncate">Target selected</p>
                <label className="text-[10px] text-indigo-600 hover:underline cursor-pointer flex items-center gap-1 mt-0.5">
                  <input type="file" accept="image/*" className="hidden" onChange={handleFeaturedPhotoUpload} />
                  Change photo
                </label>
              </div>
            </div>
          )}
        </div>

        {/* Step 2: Garment */}
        <div className="border border-zinc-200 dark:border-zinc-800 rounded-xl p-3 bg-white dark:bg-zinc-950">
          <label className="block text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-2">2. Garment to try on</label>
          {!featuredGarmentImage ? (
             <label className="border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-lg p-4 flex flex-col items-center justify-center text-center hover:bg-zinc-50 dark:hover:bg-zinc-900 cursor-pointer transition">
             <input type="file" accept="image/*" className="hidden" onChange={handleFeaturedGarmentUpload} />
             <Edit3 className="w-5 h-5 text-zinc-400 mb-2" />
             <p className="text-[10px] font-semibold">Upload Garment Image</p>
           </label>
          ) : (
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-zinc-100 overflow-hidden shrink-0 border border-zinc-200">
                <img src={featuredGarmentImage} alt="Garment" className="w-full h-full object-cover" />
              </div>
              <div className="flex-1">
                <p className="text-xs font-bold truncate">Garment selected</p>
                <label className="text-[10px] text-indigo-600 hover:underline cursor-pointer flex items-center gap-1 mt-0.5">
                  <input type="file" accept="image/*" className="hidden" onChange={handleFeaturedGarmentUpload} />
                  Change garment
                </label>
              </div>
            </div>
          )}
        </div>

        {/* Generate Button */}
        <button 
          onClick={handleGenerateFeaturedTryOn}
          disabled={!featuredUserPhoto || !featuredGarmentImage || isGeneratingFeatured}
          className={`w-full py-3 rounded-xl font-bold uppercase tracking-widest text-xs transition flex items-center justify-center gap-2 ${
            !featuredUserPhoto || !featuredGarmentImage ? 'bg-zinc-200 dark:bg-zinc-800 text-zinc-400 cursor-not-allowed' :
            isGeneratingFeatured ? 'bg-zinc-800 text-white cursor-wait opacity-80' :
            'bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 hover:scale-[1.02]'
          }`}
        >
          {isGeneratingFeatured ? (
            <>
              <div className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
              Generating Demo...
            </>
          ) : (
            <>
              <Sparkles className="w-3.5 h-3.5" />
              Generate Try-On Image
            </>
          )}
        </button>

        {/* Error */}
        {featuredTryOnError && (
          <div className="p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-900/50 rounded-xl text-xs flex justify-between items-start">
            <span>{featuredTryOnError}</span>
            <button onClick={() => setFeaturedTryOnError(null)}><X className="w-3.5 h-3.5" /></button>
          </div>
        )}

        {/* Result Area */}
        {(featuredTryOnResult || isGeneratingFeatured) && (
          <div className="mt-2 rounded-xl overflow-hidden border border-zinc-200 dark:border-zinc-800 bg-zinc-950 aspect-[3/4] relative flex items-center justify-center">
            
            {featuredViewMode === 'compare' && featuredUserPhoto ? (
              <div className="absolute inset-0 grid grid-cols-2 divide-x-2 divide-white">
                <div className="relative w-full h-full bg-zinc-900 overflow-hidden">
                  <img src={featuredUserPhoto} alt="Original" className="w-full h-full object-cover" />
                  <span className="absolute top-2 left-2 bg-black/75 backdrop-blur text-white text-[9px] font-bold uppercase tracking-widest px-2 py-1 rounded">BEFORE</span>
                </div>
                <div className="relative w-full h-full bg-zinc-900 overflow-hidden">
                  <img src={featuredTryOnResult || ''} alt="Result" className="w-full h-full object-cover" />
                  <span className="absolute top-2 left-2 bg-black text-white text-[9px] font-bold uppercase tracking-widest px-2 py-1 rounded">AFTER</span>
                </div>
              </div>
            ) : featuredViewMode === 'before' && featuredUserPhoto ? (
              <div className="relative w-full h-full">
                <img src={featuredUserPhoto} alt="Original" className="w-full h-full object-cover" />
                <span className="absolute top-2 left-2 bg-black/75 backdrop-blur text-white text-[9px] font-bold uppercase tracking-widest px-2 py-1 rounded">BEFORE</span>
              </div>
            ) : featuredViewMode === 'product' && featuredGarmentImage ? (
               <div className="relative w-full h-full">
                <img src={featuredGarmentImage} alt="Garment" className="w-full h-full object-contain bg-white" />
              </div>
            ) : (
              <div className="relative w-full h-full">
                <img src={featuredTryOnResult || ''} alt="Result" className="w-full h-full object-cover" />
              </div>
            )}

            {isGeneratingFeatured && (
               <div className="absolute inset-0 bg-zinc-900/80 backdrop-blur-sm flex flex-col items-center justify-center text-white z-20">
                <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin mb-3" />
                <p className="text-[10px] font-bold tracking-widest uppercase animate-pulse">Draping Garment...</p>
              </div>
            )}

            {/* View Toggles */}
            {featuredTryOnResult && !isGeneratingFeatured && (
               <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-1 bg-black/80 backdrop-blur-md p-1 rounded-xl shadow-xl z-30">
                  <button onClick={() => setFeaturedViewMode('after')} className={`px-2 py-1 text-[9px] font-bold uppercase tracking-wider rounded-lg transition ${featuredViewMode === 'after' ? 'bg-white text-black' : 'text-zinc-400 hover:text-white'}`}>Result</button>
                  <button onClick={() => setFeaturedViewMode('before')} className={`px-2 py-1 text-[9px] font-bold uppercase tracking-wider rounded-lg transition ${featuredViewMode === 'before' ? 'bg-white text-black' : 'text-zinc-400 hover:text-white'}`}>Target</button>
                  <button onClick={() => setFeaturedViewMode('product')} className={`px-2 py-1 text-[9px] font-bold uppercase tracking-wider rounded-lg transition ${featuredViewMode === 'product' ? 'bg-white text-black' : 'text-zinc-400 hover:text-white'}`}>Garm</button>
                  <button onClick={() => setFeaturedViewMode('compare')} className={`px-2 py-1 text-[9px] font-bold uppercase tracking-wider rounded-lg transition ${featuredViewMode === 'compare' ? 'bg-white text-black' : 'text-zinc-400 hover:text-white'}`}><Columns className="w-3 h-3" /></button>
               </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
};
