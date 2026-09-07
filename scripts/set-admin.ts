/**
 * SERVER-SIDE SCRIPT TO ASSIGN ADMIN CUSTOM CLAIMS IN FIREBASE AUTH
 * 
 * SECURITY:
 * - This script is executed only on the server/CLI environment.
 * - Never bundle or expose this script in client-side code.
 * 
 * USAGE:
 *   npx tsx scripts/set-admin.ts <USER_UID_OR_EMAIL>
 * 
 * Example:
 *   npx tsx scripts/set-admin.ts zairoxmax2.0@gmail.com
 *   or
 *   npx tsx scripts/set-admin.ts dS8f9s8d7fsd89f7sd8f9
 */

import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import * as fs from 'fs';
import * as path from 'path';

// Read config to extract Project ID
const configPath = path.join(process.cwd(), 'firebase-applet-config.json');
let projectId = process.env.FIREBASE_PROJECT_ID || process.env.PROJECT_ID || '';

if (!projectId && fs.existsSync(configPath)) {
  try {
    const raw = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    projectId = raw.projectId || '';
  } catch {
    // Ignore JSON parse errors
  }
}

if (!projectId) {
  projectId = 'ai-studio-zynoxanimesmvp-6e05f6e8-26d0-48b4-b1dc-125356733312';
}

const app = getApps().length > 0 ? getApps()[0] : initializeApp({
  projectId: projectId,
});
const auth = getAuth(app);
const db = getFirestore(app);

async function setAdminClaim() {
  const target = process.argv[2];

  if (!target) {
    console.error('\n❌ ERROR: Please provide a Firebase Auth UID or Email.');
    console.log('\nUsage:');
    console.log('  npx tsx scripts/set-admin.ts <USER_UID_OR_EMAIL>');
    console.log('\nExample:');
    console.log('  npx tsx scripts/set-admin.ts zairoxmax2.0@gmail.com\n');
    process.exit(1);
  }

  try {
    let userRecord: any;

    if (target.includes('@')) {
      console.log(`🔍 Looking up Firebase Auth user by email: ${target}...`);
      userRecord = await auth.getUserByEmail(target);
    } else {
      console.log(`🔍 Looking up Firebase Auth user by UID: ${target}...`);
      userRecord = await auth.getUser(target);
    }

    console.log(`✅ Found user: ${userRecord.email} (UID: ${userRecord.uid})`);

    // 1. Assign Firebase Auth Custom Claim { admin: true }
    await auth.setCustomUserClaims(userRecord.uid, {
      admin: true,
      role: 'admin',
    });
    console.log(`🛡️ Assigned Firebase Custom Claim { admin: true } to user: ${userRecord.uid}`);

    // 2. Also update Firestore user profile document if it exists
    const userDocRef = db.collection('users').doc(userRecord.uid);
    const docSnap = await userDocRef.get();

    if (docSnap.exists) {
      await userDocRef.update({
        role: 'admin',
        updatedAt: FieldValue.serverTimestamp(),
      });
      console.log(`📄 Updated Firestore users/${userRecord.uid} document with role: "admin"`);
    } else {
      await userDocRef.set({
        uid: userRecord.uid,
        email: userRecord.email || '',
        displayName: userRecord.displayName || (userRecord.email ? userRecord.email.split('@')[0] : 'Admin'),
        role: 'admin',
        createdAt: FieldValue.serverTimestamp(),
      });
      console.log(`📄 Created Firestore users/${userRecord.uid} document with role: "admin"`);
    }

    console.log('\n🎉 SUCCESS: Admin privileges granted successfully!');
    console.log('--------------------------------------------------------------');
    console.log('IMPORTANT NEXT STEP:');
    console.log('Firebase ID Tokens cache custom claims. In the app:');
    console.log('1. Log out (Sign out).');
    console.log('2. Log in again with this account.');
    console.log('3. Access the /admin panel.\n');
  } catch (err: any) {
    console.error('\n❌ FAILED to assign admin privileges:', err.message || err);
    process.exit(1);
  }
}

setAdminClaim();
