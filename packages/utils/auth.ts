import { account, ID } from './appwriteConfig';

export const authService = {
  // Create a new account and immediately log them in
  register: async (email: string, pass: string, name: string) => {
    await account.create(ID.unique(), email, pass, name);
    return await account.createEmailPasswordSession(email, pass);
  },

  // Log in existing user
  login: async (email: string, pass: string) => {
    return await account.createEmailPasswordSession(email, pass);
  },

  // Log out
async logout() {
    try {
      await account.deleteSession('current');
      // Using window.location to force a clean state wipe
      window.location.href = '/auth'; 
    } catch (error) {
      console.error("Logout failed:", error);
      throw error;
    }
  }
};