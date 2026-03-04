import { Client, Databases, Account, ID, Query } from 'appwrite';

// Added 'export' so the Sidebar can use this for Realtime subscriptions
export const client = new Client()
    .setEndpoint('https://fra.cloud.appwrite.io/v1')
    .setProject('698834440011a2acb62a'); // Your Project ID

export const databases = new Databases(client);
export const account = new Account(client);

// Re-exporting helpers for use across the monorepo
export { ID, Query };