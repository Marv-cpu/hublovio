'use client';
import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { databases, account } from '@aura/utils/appwriteConfig';
import client from '@aura/utils/appwriteConfig';
import { Query, ID, Storage, Models, RealtimeResponseEvent, AppwriteException } from 'appwrite';
import Image from 'next/image';
import { 
  ChevronLeft, 
  MoreHorizontal, 
  Mic, 
  Send, 
  Plus, 
  Bell,
  Square,
  Loader2,
  Check,
  CheckCheck,
  AlertCircle
} from 'lucide-react';

// Define types
interface User {
  $id: string;
  name?: string;
  email?: string;
}

interface Profile extends Models.Document {
  userId: string;
  username?: string;
  profilePictureUrl?: string;
  bio?: string;
}

// MessageDocument without the custom id field
interface MessageDocument extends Models.Document {
  senderId: string;
  receiverId: string;
  conversationId: string;
  message: string;
  createdAt: string;
  isRead: boolean;
}

const storage = new Storage(client);

const DATABASE_ID = '698835eb000eb728917a';
const MESSAGES_COLLECTION_ID = 'conversations';
const PROFILES_COLLECTION_ID = 'profiles';
const STORAGE_BUCKET_ID = '699daed50031e337481f'; 

// Helper function to create consistent conversation ID
const createConversationId = (userId1: string, userId2: string) => {
  // Sort IDs to ensure consistent conversation ID regardless of who initiates
  const sortedIds = [userId1, userId2].sort();
  return `${sortedIds[0]}_${sortedIds[1]}`;
};

