import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { 
  doc, 
  onSnapshot, 
  collection, 
  query, 
  where, 
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  serverTimestamp
} from 'firebase/firestore';
import { auth, db } from '../firebase';
import { setDocument, updateDocument } from '../lib/firestore';

export interface Organization {
  id: string;
  name: string;
  ownerUid: string;
  country?: string;
  currency?: string;
  address?: string;
  uprsRegistrationNumber?: string;
  plan: string;
  subscriptionStatus: string;
  createdAt: any;
  expiresAt?: string;
}

export interface UserProfile {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  phoneNumber: string | null;
  plan: 'trial' | 'basic' | 'essentials' | 'plus' | 'advanced';
  createdAt: any;
}

interface FirebaseContextType {
  user: FirebaseUser | null;
  userProfile: UserProfile | null;
  loading: boolean;
  organizations: Organization[];
  currentOrg: Organization | null;
  setCurrentOrg: (org: Organization | null) => void;
  isAuthReady: boolean;
}

const FirebaseContext = createContext<FirebaseContextType | undefined>(undefined);

export const FirebaseProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [currentOrg, setCurrentOrg] = useState<Organization | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      try {
        setUser(firebaseUser);
        if (firebaseUser) {
          const userDocRef = doc(db, 'users', firebaseUser.uid);
          
          const unsubscribeUser = onSnapshot(userDocRef, async (docSnap) => {
            if (docSnap.exists()) {
              setUserProfile({ uid: docSnap.id, ...docSnap.data() } as UserProfile);
            } else {
              const newProfile = {
                uid: firebaseUser.uid,
                email: firebaseUser.email,
                displayName: firebaseUser.displayName,
                photoURL: firebaseUser.photoURL,
                phoneNumber: firebaseUser.phoneNumber,
                plan: 'trial',
                createdAt: new Date().toISOString()
              };
              await setDoc(userDocRef, newProfile);
              setUserProfile(newProfile as UserProfile);
            }
          });

          return () => unsubscribeUser();
        } else {
          setUserProfile(null);
        }
      } catch (error) {
        console.error("Auth initialization error:", error);
      } finally {
        setIsAuthReady(true);
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) {
      setOrganizations([]);
      setCurrentOrg(null);
      return;
    }

    let unsubscribeMemberships: (() => void) | null = null;

    // Fetch organizations where user is owner
    const ownedQuery = query(collection(db, 'organizations'), where('ownerUid', '==', user.uid));
    const unsubscribeOwned = onSnapshot(ownedQuery, (ownedSnapshot) => {
      const ownedOrgs = ownedSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Organization));
      
      // Fetch organizations where user is staff via memberships
      const membershipsQuery = query(collection(db, 'memberships'), where('userId', '==', user.uid));
      
      // Also check for unclaimed memberships by email
      const unclaimedQuery = query(collection(db, 'memberships'), where('email', '==', user.email), where('userId', '==', null));

      if (unsubscribeMemberships) unsubscribeMemberships();
      
      unsubscribeMemberships = onSnapshot(membershipsQuery, async (membershipSnapshot) => {
        const staffOrgs: Organization[] = [];
        
        try {
          // 1. Process existing memberships
          for (const membershipDoc of membershipSnapshot.docs) {
            const membership = membershipDoc.data();
            const orgDoc = await getDoc(doc(db, 'organizations', membership.orgId));
            if (orgDoc.exists()) {
              staffOrgs.push({ id: orgDoc.id, ...orgDoc.data() } as Organization);
            }
          }

          // 2. Check for unclaimed memberships
          const unclaimedSnapshot = await getDocs(unclaimedQuery);
          for (const unclaimedDoc of unclaimedSnapshot.docs) {
            const data = unclaimedDoc.data();
            // Claim it
            await updateDocument('memberships', unclaimedDoc.id, { userId: user.uid });
            
            // Also create the staff record with UID as ID for security rules
            await setDocument(`organizations/${data.orgId}/staff`, user.uid, {
              id: user.uid,
              uid: user.uid,
              email: user.email,
              displayName: user.displayName,
              role: data.role,
              addedAt: new Date().toISOString()
            });

            // Add to list immediately if not already there
            const orgDoc = await getDoc(doc(db, 'organizations', data.orgId));
            if (orgDoc.exists() && !staffOrgs.find(o => o.id === orgDoc.id)) {
              staffOrgs.push({ id: orgDoc.id, ...orgDoc.data() } as Organization);
            }
          }

          // Combine and unique by ID
          const allOrgs = [...ownedOrgs];
          staffOrgs.forEach(org => {
            if (!allOrgs.find(o => o.id === org.id)) {
              allOrgs.push(org);
            }
          });

          setOrganizations(allOrgs);
          
          if (allOrgs.length > 0) {
            setCurrentOrg(prev => {
              if (!prev) return allOrgs[0];
              const updated = allOrgs.find(o => o.id === prev.id);
              return updated || allOrgs[0];
            });
          } else {
            setCurrentOrg(null);
          }
        } catch (error) {
          console.error("Error processing memberships:", error);
        }
      }, (error) => {
        console.error("Error fetching memberships:", error);
      });
    }, (error) => {
      console.error("Error fetching owned organizations:", error);
    });

    return () => {
      unsubscribeOwned();
      if (unsubscribeMemberships) unsubscribeMemberships();
    };
  }, [user]);

  return (
    <FirebaseContext.Provider value={{ user, userProfile, loading, organizations, currentOrg, setCurrentOrg, isAuthReady }}>
      {children}
    </FirebaseContext.Provider>
  );
};

export const useFirebase = () => {
  const context = useContext(FirebaseContext);
  if (context === undefined) {
    throw new Error('useFirebase must be used within a FirebaseProvider');
  }
  return context;
};
