import React, { useState } from 'react';
import { Camera, Edit3, X, Columns, ShoppingCart, Sparkle, ArrowLeft } from 'lucide-react';
import { Lead } from '../types';

interface ProductDemoModalProps {
  lead: Lead;
  onClose: () => void;
}

export const ProductDemoModal: React.FC<ProductDemoModalProps> = ({ lead, onClose }) => {
  // Use lead's product image first, then placeholder
  const initialGarment = lead.productImage || 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=600&auto=format&fit=crop';

  const [featuredGarmentImage, setFeaturedGarmentImage] = useState(initialGarment);
  const [featuredUserPhoto, setFeaturedUserPhoto] = useState<string | null>(null);
  
  const [isGeneratingFeatured, setIsGeneratingFeatured] = useState(false);
  const [featuredTryOnResult, setFeaturedTryOnResult] = useState<string | null>(null);
  const [featuredTryOnError, setFeaturedTryOnError] = useState<string | null>(null);
  
  const [featuredViewMode, setFeaturedViewMode] = useState<'after' | 'before' | 'compare' | 'product'>('product');
  
  const [featuredProductName, setFeaturedProductName] = useState('Signature Collection');
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [lastTapTime, setLastTapTime] = useState(0);

  const handleTitleDoubleTap = () => {
    setIsEditingTitle(true);
  };

  const handleTouchEndTitle = () => {
    const now = Date.now();
    if (now - lastTapTime < 300) {
      setIsEditingTitle(true);
    }
    setLastTapTime(now);
  };

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
    // If they upload a human photo, keep it on product until generated
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
    <div className="fixed inset-0 z-[100] bg-white font-sans overflow-y-auto">
      {/* Subtle Close Button for CRM user (Invisible enough for screen recording if they scroll down slightly) */}
      <button 
        onClick={onClose}
        className="absolute top-4 left-4 p-2 bg-stone-100 hover:bg-stone-200 text-stone-600 rounded-full transition z-50 flex items-center gap-2"
        title="Back to CRM"
      >
        <ArrowLeft size={16} />
        <span className="text-xs font-bold uppercase tracking-widest">Exit Demo</span>
      </button>

      {/* Mock Store Navigation */}
      <div className="w-full bg-white border-b border-stone-100 py-6 px-8 flex justify-center sticky top-0 z-40">
        <h1 className="text-2xl font-black tracking-tighter uppercase text-[#111111]">
          {lead.name || 'Storefront'}
        </h1>
      </div>

      <div className="py-12 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col lg:flex-row gap-16 items-start">
            
            {/* =======================================
                LEFT COLUMN: CANVAS / IMAGE VIEWER 
               ======================================= */}
            <div className="flex-1 w-full relative">
              <div className="bg-stone-50 rounded-2xl p-6 lg:p-10 flex flex-col h-full border border-stone-200">
                
                {/* Top View Mode Bar (Before / After / Compare) */}
                {featuredTryOnResult && (
                  <div className="flex items-center justify-between mb-4 bg-white p-1.5 rounded-xl border border-stone-200 shadow-sm flex-wrap gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-stone-400 px-2">
                      View Mode
                    </span>
                    <div className="flex gap-1">
                      <button
                        onClick={() => setFeaturedViewMode('after')}
                        className={`px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest rounded-lg transition flex items-center gap-1.5 cursor-pointer border-none ${
                          featuredViewMode === 'after' ? 'bg-[#111111] text-white shadow-sm' : 'bg-transparent text-stone-500 hover:text-black'
                        }`}
                      >
                        Result
                      </button>
                      <button
                        onClick={() => setFeaturedViewMode('before')}
                        className={`px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest rounded-lg transition flex items-center gap-1.5 cursor-pointer border-none ${
                          featuredViewMode === 'before' ? 'bg-[#111111] text-white shadow-sm' : 'bg-transparent text-stone-500 hover:text-black'
                        }`}
                      >
                        <Camera size={12} /> Target
                      </button>
                      <button
                        onClick={() => setFeaturedViewMode('compare')}
                        className={`px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest rounded-lg transition flex items-center gap-1.5 cursor-pointer border-none ${
                          featuredViewMode === 'compare' ? 'bg-[#111111] text-white shadow-sm' : 'bg-transparent text-stone-500 hover:text-black'
                        }`}
                      >
                        <Columns size={12} /> Compare
                      </button>
                    </div>
                  </div>
                )}

                <div className="flex-1 relative rounded-xl overflow-hidden bg-white aspect-[3/4] flex items-center justify-center border border-stone-200 shadow-sm w-full">
                  
                  {/* CANVAS DISPLAY BASED ON VIEW MODE */}
                  {featuredViewMode === 'compare' && featuredUserPhoto && featuredTryOnResult ? (
                    <div className="absolute inset-0 grid grid-cols-2 divide-x-2 divide-white">
                      <div className="relative w-full h-full bg-stone-100 overflow-hidden">
                        <img src={featuredUserPhoto} alt="Original Person" className="w-full h-full object-cover" />
                        <span className="absolute top-3 left-3 bg-black/75 backdrop-blur text-white text-[9px] font-bold uppercase tracking-widest px-2.5 py-1 rounded shadow-md">
                          BEFORE
                        </span>
                      </div>
                      <div className="relative w-full h-full bg-stone-100 overflow-hidden">
                        <img src={featuredTryOnResult} alt="Virtual Try-On Result" className="w-full h-full object-cover" />
                        <span className="absolute top-3 left-3 bg-black text-white text-[9px] font-bold uppercase tracking-widest px-2.5 py-1 rounded shadow-md flex items-center gap-1">
                          AFTER
                        </span>
                      </div>
                    </div>
                  ) : featuredViewMode === 'before' && featuredUserPhoto ? (
                    <div className="relative w-full h-full bg-stone-100">
                      <img src={featuredUserPhoto} alt="Original Person" className="w-full h-full object-cover" />
                      <span className="absolute top-4 left-4 bg-black/75 backdrop-blur text-white text-[10px] font-bold uppercase tracking-widest px-3 py-1.5 rounded-md shadow-md">
                        Original Photo
                      </span>
                    </div>
                  ) : featuredViewMode === 'product' ? (
                    <div className="relative w-full h-full bg-white flex items-center justify-center">
                      <img src={featuredGarmentImage} alt="Product" className="w-full h-full object-contain" />
                    </div>
                  ) : (
                    <div className="relative w-full h-full bg-stone-100">
                      <img src={featuredTryOnResult || featuredGarmentImage} alt="Featured View" className="w-full h-full object-cover" />
                    </div>
                  )}

                  {/* Loading / Generating UI overlay */}
                  {isGeneratingFeatured && (
                    <div className="absolute inset-0 bg-stone-900/80 backdrop-blur-sm flex flex-col items-center justify-center text-white z-20">
                      <div className="w-10 h-10 border-4 border-white/20 border-t-white rounded-full animate-spin mb-3"></div>
                      <p className="text-xs font-bold tracking-widest uppercase mb-1 animate-pulse">Generating Try-On...</p>
                      <p className="text-[10px] text-stone-300">Draping Garment</p>
                    </div>
                  )}

                  {/* Error Banner */}
                  {featuredTryOnError && !isGeneratingFeatured && (
                    <div className="absolute bottom-6 right-6 w-56 bg-red-600 text-white rounded-xl shadow-2xl p-4 z-20 border border-red-500">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-bold uppercase tracking-widest flex items-center gap-1">
                          <X size={14} /> Failed
                        </span>
                        <button onClick={() => setFeaturedTryOnError(null)} className="text-white/80 hover:text-white bg-transparent border-none cursor-pointer">
                          <X size={14} />
                        </button>
                      </div>
                      <p className="text-[10px] leading-tight text-white/90">{featuredTryOnError}</p>
                    </div>
                  )}

                  {/* Secret Upload Garment override for testing (Subtle) */}
                  {!featuredTryOnResult && (
                    <div className="absolute top-4 right-4 flex items-center gap-2 z-30 opacity-0 hover:opacity-100 transition-opacity">
                      <label className="bg-white/90 backdrop-blur text-[#111111] hover:bg-[#111111] hover:text-white px-3 py-2 rounded-lg shadow-md text-[10px] font-bold uppercase tracking-widest cursor-pointer transition flex items-center gap-1.5 border border-stone-200">
                        <input type="file" accept="image/jpeg, image/png, image/webp" className="hidden" onChange={handleFeaturedGarmentUpload} />
                        <Edit3 size={12} /> Swap Garment
                      </label>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* =======================================
                RIGHT COLUMN: PRODUCT INFO & UPLOADER 
               ======================================= */}
            <div className="flex-1 space-y-8 w-full py-4">
              <div>
                <span className="text-[10px] font-bold tracking-widest text-stone-400 uppercase mb-2 block">
                  {lead.name} Exclusive
                </span>
                {isEditingTitle ? (
                  <input 
                    type="text" 
                    value={featuredProductName}
                    autoFocus
                    onChange={(e) => setFeaturedProductName(e.target.value)}
                    onBlur={() => setIsEditingTitle(false)}
                    onKeyDown={(e) => e.key === 'Enter' && setIsEditingTitle(false)}
                    className="text-2xl sm:text-3xl font-bold uppercase tracking-widest text-[#111111] mb-2 w-full bg-stone-100 border-2 border-stone-900 rounded-lg px-2.5 py-1 outline-none"
                  />
                ) : (
                  <div 
                    onDoubleClick={handleTitleDoubleTap}
                    onTouchEnd={handleTouchEndTitle}
                    className="group relative cursor-pointer select-none inline-block max-w-full"
                    title="Double-tap or double-click to rename collection"
                  >
                    <h2 className="text-2xl sm:text-3xl font-bold uppercase tracking-widest text-[#111111] mb-1 group-hover:text-stone-700 transition-colors flex items-center gap-2">
                      <span>{featuredProductName}</span>
                      <Edit3 size={16} className="text-stone-400 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                    </h2>
                    <span className="text-[9px] text-stone-400 font-mono tracking-normal block mb-2">
                      (Double-tap to rename)
                    </span>
                  </div>
                )}
                <p className="text-xl font-mono font-bold text-stone-600">$120.00</p>
              </div>

              <div className="text-sm text-stone-500 font-medium leading-relaxed">
                Experience unparalleled craftsmanship. Test out our Virtual Fitting Room by uploading your photo to see this garment draped on you instantly.
              </div>

              <div className="space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-widest text-[#111111]">Select Size</h3>
                <div className="flex gap-3">
                  {['XS', 'S', 'M', 'L', 'XL'].map(size => (
                    <button key={size} className="w-12 h-12 border border-stone-200 rounded flex items-center justify-center text-xs font-bold text-stone-600 hover:border-black hover:text-black transition cursor-pointer bg-white">
                      {size}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-4 pt-8 border-t border-stone-100">
                <h3 className="text-xs font-bold uppercase tracking-widest text-[#111111]">Virtual Fitting Room</h3>
                <p className="text-xs text-stone-500 leading-relaxed max-w-md">
                  Upload a photo of yourself facing forward. We'll instantly generate a preview of you wearing this item.
                </p>
                
                {/* UPLOAD ZONE */}
                {!featuredUserPhoto ? (
                  <label className="border-2 border-dashed border-stone-200 rounded-xl p-8 flex flex-col items-center justify-center text-center bg-stone-50 hover:bg-stone-100 transition cursor-pointer">
                    <input type="file" accept="image/jpeg, image/png, image/webp" className="hidden" onChange={handleFeaturedPhotoUpload} />
                    <Camera size={32} className="text-stone-400 mb-3" />
                    <p className="text-sm font-bold text-[#111111] mb-1">Click to upload your photo</p>
                    <p className="text-xs text-stone-500">JPG, PNG up to 5MB</p>
                  </label>
                ) : (
                  /* FILE ATTACHED VIEW */
                  <div className="relative border border-stone-200 rounded-xl p-4 bg-stone-50 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-16 rounded-lg bg-stone-200 overflow-hidden border border-stone-300 relative shadow-sm shrink-0">
                        <img src={featuredUserPhoto} alt="User selfie" className="w-full h-full object-cover" />
                        <span className="absolute bottom-0 inset-x-0 bg-black/70 text-white text-[7px] font-bold text-center uppercase py-0.5">Target</span>
                      </div>
                      <div>
                        <p className="text-xs font-bold text-[#111111]">model_photo.jpg</p>
                        <p className="text-[10px] text-stone-500">Target photo uploaded</p>
                        <label className="text-[10px] font-bold text-stone-900 hover:underline cursor-pointer flex items-center gap-1 mt-1">
                          <input type="file" accept="image/jpeg, image/png, image/webp" className="hidden" onChange={handleFeaturedPhotoUpload} />
                          <Camera size={11} /> Upload different photo
                        </label>
                      </div>
                    </div>
                    <button onClick={() => setFeaturedUserPhoto(null)} className="p-2 text-stone-400 hover:text-red-500 bg-transparent border-none cursor-pointer">
                      <X size={16} />
                    </button>
                  </div>
                )}

                {/* ACTION BUTTONS */}
                <div className="flex gap-4 mt-4 pt-2">
                  <button 
                    onClick={handleGenerateFeaturedTryOn}
                    disabled={!featuredUserPhoto || isGeneratingFeatured}
                    className={`flex-1 py-4 font-bold uppercase tracking-widest text-xs rounded-lg transition shadow-lg flex items-center justify-center gap-2 cursor-pointer border-none ${
                      !featuredUserPhoto ? 'bg-stone-200 text-stone-400 cursor-not-allowed shadow-none' : 
                      isGeneratingFeatured ? 'bg-stone-800 text-white cursor-wait opacity-80' : 
                      'bg-[#111111] text-white hover:bg-stone-800'
                    }`}
                  >
                    {isGeneratingFeatured ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        Generating...
                      </>
                    ) : (
                      <>
                        <Sparkle size={16} /> Try It On Me
                      </>
                    )}
                  </button>
                  
                  <button className="py-4 px-6 bg-white border border-stone-200 text-[#111111] font-bold uppercase tracking-widest text-xs rounded-lg hover:border-black transition shadow-sm cursor-pointer flex items-center gap-2">
                    <ShoppingCart size={16} /> Add
                  </button>
                </div>
              </div>
              
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
