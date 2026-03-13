'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { databases, account } from '@/utils/appwriteConfig';
import { Query } from 'appwrite';
import { ChevronRight, MessageCircle, Heart } from 'lucide-react';

const DATABASE_ID = '698835eb000eb728917a';
const MESSAGES_COLLECTION_ID = 'conversations';
const PROFILES_COLLECTION_ID = 'profiles';

interface Conversation {
  conversationId: string;
  lastMessage: string;
  lastMessageTime: string;
  otherUser: any;
  unreadCount: number;
}

export default function MessagesPage() {
  const router = useRouter();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);

  useEffect(() => {
    loadConversations();
  }, []);

  const loadConversations = async () => {
    try {
      // Get current user
      const user = await account.get();
      setCurrentUser(user);

      // Get all messages where user is sender or receiver
      const sentMessages = await databases.listDocuments(DATABASE_ID, MESSAGES_COLLECTION_ID, [
        Query.equal('senderId', user.$id),
        Query.orderDesc('createdAt'),
        Query.limit(100)
      ]);

      const receivedMessages = await databases.listDocuments(DATABASE_ID, MESSAGES_COLLECTION_ID, [
        Query.equal('receiverId', user.$id),
        Query.orderDesc('createdAt'),
        Query.limit(100)
      ]);

      // Combine and deduplicate by conversationId
      const allMessages = [...sentMessages.documents, ...receivedMessages.documents];
      const conversationMap = new Map();

      // Sort messages by date to get the latest for each conversation
      const sortedMessages = allMessages.sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );

      for (const msg of sortedMessages) {
        if (!conversationMap.has(msg.conversationId)) {
          conversationMap.set(msg.conversationId, {
            conversationId: msg.conversationId,
            lastMessage: msg.message,
            lastMessageTime: msg.createdAt,
            unreadCount: msg.receiverId === user.$id && !msg.isRead ? 1 : 0
          });
        } else if (msg.receiverId === user.$id && !msg.isRead) {
          // Increment unread count
          const existing = conversationMap.get(msg.conversationId);
          existing.unreadCount += 1;
        }
      }

      // Fetch other user profiles for each conversation
      const conversationsWithUsers = await Promise.all(
        Array.from(conversationMap.values()).map(async (conv: any) => {
          // Extract other user ID from conversationId or messages
          let otherUserId = null;
          
          // First try to get from messages
          const convMessages = allMessages.filter(m => m.conversationId === conv.conversationId);
          for (const msg of convMessages) {
            if (msg.senderId !== user.$id) {
              otherUserId = msg.senderId;
              break;
            }
            if (msg.receiverId !== user.$id) {
              otherUserId = msg.receiverId;
              break;
            }
          }

          // If not found in messages, try to parse from conversationId (format: userA_userB)
         if (!otherUserId && conv.conversationId && conv.conversationId.includes('_')) {
  const participants = conv.conversationId.split('_');
  otherUserId = participants.find((id: string) => id !== user.$id);
}

          if (otherUserId) {
            try {
              const profileRes = await databases.listDocuments(DATABASE_ID, PROFILES_COLLECTION_ID, [
                Query.equal('userId', otherUserId),
                Query.limit(1)
              ]);

              return {
                ...conv,
                otherUser: profileRes.documents[0] || {
                  userId: otherUserId,
                  username: 'User',
                  profilePictureUrl: null,
                  age: null
                }
              };
            } catch (err) {
              console.error('Error fetching profile:', err);
              return {
                ...conv,
                otherUser: {
                  userId: otherUserId,
                  username: 'User',
                  profilePictureUrl: null,
                  age: null
                }
              };
            }
          }
          return null;
        })
      );

      setConversations(conversationsWithUsers.filter(Boolean));
    } catch (err) {
      console.error('Error loading conversations:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleChatClick = (conversationId: string) => {
    // Make sure we have a valid conversationId
    if (!conversationId) {
      console.error('No conversation ID provided');
      return;
    }
    
    // Navigate to the chat page with the correct path
    // IMPORTANT: Make sure your folder is named [conversationId] (with an 's')
    router.push(`/chat/${conversationId}`);
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m`;
    if (diffHours < 24) return `${diffHours}h`;
    if (diffDays === 1) return 'Yesterday';
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  const truncateMessage = (message: string, maxLength = 30) => {
    if (!message) return '';
    if (message.startsWith('data:image')) return '📷 Photo';
    if (message.length <= maxLength) return message;
    return message.substring(0, maxLength) + '...';
  };

  if (loading) {
    return (
      <div className="flex flex-col h-screen bg-white items-center justify-center">
        <div className="w-12 h-12 border-4 border-pink-200 border-t-pink-500 rounded-full animate-spin"></div>
        <p className="mt-4 text-slate-500">Loading conversations...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-white">
      {/* Header */}
      <header className="px-6 py-4 bg-[#120621] border-b border-white/5 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Heart className="text-pink-500" size={24} fill="currentColor" />
          Messages
        </h1>
        <button 
          onClick={() => router.push('/discover')}
          className="text-white/60 hover:text-white transition-colors"
        >
          Discover
        </button>
      </header>

      {/* Conversations List */}
      <main className="flex-1 overflow-y-auto">
        {conversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-8">
            <div className="w-24 h-24 bg-slate-100 rounded-full flex items-center justify-center mb-6">
              <MessageCircle size={40} className="text-slate-400" />
            </div>
            <h3 className="text-xl font-semibold text-slate-800 mb-2">No messages yet</h3>
            <p className="text-slate-500 mb-8 max-w-xs">
              When you match with someone, you can start chatting here!
            </p>
            <button
              onClick={() => router.push('/discover')}
              className="bg-gradient-to-r from-pink-500 to-purple-600 text-white px-8 py-4 rounded-full font-semibold shadow-lg hover:shadow-xl transition-all hover:scale-105"
            >
              Find Matches
            </button>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {conversations.map((conv) => (
              <button
                key={conv.conversationId}
                onClick={() => handleChatClick(conv.conversationId)}
                className="w-full px-6 py-5 flex items-center gap-4 hover:bg-slate-50 transition-colors active:bg-slate-100"
              >
                {/* Avatar */}
                <div className="relative flex-shrink-0">
                  <div className="w-14 h-14 rounded-full p-0.5 bg-gradient-to-tr from-pink-500 to-purple-500">
                    <img
                      src={conv.otherUser?.profilePictureUrl || '/placeholder-user.jpg'}
                      className="w-full h-full rounded-full object-cover border-2 border-white"
                      alt={conv.otherUser?.username || 'User'}
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = '/placeholder-user.jpg';
                      }}
                    />
                  </div>
                  <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></div>
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0 text-left">
                  <div className="flex justify-between items-baseline mb-1">
                    <h3 className="font-semibold text-slate-900 truncate">
                      {conv.otherUser?.username || 'User'}
                      {conv.otherUser?.age ? `, ${conv.otherUser.age}` : ''}
                    </h3>
                    <span className="text-xs text-slate-400 flex-shrink-0 ml-2">
                      {formatTime(conv.lastMessageTime)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <p className="text-sm text-slate-500 truncate">
                      {truncateMessage(conv.lastMessage)}
                    </p>
                    {conv.unreadCount > 0 && (
                      <span className="bg-pink-500 text-white text-xs font-bold px-2 py-1 rounded-full min-w-[20px] text-center ml-2">
                        {conv.unreadCount}
                      </span>
                    )}
                  </div>
                </div>

                <ChevronRight size={20} className="text-slate-400 flex-shrink-0" />
              </button>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}