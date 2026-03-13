'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { databases, account } from '@aura/utils/appwriteConfig';
import { Query, ID } from 'appwrite';
import { 
  User, 
  Calendar, 
  MapPin, 
  Heart, 
  ArrowLeft, 
  Edit3, 
  Loader2,
  Cake,
  Sparkles,
  Shield,
  Zap,
  Flame,
  Star,
  MessageCircle,
  Share2,
  ChevronRight,
  Award,
  Check,
  X
} from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';

// Configuration Constants
const DATABASE_ID = '698835eb000eb728917a';
const PROFILES_COLLECTION_ID = 'profiles';
const CONNECTIONS_COLLECTION_ID = 'connections';

interface ProfileData {
  $id: string;
  userId: string;
  username: string;
  profilePictureUrl: string;
  bio?: string;
  birthdate?: string;
  gender?: string;
  location?: string;
  $createdAt?: string;
  $updatedAt?: string;
}

export default function ProfilePage() {
  const params = useParams();
  const router = useRouter();
  const [profileId, setProfileId] = useState<string | null>(null);
  
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCurrentUser, setIsCurrentUser] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [showShareMenu, setShowShareMenu] = useState(false);
  
  // Connection states
  const [connecting, setConnecting] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'none' | 'pending' | 'accepted'>('none');
  const [showNotification, setShowNotification] = useState(false);
  const [lastNotification, setLastNotification] = useState('');
  const [connectionId, setConnectionId] = useState<string | null>(null);

  // Extract profile ID from params safely
  useEffect(() => {
    const resolveParams = async () => {
      try {
        const resolvedParams = await params;
        const id = resolvedParams?.id as string;
        setProfileId(id);
      } catch (error) {
        console.error('Error resolving params:', error);
        setError('Invalid profile ID');
        setLoading(false);
      }
    };
    
    resolveParams();
  }, [params]);

  // Calculate age from birthdate
  const calculateAge = (birthdate?: string) => {
    if (!birthdate) return null;
    const today = new Date();
    const birthDate = new Date(birthdate);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  // Handle sending a like (connection)
  const handleSendLike = async () => {
    if (!currentUserId || !profile?.userId || connecting) return;
    
    setConnecting(true);
    try {
      const response = await databases.createDocument(
        DATABASE_ID, 
        CONNECTIONS_COLLECTION_ID, 
        ID.unique(), 
        {
          senderId: currentUserId,
          receiverId: profile.userId,
          status: 'pending',
          timestamp: new Date().toISOString()
        }
      );
      
      setConnectionId(response.$id);
      setConnectionStatus('pending');
      setLastNotification(`✨ You sent a like to ${profile.username}!`);
      setShowNotification(true);
      setTimeout(() => setShowNotification(false), 3000);
    } catch (e) {
      console.error("Like Failed:", e);
      setLastNotification(`❌ Failed to send like. Please try again.`);
      setShowNotification(true);
      setTimeout(() => setShowNotification(false), 3000);
    } finally {
      setConnecting(false);
    }
  };

  // Handle opening chat for mutual matches
  const handleOpenChat = () => {
    if (!profileId || !currentUserId) return;
    const conversationId = [currentUserId, profileId].sort().join('_');
    router.push(`/chat/${conversationId}`);
  };

  // Fetch profile data and check connection status
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        if (!profileId) return;

        setLoading(true);
        
        const currentUser = await account.get();
        setCurrentUserId(currentUser.$id);
        
        setIsCurrentUser(currentUser.$id === profileId);
        
        // Try to fetch by userId first, then by $id
        let response = await databases.listDocuments(
          DATABASE_ID,
          PROFILES_COLLECTION_ID,
          [Query.equal('userId', profileId)]
        );
        
        if (response.documents.length === 0) {
          response = await databases.listDocuments(
            DATABASE_ID,
            PROFILES_COLLECTION_ID,
            [Query.equal('$id', profileId)]
          );
        }
        
        if (response.documents.length > 0) {
          const profileData = response.documents[0] as unknown as ProfileData;
          setProfile(profileData);
          
          // Check connection status if not current user
          if (currentUser.$id !== profileId && profileData.userId) {
            const conn = await databases.listDocuments(
              DATABASE_ID, 
              CONNECTIONS_COLLECTION_ID, 
              [
                Query.or([
                  Query.and([
                    Query.equal('senderId', currentUser.$id), 
                    Query.equal('receiverId', profileData.userId)
                  ]),
                  Query.and([
                    Query.equal('senderId', profileData.userId), 
                    Query.equal('receiverId', currentUser.$id)
                  ])
                ])
              ]
            );
            
            if (conn.documents.length > 0) {
              setConnectionStatus(conn.documents[0].status as 'pending' | 'accepted');
              setConnectionId(conn.documents[0].$id);
            }
          }
        } else {
          setError('Profile not found');
        }
      } catch (err: any) {
        console.error('Error fetching profile:', err);
        setError(err.message || 'Failed to load profile');
      } finally {
        setLoading(false);
      }
    };

    if (profileId) {
      fetchProfile();
    }
  }, [profileId]);

  const handleEditProfile = () => {
    router.push('/profile/edit');
  };

  const age = profile?.birthdate ? calculateAge(profile.birthdate) : null;

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-rose-950 via-purple-950 to-indigo-950 flex items-center justify-center">
        <div className="relative">
          {/* Animated rings */}
          <div className="absolute inset-0 rounded-full bg-pink-500/20 animate-ping"></div>
          <div className="absolute inset-0 rounded-full bg-purple-500/20 animate-ping animation-delay-300"></div>
          
          {/* Center logo */}
          <div className="relative w-24 h-24 rounded-full bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center shadow-2xl">
            <Heart className="w-10 h-10 text-white animate-pulse" fill="currentColor" />
          </div>
        </div>
        <p className="absolute mt-32 text-pink-400 font-black tracking-[0.3em] uppercase text-xs animate-pulse">
          Loading Profile
        </p>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-rose-950 via-purple-950 to-indigo-950 flex items-center justify-center p-4">
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-[2rem] p-8 max-w-md w-full text-center relative overflow-hidden">
          {/* Decorative elements */}
          <div className="absolute -top-20 -right-20 w-40 h-40 bg-pink-500/20 rounded-full blur-3xl"></div>
          <div className="absolute -bottom-20 -left-20 w-40 h-40 bg-purple-500/20 rounded-full blur-3xl"></div>
          
          <div className="relative">
            <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-gradient-to-br from-pink-500/20 to-purple-600/20 flex items-center justify-center">
              <Heart className="w-12 h-12 text-pink-500/50" />
            </div>
            
            <h1 className="text-3xl font-bold text-white mb-2">Profile Not Found</h1>
            <p className="text-white/40 mb-8">{error || 'This profile does not exist or has been removed'}</p>
            
            <Link 
              href="/discovery"
              className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-pink-500 to-purple-600 text-white rounded-full font-medium hover:opacity-90 transition-all hover:scale-105 shadow-lg shadow-pink-500/25"
            >
              <ArrowLeft size={18} />
              Back to Discovery
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-rose-950 via-purple-950 to-indigo-950 relative">
      {/* Animated background floating hearts */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-[10%] text-6xl animate-float-slow opacity-5">❤️</div>
        <div className="absolute bottom-32 right-[15%] text-7xl animate-float-slower opacity-5">❤️</div>
        <div className="absolute top-1/3 right-[25%] text-5xl animate-float opacity-5">❤️</div>
        <div className="absolute top-2/3 left-[20%] text-5xl animate-float-delayed opacity-5">❤️</div>
        <div className="absolute top-40 right-[30%] text-4xl animate-float-slow opacity-5">❤️</div>
        <div className="absolute bottom-40 left-[30%] text-6xl animate-float-slower opacity-5">❤️</div>
      </div>

      {/* Notification Toast */}
      {showNotification && (
        <div className="fixed top-8 right-8 z-[200] animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="bg-gradient-to-r from-pink-600 to-purple-600 backdrop-blur-xl px-6 py-4 rounded-2xl shadow-[0_0_40px_rgba(236,72,153,0.3)] border border-white/20">
            <p className="text-white text-sm font-medium flex items-center gap-2">
              {lastNotification.includes('✨') ? (
                <Sparkles size={16} className="text-yellow-300" />
              ) : (
                <Heart size={16} className="text-white" />
              )}
              {lastNotification}
            </p>
          </div>
        </div>
      )}

      <div className="relative z-10 max-w-4xl mx-auto px-4 pt-6 pb-12">
        {/* Navigation - Floating pill style */}
        <div className="flex items-center justify-between mb-8 bg-black/30 backdrop-blur-xl rounded-full px-4 py-2 border border-white/10 w-fit mx-auto shadow-lg">
          <button 
            onClick={() => router.back()}
            className="flex items-center gap-2 text-white/70 hover:text-white transition-all group px-4 py-2"
          >
            <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
            <span className="text-sm font-medium">Discover</span>
          </button>
          
          <div className="w-px h-5 bg-white/20 mx-3"></div>
          
          <div className="flex items-center gap-2">
            {!isCurrentUser && (
              <>
                <button
                  onClick={() => setShowShareMenu(!showShareMenu)}
                  className="p-2.5 rounded-full hover:bg-white/10 transition-colors text-white/70 hover:text-white relative"
                >
                  <Share2 size={18} />
                  
                  {/* Share menu */}
                  {showShareMenu && (
                    <div className="absolute top-full right-0 mt-2 w-48 bg-[#120621] border border-white/10 rounded-xl p-1 shadow-2xl z-50 backdrop-blur-xl">
                      <button className="w-full text-left px-3 py-2.5 hover:bg-white/10 rounded-lg text-white/80 hover:text-white text-xs transition-colors flex items-center gap-2">
                        <span>📋</span> Copy Profile Link
                      </button>
                      <button className="w-full text-left px-3 py-2.5 hover:bg-white/10 rounded-lg text-white/80 hover:text-white text-xs transition-colors flex items-center gap-2">
                        <span>📱</span> Share on Social
                      </button>
                      <div className="border-t border-white/10 my-1"></div>
                      <button className="w-full text-left px-3 py-2.5 hover:bg-white/10 rounded-lg text-red-400 hover:text-red-300 text-xs transition-colors flex items-center gap-2">
                        <span>🚩</span> Report Profile
                      </button>
                    </div>
                  )}
                </button>
                
                <button className="p-2.5 rounded-full hover:bg-white/10 transition-colors text-white/70 hover:text-white">
                  <ChevronRight size={18} />
                </button>
              </>
            )}
            
            {isCurrentUser && (
              <button
                onClick={handleEditProfile}
                className="flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-pink-500 to-purple-600 rounded-full text-white hover:opacity-90 transition-all text-sm font-medium shadow-lg shadow-pink-500/25"
              >
                <Edit3 size={16} />
                <span>Edit Profile</span>
              </button>
            )}
          </div>
        </div>

        {/* Profile Card - Dating app style */}
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-[3rem] overflow-hidden shadow-2xl">
          {/* Cover Photo with Gradient - Romantic sunset style */}
          <div className="relative h-64 md:h-80 bg-gradient-to-br from-pink-600/40 via-purple-600/40 to-indigo-600/40">
            {/* Animated gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent"></div>
            
            {/* Decorative sparkles */}
            <div className="absolute top-6 right-6 text-yellow-300 animate-pulse">✨</div>
            <div className="absolute top-12 left-12 text-yellow-300 animate-pulse animation-delay-500">✨</div>
            
            {/* Avatar - Large and centered with romantic glow */}
            <div className="absolute -bottom-20 left-1/2 transform -translate-x-1/2">
              <div className="relative">
                {/* Multiple animated rings for romantic effect */}
                <div className="absolute inset-0 rounded-full bg-gradient-to-r from-pink-400 to-purple-400 animate-ping opacity-30 blur-md"></div>
                <div className="absolute -inset-3 rounded-full bg-gradient-to-r from-pink-500 to-purple-600 opacity-40 blur-xl animate-pulse"></div>
                <div className="absolute -inset-1 rounded-full bg-gradient-to-r from-pink-400 to-purple-500 opacity-60 blur-md"></div>
                
                {/* Avatar container - Much larger now */}
                <div className="relative w-40 h-40 md:w-48 md:h-48 rounded-full border-4 border-white/20 overflow-hidden bg-gradient-to-br from-pink-500 to-purple-600 shadow-2xl shadow-pink-500/30">
                  {profile.profilePictureUrl ? (
                    <Image 
                      src={profile.profilePictureUrl} 
                      alt={profile.username}
                      fill
                      sizes="(max-width: 768px) 160px, 192px"
                      className="object-cover"
                      priority
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <User className="w-16 h-16 text-white" />
                    </div>
                  )}
                </div>

                {/* Online indicator - Romantic glow */}
                <div className="absolute bottom-2 right-2 w-5 h-5 bg-green-500 rounded-full border-4 border-purple-900 shadow-lg shadow-green-500/50 animate-pulse"></div>
                
                {/* Heart sparkle */}
                <div className="absolute -top-2 -right-2 animate-bounce">
                  <Heart size={20} className="text-pink-400 fill-pink-400" />
                </div>
              </div>
            </div>
          </div>

          {/* Profile Info Section */}
          <div className="pt-28 pb-8 px-6">
            {/* Name and badges - Romantic centered */}
            <div className="text-center mb-8">
              <h1 className="text-4xl md:text-5xl font-bold text-white mb-2 tracking-tight">
                {profile.username}
                {isCurrentUser && (
                  <span className="ml-3 text-sm bg-green-500/20 text-green-400 px-3 py-1 rounded-full font-normal">
                    You
                  </span>
                )}
              </h1>
              
              <div className="flex flex-wrap items-center justify-center gap-2 mt-3">
                {age && (
                  <div className="flex items-center gap-1.5 bg-white/10 backdrop-blur-sm px-4 py-2 rounded-full border border-white/10">
                    <Cake size={14} className="text-pink-400" />
                    <span className="text-sm text-white/90">{age} years</span>
                  </div>
                )}
                
                {profile.gender && (
                  <div className="flex items-center gap-1.5 bg-white/10 backdrop-blur-sm px-4 py-2 rounded-full border border-white/10">
                    <User size={14} className="text-purple-400" />
                    <span className="text-sm text-white/90 capitalize">{profile.gender}</span>
                  </div>
                )}
                
                {profile.location && (
                  <div className="flex items-center gap-1.5 bg-white/10 backdrop-blur-sm px-4 py-2 rounded-full border border-white/10">
                    <MapPin size={14} className="text-pink-400" />
                    <span className="text-sm text-white/90">{profile.location}</span>
                  </div>
                )}
                
                <div className="flex items-center gap-1.5 bg-pink-500/20 backdrop-blur-sm px-4 py-2 rounded-full border border-pink-500/30">
                  <Flame size={14} className="text-pink-400" />
                  <span className="text-sm text-pink-300">Active Now</span>
                </div>
              </div>
            </div>

            {/* Bio Section - Romantic card */}
            {profile.bio && (
              <div className="mb-8 max-w-2xl mx-auto">
                <div className="bg-gradient-to-br from-white/5 to-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/10 relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-1.5 h-full bg-gradient-to-b from-pink-500 via-purple-500 to-pink-500"></div>
                  <div className="flex items-start gap-3">
                    <Sparkles size={20} className="text-pink-400 mt-0.5 flex-shrink-0" />
                    <p className="text-white/80 text-base leading-relaxed italic">{profile.bio}</p>
                  </div>
                  <div className="absolute -bottom-4 -right-4 text-4xl opacity-5 rotate-12">❤️</div>
                </div>
              </div>
            )}

            {/* Action Buttons - Main CTA */}
            <div className="flex justify-center mb-8">
              {!isCurrentUser ? (
                connectionStatus === 'none' ? (
                  <button
                    onClick={handleSendLike}
                    disabled={connecting}
                    className="group relative px-12 py-5 bg-gradient-to-r from-pink-500 to-purple-600 text-white rounded-full font-bold text-base uppercase tracking-wider overflow-hidden transition-all hover:scale-105 active:scale-95 disabled:opacity-50 shadow-xl shadow-pink-500/30 hover:shadow-pink-500/50"
                  >
                    <span className="relative z-10 flex items-center gap-3 text-lg">
                      {connecting ? (
                        <>
                          <Loader2 size={22} className="animate-spin" />
                          Sending...
                        </>
                      ) : (
                        <>
                          <Heart size={22} className="group-hover:scale-125 transition-transform" />
                          Send a Like
                          <Zap size={20} className="text-yellow-300" />
                        </>
                      )}
                    </span>
                    <div className="absolute inset-0 bg-gradient-to-r from-pink-600 to-purple-700 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                  </button>
                ) : connectionStatus === 'pending' ? (
                  <div className="px-10 py-5 bg-yellow-500/10 border-2 border-yellow-500/30 text-yellow-400 rounded-full font-bold text-base uppercase tracking-wider flex items-center gap-3 shadow-xl">
                    <Heart size={22} className="fill-yellow-400 animate-pulse" />
                    Like Pending
                    <Sparkles size={18} className="text-yellow-300" />
                  </div>
                ) : (
                  <button
                    onClick={handleOpenChat}
                    className="group px-12 py-5 bg-gradient-to-r from-pink-500 to-purple-600 text-white rounded-full font-bold text-base uppercase tracking-wider hover:opacity-90 transition-all hover:scale-105 shadow-xl shadow-pink-500/30 flex items-center gap-3"
                  >
                    <MessageCircle size={22} />
                    Message Your Match
                    <Heart size={18} className="fill-white group-hover:scale-125 transition-transform" />
                  </button>
                )
              ) : null}
            </div>

            {/* Info Grid - Romantic details */}
            <div className="grid grid-cols-2 gap-4 max-w-2xl mx-auto">
              {/* Member Since */}
              <div className="bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-white/10 hover:bg-white/10 transition-colors">
                <div className="flex items-center gap-2 text-white/40 mb-2">
                  <Calendar size={14} />
                  <span className="text-[10px] uppercase tracking-wider">Member Since</span>
                </div>
                <p className="text-white font-medium">
                  {new Date(profile.$createdAt || '').toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                </p>
              </div>

              {/* Verification Status */}
              <div className="bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-white/10 hover:bg-white/10 transition-colors">
                <div className="flex items-center gap-2 text-white/40 mb-2">
                  <Shield size={14} />
                  <span className="text-[10px] uppercase tracking-wider">Status</span>
                </div>
                <p className="text-green-400 font-medium flex items-center gap-2">
                  <Award size={16} />
                  Verified Profile
                </p>
              </div>

              {/* Interests - Full width */}
              <div className="col-span-2 bg-gradient-to-r from-pink-500/5 to-purple-600/5 backdrop-blur-sm rounded-xl p-4 border border-white/10">
                <div className="flex items-center gap-2 text-white/40 mb-3">
                  <Star size={14} />
                  <span className="text-[10px] uppercase tracking-wider">Interests</span>
                </div>
                <div className="flex flex-wrap gap-2 justify-center">
                  <span className="text-xs bg-pink-500/20 text-pink-300 px-4 py-2 rounded-full border border-pink-500/30">❤️ Dating</span>
                  <span className="text-xs bg-purple-500/20 text-purple-300 px-4 py-2 rounded-full border border-purple-500/30">🤝 Friendship</span>
                  <span className="text-xs bg-blue-500/20 text-blue-300 px-4 py-2 rounded-full border border-blue-500/30">💼 Networking</span>
                  <span className="text-xs bg-indigo-500/20 text-indigo-300 px-4 py-2 rounded-full border border-indigo-500/30">✈️ Travel</span>
                  <span className="text-xs bg-amber-500/20 text-amber-300 px-4 py-2 rounded-full border border-amber-500/30">🎨 Art</span>
                </div>
              </div>

              {/* Match compatibility - Romantic touch */}
              <div className="col-span-2 mt-2 text-center">
                <p className="text-white/30 text-xs flex items-center justify-center gap-2">
                  <Sparkles size={12} className="text-pink-400" />
                  89% compatibility score
                  <Sparkles size={12} className="text-purple-400" />
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style jsx global>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-25px) rotate(5deg); }
        }
        
        @keyframes float-slow {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-15px) rotate(-5deg); }
        }
        
        @keyframes float-slower {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-20px) rotate(10deg); }
        }
        
        .animate-float {
          animation: float 8s ease-in-out infinite;
        }
        
        .animate-float-slow {
          animation: float-slow 10s ease-in-out infinite;
        }
        
        .animate-float-slower {
          animation: float-slower 12s ease-in-out infinite;
        }
        
        .animate-float-delayed {
          animation: float 9s ease-in-out infinite;
          animation-delay: 2s;
        }
        
        .animation-delay-300 {
          animation-delay: 300ms;
        }
        
        .animation-delay-500 {
          animation-delay: 500ms;
        }
      `}</style>
    </main>
  );
}