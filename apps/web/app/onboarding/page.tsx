'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { databases, account } from '@aura/utils/appwriteConfig';
import { ID, Query } from 'appwrite';
import { X, Upload, Star, ChevronDown } from 'lucide-react';

export default function OnboardingPage() {
  const [bio, setBio] = useState('');
  const [birthdate, setBirthdate] = useState('');
  const [gender, setGender] = useState('male');
  const [username, setUsername] = useState('');
  const [location, setLocation] = useState('Global');
  const [website, setWebsite] = useState('https://auraconnect.app');
  
  // Multi-image upload states
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [primaryImageIndex, setPrimaryImageIndex] = useState(0);
  
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

  // Handle multiple image selection
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    
    // Check total images limit (max 5)
    if (imageFiles.length + files.length > 5) {
      alert(`You can only upload a maximum of 5 images. You already have ${imageFiles.length} images.`);
      return;
    }

    // Check each file size (max 2MB)
    const oversizedFiles = files.filter(file => file.size > 2 * 1024 * 1024);
    if (oversizedFiles.length > 0) {
      alert(`${oversizedFiles.length} image(s) exceed the 2MB size limit. Please compress them and try again.`);
      return;
    }

    // Add new files
    setImageFiles(prev => [...prev, ...files]);
    
    // Create preview URLs
    const newPreviews = files.map(file => URL.createObjectURL(file));
    setImagePreviews(prev => [...prev, ...newPreviews]);
  };

  // Remove an image
  const removeImage = (index: number) => {
    // Clean up preview URL
    URL.revokeObjectURL(imagePreviews[index]);
    
    // Remove from arrays
    setImageFiles(prev => prev.filter((_, i) => i !== index));
    setImagePreviews(prev => prev.filter((_, i) => i !== index));
    
    // Adjust primary index if needed
    if (index === primaryImageIndex) {
      setPrimaryImageIndex(0);
    } else if (index < primaryImageIndex) {
      setPrimaryImageIndex(prev => prev - 1);
    }
  };

  // Set primary image
  const setAsPrimary = (index: number) => {
    setPrimaryImageIndex(index);
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
    
    if (imageFiles.length === 0) {
      alert("Please upload at least one image");
      return;
    }
    
    setLoading(true);

    try {
      // Upload all images to Cloudinary
      const uploadedUrls = await Promise.all(
        imageFiles.map(file => uploadToCloudinary(file))
      );

      // Format Date
      const formattedDate = new Date(birthdate).toISOString();

      // Check if profile already exists for this user
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

      // Create Profile Document with only the fields that exist in your schema
      const profileData = {
        username: username.trim(),
        bio: bio.trim(),
        gender: gender,
        birthdate: formattedDate,
        location: location,
        website: website,
        profilePictureUrl: uploadedUrls[primaryImageIndex], // Primary image
        images: uploadedUrls, // All images array
        userId: currentUser.$id,
      };

      console.log("📝 Creating profile with data:", {
        ...profileData,
        userId: `${currentUser.$id.substring(0, 12)}...`,
        images: `${uploadedUrls.length} images`
      });

      const newProfile = await databases.createDocument(
        '698835eb000eb728917a', 
        'profiles',             
        ID.unique(),
        profileData
      );

      console.log("✅ Profile created:", newProfile.$id);
      
      // Update user name in Appwrite
      try {
        await account.updateName(username.trim());
        console.log("✅ Appwrite user name updated");
      } catch (error) {
        console.log("ℹ️ Could not update Appwrite user name (not critical)");
      }

      alert("Profile created successfully! Your profile is now linked to your account.");
      router.push(`/profile/${newProfile.$id}`);
      
    } catch (err: any) {
      console.error("❌ Profile Creation Error:", err);
      
      // Parse which attribute is missing
      if (err.message.includes('Unknown attribute')) {
        const match = err.message.match(/Unknown attribute: "([^"]+)"/);
        const missingAttr = match ? match[1] : 'unknown';
        
        alert(
          `Database schema issue: The '${missingAttr}' field is missing from the Profiles collection.\n\n` +
          `Please add this field in Appwrite Console:\n` +
          `1. Go to Database → Profiles collection\n` +
          `2. Click 'Add Attribute'\n` +
          `3. Add: ${missingAttr} with appropriate type`
        );
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
      <div className="flex min-h-screen items-center justify-center p-6 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-slate-700 border-t-indigo-500 rounded-full animate-spin mb-6"></div>
          <div className="text-indigo-400 animate-pulse tracking-widest uppercase text-xs font-black">
            Authenticating...
          </div>
        </div>
      </div>
    );
  }

  // Show message if no user
  if (!currentUser) {
    return (
      <div className="flex min-h-screen items-center justify-center p-6 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white">
        <div className="glass-panel w-full max-w-md p-10 border border-white/10 shadow-2xl bg-slate-900/30 backdrop-blur-xl">
          <div className="text-center">
            <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-6 border border-red-500/20">
              <span className="text-red-400 text-3xl">!</span>
            </div>
            <h2 className="text-2xl font-bold mb-3 text-white">Authentication Required</h2>
            <p className="text-slate-400 mb-8">You need to be logged in to create a profile.</p>
            <button
              onClick={() => router.push('/auth')}
              className="w-full px-6 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-bold hover:from-indigo-500 hover:to-purple-500 transition-all shadow-lg shadow-indigo-500/20"
            >
              Go to Login
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white py-12 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header with contrast */}
        <div className="mb-10 text-center">
          <div className="inline-block px-4 py-2 bg-indigo-500/10 border border-indigo-500/20 rounded-full mb-4">
            <span className="text-indigo-400 text-xs font-bold tracking-widest uppercase">Step 2 of 2</span>
          </div>
          <h1 className="text-5xl md:text-6xl font-black mb-3 tracking-tight">
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-white via-indigo-200 to-white">
              Complete Your
            </span>
            <br />
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400">
              Profile
            </span>
          </h1>
          <p className="text-slate-400 text-lg max-w-xl mx-auto">
            Tell us about yourself and upload your photos.
          </p>
        </div>

        <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-3xl shadow-2xl overflow-hidden">
          {/* User Info Header */}
          <div className="bg-slate-950/80 border-b border-slate-800 p-6">
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 p-[2px]">
                  <div className="w-full h-full rounded-full bg-slate-900 flex items-center justify-center">
                    <span className="text-white text-xl font-bold">
                      {currentUser.name?.charAt(0) || currentUser.email?.charAt(0) || 'U'}
                    </span>
                  </div>
                </div>
                <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-emerald-500 rounded-full border-4 border-slate-900"></div>
              </div>
              <div className="flex-1">
                <p className="text-slate-400 text-xs uppercase tracking-widest mb-1">Creating profile for</p>
                <p className="text-white font-bold text-lg">{currentUser.name || 'User'}</p>
                <p className="text-slate-500 text-sm">{currentUser.email}</p>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="p-8 space-y-8">
            {/* Multi-Image Upload Section */}
            <div className="border-b border-slate-800 pb-8">
              <div className="flex items-center justify-between mb-4">
                <label className="block text-sm font-bold text-white uppercase tracking-wider">
                  Your Photos <span className="text-slate-500 font-normal">(Max 5, 2MB each)</span>
                </label>
                <span className="text-indigo-400 text-sm font-medium">
                  {imageFiles.length}/5 uploaded
                </span>
              </div>
              
              {/* Image Grid */}
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-4">
                {/* Upload Button */}
                <label className="aspect-square border-2 border-dashed border-slate-700 rounded-2xl flex flex-col items-center justify-center gap-2 cursor-pointer hover:border-indigo-500 transition-colors bg-slate-800/20 hover:bg-slate-800/40">
                  <input 
                    type="file" 
                    multiple 
                    accept="image/*" 
                    onChange={handleImageChange} 
                    className="hidden"
                    disabled={imageFiles.length >= 5}
                  />
                  <Upload size={24} className="text-slate-500" />
                  <span className="text-xs text-slate-500 font-medium text-center px-2">
                    {imageFiles.length >= 5 ? 'Max reached' : 'Upload photos'}
                  </span>
                </label>

                {/* Image Previews */}
                {imagePreviews.map((preview, index) => (
                  <div key={index} className="relative aspect-square group">
                    <img 
                      src={preview} 
                      alt={`Preview ${index + 1}`} 
                      className="w-full h-full object-cover rounded-2xl border-2 border-slate-700"
                    />
                    
                    {/* Primary Badge */}
                    {index === primaryImageIndex && (
                      <div className="absolute top-2 left-2 bg-indigo-500 text-white text-xs px-2 py-1 rounded-full flex items-center gap-1 shadow-lg">
                        <Star size={12} fill="currentColor" />
                        <span>Primary</span>
                      </div>
                    )}
                    
                    {/* Overlay on hover */}
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl flex items-center justify-center gap-2">
                      {index !== primaryImageIndex && (
                        <button
                          type="button"
                          onClick={() => setAsPrimary(index)}
                          className="p-2 bg-indigo-500 rounded-full hover:bg-indigo-400 transition-colors"
                          title="Set as primary"
                        >
                          <Star size={16} fill="currentColor" />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => removeImage(index)}
                        className="p-2 bg-red-500 rounded-full hover:bg-red-400 transition-colors"
                        title="Remove"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-slate-500 text-xs mt-2">
                Click the star icon to set your primary profile photo. First image will be your default.
              </p>
            </div>

            {/* Username */}
            <div>
              <label className="block text-sm font-bold mb-3 text-white uppercase tracking-wider">
                Display Name <span className="text-slate-500 font-normal">(Public)</span>
              </label>
              <input 
                type="text" 
                className="w-full bg-slate-800/50 border border-slate-700 rounded-xl p-4 text-white placeholder-slate-500 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all"
                onChange={(e) => setUsername(e.target.value)}
                required
                placeholder="e.g., Alex Chen"
                minLength={2}
                maxLength={30}
                value={username}
              />
              <div className="flex justify-between mt-2">
                <p className="text-slate-500 text-xs">
                  This will be your public display name
                </p>
                <p className="text-slate-500 text-xs">
                  {username.length}/30
                </p>
              </div>
            </div>

            {/* Bio */}
            <div>
              <label className="block text-sm font-bold mb-3 text-white uppercase tracking-wider">
                Your Bio <span className="text-slate-500 font-normal">(Public)</span>
              </label>
              <textarea 
                className="w-full bg-slate-800/50 border border-slate-700 rounded-xl p-4 text-white placeholder-slate-500 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all h-32 resize-none"
                onChange={(e) => setBio(e.target.value)}
                required
                placeholder="Tell us about yourself (minimum 10 characters)..."
                minLength={10}
                maxLength={500}
                value={bio}
              />
              <div className="flex justify-between mt-2">
                <p className={`text-xs ${bio.length < 10 ? 'text-red-400' : 'text-slate-500'}`}>
                  {bio.length < 10 ? `${10 - bio.length} more characters needed` : '✓ Minimum met'}
                </p>
                <p className={`text-xs ${bio.length >= 450 ? 'text-yellow-500' : 'text-slate-500'}`}>
                  {bio.length}/500
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Birthdate */}
              <div>
                <label className="block text-sm font-bold mb-3 text-white uppercase tracking-wider">
                  Birthdate <span className="text-slate-500 font-normal">(Private)</span>
                </label>
                <input 
                  type="date" 
                  className="w-full bg-slate-800/50 border border-slate-700 rounded-xl p-4 text-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all"
                  onChange={(e) => setBirthdate(e.target.value)}
                  required
                  value={birthdate}
                  max={new Date().toISOString().split('T')[0]}
                />
                <p className="text-slate-500 text-xs mt-2">
                  Used for age verification only
                </p>
              </div>

              {/* Gender */}
              <div>
                <label className="block text-sm font-bold mb-3 text-white uppercase tracking-wider">
                  Your Gender <span className="text-slate-500 font-normal">(Public)</span>
                </label>
                <select 
                  className="w-full bg-slate-800/50 border border-slate-700 rounded-xl p-4 text-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all appearance-none cursor-pointer"
                  onChange={(e) => setGender(e.target.value)}
                  value={gender}
                  style={{
                    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3E%3Cpath stroke='%239CA3AF' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3E%3C/svg%3E")`,
                    backgroundPosition: 'right 1rem center',
                    backgroundRepeat: 'no-repeat',
                    backgroundSize: '1.5em'
                  }}
                >
                  <option value="male" className="bg-slate-800">Male</option>
                  <option value="female" className="bg-slate-800">Female</option>
                  <option value="non-binary" className="bg-slate-800">Non-Binary</option>
                  <option value="preferNotToSay" className="bg-slate-800">Prefer Not To Say</option>
                </select>
              </div>

              {/* Location */}
              <div>
                <label className="block text-sm font-bold mb-3 text-white uppercase tracking-wider">
                  Location <span className="text-slate-500 font-normal">(Public)</span>
                </label>
                <input 
                  type="text" 
                  className="w-full bg-slate-800/50 border border-slate-700 rounded-xl p-4 text-white placeholder-slate-500 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all"
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="e.g., New York, NY"
                  value={location}
                />
              </div>

              {/* Website */}
              <div>
                <label className="block text-sm font-bold mb-3 text-white uppercase tracking-wider">
                  Website <span className="text-slate-500 font-normal">(Optional)</span>
                </label>
                <input 
                  type="url" 
                  className="w-full bg-slate-800/50 border border-slate-700 rounded-xl p-4 text-white placeholder-slate-500 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all"
                  onChange={(e) => setWebsite(e.target.value)}
                  placeholder="https://yourwebsite.com"
                  value={website}
                />
              </div>
            </div>

            {/* User ID Info */}
            <div className="p-5 bg-slate-800/30 border border-slate-700/50 rounded-xl">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-indigo-500/10 rounded-lg flex items-center justify-center flex-shrink-0 border border-indigo-500/20">
                  <span className="text-indigo-400 text-sm">🔗</span>
                </div>
                <div>
                  <p className="text-indigo-400 text-xs mb-1 uppercase tracking-wider font-bold">Profile Linking</p>
                  <p className="text-slate-300 text-sm mb-2">
                    Your profile will be permanently linked to your account ID:
                  </p>
                  <code className="block bg-slate-900/80 px-4 py-3 rounded-lg text-indigo-300 text-xs font-mono border border-slate-700">
                    {currentUser.$id}
                  </code>
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <button 
              disabled={loading || !username || !bio || bio.length < 10 || !birthdate || imageFiles.length === 0} 
              className="w-full mt-8 py-5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-black tracking-wider uppercase rounded-xl disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-xl shadow-indigo-500/20 hover:shadow-indigo-500/30 text-lg"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-3">
                  <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                  Creating Profile...
                </span>
              ) : (
                "Complete Your Profile"
              )}
            </button>
            
            <p className="text-center text-slate-500 text-xs">
              By creating a profile, you agree to our Terms of Service
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}