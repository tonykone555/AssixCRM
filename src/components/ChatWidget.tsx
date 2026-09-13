import React, { useState, useEffect, useRef } from 'react';
import { MessageCircle, X, Send, Image as ImageIcon, Loader2, ArrowLeft, Paperclip, Users } from 'lucide-react';
import { User } from 'firebase/auth';
import { Lead, ChatMessage } from '../types';
import { subscribeToMessages, sendMessage, uploadFileToStorage, SUPER_ADMIN_EMAIL, requestPushPermission, getCachedMessages } from '../lib/firebase';
import { compressAndGetInstantDataUrl } from '../utils/imageCompressor';

interface ChatWidgetProps {
  currentUser: User | null;
  isSuperAdmin: boolean;
  availableAccounts: { email: string; uid: string; displayName?: string }[];
  leads: Lead[];
  isDarkMode: boolean;
  isCloudSyncEnabled?: boolean;
}

export const ChatWidget: React.FC<ChatWidgetProps> = ({
  currentUser,
  isSuperAdmin,
  availableAccounts,
  leads,
  isDarkMode,
  isCloudSyncEnabled = true,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [pushAsked, setPushAsked] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [selectedSubAccount, setSelectedSubAccount] = useState<string | null>(null);
  
  const [text, setText] = useState('');
  const [isSending, setIsSending] = useState(false);
  
  const [screenshotData, setScreenshotData] = useState<{name: string, dataUrl: string} | null>(null);
  const [isCompressing, setIsCompressing] = useState(false);
  const [taggedLeadId, setTaggedLeadId] = useState<string>('');
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const [unreadSenders, setUnreadSenders] = useState<Set<string>>(new Set());
  const lastSeenMessages = useRef<Set<string>>(new Set());
  const isInitialLoadRef = useRef<boolean>(true);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };
  
    useEffect(() => {
    if (currentUser?.email && 'Notification' in window && Notification.permission === 'granted') {
      requestPushPermission(currentUser.email);
    }
  }, [currentUser?.email]);

  useEffect(() => {
    if (!currentUser?.email) return;

    if (!isCloudSyncEnabled) {
      const cached = getCachedMessages();
      setMessages(cached);
      return;
    }

    const unsub = subscribeToMessages(currentUser.email, (msgs) => {
      setMessages(msgs);
    });
    return () => unsub();
  }, [currentUser, isCloudSyncEnabled]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isOpen, selectedSubAccount]);

  if (!currentUser) return null;

  // Filter messages based on active conversation
  const activeMessages = messages.filter(m => {
    const myEmail = currentUser.email?.toLowerCase();
    const adminEmail = SUPER_ADMIN_EMAIL.toLowerCase();
    const subEmail = selectedSubAccount?.toLowerCase();
    
    if (isSuperAdmin) {
      if (!subEmail) return false;
      return (
        (m.senderEmail === myEmail && m.receiverEmail === subEmail) ||
        (m.senderEmail === subEmail && m.receiverEmail === myEmail)
      );
    } else {
      return (
        (m.senderEmail === myEmail && m.receiverEmail === adminEmail) ||
        (m.senderEmail === adminEmail && m.receiverEmail === myEmail)
      );
    }
  });

  const requestNotificationPermission = async () => {
    if ('Notification' in window && Notification.permission === 'default') {
      await Notification.requestPermission();
    }
  };

  useEffect(() => {
    if (isOpen) {
      requestNotificationPermission();
    }
  }, [isOpen]);

  // Show notification for new messages and manage unread state (strictly for new incoming messages after load)
  useEffect(() => {
    if (messages.length === 0) return;

    // Handle initial batch of existing messages without triggering notifications
    if (isInitialLoadRef.current) {
      messages.forEach(msg => lastSeenMessages.current.add(msg.id));
      isInitialLoadRef.current = false;
      return;
    }

    let hasNew = false;
    const newUnread = new Set(unreadSenders);
    const currentMyEmail = currentUser.email?.toLowerCase();

    messages.forEach(msg => {
      if (!lastSeenMessages.current.has(msg.id)) {
        lastSeenMessages.current.add(msg.id);
        
        // Only trigger notification if the message comes from someone else
        if (msg.senderEmail !== currentMyEmail) {
          const isCurrentlyViewing = isOpen && (
            !isSuperAdmin || 
            (isSuperAdmin && selectedSubAccount?.toLowerCase() === msg.senderEmail)
          );

          if (!isCurrentlyViewing) {
            newUnread.add(msg.senderEmail);
            hasNew = true;
          }

          if (!isCurrentlyViewing && 'Notification' in window && Notification.permission === 'granted') {
            const title = `New message from ${msg.senderName}`;
            const options = {
              body: msg.text || (msg.screenshotUrl ? 'Sent an attachment' : 'New message received'),
              icon: '/vite.svg',
              badge: '/vite.svg',
              tag: 'chat-message'
            };

            if ('serviceWorker' in navigator) {
              navigator.serviceWorker.ready.then(registration => {
                registration.showNotification(title, options);
              }).catch(() => {
                new Notification(title, options);
              });
            } else {
              new Notification(title, options);
            }
          }
        }
      }
    });

    if (hasNew) {
      setUnreadSenders(newUnread);
    }
  }, [messages, isOpen, isSuperAdmin, selectedSubAccount, currentUser.email]);

  useEffect(() => {
    if (isOpen) {
      if (!isSuperAdmin) {
        setUnreadSenders(new Set());
      } else if (selectedSubAccount) {
        setUnreadSenders(prev => {
          const next = new Set(prev);
          next.delete(selectedSubAccount.toLowerCase());
          return next;
        });
      }
    }
  }, [isOpen, selectedSubAccount, isSuperAdmin]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!text.trim() && !screenshotData && !taggedLeadId) || isSending || isCompressing) return;
    
    setIsSending(true);
    
    try {
      let screenshotUrl = '';
      if (screenshotData) {
        screenshotUrl = screenshotData.dataUrl;
      }
      
      const targetEmail = (isSuperAdmin ? selectedSubAccount : SUPER_ADMIN_EMAIL)?.toLowerCase();
      if (!targetEmail) {
        throw new Error("No receiver selected");
      }
      
      const taggedLead = leads.find(l => l.id === taggedLeadId);
      
      const msg: Partial<ChatMessage> = {
        id: `msg_${Date.now()}_${Math.random().toString(36).substring(2,8)}`,
        senderEmail: currentUser.email!.toLowerCase(),
        senderName: currentUser.displayName || currentUser.email!.split('@')[0],
        receiverEmail: targetEmail,
        text: text.trim(),
        timestamp: new Date().toISOString(),
      };
      
      if (taggedLeadId) msg.leadId = taggedLeadId;
      if (taggedLead?.name) msg.leadName = taggedLead.name;
      if (screenshotUrl) msg.screenshotUrl = screenshotUrl;
      
      console.log('Sending message:', msg);
      
      // Optimistic update so it shows instantly even if Firebase quota is exhausted
      setMessages(prev => [...prev, msg as ChatMessage]);
      
      await sendMessage(msg as ChatMessage);
      console.log('Message sent successfully!');
      
      setText('');
      setScreenshotData(null);
      setTaggedLeadId('');
    } catch (err: any) {
      console.error("Failed to send message:", err);
      alert("Failed to send message: " + (err.message || 'Unknown error'));
    } finally {
      setIsSending(false);
      scrollToBottom();
    }
  };

  return (
    <>
      <button
                onClick={() => {
          setIsOpen(!isOpen);
          if (!isOpen && !pushAsked && currentUser?.email && 'Notification' in window && Notification.permission === 'default') {
            setPushAsked(true);
            requestPushPermission(currentUser.email);
          }
        }}
        className="fixed bottom-6 right-6 z-50 p-4 bg-black text-white rounded-full shadow-2xl hover:scale-105 transition-transform cursor-pointer flex items-center justify-center border border-zinc-800"
      >
        {isOpen ? <X className="w-6 h-6" /> : <MessageCircle className="w-6 h-6" />}
        {!isOpen && unreadSenders.size > 0 && (
          <span className="absolute top-0 right-0 -mt-1 -mr-1 flex h-4 w-4">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-4 w-4 bg-rose-500 border-2 border-black"></span>
          </span>
        )}
      </button>

      {isOpen && (
        <div className="fixed bottom-24 right-6 w-[400px] max-w-[calc(100vw-48px)] h-[550px] max-h-[calc(100vh-120px)] bg-black rounded-3xl shadow-2xl border border-zinc-800 z-50 flex flex-col overflow-hidden animate-in slide-in-from-bottom-5 fade-in duration-200">
          {/* Header */}
          <div className="bg-zinc-950 p-4 text-white flex items-center gap-3 border-b border-zinc-900">
            {isSuperAdmin && selectedSubAccount && (
              <button onClick={() => setSelectedSubAccount(null)} className="p-1 hover:bg-white/10 rounded-lg transition-colors shrink-0" title="Back to accounts">
                <ArrowLeft className="w-5 h-5" />
              </button>
            )}
            
            <div className="flex-1 min-w-0">
              {isSuperAdmin && selectedSubAccount ? (
                <div className="relative">
                  <select 
                    value={selectedSubAccount}
                    onChange={(e) => setSelectedSubAccount(e.target.value)}
                    className="w-full bg-transparent text-sm font-bold text-white border-none outline-none cursor-pointer appearance-none truncate pr-4"
                  >
                    {availableAccounts.filter(a => a.email.toLowerCase() !== SUPER_ADMIN_EMAIL.toLowerCase()).map(acc => (
                      <option key={acc.email} value={acc.email} className="bg-zinc-900 text-white">
                        Chat with {acc.displayName || acc.email.split('@')[0]} {unreadSenders.has(acc.email.toLowerCase()) ? '(New)' : ''}
                      </option>
                    ))}
                  </select>
                  <div className="absolute right-0 top-1/2 -translate-y-1/2 pointer-events-none text-zinc-500 text-[10px]">▼</div>
                </div>
              ) : (
                <h3 className="font-bold text-sm truncate">
                  {isSuperAdmin ? 'Select Account to Chat' : 'Chat with Support (Admin)'}
                </h3>
              )}
            </div>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto bg-black flex flex-col p-4 relative">
            {isSuperAdmin && !selectedSubAccount ? (
              <div className="flex flex-col gap-2">
                <p className="text-xs text-zinc-500 font-medium mb-2 px-2">Sub-Accounts</p>
                {availableAccounts.filter(a => a.email.toLowerCase() !== SUPER_ADMIN_EMAIL.toLowerCase()).map(acc => (
                  <button
                    key={acc.email}
                    onClick={() => setSelectedSubAccount(acc.email)}
                    className="flex items-center gap-3 p-3 rounded-xl bg-zinc-900/50 border border-zinc-800 hover:border-zinc-600 transition-colors text-left relative"
                  >
                    {unreadSenders.has(acc.email.toLowerCase()) && (
                      <div className="absolute top-3 right-3 w-2.5 h-2.5 bg-rose-500 rounded-full border border-zinc-900 shadow-sm shadow-rose-500/50"></div>
                    )}
                    <div className="w-8 h-8 rounded-full bg-zinc-800 text-white flex items-center justify-center font-bold text-xs">
                      {acc.email.substring(0, 2).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-white truncate">{acc.displayName || acc.email}</p>
                      <p className="text-[10px] text-zinc-500 truncate">{acc.email}</p>
                    </div>
                  </button>
                ))}
                {availableAccounts.filter(a => a.email.toLowerCase() !== SUPER_ADMIN_EMAIL.toLowerCase()).length === 0 && (
                  <div className="text-center p-6 text-zinc-600 text-xs">No sub-accounts found.</div>
                )}
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                {activeMessages.length === 0 ? (
                  <div className="text-center p-6 text-zinc-600 text-xs mt-10">No messages yet. Say hello!</div>
                ) : (
                  activeMessages.map(msg => {
                    const isMe = msg.senderEmail === currentUser.email;
                    return (
                      <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} gap-1 max-w-[85%]`}>
                        <div className={`p-3 rounded-2xl text-sm ${
                          isMe 
                            ? 'bg-zinc-800 text-white rounded-tr-sm border border-zinc-700' 
                            : 'bg-zinc-900 text-zinc-200 border border-zinc-800 rounded-tl-sm'
                        }`}>
                          {msg.leadId && msg.leadName && (
                            <div className={`text-[10px] px-2 py-1 mb-2 rounded-lg inline-flex font-semibold ${isMe ? 'bg-zinc-700 text-zinc-200' : 'bg-zinc-800 text-zinc-300'}`}>
                              📎 Lead: {msg.leadName}
                            </div>
                          )}
                          {msg.screenshotUrl && (
                            <button type="button" onClick={() => setLightboxImage(msg.screenshotUrl!)} className="block mb-2 text-left cursor-zoom-in active:scale-95 transition-transform">
                              <img src={msg.screenshotUrl} alt="Screenshot" className="rounded-lg max-w-[200px] max-h-[200px] object-cover border border-zinc-700 hover:opacity-90 transition-opacity" />
                            </button>
                          )}
                          {msg.text && <p className="whitespace-pre-wrap">{msg.text}</p>}
                        </div>
                        <span className="text-[9px] text-zinc-600 px-1">
                          {new Date(msg.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                        </span>
                      </div>
                    )
                  })
                )}
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>

          {/* Input Area */}
          {(!isSuperAdmin || selectedSubAccount) && (
            <div className="p-3 bg-zinc-950 border-t border-zinc-900 flex flex-col gap-2">
              {(screenshotData || taggedLeadId) && (
                <div className="flex flex-wrap gap-2 px-1">
                  {screenshotData && (
                    <span className="inline-flex items-center gap-1 bg-zinc-800 text-zinc-300 px-2 py-1 rounded-md text-[10px] font-semibold border border-zinc-700">
                      <ImageIcon className="w-3 h-3" />
                      <span className="max-w-[100px] truncate">{screenshotData.name}</span>
                      <button type="button" onClick={() => setScreenshotData(null)}><X className="w-3 h-3 hover:text-white" /></button>
                    </span>
                  )}
                  {taggedLeadId && (
                    <span className="inline-flex items-center gap-1 bg-zinc-800 text-zinc-300 px-2 py-1 rounded-md text-[10px] font-semibold border border-zinc-700">
                      <Paperclip className="w-3 h-3" />
                      <span className="max-w-[100px] truncate">{leads.find(l => l.id === taggedLeadId)?.name || 'Lead'}</span>
                      <button type="button" onClick={() => setTaggedLeadId('')}><X className="w-3 h-3 hover:text-white" /></button>
                    </span>
                  )}
                </div>
              )}
              
              <form onSubmit={handleSend} className="flex items-center gap-2">
                <div className="flex items-center gap-1">
                  <label className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-full cursor-pointer transition-colors" title="Attach Screenshot">
                    <ImageIcon className="w-4 h-4" />
                    <input 
                      type="file" 
                      accept="image/*" 
                      className="hidden" 
                      onChange={(e) => {
                        if (e.target.files?.[0]) {
                          setIsCompressing(true);
                          const file = e.target.files[0];
                          compressAndGetInstantDataUrl(file).then(({ dataUrl }) => {
                            setScreenshotData({ name: file.name, dataUrl });
                            setIsCompressing(false);
                          }).catch((err) => {
                            console.error(err);
                            setIsCompressing(false);
                          });
                        }
                      }}
                    />
                  </label>
                  
                  <div className="relative group">
                    <button type="button" className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-full cursor-pointer transition-colors" title="Tag a Lead">
                      <Paperclip className="w-4 h-4" />
                    </button>
                    <div className="absolute bottom-full left-0 mb-2 w-48 bg-zinc-900 rounded-xl shadow-xl border border-zinc-700 hidden group-hover:flex flex-col max-h-48 overflow-y-auto">
                      <p className="text-[10px] font-bold text-zinc-500 px-3 py-2 sticky top-0 bg-zinc-900/90 backdrop-blur border-b border-zinc-800">Tag Lead</p>
                      {leads.length === 0 ? <p className="text-[10px] text-zinc-600 px-3 py-2">No leads available</p> : leads.map(l => (
                        <button
                          key={l.id}
                          type="button"
                          onClick={() => setTaggedLeadId(l.id)}
                          className="text-left px-3 py-2 text-[11px] text-zinc-300 hover:bg-zinc-800 truncate border-b border-zinc-800/50 last:border-0"
                        >
                          {l.name}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
                
                <input
                  type="text"
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="Type a message..."
                  className="flex-1 bg-zinc-900 border border-zinc-800 rounded-full px-4 py-2 text-sm text-white focus:outline-none focus:border-zinc-600 placeholder:text-zinc-600"
                />
                
                <button
                  type="submit"
                  disabled={isSending || isCompressing || (!text.trim() && !screenshotData && !taggedLeadId)}
                  className="p-2 bg-white text-black rounded-full hover:bg-zinc-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
                >
                  {isSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4 ml-0.5" />}
                </button>
              </form>
            </div>
          )}
        </div>
      )}
      {lightboxImage && (
        <div className="fixed inset-0 z-[99999] bg-black/90 flex items-center justify-center p-4 backdrop-blur-sm" onClick={() => setLightboxImage(null)}>
          <button 
            className="absolute top-6 right-6 p-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-full transition-colors"
            onClick={(e) => { e.stopPropagation(); setLightboxImage(null); }}
          >
            <X className="w-6 h-6" />
          </button>
          <img 
            src={lightboxImage} 
            alt="Full size screenshot" 
            className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </>
  );
};
