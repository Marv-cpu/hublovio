// Import the tools from the config file you just made
import { databases, ID, Query } from './appwriteConfig';

// Appwrite Match Logic
export const checkMatch = async (currentId: string, targetId: string) => {
  // 1. Create a "Like" record
  await databases.createDocument(
    'YOUR_DATABASE_ID', // Replace with your DB ID from Appwrite Console
    'likes_coll',       // Replace with your Collection ID
    ID.unique(), 
    {
      from: currentId,
      to: targetId
    }
  );

  // 2. Check if they liked you back
  const result = await databases.listDocuments(
    'YOUR_DATABASE_ID', 
    'likes_coll', 
    [
      Query.equal('from', targetId),
      Query.equal('to', currentId)
    ]
  );

  // 3. If yes, it's a match! Create a Conversation.
  if (result.total > 0) {
    return await databases.createDocument(
        'YOUR_DATABASE_ID', 
        'matches_coll', 
        ID.unique(), 
        {
            users: [currentId, targetId],
            createdAt: new Date().toISOString()
        }
    );
  }
  return null;
};