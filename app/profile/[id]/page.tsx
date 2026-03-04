'use client';
import { use, useEffect, useState, useRef, useCallback } from 'react';
import { databases, account, client } from '@aura/utils/appwriteConfig';
import { useRouter } from 'next/navigation';
import { ID, Query } from 'appwrite';
import Image from 'next/image';
import Link from 'next/link';

interface Profile {
  $id: string;
  userId?: string; 
  username: string;
  bio: string;
  profilePictureUrl: string;
  gender: string;
  location: string;
  birthdate: string;
}

interface Message {
  $id: string;
  id: number; 
  senderId: string;
  receiverId: string;
  message: string;
  $createdAt: string;
  createdAt?: string;
  isRead?: boolean;
  conversationId?: string;
}

interface ChatPartner {
  userId: string;
  username: string;
  avatar: string;
  lastMessage?: string;
}

export default function ProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();

  // IDs & Config
  const DATABASE_ID = '698835eb000eb728917a';
  const PROFILES_COLLECTION = 'profiles';
  const CONNECTIONS_COLLECTION = 'connections';
  const MESSAGES_COLLECTION = 'conversations';

  // State
  const [profile, setProfile] = useState<Profile | null>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [connecting, setConnecting] = useState<boolean>(false);
  const [hasConnected, setHasConnected] = useState<boolean>(false);
  const [connectionStatus, setConnectionStatus] = useState<'none' | 'pending' | 'accepted'>('none');

  // Chat & UI State
  const [isChatOpen, setIsChatOpen] = useState<boolean>(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState<string>('');
  const [matches, setMatches] = useState<ChatPartner[]>([]);
  const [showNotification, setShowNotification] = useState<boolean>(false);
  const [lastNotification, setLastNotification] = useState<string>('');

  // Refs
  const scrollRef = useRef<HTMLDivElement>(null);
  const unsubscribeRef = useRef<(() => void) | null>(null);

  // --- AUTO SCROLL LOGIC ---
  const scrollToBottom = useCallback(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, []);

  useEffect(() => {
    if (isChatOpen) scrollToBottom();
  }, [messages, isChatOpen, scrollToBottom]);

  const playPulseSound = useCallback(() => {
    const audio = new Audio('/sounds/notification.mp3');
    audio.play().catch(() => {}); 
  }, []);

  // --- CONNECTION LOGIC (FIXED) ---
  const handleConnect = async () => {
    if (!currentUser || !profile?.userId || connecting) return;
    setConnecting(true);
    try {
      await databases.createDocument(DATABASE_ID, CONNECTIONS_COLLECTION, ID.unique(), {
        senderId: currentUser.$id,
        receiverId: profile.userId,
        status: 'pending',
        timestamp: new Date().toISOString()
      });
      setHasConnected(true);
      setConnectionStatus('pending');
    } catch (e) {
      console.error("Frequency Link Failed:", e);
    } finally {
      setConnecting(false);
    }
  };

  const fetchMatches = useCallback(async (userId: string) => {
    try {
      const connRes = await databases.listDocuments(DATABASE_ID, CONNECTIONS_COLLECTION, [
        Query.equal('status', 'accepted'),
        Query.or([Query.equal('senderId', userId), Query.equal('receiverId', userId)])
      ]);

      const partners = await Promise.all(connRes.documents.map(async doc => {
        const partnerId = doc.senderId === userId ? doc.receiverId : doc.senderId;
        const profileRes = await databases.listDocuments(DATABASE_ID, PROFILES_COLLECTION, [
          Query.equal('userId', partnerId)
        ]);
        const p = profileRes.documents[0] as unknown as Profile;
        return {
          userId: partnerId,
          username: p?.username || 'Unknown Aura',
          avatar: p?.profilePictureUrl || '',
          lastMessage: 'Frequency established'
        };
      }));
      setMatches(partners);
    } catch (e) { console.error(e); }
  }, []);

  const fetchMessages = useCallback(async () => {
    if (!currentUser || !profile?.userId) return;
    try {
      const res = await databases.listDocuments(DATABASE_ID, MESSAGES_COLLECTION, [
        Query.or([
          Query.and([Query.equal('senderId', currentUser.$id), Query.equal('receiverId', profile.userId)]),
          Query.and([Query.equal('senderId', profile.userId), Query.equal('receiverId', currentUser.$id)])
        ]),
        Query.orderAsc('$createdAt')
      ]);
      setMessages(res.documents as unknown as Message[]);
    } catch (e) { console.error(e); }
  }, [currentUser, profile]);

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !currentUser || !profile?.userId) return;

    const validRangeId = Math.floor(Math.random() * 999998) + 1;

    try {
      const msg = await databases.createDocument(DATABASE_ID, MESSAGES_COLLECTION, ID.unique(), {
        id: validRangeId,
        senderId: currentUser.$id,
        receiverId: profile.userId,
        message: newMessage,
        createdAt: new Date().toISOString(),
        isRead: false,
        conversationId: [currentUser.$id, profile.userId].sort().join('_')
      });
      setMessages(prev => [...prev, msg as unknown as Message]);
      setNewMessage('');
    } catch (e) { 
      console.error("Pulse Transmission Failed:", e); 
    }
  };

  useEffect(() => {
    const init = async () => {
      try {
        const [profileDoc, userDoc] = await Promise.all([
          databases.getDocument(DATABASE_ID, PROFILES_COLLECTION, id),
          account.get().catch(() => null)
        ]);
        
        const pData = profileDoc as unknown as Profile;
        setProfile(pData);
        setCurrentUser(userDoc);

        if (userDoc && pData.userId) {
          const conn = await databases.listDocuments(DATABASE_ID, CONNECTIONS_COLLECTION, [
            Query.or([
              Query.and([Query.equal('senderId', userDoc.$id), Query.equal('receiverId', pData.userId)]),
              Query.and([Query.equal('senderId', pData.userId), Query.equal('receiverId', userDoc.$id)])
            ])
          ]);
          if (conn.documents.length > 0) {
            setHasConnected(true);
            setConnectionStatus(conn.documents[0].status);
          }
          fetchMatches(userDoc.$id);

          const sub = client.subscribe(`databases.${DATABASE_ID}.collections.${MESSAGES_COLLECTION}.documents`, (res) => {
            const payload = res.payload as Message;
            if (payload.receiverId === userDoc.$id) {
              playPulseSound();
              setLastNotification(payload.message);
              setShowNotification(true);
              setTimeout(() => setShowNotification(false), 4000);
              if (isChatOpen) fetchMessages();
            }
          });
          unsubscribeRef.current = sub;
        }
      } catch (e) { router.push('/discovery'); } finally { setLoading(false); }
    };
    init();
    return () => unsubscribeRef.current?.();
  }, [id, isChatOpen, fetchMessages, fetchMatches, playPulseSound, router]);

  if (loading) return (
    <div className="min-h-screen bg-aura-black flex items-center justify-center">
      <div className="text-aura-purple-light animate-pulse tracking-[0.5em] uppercase text-xs">Syncing Frequency...</div>
    </div>
  );

  if (!profile) return null;

  return (
    <div className="min-h-screen bg-aura-black text-white selection:bg-aura-purple-main relative overflow-hidden">
      
      <div className="absolute inset-0 opacity-10 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-aura-purple-main blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-aura-teal-main blur-[100px] rounded-full" />
      </div>

      {showNotification && (
        <div className="fixed top-6 right-6 z-[100] animate-bounce">
          <div className="bg-white/10 backdrop-blur-xl border border-aura-purple-light/50 p-4 rounded-2xl shadow-2xl">
            <p className="text-[10px] font-black uppercase text-aura-purple-light tracking-widest">New Pulse</p>
            <p className="text-sm text-white/90">{lastNotification}</p>
          </div>
        </div>
      )}

      <div className="relative z-10 max-w-6xl mx-auto px-6 py-12">
        <Link href="/discovery" className="inline-flex items-center gap-2 text-xs font-black tracking-widest text-white/40 hover:text-aura-purple-light transition-all mb-12">
          ← BACK TO DISCOVERY
        </Link>

        <div className="grid lg:grid-cols-12 gap-12 items-center">
          <div className="lg:col-span-5 flex justify-center">
            <div className="relative w-80 h-80 lg:w-[450px] lg:h-[450px]">
              <div className="absolute inset-0 border border-white/10 rounded-full animate-[spin_20s_linear_infinite]" />
              <div className="absolute inset-4 border border-aura-purple-main/20 rounded-full" />
              <div className="absolute inset-0 p-6">
                <div className="relative w-full h-full rounded-full overflow-hidden border-4 border-white/5">
                  <Image 
                    src={profile.profilePictureUrl || '/placeholder-aura.jpg'} 
                    alt={profile.username}
                    fill
                    className="object-cover grayscale-[0.2] hover:grayscale-0 transition-all duration-700"
                    priority
                    unoptimized
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-7 space-y-8">
            <div>
              <h1 className="text-7xl lg:text-9xl font-black tracking-tighter leading-none italic uppercase">
                {profile.username}<span className="text-aura-purple-light">.</span>
              </h1>
              <div className="flex gap-4 mt-4">
                <span className="text-[10px] font-black tracking-[0.3em] uppercase bg-white/5 px-4 py-2 rounded-full border border-white/10">{profile.location}</span>
                <span className="text-[10px] font-black tracking-[0.3em] uppercase bg-white/5 px-4 py-2 rounded-full border border-white/10">{profile.gender}</span>
              </div>
            </div>

            <p className="text-2xl font-light italic text-white/60 leading-relaxed max-w-xl">
              "{profile.bio}"
            </p>

            <div className="flex flex-wrap gap-4 pt-6">
              {!hasConnected ? (
                <button 
                  onClick={handleConnect}
                  disabled={connecting}
                  className="px-10 py-5 bg-aura-purple-main rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-aura-purple-light transition-all shadow-xl shadow-aura-purple-main/20 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {connecting ? 'Linking...' : 'Send Frequency'}
                </button>
              ) : (
                <div className="flex gap-4">
                   <div className="px-8 py-5 border border-aura-teal-main/50 text-aura-teal-main rounded-2xl font-black uppercase text-xs tracking-widest">
                    {connectionStatus}
                  </div>
                  {connectionStatus === 'accepted' && (
                    <button 
                      onClick={() => { setIsChatOpen(true); fetchMessages(); }}
                      className="px-10 py-5 bg-white text-black rounded-2xl font-black uppercase text-xs tracking-widest hover:invert transition-all"
                    >
                      Initiate Pulse
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {isChatOpen && (
        <div className="fixed inset-0 z-[150] flex justify-end">
          <div className="absolute inset-0 bg-aura-black/60 backdrop-blur-md" onClick={() => setIsChatOpen(false)} />
          <div className="w-full lg:w-[450px] bg-aura-gray-dark border-l border-white/10 h-full relative flex flex-col animate-in slide-in-from-right duration-500">
            
            <div className="p-8 border-b border-white/10 flex items-center justify-between">
              <h2 className="font-black italic tracking-tighter text-xl">CHATS<span className="text-aura-purple-light">.</span></h2>
              <button onClick={() => setIsChatOpen(false)} className="text-white/40 hover:text-white">✕</button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {messages.map((m, i) => (
                <div key={i} className={`flex ${m.senderId === currentUser?.$id ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[80%] px-5 py-3 rounded-2xl text-sm ${
                    m.senderId === currentUser?.$id ? 'bg-aura-purple-main text-white' : 'bg-white/5 border border-white/10'
                  }`}>
                    {m.message}
                  </div>
                </div>
              ))}
              <div ref={scrollRef} className="h-1 w-full" />
            </div>

            <form onSubmit={sendMessage} className="p-8 bg-white/5 border-t border-white/10">
              <div className="relative">
                <input 
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Type message..."
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-6 py-4 outline-none focus:border-aura-purple-main transition-all pr-16"
                />
                <button type="submit" className="absolute right-3 top-1/2 -translate-y-1/2 bg-white text-black p-2 rounded-lg font-bold">→</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}