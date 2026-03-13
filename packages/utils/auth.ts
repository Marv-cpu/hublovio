import { account } from './appwriteConfig';
import { ID } from 'appwrite';

export const authService = {
  async login(email: string, password: string) {
    try {
      try {
        await account.deleteSession('current');
      } catch (e) {}
      
      return await account.createEmailPasswordSession(email, password);
    } catch (error: any) {
      throw new Error(error.message || 'Login failed');
    }
  },

  async register(email: string, password: string, name: string) {
    try {
      const newAccount = await account.create(
        ID.unique(),
        email,
        password,
        name
      );
      
      if (newAccount) {
        await account.createEmailPasswordSession(email, password);
      }
      
      return newAccount;
    } catch (error: any) {
      throw new Error(error.message || 'Registration failed');
    }
  },

  async logout() {
    try {
      await account.deleteSession('current');
    } catch (error: any) {
      throw new Error(error.message || 'Logout failed');
    }
  },

  async getCurrentUser() {
    try {
      return await account.get();
    } catch (error) {
      return null;
    }
  }
};