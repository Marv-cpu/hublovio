'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { databases, account, ID, Query } from '@aura/utils/appwriteConfig';

export default function OnboardingPage() {
  const [bio, setBio] = useState('');
  const [birthdate, setBirthdate] = useState('');
  const [gender, setGender] = useState('male');
  const [username, setUsername] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [userLoading, setUserLoading] = useState(true);
  const router = useRouter();

  // Get current user on component mount
  useEffect(() => {
    const getUser = async () => {
      try {
        const user = await account.get();
        setCurrentUser(user);
        console.log("👤 Current Appwrite user:", user.$id);
      } catch (error) {
        console.error("❌ Failed to get current user:", error);
        router.push('/auth');
      } finally {
        setUserLoading(false);
      }
    };
    getUser();
  }, [router]);

  // Handle local image selection & preview
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const uploadToCloudinary = async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', 'aura_unsigned');
    formData.append('cloud_name', 'dkx4x5oze');

    const res = await fetch('https://api.cloudinary.com/v1_1/dkx4x5oze/image/upload', {
      method: 'POST',
      body: formData,
    });

    if (!res.ok) throw new Error('Failed to upload image to Cloudinary');
    
    const data = await res.json();
    return data.secure_url;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!currentUser) {
      alert("You must be logged in to create a profile");
      router.push('/auth');
      return;
    }
    
    if (!username.trim()) {
      alert("Please enter a username");
      return;
    }
    
    if (!bio.trim() || bio.trim().length < 10) {
      alert("Please enter a bio with at least 10 characters");
      return;
    }
    
    if (!birthdate) {
      alert("Please select your birthdate");
      return;
    }
    
    setLoading(true);

    try {
      let finalImageUrl = "https://avatar.iran.liara.run/public/luxury";

      // 1. Upload to Cloudinary if a file exists
      if (imageFile) {
        finalImageUrl = await uploadToCloudinary(imageFile);
      }

      // 2. Format Date
      const formattedDate = new Date(birthdate).toISOString();

      // 3. Check if profile already exists for this user
      try {
        const existingProfiles = await databases.listDocuments(
          '698835eb000eb728917a',
          'profiles',
          [Query.equal('userId', currentUser.$id)]
        );
        
        if (existingProfiles.total > 0) {
          alert("You already have a profile! Redirecting to your profile...");
          router.push(`/profile/${existingProfiles.documents[0].$id}`);
          return;
        }
      } catch (error: any) {
        console.log("Could not query by userId, field may not exist yet");
      }

      // 4. Create Profile Document
      const profileData = {
        username: username.trim(),
        bio: bio.trim(),
        gender: gender,
        birthdate: formattedDate,
        profilePictureUrl: finalImageUrl,
        location: "Global",
        website: "https://auraconnect.app",
        userId: currentUser.$id // CRITICAL: Always include userId
      };

      console.log("📝 Creating profile with data:", {
        ...profileData,
        userId: `${currentUser.$id.substring(0, 12)}...`
      });

      const newProfile = await databases.createDocument(
        '698835eb000eb728917a', 
        'profiles',             
        ID.unique(),
        profileData
      );

      console.log("✅ Profile created:", newProfile.$id);
      
      // 5. Update user name in Appwrite
      try {
        await account.updateName(username.trim());
        console.log("✅ Appwrite user name updated");
      } catch (error) {
        console.log("ℹ️ Could not update Appwrite user name (not critical)");
      }

      // Show success message
      alert("Profile created successfully! Your profile is now linked to your account.");
      
      router.push(`/profile/${newProfile.$id}`);
      
    } catch (err: any) {
      console.error("❌ Profile Creation Error:", err);
      
      // Handle specific error cases
      if (err.message.includes('Unknown attribute')) {
        if (err.message.includes('userId')) {
          alert(
            "Database schema issue: The 'userId' field is missing from the Profiles collection.\n\n" +
            "Please add this field in Appwrite Console:\n" +
            "1. Go to Database → Profiles collection\n" +
            "2. Click 'Add Attribute'\n" +
            "3. Add: userId (String, 255 chars, Required: No)"
          );
        } else {
          alert("Database schema is missing required fields. Please check console for details.");
        }
      } else if (err.message.includes('permission')) {
        alert("Permission error: Make sure you're logged in and try again.");
      } else if (err.code === 409) {
        alert("Username might already exist. Please try a different one.");
      } else {
        alert("Error creating profile: " + err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  // Show loading while getting user
  if (userLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center p-6 bg-aura-black text-white">
        <div className="text-center">
          <div className="text-aura-purple-light animate-pulse tracking-widest uppercase text-xs font-black">
            Authenticating...
          </div>
        </div>
      </div>
    );
  }

  // Show message if no user
  if (!currentUser) {
    return (
      <div className="flex min-h-screen items-center justify-center p-6 bg-aura-black text-white">
        <div className="text-center">
          <div className="text-2xl font-bold mb-4">Authentication Required</div>
          <p className="text-white/60 mb-6">You need to be logged in to create a profile.</p>
          <button
            onClick={() => router.push('/auth')}
            className="px-6 py-3 bg-aura-purple-main rounded-xl font-bold hover:bg-aura-purple-light transition-all"
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-6 bg-aura-black text-white">
      <div className="glass-panel w-full max-w-2xl p-10 border border-white/10 shadow-glass">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2 bg-clip-text text-transparent bg-gradient-to-r from-aura-purple-light to-white">
            Refine Your Aura
          </h1>
          <p className="text-aura-purple-light/60 mb-2">Upload your visual essence.</p>
          
          {/* User info display */}
          <div className="mt-4 p-3 bg-white/5 border border-white/10 rounded-lg">
            <p className="text-white/40 text-xs uppercase tracking-widest">Creating profile for:</p>
            <div className="flex items-center gap-3 mt-2">
              <div className="w-8 h-8 rounded-full bg-aura-purple-main/20 flex items-center justify-center">
                <span className="text-aura-purple-light text-xs font-bold">
                  {currentUser.name?.charAt(0) || currentUser.email?.charAt(0) || 'U'}
                </span>
              </div>
              <div>
                <p className="text-sm font-medium">{currentUser.name || 'User'}</p>
                <p className="text-white/40 text-xs">{currentUser.email}</p>
                <p className="text-white/30 text-[10px] font-mono mt-1">
                  User ID: {currentUser.$id.substring(0, 12)}...
                </p>
                <p className="text-green-400 text-[9px] mt-1">
                  ✓ This ID will be linked to your profile
                </p>
              </div>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Profile Picture Upload */}
          <div className="flex flex-col items-center gap-4 py-4">
            <div className="relative w-24 h-24 rounded-full border-2 border-aura-purple-main overflow-hidden bg-white/5">
              {previewUrl ? (
                <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />
              ) : (
                <div className="flex items-center justify-center h-full text-xs text-white/40">No Image</div>
              )}
            </div>
            <label className="cursor-pointer bg-white/10 hover:bg-white/20 px-4 py-2 rounded-lg text-sm transition">
              Choose Avatar
              <input 
                type="file" 
                className="hidden" 
                accept="image/*" 
                onChange={handleImageChange}
              />
            </label>
            <p className="text-white/30 text-[10px] text-center">
              This will be your public profile picture
            </p>
          </div>

          {/* Username */}
          <div>
            <label className="block text-sm font-medium mb-2 text-aura-purple-light">
              Display Name <span className="text-white/40 text-xs">(Public)</span>
            </label>
            <input 
              type="text" 
              className="w-full bg-white/5 border border-white/10 rounded-xl p-3 focus:border-aura-purple-main outline-none"
              onChange={(e) => setUsername(e.target.value)}
              required
              placeholder="Enter your display name"
              minLength={2}
              maxLength={30}
              value={username}
            />
            <p className="text-white/30 text-[10px] mt-1">
              This will also update your Appwrite account name
            </p>
          </div>

          {/* Bio */}
          <div>
            <label className="block text-sm font-medium mb-2 text-aura-purple-light">
              Your Essence (Bio) <span className="text-white/40 text-xs">(Public)</span>
            </label>
            <textarea 
              className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 focus:border-aura-purple-main outline-none h-32 resize-none"
              onChange={(e) => setBio(e.target.value)}
              required
              placeholder="Tell us about yourself (minimum 10 characters)..."
              minLength={10}
              maxLength={500}
              value={bio}
            />
            <p className={`text-[10px] mt-1 ${bio.length < 10 ? 'text-red-400' : 'text-white/30'}`}>
              {bio.length}/500 characters {bio.length < 10 && '(minimum 10 required)'}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Birthdate */}
            <div>
              <label className="block text-sm font-medium mb-2 text-aura-purple-light">
                Birthdate <span className="text-white/40 text-xs">(Private)</span>
              </label>
              <input 
                type="date" 
                className="w-full bg-white/5 border border-white/10 rounded-xl p-3 focus:border-aura-purple-main outline-none text-white appearance-none"
                onChange={(e) => setBirthdate(e.target.value)}
                required
                value={birthdate}
                max={new Date().toISOString().split('T')[0]}
              />
              <p className="text-white/30 text-[10px] mt-1">
                For age verification only
              </p>
            </div>

            {/* Gender */}
            <div>
              <label className="block text-sm font-medium mb-2 text-aura-purple-light">
                Energy <span className="text-white/40 text-xs">(Public)</span>
              </label>
              <select 
                className="w-full bg-white/5 border border-white/10 rounded-xl p-3 focus:border-aura-purple-main outline-none text-white"
                onChange={(e) => setGender(e.target.value)}
                value={gender}
              >
                <option value="male" className="bg-aura-black">Masculine (Male)</option>
                <option value="female" className="bg-aura-black">Feminine (Female)</option>
                <option value="non-binary" className="bg-aura-black">Elegant (Non-Binary)</option>
                <option value="preferNotToSay" className="bg-aura-black">Prefer Not To Say</option>
              </select>
              <p className="text-white/30 text-[10px] mt-1">
                How you identify
              </p>
            </div>
          </div>

          {/* User ID Info */}
          <div className="p-4 bg-aura-purple-main/10 border border-aura-purple-main/20 rounded-xl">
            <p className="text-aura-purple-light text-xs mb-2 uppercase tracking-widest">🔗 Profile Linking</p>
            <p className="text-aura-purple-light/80 text-sm">
              Your profile will be linked to your User ID: 
              <code className="bg-black/30 px-2 py-1 rounded text-[10px] ml-2 font-mono">
                {currentUser.$id.substring(0, 16)}...
              </code>
            </p>
            <p className="text-aura-purple-light/60 text-[10px] mt-2">
              This linking enables friend requests and connections to work properly.
            </p>
          </div>

          <button 
            disabled={loading || !username || !bio || bio.length < 10 || !birthdate} 
            className="w-full mt-4 py-4 bg-aura-purple-main hover:bg-aura-purple-light text-black font-bold tracking-widest uppercase rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {loading ? "Transmitting Essence..." : "Step into the Light"}
          </button>
          
          <p className="text-center text-white/30 text-xs mt-4">
            By creating a profile, you agree to our Terms of Service
          </p>
        </form>
      </div>
    </div>
  );
}