export default function ChatPage() {
  const params = useParams();
  const routeConversationId = params?.conversationId as string;
  const router = useRouter();
  
  const [messages, setMessages] = useState<MessageDocument[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [otherUser, setOtherUser] = useState<Profile | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [conversationId, setConversationId] = useState<string>(routeConversationId);
  
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected' | 'reconnecting'>('connected');
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const unsubscribeRef = useRef<() => void>(() => {});

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  // Mark messages as read
  const markMessagesAsRead = useCallback(async () => {
    if (!currentUser?.$id || !messages.length) return;
    
    const unreadMessages = messages.filter(
      msg => msg.receiverId === currentUser.$id && !msg.isRead
    );
    
    for (const msg of unreadMessages) {
      try {
        await databases.updateDocument(
          DATABASE_ID,
          MESSAGES_COLLECTION_ID,
          msg.$id,
          { isRead: true }
        );
      } catch (err) {
        console.error("Failed to mark message as read:", err);
      }
    }
  }, [messages, currentUser]);

  // Fetch messages
  const fetchMessages = useCallback(async () => {
    if (!conversationId) return;
    
    try {
      console.log("Fetching messages for conversation:", conversationId);
      const res = await databases.listDocuments<MessageDocument>(
        DATABASE_ID, 
        MESSAGES_COLLECTION_ID, 
        [
          Query.equal('conversationId', conversationId),
          Query.orderAsc('createdAt')
        ]
      );
      console.log("Fetched messages:", res.documents.length);
      setMessages(res.documents);
      setTimeout(scrollToBottom, 100);
    } catch (err) {
      console.error("Fetch Error:", err);
      if (err instanceof AppwriteException) {
        setError(`Failed to load messages: ${err.message}`);
      } else {
        setError("Failed to load messages");
      }
    }
  }, [conversationId, scrollToBottom]);

  // Real-time subscription
  useEffect(() => {
    if (!conversationId) return;

    setConnectionStatus('connected');

    const unsubscribe = client.subscribe(
      [`databases.${DATABASE_ID}.collections.${MESSAGES_COLLECTION_ID}.documents`], 
      (response: RealtimeResponseEvent<MessageDocument>) => {
        console.log("Realtime event received:", response.events);
        console.log("Payload conversationId:", response.payload.conversationId);
        console.log("Current conversationId:", conversationId);
        
        // Only process if this is for the current conversation
        if (response.payload.conversationId === conversationId) {
          if (response.events.some(e => e.includes('.create'))) {
            console.log("New message created:", response.payload);
            setMessages((prev: MessageDocument[]) => {
              // Check if message already exists
              if (prev.some(m => m.$id === response.payload.$id)) {
                console.log("Message already exists, skipping");
                return prev;
              }
              console.log("Adding new message to state");
              return [...prev, response.payload];
            });
            setTimeout(scrollToBottom, 100);
          } else if (response.events.some(e => e.includes('.update'))) {
            // Handle updates (like read status)
            console.log("Message updated:", response.payload);
            setMessages((prev: MessageDocument[]) => 
              prev.map(msg => 
                msg.$id === response.payload.$id ? response.payload : msg
              )
            );
          }
        } else {
          console.log("Message not for this conversation, ignoring");
        }
      }
    );

    unsubscribeRef.current = unsubscribe;

    return () => {
      unsubscribeRef.current();
      setConnectionStatus('disconnected');
    };
  }, [conversationId, scrollToBottom]);

  // Initialize chat
  useEffect(() => {
    const initChat = async () => {
      if (!routeConversationId) return;
      
      setIsLoading(true);
      setError(null);
      
      try {
        // Get current user
        const user = await account.get();
        setCurrentUser(user);

        // Get other user ID from conversation ID
        const participants = routeConversationId.split('_');
        const otherUserId = participants.find(id => id !== user.$id);
        
        if (otherUserId) {
          // Create consistent conversation ID
          const consistentConvId = createConversationId(user.$id, otherUserId);
          console.log("Original conversationId:", routeConversationId);
          console.log("Consistent conversationId:", consistentConvId);
          
          // Use the consistent conversation ID
          setConversationId(consistentConvId);
          
          try {
            // Fetch other user's profile
            const profileRes = await databases.listDocuments<Profile>(
              DATABASE_ID, 
              PROFILES_COLLECTION_ID, 
              [
                Query.equal('userId', otherUserId),
                Query.limit(1)
              ]
            );
            
            if (profileRes.documents.length > 0) {
              setOtherUser(profileRes.documents[0]);
            } else {
              setOtherUser(null);
            }
          } catch (profileErr) {
            console.error("Profile fetch error:", profileErr);
            setOtherUser(null);
          }
        }
      } catch (err) {
        console.error("Init Error:", err);
        if (err instanceof AppwriteException) {
          setError(`Failed to initialize chat: ${err.message}`);
        } else {
          setError("Failed to initialize chat");
        }
      } finally {
        setIsLoading(false);
      }
    };
    
    initChat();

    // Cleanup function
    return () => {
      // Stop any active media streams
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
      
      // Clean up media recorder
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
        mediaRecorderRef.current = null;
      }
    };
  }, [routeConversationId]);

  // Fetch messages when conversationId is set
  useEffect(() => {
    if (conversationId && currentUser) {
      fetchMessages();
    }
  }, [conversationId, currentUser, fetchMessages]);

  // Mark messages as read when they change
  useEffect(() => {
    if (messages.length > 0) {
      markMessagesAsRead();
    }
  }, [messages, markMessagesAsRead]);

  // Save message to database
  const saveMessage = async (content: string) => {
    if (!currentUser?.$id || !otherUser?.userId || isSending) return;
    
    setIsSending(true);
    
    try {
      const now = new Date().toISOString();
      
      // Message data with consistent conversation ID
      const messageData = {
        conversationId: conversationId, // Use the consistent conversation ID
        senderId: currentUser.$id,
        receiverId: otherUser.userId,
        message: content,
        createdAt: now,
        isRead: false
      };
      
      console.log("Saving message:", messageData);
      
      // Create the document in Appwrite
      const response = await databases.createDocument(
        DATABASE_ID,
        MESSAGES_COLLECTION_ID,
        ID.unique(),
        messageData
      );
      
      console.log("Message saved successfully:", response);
      
      // Clear any previous errors
      setError(null);
      
    } catch (err) {
      console.error("Save Error Details:", err);
      
      // Handle specific Appwrite errors
      if (err instanceof AppwriteException) {
        console.error("Appwrite Error Type:", err.type);
        console.error("Appwrite Error Code:", err.code);
        console.error("Appwrite Error Message:", err.message);
        
        switch (err.type) {
          case 'document_invalid_structure':
            setError("Message format is invalid. Please check your database schema.");
            break;
          case 'collection_rule_violated':
            setError("Message violates collection rules. Check required fields.");
            break;
          case 'missing_payload':
            setError("Missing required fields in message.");
            break;
          case 'general_error':
            if (err.message.includes('permission')) {
              setError("Permission denied. Check your Appwrite permissions.");
            } else if (err.message.includes('unknown collection')) {
              setError("Collection not found. Check your DATABASE_ID and COLLECTION_ID.");
            } else {
              setError(`Database error: ${err.message}`);
            }
            break;
          default:
            setError(`Failed to send message: ${err.message}`);
        }
      } else if (err instanceof Error) {
        setError(`Error: ${err.message}`);
      } else {
        setError("Failed to send message. Please try again.");
      }
      
      // Clear error after 5 seconds
      setTimeout(() => setError(null), 5000);
    } finally {
      setIsSending(false);
    }
  };

  // Handle image upload
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Please upload an image file');
      return;
    }

    // Validate file size (5MB limit)
    if (file.size > 5 * 1024 * 1024) {
      alert('Image must be less than 5MB');
      return;
    }

    try {
      setIsUploading(true);
      setUploadProgress(20);

      // Upload file to storage
      const uploadedFile = await storage.createFile(STORAGE_BUCKET_ID, ID.unique(), file);
      setUploadProgress(70);

      // Get file URL
      const fileUrl = storage.getFileView(STORAGE_BUCKET_ID, uploadedFile.$id);
      
      // Save message with image URL
      await saveMessage(`[IMAGE]${fileUrl}`);
      
      setUploadProgress(100);
    } catch (error) {
      console.error('Upload failed:', error);
      alert('Upload failed. Please check your permissions and try again.');
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Start recording audio
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      
      // Check for supported MIME types
      let mimeType = 'audio/webm';
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = 'audio/mp4';
      }
      
      const options = { mimeType };
      const mediaRecorder = new MediaRecorder(stream, options);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e: BlobEvent) => { 
        if (e.data.size > 0) audioChunksRef.current.push(e.data); 
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
        const reader = new FileReader();
        
        reader.onloadend = () => {
          if (reader.result) {
            saveMessage(reader.result as string);
          }
          
          // Clean up tracks after saving
          if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
          }
        };
        
        reader.readAsDataURL(audioBlob);
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) { 
      console.error("Mic Error:", err); 
      alert("Could not access microphone. Please check permissions.");
    }
  };

  // Stop recording audio
  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') { 
      mediaRecorderRef.current.stop(); 
      setIsRecording(false); 
    }
  };

  // Send text message
  const sendMessage = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!newMessage.trim() || isSending || isUploading || isRecording) return;
    saveMessage(newMessage.trim());
    setNewMessage('');
  };

  // Render message content based on type
  const renderMessageContent = (message: string) => {
    if (message.startsWith('[IMAGE]')) {
      const imageUrl = message.replace('[IMAGE]', '');
      return (
        <div className="relative w-full h-60">
          <Image
            src={imageUrl}
            alt="Shared image"
            fill
            unoptimized
            className="rounded-xl object-cover cursor-pointer hover:opacity-95"
            onClick={() => window.open(imageUrl, '_blank')}
          />
        </div>
      );
    } 
    else if (message.startsWith('data:audio')) {
      return (
        <audio controls className="max-w-full h-8 mt-1">
          <source src={message} type={message.split(';')[0]} />
        </audio>
      );
    }
    return <p className="text-[15px] font-medium leading-relaxed break-words">{message}</p>;
  };

  // Get display name for user
  const getDisplayName = () => {
    return otherUser?.username || 'User';
  };

  // Get avatar initial
  const getAvatarInitial = () => {
    return otherUser?.username?.charAt(0).toUpperCase() || 'U';
  };

  // Error display
  if (error) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-gradient-to-b from-[#2E1065] to-[#0D0B14] p-6">
        <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-8 max-w-md w-full text-center">
          <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
          <p className="text-red-400 mb-6 font-medium text-lg">{error}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="px-8 py-4 bg-gradient-to-r from-pink-500 to-purple-600 text-white rounded-xl font-bold hover:scale-105 transition-transform w-full"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // Loading display
  if (isLoading) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-gradient-to-b from-[#2E1065] to-[#0D0B14]">
        <div className="relative">
          <div className="w-20 h-20 rounded-full bg-pink-500/20 animate-ping absolute inset-0"></div>
          <div className="w-20 h-20 rounded-full border-2 border-pink-500/50 flex items-center justify-center animate-pulse">
            <Loader2 className="text-pink-500 animate-spin" size={30} />
          </div>
        </div>
        <p className="mt-8 text-pink-400 font-black tracking-[0.3em] uppercase text-[10px]">Loading Conversation</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-gradient-to-b from-[#1A0B2E] to-[#0D0B14] text-white overflow-hidden">
      {/* Connection Status Banner */}
      {connectionStatus !== 'connected' && (
        <div className="bg-yellow-500/20 text-yellow-400 text-center py-1 text-sm">
          {connectionStatus === 'reconnecting' ? 'Reconnecting...' : 'Disconnected. Trying to reconnect...'}
        </div>
      )}

      {/* Header */}
      <header className="px-6 py-4 bg-[#120621] border-b border-white/5 flex items-center justify-between shadow-2xl z-50">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => router.back()} 
            className="p-2 hover:bg-white/10 rounded-full transition-colors text-white/60 hover:text-white"
          >
            <ChevronLeft size={24} />
          </button>
          <div className="relative">
            <div className="w-12 h-12 rounded-full border-2 border-pink-500 overflow-hidden bg-slate-800 relative">
              {otherUser?.profilePictureUrl ? (
                <Image
                  src={otherUser.profilePictureUrl}
                  alt={getDisplayName()}
                  fill
                  unoptimized
                  className="object-cover"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center text-white font-bold text-xl">
                  {getAvatarInitial()}
                </div>
              )}
            </div>
            <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-[#120621]"></div>
          </div>
          <div>
            <h2 className="text-lg font-bold">{getDisplayName()}</h2>
            <p className="text-[10px] text-green-400 font-black animate-pulse uppercase tracking-widest">Online</p>
          </div>
        </div>
        <div className="flex gap-4 text-white/40">
          <Bell size={20} className="hover:text-white cursor-pointer transition-colors" />
          <MoreHorizontal size={20} className="hover:text-white cursor-pointer transition-colors" />
        </div>
      </header>

      {/* Messages Area */}
      <main className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
        {messages.length === 0 ? (
          <div className="h-full flex items-center justify-center">
            <div className="text-center">
              <p className="text-white/30 text-sm mb-2">No messages yet</p>
              <p className="text-white/20 text-xs">Send a message to start the conversation</p>
            </div>
          </div>
        ) : (
          messages.map((msg: MessageDocument, index) => {
            const isMe = msg.senderId === currentUser?.$id;
            const showAvatar = index === 0 || messages[index - 1]?.senderId !== msg.senderId;
            
            return (
              <div key={msg.$id} className={`flex items-end gap-2 ${isMe ? 'justify-end' : 'justify-start'}`}>
                {!isMe && showAvatar && (
                  <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0 border border-white/10">
                    {otherUser?.profilePictureUrl ? (
                      <Image
                        src={otherUser.profilePictureUrl}
                        alt={getDisplayName()}
                        width={32}
                        height={32}
                        className="object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center text-white font-bold text-xs">
                        {getAvatarInitial()}
                      </div>
                    )}
                  </div>
                )}
                {!isMe && !showAvatar && <div className="w-8 flex-shrink-0" />}
                
                <div className={`max-w-[75%] px-5 py-3 rounded-2xl shadow-sm ${
                  isMe 
                    ? 'bg-gradient-to-br from-pink-500 to-purple-600 text-white rounded-tr-none' 
                    : 'bg-[#120621] border border-white/10 text-white rounded-tl-none'
                }`}>
                  {renderMessageContent(msg.message)}
                  <div className={`flex items-center justify-end gap-1 mt-1 text-[9px] ${
                    isMe ? 'text-white/60' : 'text-white/40'
                  }`}>
                    <span>
                      {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    {isMe && (
                      msg.isRead ? <CheckCheck size={14} /> : <Check size={14} />
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </main>

      {/* Input Area */}
      <div className="p-6 bg-[#120621] border-t border-white/5 relative">
        {isUploading && (
          <div className="absolute top-0 left-0 right-0 h-1 bg-pink-500/20 overflow-hidden">
            <div 
              className="bg-gradient-to-r from-pink-500 to-purple-600 h-full transition-all duration-300" 
              style={{ width: `${uploadProgress}%` }} 
            />
          </div>
        )}
        
        {/* Error Banner */}
        {error && (
          <div className="absolute -top-12 left-0 right-0 mx-auto w-max z-50">
            <div className="bg-red-500/90 text-white px-4 py-2 rounded-full text-sm shadow-lg flex items-center gap-2">
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          </div>
        )}
        
        <form onSubmit={sendMessage} className="flex items-center gap-3 bg-[#1A0B2E] p-2 rounded-[2rem] border border-white/10">
          <button 
            type="button" 
            onClick={() => fileInputRef.current?.click()} 
            className="p-3 text-white/40 hover:text-pink-500 transition-colors disabled:opacity-50 disabled:hover:text-white/40"
            disabled={isRecording || isUploading || isSending}
          >
            <Plus size={22} />
            <input 
              ref={fileInputRef} 
              type="file" 
              hidden 
              accept="image/*" 
              onChange={handleImageUpload} 
              disabled={isRecording || isUploading || isSending}
            />
          </button>
          
          <input 
            value={newMessage} 
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewMessage(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
              }
            }}
            disabled={isRecording || isUploading || isSending} 
            placeholder={isUploading ? "Uploading..." : isRecording ? "Recording..." : "Type a message..."}
            className="flex-1 bg-transparent border-none outline-none text-sm px-2 text-white placeholder:text-white/30 disabled:opacity-50"
          />
          
          <button 
            type="button" 
            onClick={isRecording ? stopRecording : startRecording} 
            disabled={isUploading || isSending}
            className={`p-3 rounded-full transition-all disabled:opacity-50 ${
              isRecording 
                ? 'bg-red-500/20 text-red-400 animate-pulse' 
                : 'text-white/40 hover:text-pink-500'
            }`}
          >
            {isRecording ? <Square size={20} fill="currentColor" /> : <Mic size={22} />}
          </button>

          <button 
            type="submit" 
            disabled={!newMessage.trim() || isUploading || isRecording || isSending} 
            className="bg-gradient-to-tr from-pink-500 to-purple-600 p-3 rounded-full text-white shadow-lg hover:scale-105 transition-transform disabled:opacity-50 disabled:hover:scale-100"
          >
            {isSending ? <Loader2 size={20} className="animate-spin" /> : <Send size={20} />}
          </button>
        </form>
      </div>

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar { 
          width: 4px; 
        }
        .custom-scrollbar::-webkit-scrollbar-thumb { 
          background: linear-gradient(#ec4899, #8b5cf6); 
          border-radius: 10px; 
        }
        .custom-scrollbar::-webkit-scrollbar-track { 
          background: rgba(255,255,255,0.05); 
        }
      `}</style>
    </div>
  );
}