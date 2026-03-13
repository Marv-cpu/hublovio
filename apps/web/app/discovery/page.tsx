'use client';
import { useEffect, useState, useMemo } from 'react';
import { databases, account } from '@aura/utils/appwriteConfig';
import { Query, Models } from 'appwrite';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Check, X, Zap, Send, Clock, UserCheck, Users, Bell, Menu } from 'lucide-react';

// Configuration Constants
const DATABASE_ID = '698835eb000eb728917a';
const CONNECTIONS_COLLECTION_ID = 'connections';
const PROFILES_COLLECTION_ID = 'profiles';
const CONVERSATIONS_COLLECTION_ID = 'conversations';

interface Profile {
  $id: string;
  username: string;
  profilePictureUrl: string;
  bio?: string;
  birthdate?: string;
  gender?: string;
  location?: string;
  website?: string;
  userId: string;
}

interface Connection extends Models.Document {
  senderId: string;
  receiverId: string;
  status: 'pending' | 'accepted' | 'declined';
  timestamp?: string;
  friendSince?: string;
  receiverProfileId?: string;
}

interface ConnectionWithProfile extends Connection {
  otherUserProfile?: {
    username: string;
    profilePictureUrl: string;
    location: string;
    userId?: string;
  };
  isIncoming?: boolean;
}

