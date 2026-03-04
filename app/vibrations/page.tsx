'use client';

import { useEffect, useState } from 'react';
import { databases, account } from '@aura/utils/appwriteConfig';
import { Query, Models } from 'appwrite';
import { Check, X, Zap, Send, Clock, UserCheck, Users } from 'lucide-react'; 
import { useRouter } from 'next/navigation';

const DATABASE_ID = '698835eb000eb728917a';
const CONNECTIONS_COLLECTION_ID = 'connections';
const PROFILES_COLLECTION_ID = 'profiles';

interface ConnectionWithProfile extends Models.Document {
  senderId: string;
  receiverId: string;
  receiverProfileId?: string;
  status: string;
  friendSince?: string;
  otherUserProfile?: {
    username: string;
    profilePictureUrl: string;
    location: string;
    userId?: string;
  };
  isIncoming?: boolean;
}

// Helper function to create profile data
const createProfileData = (profile: any) => ({
  username: profile.username || 'Unknown User',
  profilePictureUrl: profile.profilePictureUrl || 'https://avatar.iran.liara.run/public',
  location: profile.location || 'Unknown',
  userId: profile.userId
});

export default function VibrationsPage() {
  const [incomingRequests, setIncomingRequests] = useState<ConnectionWithProfile[]>([]);
  const [sentRequests, setSentRequests] = useState<ConnectionWithProfile[]>([]);
  const [acceptedConnections, setAcceptedConnections] = useState<ConnectionWithProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'incoming' | 'sent' | 'accepted'>('incoming');
  const router = useRouter();

  useEffect(() => {
    const init = async () => {
      try {
        const user = await account.get();
        setCurrentUserId(user.$id);
      } catch (error) {
        console.error("Failed to get current user:", error);
        router.push('/auth');
      }
    };
    init();
  }, [router]);

  useEffect(() => {
    if (currentUserId) {
      fetchAllConnections();
    }
  }, [currentUserId]);

  // Function to find profile by userId
  const findProfileByUserId = async (userId: string) => {
    try {
      const profileQuery = await databases.listDocuments(
        DATABASE_ID,
        PROFILES_COLLECTION_ID,
        [Query.equal('userId', userId)]
      );
      
      if (profileQuery.documents.length > 0) {
        return profileQuery.documents[0];
      }
      return null;
    } catch (error) {
      return null;
    }
  };

  // Function to search all profiles for matching userId
  const searchAllProfilesForUserId = async (userId: string) => {
    try {
      const allProfiles = await databases.listDocuments(
        DATABASE_ID,
        PROFILES_COLLECTION_ID,
        [Query.limit(100)]
      );
      
      const matchingProfile = allProfiles.documents.find(p => p.userId === userId);
      if (matchingProfile) {
        return matchingProfile;
      }
      return null;
    } catch (error) {
      return null;
    }
  };

  // Function to get profile by document ID
  const getProfileById = async (profileId: string) => {
    try {
      const profile = await databases.getDocument(
        DATABASE_ID,
        PROFILES_COLLECTION_ID,
        profileId
      );
      return profile;
    } catch (error) {
      return null;
    }
  };

  const fetchAllConnections = async () => {
    if (!currentUserId) return;
    
    try {
      setLoading(true);

      // Get connections involving current user
      const allConnections = await databases.listDocuments(
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
      
      for (const doc of allConnections.documents) {
        const connection = doc as any;
        const isIncoming = connection.receiverId === currentUserId;
        const isSent = connection.senderId === currentUserId;
        
        const otherUserId = isIncoming ? connection.senderId : connection.receiverId;
        
        let otherUserProfile = null;
        
        try {
          // METHOD 1: Find profile by userId (preferred)
          let profileResult = await findProfileByUserId(otherUserId);
          
          // METHOD 2: Search all profiles if method 1 fails
          if (!profileResult) {
            profileResult = await searchAllProfilesForUserId(otherUserId);
          }
          
          // METHOD 3: Try direct profile ID if we have receiverProfileId
          if (!profileResult && connection.receiverProfileId) {
            profileResult = await getProfileById(connection.receiverProfileId);
          }
          
          // METHOD 4: Try otherUserId as profile ID (last resort)
          if (!profileResult) {
            profileResult = await getProfileById(otherUserId);
          }
          
          if (profileResult) {
            otherUserProfile = createProfileData(profileResult);
          } else {
            throw new Error('No profile found');
          }
        } catch (err) {
          // Create fallback profile data
          otherUserProfile = {
            username: isIncoming ? 'Unknown User' : 'Unknown Receiver',
            profilePictureUrl: '',
            location: 'Unknown',
            userId: otherUserId
          };
        }
        
        const enrichedConnection: ConnectionWithProfile = {
          ...connection,
          otherUserProfile,
          isIncoming
        };
        
        if (connection.status === 'pending') {
          if (isIncoming) {
            incoming.push(enrichedConnection);
          } else if (isSent) {
            sent.push(enrichedConnection);
          }
        } else if (connection.status === 'accepted') {
          accepted.push(enrichedConnection);
        }
      }
      
      setIncomingRequests(incoming);
      setSentRequests(sent);
      setAcceptedConnections(accepted);
      
    } catch (error) {
      console.error("Error fetching connections:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleResponse = async (connectionId: string, status: 'accepted' | 'declined') => {
    try {
      const friendSinceDate = status === 'accepted' ? new Date().toISOString() : "";
      
      await databases.updateDocument(
        DATABASE_ID,
        CONNECTIONS_COLLECTION_ID,
        connectionId,
        { 
          status: status,
          friendSince: friendSinceDate
        }
      );
      
      const connection = incomingRequests.find(req => req.$id === connectionId);
      setIncomingRequests(prev => prev.filter(req => req.$id !== connectionId));
      
      if (status === 'accepted' && connection) {
        setAcceptedConnections(prev => [...prev, { 
          ...connection, 
          status: 'accepted', 
          friendSince: friendSinceDate 
        }]);
      }
      
      // Refresh to show updated counts
      setTimeout(() => fetchAllConnections(), 500);
      
    } catch (error: any) {
      console.error("Update error:", error);
      alert(`Failed to ${status === 'accepted' ? 'accept' : 'decline'} connection: ${error.message}`);
    }
  };

  const cancelSentRequest = async (connectionId: string) => {
    if (!confirm("Are you sure you want to cancel this request?")) return;
    
    try {
      await databases.deleteDocument(
        DATABASE_ID,
        CONNECTIONS_COLLECTION_ID,
        connectionId
      );
      setSentRequests(prev => prev.filter(req => req.$id !== connectionId));
      alert("Request cancelled successfully!");
    } catch (error: any) {
      alert(`Failed to cancel request: ${error.message}`);
    }
  };

  const removeConnection = async (connectionId: string) => {
    if (!confirm("Are you sure you want to remove this connection?")) return;
    
    try {
      await databases.deleteDocument(
        DATABASE_ID,
        CONNECTIONS_COLLECTION_ID,
        connectionId
      );
      setAcceptedConnections(prev => prev.filter(conn => conn.$id !== connectionId));
      alert("Connection removed successfully!");
    } catch (error: any) {
      alert(`Failed to remove connection: ${error.message}`);
    }
  };

  if (loading) return (
    <div className="min-h-screen bg-aura-black flex items-center justify-center">
        <div className="text-aura-purple-light animate-pulse tracking-widest uppercase text-xs font-black">Loading Connections...</div>
    </div>
  );

  return (
    <div className="min-h-screen bg-aura-black p-8 lg:p-20 text-white selection:bg-aura-purple-main">
      <header className="mb-12">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-4xl lg:text-6xl font-black tracking-tighter italic">VIBRATIONS</h1>
            <p className="text-aura-purple-light text-[10px] font-bold uppercase tracking-[0.4em] mt-2">Your connection ecosystem</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => fetchAllConnections()}
              className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-white hover:text-black transition-all"
            >
              <Zap size={12} /> Refresh
            </button>
          </div>
        </div>
        
        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 bg-white/5 border border-white/10 rounded-2xl backdrop-blur-sm">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-aura-purple-main/20 rounded-lg">
                <Clock size={16} className="text-aura-purple-light" />
              </div>
              <div>
                <p className="text-white/40 text-[10px] uppercase tracking-widest">Incoming</p>
                <p className="text-2xl font-black">{incomingRequests.length}</p>
              </div>
            </div>
          </div>
          
          <div className="p-4 bg-white/5 border border-white/10 rounded-2xl backdrop-blur-sm">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500/20 rounded-lg">
                <Send size={16} className="text-blue-400" />
              </div>
              <div>
                <p className="text-white/40 text-[10px] uppercase tracking-widest">Sent</p>
                <p className="text-2xl font-black">{sentRequests.length}</p>
              </div>
            </div>
          </div>
          
          <div className="p-4 bg-white/5 border border-white/10 rounded-2xl backdrop-blur-sm">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-500/20 rounded-lg">
                <UserCheck size={16} className="text-green-400" />
              </div>
              <div>
                <p className="text-white/40 text-[10px] uppercase tracking-widest">Accepted</p>
                <p className="text-2xl font-black">{acceptedConnections.length}</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Tab Navigation */}
      <div className="mb-8">
        <div className="flex border-b border-white/10 overflow-x-auto">
          <button
            onClick={() => setActiveTab('incoming')}
            className={`px-6 py-3 text-[10px] font-black uppercase tracking-widest border-b-2 transition-all whitespace-nowrap ${activeTab === 'incoming' ? 'border-aura-purple-light text-aura-purple-light' : 'border-transparent text-white/40 hover:text-white'}`}
          >
            Incoming ({incomingRequests.length})
          </button>
          <button
            onClick={() => setActiveTab('sent')}
            className={`px-6 py-3 text-[10px] font-black uppercase tracking-widest border-b-2 transition-all whitespace-nowrap ${activeTab === 'sent' ? 'border-blue-400 text-blue-400' : 'border-transparent text-white/40 hover:text-white'}`}
          >
            Sent ({sentRequests.length})
          </button>
          <button
            onClick={() => setActiveTab('accepted')}
            className={`px-6 py-3 text-[10px] font-black uppercase tracking-widest border-b-2 transition-all whitespace-nowrap ${activeTab === 'accepted' ? 'border-green-400 text-green-400' : 'border-transparent text-white/40 hover:text-white'}`}
          >
            Connections ({acceptedConnections.length})
          </button>
        </div>
      </div>

      <div className="min-h-[50vh]">
        {activeTab === 'incoming' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {incomingRequests.length === 0 ? (
              <div className="col-span-full border border-white/5 bg-white/5 rounded-[3rem] p-32 text-center backdrop-blur-sm">
                <Users className="mx-auto mb-6 text-white/10" size={48} />
                <p className="text-white/20 uppercase tracking-[0.3em] text-[10px] font-black">No incoming requests</p>
                <div className="mt-8 p-4 bg-white/5 border border-white/10 rounded-xl max-w-md mx-auto">
                  <p className="text-white/30 text-[10px] uppercase tracking-widest mb-2">Why this might happen:</p>
                  <ol className="text-white/20 text-[9px] space-y-2 text-left">
                    <li>1. No one has sent you requests yet</li>
                    <li>2. Check if you have an internet connection</li>
                    <li>3. Refresh to check for new requests</li>
                  </ol>
                </div>
              </div>
            ) : (
              incomingRequests.map((req) => (
                <div key={req.$id} className="bg-white/5 border border-white/10 rounded-[2.5rem] p-8 hover:bg-white/[0.08] transition-all group relative overflow-hidden">
                  <div className="absolute -top-10 -right-10 w-32 h-32 bg-aura-purple-main/10 blur-[50px] rounded-full group-hover:bg-aura-purple-main/20 transition-all" />
                  <div className="flex items-center gap-5 mb-8">
                    <div className="relative">
                      <img 
                        src={req.otherUserProfile?.profilePictureUrl || 'https://avatar.iran.liara.run/public'} 
                        className="w-20 h-20 rounded-2xl object-cover grayscale group-hover:grayscale-0 transition-all duration-500 border border-white/10"
                        alt="Profile"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = 'https://avatar.iran.liara.run/public';
                        }}
                      />
                      <div className="absolute -bottom-2 -right-2 bg-aura-purple-main p-1.5 rounded-lg shadow-lg">
                        <Zap size={12} className="text-white" />
                      </div>
                    </div>
                    <div>
                      <h3 className="font-black text-2xl tracking-tighter uppercase italic">{req.otherUserProfile?.username}</h3>
                      <p className="text-[9px] text-white/40 uppercase tracking-widest font-bold mt-1">{req.otherUserProfile?.location}</p>
                      <p className="text-aura-purple-light text-[8px] mt-2 uppercase tracking-widest">Wants to connect</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <button 
                      onClick={() => handleResponse(req.$id, 'accepted')}
                      className="flex items-center justify-center gap-2 py-4 bg-white text-black rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] hover:bg-aura-purple-light transition-all"
                    >
                      <Check size={14} /> Accept
                    </button>
                    <button 
                      onClick={() => handleResponse(req.$id, 'declined')}
                      className="flex items-center justify-center gap-2 py-4 bg-white/5 border border-white/10 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] hover:bg-red-500/20 hover:text-red-400 transition-all text-white/40"
                    >
                      <X size={14} /> Decline
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'sent' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {sentRequests.length === 0 ? (
              <div className="col-span-full border border-white/5 bg-white/5 rounded-[3rem] p-32 text-center backdrop-blur-sm">
                <Send className="mx-auto mb-6 text-white/10" size={48} />
                <p className="text-white/20 uppercase tracking-[0.3em] text-[10px] font-black">No sent requests</p>
              </div>
            ) : (
              sentRequests.map((req) => (
                <div key={req.$id} className="bg-white/5 border border-white/10 rounded-[2.5rem] p-8 hover:bg-white/[0.08] transition-all relative overflow-hidden">
                  <div className="absolute -top-10 -right-10 w-32 h-32 bg-blue-500/10 blur-[50px] rounded-full group-hover:bg-blue-500/20 transition-all" />
                  <div className="flex items-center gap-5 mb-8">
                    <img 
                      src={req.otherUserProfile?.profilePictureUrl || 'https://avatar.iran.liara.run/public'} 
                      className="w-20 h-20 rounded-2xl object-cover grayscale border border-white/10"
                      alt="Profile"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = 'https://avatar.iran.liara.run/public';
                      }}
                    />
                    <div>
                      <h3 className="font-black text-2xl tracking-tighter uppercase italic">{req.otherUserProfile?.username}</h3>
                      <p className="text-blue-400 text-[8px] mt-2 uppercase tracking-widest font-bold">Pending</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => cancelSentRequest(req.$id)}
                    className="w-full py-4 bg-white/5 border border-white/10 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] hover:bg-red-500/20 hover:text-red-400 transition-all text-white/40"
                  >
                    Cancel Request
                  </button>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'accepted' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {acceptedConnections.length === 0 ? (
              <div className="col-span-full border border-white/5 bg-white/5 rounded-[3rem] p-32 text-center backdrop-blur-sm">
                <UserCheck className="mx-auto mb-6 text-white/10" size={48} />
                <p className="text-white/20 uppercase tracking-[0.3em] text-[10px] font-black">No connections yet</p>
              </div>
            ) : (
              acceptedConnections.map((conn) => (
                <div key={conn.$id} className="bg-white/5 border border-white/10 rounded-[2.5rem] p-8 hover:bg-white/[0.08] transition-all relative overflow-hidden">
                  <div className="absolute -top-10 -right-10 w-32 h-32 bg-green-500/10 blur-[50px] rounded-full group-hover:bg-green-500/20 transition-all" />
                  <div className="flex items-center gap-5 mb-8">
                    <img 
                      src={conn.otherUserProfile?.profilePictureUrl || 'https://avatar.iran.liara.run/public'} 
                      className="w-20 h-20 rounded-2xl object-cover border border-white/10"
                      alt="Profile"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = 'https://avatar.iran.liara.run/public';
                      }}
                    />
                    <div>
                      <h3 className="font-black text-2xl tracking-tighter uppercase italic">{conn.otherUserProfile?.username}</h3>
                      <p className="text-green-400 text-[8px] mt-2 uppercase tracking-widest">Connected</p>
                      {conn.friendSince && (
                        <p className="text-white/20 text-[7px] mt-1">Since: {new Date(conn.friendSince).toLocaleDateString()}</p>
                      )}
                    </div>
                  </div>
                  <button 
                    onClick={() => removeConnection(conn.$id)}
                    className="w-full py-4 bg-white/5 border border-white/10 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] hover:bg-red-500/20 hover:text-red-400 transition-all text-white/40"
                  >
                    Remove Connection
                  </button>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      <div className="mt-12 pt-8 border-t border-white/10 flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="text-white/30 text-[9px] uppercase tracking-widest">
          Your connection hub • {incomingRequests.length + sentRequests.length + acceptedConnections.length} total interactions
        </div>
        <div className="flex gap-2">
          <button 
            onClick={() => router.push('/onboarding')}
            className="px-6 py-3 bg-white/5 border border-white/10 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-white hover:text-black transition-all"
          >
            Edit Profile
          </button>
          <button 
            onClick={() => fetchAllConnections()}
            className="px-6 py-3 bg-white/5 border border-white/10 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-white hover:text-black transition-all"
          >
            Refresh Connections
          </button>
        </div>
      </div>
    </div>
  );
}