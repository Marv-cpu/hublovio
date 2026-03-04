'use client';
import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { databases, account, client } from '@aura/utils/appwriteConfig';
import { Query, ID, Storage } from 'appwrite';
import Image from 'next/image';
import { 
  ChevronLeft, 
  MoreHorizontal, 
  Mic, 
  Send, 
  Plus, 
  Smile, 
  Bell,
  X,
  Square,
  Loader2
} from 'lucide-react';

import data from '@emoji-mart/data';
import Picker from '@emoji-mart/react';

const storage = new Storage(client);

const DATABASE_ID = '698835eb000eb728917a';
const MESSAGES_COLLECTION_ID = 'conversations';
const PROFILES_COLLECTION_ID = 'profiles';
const STORAGE_BUCKET_ID = '699daed50031e337481f'; 

export default function ChatPage() {
  const params = useParams();
  const conversationId = params?.conversationId as string;
  const router = useRouter();
  
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [otherUser, setOtherUser] = useState<any>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [showEmoji, setShowEmoji] = useState(false);
  
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null); // ✅ Ref to track the stream
  const audioChunksRef = useRef<Blob[]>([]);

  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  const fetchMessages = useCallback(async () => {
    if (!conversationId) return;
    try {
      const res = await databases.listDocuments(DATABASE_ID, MESSAGES_COLLECTION_ID, [
        Query.equal('conversationId', conversationId),
        Query.orderAsc('createdAt')
      ]);
      setMessages(res.documents);
      setTimeout(scrollToBottom, 100);
    } catch (err) {
      console.error("Fetch Error:", err);
    }
  }, [conversationId, scrollToBottom]);

  useEffect(() => {
    if (!conversationId) return;

    const unsubscribe = client.subscribe(
      [`databases.${DATABASE_ID}.collections.${MESSAGES_COLLECTION_ID}.documents`], 
      (response) => {
        if (response.events.some(e => e.includes('.create'))) {
          const newDoc = response.payload as any;
          if (newDoc.conversationId === conversationId) {
            setMessages((prev) => {
              if (prev.find((m) => m.$id === newDoc.$id)) return prev;
              return [...prev, newDoc];
            });
            setTimeout(scrollToBottom, 100);
          }
        }
      }
    );

    return () => unsubscribe();
  }, [conversationId, scrollToBottom]);

  useEffect(() => {
    const initChat = async () => {
      if (!conversationId) return;
      setIsLoading(true);
      try {
        const user = await account.get();
        setCurrentUser(user);

        const participants = conversationId.split('_');
        const otherUserId = participants.find(id => id !== user.$id);
        
        if (otherUserId) {
          const profileRes = await databases.listDocuments(DATABASE_ID, PROFILES_COLLECTION_ID, [
            Query.equal('userId', otherUserId),
            Query.limit(1)
          ]);
          if (profileRes.documents.length > 0) setOtherUser(profileRes.documents[0]);
        }
        await fetchMessages();
      } catch (err) {
        console.error("Init Error:", err);
      } finally {
        setIsLoading(false);
      }
    };
    initChat();

    // ✅ CLEANUP: Stop any active stream if the component unmounts
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, [conversationId, fetchMessages]);

  const saveMessage = async (content: string) => {
    if (!currentUser?.$id || !otherUser?.userId) return;
    try {
      const payload = {
        id: Math.floor(Math.random() * 999998) + 1,
        conversationId,
        senderId: currentUser.$id,
        receiverId: otherUser.userId,
        message: content,
        createdAt: new Date().toISOString(),
        isRead: false
      };
      await databases.createDocument(DATABASE_ID, MESSAGES_COLLECTION_ID, ID.unique(), payload);
    } catch (err) {
      console.error("Save Error:", err);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploading(true);
      setUploadProgress(20);

      const uploadedFile = await storage.createFile(STORAGE_BUCKET_ID, ID.unique(), file);
      setUploadProgress(70);

      const endpoint = client.config.endpoint;
      const project = client.config.project;
      const publicUrl = `${endpoint}/storage/buckets/${STORAGE_BUCKET_ID}/files/${uploadedFile.$id}/view?project=${project}`;

      await saveMessage(`[IMAGE]${publicUrl}`);
      setUploadProgress(100);
    } catch (error) {
      console.error('Upload failed:', error);
      alert('Upload failed. Ensure Bucket Permissions are set to "Read: Any" and "Create: Any".');
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // ✅ FIXED RECORDING LOGIC
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream; // Save to ref for cleanup
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => { 
        if (e.data.size > 0) audioChunksRef.current.push(e.data); 
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = () => {
          saveMessage(reader.result as string);
        };
        // Clean up tracks
        stream.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) { 
      console.error("Mic Error:", err); 
      alert("Could not access microphone.");
    }
  };

  const stopRecording = () => {
    // Check if recorder is active before stopping to prevent NotFoundError
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') { 
      mediaRecorderRef.current.stop(); 
      setIsRecording(false); 
    }
  };

  const sendMessage = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!newMessage.trim()) return;
    saveMessage(newMessage);
    setNewMessage('');
    setShowEmoji(false);
  };

  const renderMessageContent = (message: string) => {
    if (message.startsWith('[IMAGE]') || message.includes('/storage/buckets/')) {
      const imageUrl = message.replace('[IMAGE]', '');
      return (
        <div className="relative w-full h-60">
          <Image
            src={imageUrl}
            alt="Shared"
            fill
            unoptimized
            className="rounded-xl object-cover cursor-pointer hover:opacity-95"
            onClick={() => window.open(imageUrl, '_blank')}
          />
        </div>
      );
    } 
    else if (message.startsWith('data:audio')) {
      return <audio controls className="max-w-full h-8 mt-1"><source src={message} type="audio/webm" /></audio>;
    }
    return <p className="text-[15px] font-medium leading-relaxed break-words">{message}</p>;
  };

  if (isLoading) return <div className="h-screen flex items-center justify-center bg-white text-pink-500 font-bold animate-pulse">AURA CONNECT...</div>;

  return (
    <div className="flex flex-col h-screen bg-white text-slate-900 overflow-hidden">
      <header className="px-6 py-4 bg-[#120621] flex items-center justify-between shadow-2xl z-50 text-white">
        <div className="flex items-center gap-4">
          <button onClick={() => router.back()} className="p-2 hover:bg-white/10 rounded-full transition-colors"><ChevronLeft size={24} /></button>
          <div className="w-12 h-12 rounded-full border-2 border-pink-500 overflow-hidden bg-slate-800 relative">
            <Image
              src={otherUser?.profilePictureUrl || '/placeholder-user.jpg'}
              alt=""
              fill
              unoptimized
              className="object-cover"
            />
          </div>
          <div>
            <h2 className="text-lg font-bold">{otherUser?.username || 'User'}</h2>
            <p className="text-[10px] text-green-400 font-black animate-pulse uppercase tracking-widest">Online</p>
          </div>
        </div>
        <div className="flex gap-4 opacity-40"><Bell size={20} /><MoreHorizontal size={20} /></div>
      </header>

      <main className="flex-1 overflow-y-auto p-6 space-y-4 bg-white custom-scrollbar">
        {messages.map((msg) => {
          const isMe = msg.senderId === currentUser?.$id;
          return (
            <div key={msg.$id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[75%] px-5 py-3 rounded-2xl shadow-sm ${isMe ? 'bg-gradient-to-br from-pink-500 to-rose-400 text-white rounded-tr-none' : 'bg-[#F1F2F6] text-slate-800 rounded-tl-none border border-slate-100'}`}>
                {renderMessageContent(msg.message)}
                <span className={`text-[9px] block text-right mt-1 opacity-60 font-bold ${isMe ? 'text-white' : 'text-slate-400'}`}>
                  {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </main>

      <div className="p-6 bg-white border-t relative">
        {isUploading && (
          <div className="absolute top-0 left-0 right-0 h-1 bg-pink-100 overflow-hidden">
            <div className="bg-pink-500 h-full transition-all duration-300" style={{ width: `${uploadProgress}%` }} />
          </div>
        )}
        {showEmoji && (
          <div className="absolute bottom-24 right-6 z-50 shadow-2xl rounded-2xl overflow-hidden border">
             <button onClick={() => setShowEmoji(false)} className="absolute top-2 right-2 z-[60] bg-slate-800 rounded-full p-1 text-white"><X size={16} /></button>
             <Picker data={data} onEmojiSelect={(e: any) => setNewMessage(p => p + e.native)} theme="light" />
          </div>
        )}
        <form onSubmit={sendMessage} className="flex items-center gap-3 bg-[#F1F2F6] p-2 rounded-[2rem] border border-slate-200">
          <button type="button" onClick={() => fileInputRef.current?.click()} className="p-3 text-slate-400 hover:text-pink-500 transition-colors">
            <Plus size={22} />
            <input ref={fileInputRef} type="file" hidden accept="image/*" onChange={handleImageUpload} />
          </button>
          <input 
            value={newMessage} onChange={(e) => setNewMessage(e.target.value)}
            disabled={isRecording || isUploading} placeholder={isUploading ? "Uploading..." : "Type a message..."}
            className="flex-1 bg-transparent border-none outline-none text-sm px-2 text-slate-900"
          />
          <button type="button" onClick={() => setShowEmoji(!showEmoji)} className="p-2 text-slate-400 hover:text-pink-500 transition-colors"><Smile size={22} /></button>
          
          {/* MIC BUTTON */}
          <button 
            type="button" 
            onClick={isRecording ? stopRecording : startRecording} 
            className={`p-3 rounded-full transition-all ${isRecording ? 'bg-red-50 text-red-500 animate-pulse' : 'text-slate-400 hover:text-pink-500'}`}
          >
            {isRecording ? <Square size={20} fill="currentColor" /> : <Mic size={22} />}
          </button>

          <button type="submit" disabled={!newMessage.trim() || isUploading} className="bg-gradient-to-tr from-pink-500 to-purple-600 p-3 rounded-full text-white shadow-lg hover:scale-105 transition-transform disabled:opacity-50">
            {isUploading ? <Loader2 size={20} className="animate-spin" /> : <Send size={20} />}
          </button>
        </form>
      </div>

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #E2E8F0; border-radius: 10px; }
      `}</style>
    </div>
  );
}