export default function DiscoveryPage() {
  // Navigation & UI State
  const [view, setView] = useState<'discover' | 'matches'>('discover');
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const router = useRouter();

  // Data State
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [connectedUserIds, setConnectedUserIds] = useState<Set<string>>(new Set());
  const [incomingRequests, setIncomingRequests] = useState<ConnectionWithProfile[]>([]);
  const [sentRequests, setSentRequests] = useState<ConnectionWithProfile[]>([]);
  const [acceptedConnections, setAcceptedConnections] = useState<ConnectionWithProfile[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState('all');
  const [activeMatchTab, setActiveMatchTab] = useState<'incoming' | 'sent' | 'accepted'>('incoming');
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  // Handle navigation to chat
  const handleChatNavigation = async (connection: ConnectionWithProfile) => {
    if (!currentUserId) return;
    
    // Determine the other user's ID
    const otherUserId = connection.isIncoming ? connection.senderId : connection.receiverId;
    
    // Generate conversationId in the format expected by your chat page
    const conversationId = `${currentUserId}_${otherUserId}`;
    
    try {
      // Check if a conversation already exists
      const existingConversations = await databases.listDocuments(
        DATABASE_ID, 
        CONVERSATIONS_COLLECTION_ID,
        [
          Query.equal('conversationId', conversationId)
        ]
      );

      // If no conversation exists, create one
      if (existingConversations.documents.length === 0) {
        await databases.createDocument(
          DATABASE_ID,
          CONVERSATIONS_COLLECTION_ID,
          'unique()',
          {
            senderId: currentUserId,
            receiverId: otherUserId,
            conversationId: conversationId,
            message: '', // Initial empty message
            isRead: false,
            createdAt: new Date().toISOString()
          }
        );
      }
      
      console.log('Navigating to chat:', { conversationId, currentUserId, otherUserId });
      router.push(`/chat/${conversationId}`);
    } catch (error) {
      console.error('Error setting up conversation:', error);
    }
  };

  // 1. Initialize User & Data
  useEffect(() => {
    const init = async () => {
      try {
        // Check if DATABASE_ID is defined
        if (!DATABASE_ID) {
          console.error('DATABASE_ID is not defined');
          return;
        }

        const user = await account.get();
        setCurrentUserId(user.$id);
        
        const [profileRes, connectionsRes] = await Promise.all([
          databases.listDocuments(
            DATABASE_ID, 
            PROFILES_COLLECTION_ID, 
            [
              Query.orderDesc('$createdAt'),
              Query.limit(100)
            ]
          ),
          databases.listDocuments(
            DATABASE_ID, 
            CONNECTIONS_COLLECTION_ID, 
            [
              Query.or([
                Query.equal('senderId', user.$id), 
                Query.equal('receiverId', user.$id)
              ])
            ]
          )
        ]);

        const linkedIds = new Set<string>();
        connectionsRes.documents.forEach((doc: any) => {
          linkedIds.add(doc.senderId);
          linkedIds.add(doc.receiverId);
        });
        
        setConnectedUserIds(linkedIds);
        setProfiles(profileRes.documents as unknown as Profile[]);
      } catch (error) {
        console.error("Initialization error:", error);
        router.push('/auth');
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [router]);

  // 2. Refresh Connections data when switching to Matches view
  useEffect(() => {
    if (currentUserId && view === 'matches') {
      fetchAllConnections();
    }
  }, [currentUserId, view]);

  const fetchAllConnections = async () => {
    if (!currentUserId) return;
    try {
      const allConnections = await databases.listDocuments<Connection>(
        DATABASE_ID, 
        CONNECTIONS_COLLECTION_ID, 
        [
          Query.or([
            Query.equal('senderId', currentUserId), 
            Query.equal('receiverId', currentUserId)
          ])
        ]
      );

      const incoming: ConnectionWithProfile[] = [];
      const sent: ConnectionWithProfile[] = [];
      const accepted: ConnectionWithProfile[] = [];

      for (const connection of allConnections.documents) {
        const isIncoming = connection.receiverId === currentUserId;
        const otherUserId = isIncoming ? connection.senderId : connection.receiverId;

        const profileQuery = await databases.listDocuments(
          DATABASE_ID, 
          PROFILES_COLLECTION_ID, 
          [
            Query.equal('userId', otherUserId),
            Query.limit(1)
          ]
        );

        const profileResult = profileQuery.documents[0] as any;
        
        const enriched: ConnectionWithProfile = {
          ...connection,
          isIncoming,
          otherUserProfile: {
            username: profileResult?.username || 'Unknown User',
            profilePictureUrl: profileResult?.profilePictureUrl || '',
            location: profileResult?.location || 'Unknown',
            userId: otherUserId
          }
        };

        if (connection.status === 'pending') {
          isIncoming ? incoming.push(enriched) : sent.push(enriched);
        } else if (connection.status === 'accepted') {
          accepted.push(enriched);
        }
      }
      
      setIncomingRequests(incoming);
      setSentRequests(sent);
      setAcceptedConnections(accepted);
    } catch (e) { 
      console.error('Error fetching connections:', e); 
    }
  };

  const handleResponse = async (id: string, status: 'accepted' | 'declined') => {
    if (!currentUserId) return;
    
    try {
      const updateData: Partial<Connection> = { 
        status,
        ...(status === 'accepted' && { friendSince: new Date().toISOString() })
      };
      
      await databases.updateDocument(
        DATABASE_ID, 
        CONNECTIONS_COLLECTION_ID, 
        id, 
        updateData
      );
      
      fetchAllConnections();
    } catch (error) {
      console.error('Error updating connection:', error);
    }
  };

  const filteredDiscovery = useMemo(() => {
    return profiles.filter(profile => {
      if (profile.userId === currentUserId) return false;
      if (connectedUserIds.has(profile.userId)) return false;
      if (activeFilter !== 'all' && profile.gender?.toLowerCase() !== activeFilter.toLowerCase()) return false;
      return true;
    });
  }, [activeFilter, profiles, connectedUserIds, currentUserId]);

  if (loading) return (
    <div className="min-h-screen bg-[#1A0B2E] flex flex-col items-center justify-center">
      <div className="relative">
        <div className="w-24 h-24 rounded-full bg-pink-500/20 animate-ping absolute inset-0"></div>
        <div className="w-24 h-24 rounded-full border-2 border-pink-500/50 flex items-center justify-center animate-pulse">
          <Zap className="text-pink-500" fill="currentColor" />
        </div>
      </div>
      <p className="mt-8 text-pink-400 font-black tracking-[0.3em] uppercase text-[10px]">Syncing Matches</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#1A0B2E] text-white flex overflow-hidden">
      
      {/* SIDEBAR */}
      <aside className={`fixed lg:relative z-[200] h-screen w-72 bg-[#120621] border-r border-white/5 transition-transform duration-500 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
        <div className="p-8 flex flex-col h-full">
          <h2 className="text-2xl font-serif italic font-bold mb-10 bg-gradient-to-r from-pink-400 to-purple-400 bg-clip-text text-transparent">LovioHub</h2>
          
          <nav className="space-y-4 flex-1">
            <SidebarLink icon={<Zap size={18}/>} label="Discover" active={view === 'discover'} onClick={() => {setView('discover'); setSidebarOpen(false);}} />
            <SidebarLink icon={<Users size={18}/>} label="Matches" active={view === 'matches'} badge={incomingRequests.length.toString()} onClick={() => {setView('matches'); setSidebarOpen(false);}} />
            <SidebarLink icon={<Check size={18}/>} label="Premium" />
            <SidebarLink icon={<Bell size={18}/>} label="Notifications" />
          </nav>

          <div className="p-4 bg-white/5 rounded-3xl border border-white/10 flex items-center gap-3">
             <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-pink-500 to-purple-600 p-0.5 shadow-[0_0_15px_rgba(236,72,153,0.3)]">
                <div className="w-full h-full rounded-full bg-[#120621]" />
             </div>
             <span className="text-sm font-bold">My Aura</span>
          </div>
        </div>
      </aside>

      <main className="flex-1 h-screen overflow-y-auto relative custom-scrollbar pb-24">
        <header className="pt-12 px-8 mb-10">
          <div className="flex justify-between items-center mb-8">
            <button onClick={() => setSidebarOpen(true)} className="lg:hidden p-2 bg-white/5 rounded-lg"><Menu /></button>
            <h1 className="text-4xl font-black italic tracking-tighter">
              {view === 'discover' ? 'Discover' : 'Matches'}<span className="text-pink-500">.</span>
            </h1>
            <div className="w-12 h-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 transition-all cursor-pointer">
              <Bell size={20} className="text-white/60" />
            </div>
          </div>

          {view === 'discover' ? (
            <div className="flex gap-4 overflow-x-auto pb-4 no-scrollbar">
              {['all', 'male', 'female'].map((cat) => (
                <button key={cat} onClick={() => setActiveFilter(cat)} className={`px-10 py-4 rounded-2xl text-[11px] font-black uppercase tracking-widest border transition-all duration-500 ${activeFilter === cat ? 'bg-pink-500 shadow-[0_10px_25px_rgba(236,72,153,0.4)] border-transparent -translate-y-1' : 'bg-white/5 border-white/10 text-white/40 hover:border-pink-500/30'}`}>
                  {cat}
                </button>
              ))}
            </div>
          ) : (
            <div className="flex gap-4 border-b border-white/10 mb-8 overflow-x-auto no-scrollbar">
                {['incoming', 'sent', 'accepted'].map((tab: any) => (
                    <button key={tab} onClick={() => setActiveMatchTab(tab)} className={`pb-4 px-6 text-[10px] font-black uppercase tracking-[0.2em] border-b-2 transition-all whitespace-nowrap ${activeMatchTab === tab ? 'border-pink-500 text-pink-500' : 'border-transparent text-white/40'}`}>
                        {tab} ({tab === 'incoming' ? incomingRequests.length : tab === 'sent' ? sentRequests.length : acceptedConnections.length})
                    </button>
                ))}
            </div>
          )}
        </header>

        <div className="px-8">
          {view === 'discover' ? (
            <div className="grid grid-cols-2 md:grid-cols-2 xl:grid-cols-4 gap-y-16 gap-x-12">
              {filteredDiscovery.length === 0 ? (
                <div className="col-span-full py-20 text-center bg-white/5 rounded-[3rem] border border-white/5">
                  <p className="text-white/20 uppercase tracking-[0.4em] font-black text-xs">No new matches in your area</p>
                </div>
              ) : (
                filteredDiscovery.map((profile, i) => {
                  // Ensure we have a valid ID to link to
                  const profileId = profile.userId || profile.$id;
                  
                  return (
                    <Link 
                      key={profile.$id} 
                      href={`/profile/${profileId}`}
                      className="focus:outline-none focus:ring-2 focus:ring-pink-500/50 rounded-2xl"
                    >
                      <div className="group flex flex-col items-center animate-[zoomIn_0.5s_ease-out_forwards] cursor-pointer hover:scale-105 transition-transform duration-300" style={{animationDelay: `${i*0.05}s`}}>
                        <div className="relative w-40 h-40 md:w-52 md:h-52 rounded-full p-1.5 bg-gradient-to-tr from-pink-500 via-purple-500 to-orange-400 transition-transform group-hover:scale-105 group-hover:rotate-6 shadow-2xl">
                          <div className="w-full h-full rounded-full overflow-hidden border-[6px] border-[#1A0B2E] relative">
                            <Image 
                              src={profile.profilePictureUrl || '/default-avatar.png'} 
                              alt={profile.username} 
                              fill 
                              sizes="(max-width: 768px) 160px, 208px"
                              className="object-cover grayscale-[0.3] group-hover:grayscale-0 transition-all duration-700" 
                              priority={i < 4} 
                            />
                          </div>
                          <div className="absolute bottom-4 right-6 w-6 h-6 bg-green-500 rounded-full border-[5px] border-[#1A0B2E] shadow-[0_0_15px_#22c55e]"></div>
                        </div>
                        <h3 className="mt-6 text-2xl font-serif italic font-bold group-hover:text-pink-400 transition-colors">{profile.username}</h3>
                        <p className="mt-2 text-[10px] uppercase tracking-[0.2em] font-black text-white/30 bg-white/5 px-4 py-1.5 rounded-full">{profile.location || 'Location not set'}</p>
                      </div>
                    </Link>
                  );
                })
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
               {(activeMatchTab === 'incoming' ? incomingRequests : activeMatchTab === 'sent' ? sentRequests : acceptedConnections).map((conn) => (
                  <div key={conn.$id} className="bg-[#120621] border border-white/5 rounded-[2.5rem] p-8 hover:bg-white/[0.04] transition-all relative overflow-hidden group">
                     <div className="flex items-center gap-5 mb-8">
                        <div className="relative">
                          <img 
                            src={conn.otherUserProfile?.profilePictureUrl || '/default-avatar.png'} 
                            className="w-20 h-20 rounded-2xl object-cover border border-white/10 grayscale group-hover:grayscale-0 transition-all" 
                            alt="Avatar" 
                          />
                          {activeMatchTab === 'accepted' && <div className="absolute -top-2 -right-2 bg-green-500 p-1.5 rounded-lg"><UserCheck size={12} /></div>}
                        </div>
                        <div>
                           <h4 className="font-black uppercase italic text-2xl tracking-tighter">{conn.otherUserProfile?.username}</h4>
                           <p className="text-[9px] text-white/30 tracking-[0.2em] uppercase font-bold">{conn.otherUserProfile?.location || 'Location not set'}</p>
                        </div>
                     </div>
                     {activeMatchTab === 'incoming' && (
                        <div className="grid grid-cols-2 gap-4">
                           <button onClick={() => handleResponse(conn.$id, 'accepted')} className="py-4 bg-white text-black rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-pink-500 hover:text-white transition-all">Accept</button>
                           <button onClick={() => handleResponse(conn.$id, 'declined')} className="py-4 bg-white/5 border border-white/10 rounded-2xl text-[10px] font-black uppercase text-white/40 hover:bg-red-500/20 hover:text-red-400 transition-all">Decline</button>
                        </div>
                     )}
                     {activeMatchTab === 'sent' && (
                        <div className="flex items-center justify-center gap-3 py-4 bg-blue-500/5 border border-blue-500/10 rounded-2xl">
                          <Clock size={14} className="text-blue-400" />
                          <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest">Pending Vibe</span>
                        </div>
                     )}
                     {activeMatchTab === 'accepted' && (
                        <button 
                          onClick={() => handleChatNavigation(conn)}
                          className="w-full py-4 bg-gradient-to-r from-pink-500 to-purple-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] shadow-lg shadow-pink-500/20 hover:scale-[1.02] transition-transform active:scale-95"
                        >
                          Enter Chat
                        </button>
                     )}
                  </div>
               ))}
            </div>
          )}
        </div>
      </main>

      <style jsx global>{`
        @keyframes zoomIn { from { opacity: 0; transform: scale(0.85) translateY(20px); } to { opacity: 1; transform: scale(1) translateY(0); } }
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: linear-gradient(#ec4899, #8b5cf6); border-radius: 10px; }
      `}</style>
    </div>
  );
}

function SidebarLink({ icon, label, active = false, badge = "", onClick }: any) {
  return (
    <div onClick={onClick} className={`group flex items-center justify-between p-4 rounded-2xl cursor-pointer transition-all duration-300 ${active ? 'bg-pink-500/10 border border-pink-500/20 text-white shadow-[inset_0_0_20px_rgba(236,72,153,0.05)]' : 'text-white/40 hover:bg-white/5 hover:text-white'}`}>
      <div className="flex items-center gap-4">
        <span className={`transition-transform group-hover:scale-125 ${active ? 'text-pink-500' : ''}`}>{icon}</span>
        <span className="font-bold text-[11px] uppercase tracking-[0.2em]">{label}</span>
      </div>
      {badge !== "0" && badge !== "" && (
        <span className="bg-pink-500 text-[10px] px-2 py-0.5 rounded-full text-white font-black shadow-[0_0_10px_rgba(236,72,153,0.5)]">
          {badge}
        </span>
      )}
    </div>
  );
}