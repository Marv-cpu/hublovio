// migration-local.js
import { databases, account } from '@aura/utils/appwriteConfig'; // Adjust path as needed
import { Query } from 'appwrite';

const DATABASE_ID = '698835eb000eb728917a';
const PROFILES_COLLECTION_ID = 'profiles';
const CONNECTIONS_COLLECTION_ID = 'connections';

async function migrateProfiles() {
  console.log('🚀 Starting local migration...');
  
  try {
    // 1. Get all profiles
    console.log('📋 Fetching all profiles...');
    const profiles = await databases.listDocuments(
      DATABASE_ID,
      PROFILES_COLLECTION_ID,
      [Query.limit(100)]
    );
    
    console.log(`Found ${profiles.total} profiles\n`);
    
    console.log('📊 Current Profile Status:');
    console.log('='.repeat(50));
    
    profiles.documents.forEach((profile, index) => {
      const hasUserId = !!profile.userId;
      const status = hasUserId ? '✅ Linked' : '❌ Missing';
      console.log(`${index + 1}. ${profile.username}`);
      console.log(`   Status: ${status}`);
      console.log(`   Profile ID: ${profile.$id}`);
      if (profile.userId) {
        console.log(`   User ID: ${profile.userId.substring(0, 12)}...`);
      }
      console.log();
    });
    
    console.log('='.repeat(50));
    console.log(`\n📈 Summary:`);
    console.log(`Total Profiles: ${profiles.total}`);
    console.log(`With userId: ${profiles.documents.filter(p => p.userId).length}`);
    console.log(`Without userId: ${profiles.documents.filter(p => !p.userId).length}`);
    
    // 2. Show manual update instructions
    if (profiles.documents.filter(p => !p.userId).length > 0) {
      console.log('\n🔧 Manual Update Needed:');
      console.log('For profiles missing userId, you need to:');
      console.log('1. Go to Appwrite Console → Database → Profiles');
      console.log('2. Find each profile listed above');
      console.log('3. Add the correct userId (Appwrite user ID)');
      console.log('4. Save changes');
      
      console.log('\n📝 Profiles needing update:');
      profiles.documents
        .filter(p => !p.userId)
        .forEach(p => {
          console.log(`   - ${p.username} (ID: ${p.$id})`);
        });
    }
    
    // 3. Check connections
    console.log('\n🔗 Checking connections...');
    const connections = await databases.listDocuments(
      DATABASE_ID,
      CONNECTIONS_COLLECTION_ID,
      [Query.limit(50)]
    );
    
    console.log(`Found ${connections.total} connections`);
    
    let brokenConnections = 0;
    connections.documents.forEach(conn => {
      if (!conn.senderId || !conn.receiverId) {
        console.log(`   ⚠️ Broken connection: ${conn.$id}`);
        brokenConnections++;
      }
    });
    
    if (brokenConnections > 0) {
      console.log(`\n⚠️ Found ${brokenConnections} connections with missing user IDs`);
    }
    
    console.log('\n✅ Migration check completed!');
    console.log('\n🎯 Next steps:');
    console.log('1. Update profiles missing userId manually');
    console.log('2. Create new profiles using the updated onboarding flow');
    console.log('3. Test connections between users with linked profiles');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
  }
}

// Run the migration
migrateProfiles();