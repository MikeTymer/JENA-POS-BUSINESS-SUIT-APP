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
  ownerEmail?: string;
  country?: string;
  currency?: string;
  address?: string;
  uprsRegistrationNumber?: string;
  logoUrl?: string;
  plan: string;
  subscriptionStatus: string;
  isPaid?: boolean;
  trialExpiresAt?: string;
  referredBy?: string;
  businessType?: 'general' | 'medical';
  createdAt: any;
  expiresAt?: string;
}

export interface UserProfile {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  phoneNumber: string | null;
  plan: 'trial' | 'starter' | 'business' | 'enterprise';
  termsAcceptedAt?: string;
  notificationPreferences?: {
    sales?: boolean;
    inventory?: boolean;
    reports?: boolean;
    security?: boolean;
  };
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
  db: any;
}

const FirebaseContext = createContext<FirebaseContextType | undefined>(undefined);

export const FirebaseProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [ownedOrgs, setOwnedOrgs] = useState<Organization[]>([]);
  const [staffOrgs, setStaffOrgs] = useState<Organization[]>([]);
  const [staffOrgIds, setStaffOrgIds] = useState<string[]>([]);
  const [currentOrg, setCurrentOrg] = useState<Organization | null>(null);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (firebaseUser) => {
      console.log('Auth state changed:', firebaseUser ? 'User logged in' : 'No user');
      setUser(firebaseUser);
      if (!firebaseUser) {
        setUserProfile(null);
        setIsAuthReady(true);
        setLoading(false);
      }
    }, (error) => {
      console.error('Auth state change error:', error);
      setIsAuthReady(true);
      setLoading(false);
    });

    return () => unsubscribeAuth();
  }, []);

  useEffect(() => {
    if (!user) return;

    let unsubscribeUser: (() => void) | null = null;
    let isMounted = true;

    const initializeAndListen = async () => {
      const userDocRef = doc(db, 'users', user.uid);
      
      try {
        const docSnap = await getDoc(userDocRef);
        if (isMounted && !docSnap.exists()) {
          const newProfile = {
            uid: user.uid,
            email: user.email,
            displayName: user.displayName,
            photoURL: user.photoURL,
            phoneNumber: user.phoneNumber,
            plan: 'trial',
            createdAt: new Date().toISOString()
          };
          await setDoc(userDocRef, newProfile);
        }
      } catch (err) {
        console.error("Failed to initialize user profile:", err);
      }

      if (!isMounted) return;

      unsubscribeUser = onSnapshot(userDocRef, (docSnap) => {
        console.log('User profile snapshot received, exists:', docSnap.exists());
        if (isMounted && docSnap.exists()) {
          setUserProfile({ uid: docSnap.id, ...docSnap.data() } as UserProfile);
        }
        if (isMounted) {
          setIsAuthReady(true);
          setLoading(false);
        }
      }, (error) => {
        console.error("User profile snapshot error:", error);
        if (isMounted) {
          setIsAuthReady(true);
          setLoading(false);
        }
      });
    };

    initializeAndListen();

    return () => {
      isMounted = false;
      if (unsubscribeUser) unsubscribeUser();
    };
  }, [user]);

  useEffect(() => {
    if (!user) {
      setOrganizations([]);
      setCurrentOrg(null);
      return;
    }

    // 1. Subscribe to owned organizations
    const ownedQuery = query(collection(db, 'organizations'), where('ownerUid', '==', user.uid));
    const unsubOwned = onSnapshot(ownedQuery, (snapshot) => {
      const owned = snapshot.docs.map(doc => {
        const data = doc.data();
        // Auto-heal ownerEmail if missing
        if (!data.ownerEmail && user.email) {
          updateDocument('organizations', doc.id, { ownerEmail: user.email });
        }
        return { id: doc.id, ...data } as Organization;
      });
      setOwnedOrgs(owned);
    });

    // 2. Subscribe to memberships to get staff organizations
    const membershipsQuery = query(collection(db, 'memberships'), where('userId', '==', user.uid));
    const unsubMemberships = onSnapshot(membershipsQuery, (snapshot) => {
      const ids = snapshot.docs.map(doc => doc.data().orgId as string);
      setStaffOrgIds(ids);
      
      // Ensure staff record exists for each membership
      snapshot.docs.forEach(async (d) => {
        const data = d.data();
        const staffDocRef = doc(db, `organizations/${data.orgId}/staff`, user.uid);
        try {
          const staffSnap = await getDoc(staffDocRef);
          
          if (!staffSnap.exists()) {
            console.log(`Creating missing staff record for org ${data.orgId}`);
            await setDocument(`organizations/${data.orgId}/staff`, user.uid, {
              id: user.uid,
              uid: user.uid,
              email: user.email,
              displayName: user.displayName,
              role: data.role,
              addedAt: new Date().toISOString()
            });
          }
        } catch (err) {
          console.error("Error ensuring staff record:", err);
        }
      });
    });

    // 3. Check for unclaimed memberships
    const unclaimedQuery = query(collection(db, 'memberships'), where('email', '==', user.email), where('userId', '==', null));
    const unsubUnclaimed = onSnapshot(unclaimedQuery, (snapshot) => {
      snapshot.docs.forEach(async (d) => {
        const data = d.data();
        console.log(`Claiming membership for org ${data.orgId}`);
        try {
          await updateDocument('memberships', d.id, { userId: user.uid });
        } catch (err) {
          console.error("Error claiming membership:", err);
        }
      });
    });

    return () => {
      unsubOwned();
      unsubMemberships();
      unsubUnclaimed();
    };
  }, [user]);

  // 4. Subscribe to staff organizations individually for real-time updates
  useEffect(() => {
    if (!user || staffOrgIds.length === 0) {
      setStaffOrgs([]);
      return;
    }

    // Use a map to track active listeners to avoid redundant subscriptions
    const activeListeners = new Map<string, () => void>();

    staffOrgIds.forEach(id => {
      const unsub = onSnapshot(doc(db, 'organizations', id), (docSnap) => {
        if (docSnap.exists()) {
          setStaffOrgs(prev => {
            const other = prev.filter(o => o.id !== id);
            return [...other, { id: docSnap.id, ...docSnap.data() } as Organization];
          });
        }
      });
      activeListeners.set(id, unsub);
    });

    return () => {
      activeListeners.forEach(unsub => unsub());
    };
  }, [user, staffOrgIds.join(',')]); // Use join to stabilize dependency

  // 5. Combine and set final organizations list
  useEffect(() => {
    const all = [...ownedOrgs];
    staffOrgs.forEach(org => {
      if (!all.find(o => o.id === org.id)) {
        all.push(org);
      }
    });
    
    setOrganizations(all);
    
    if (all.length > 0) {
      setCurrentOrg(prev => {
        if (!prev) return all[0];
        const updated = all.find(o => o.id === prev.id);
        return updated || all[0];
      });
    } else {
      setCurrentOrg(null);
    }
  }, [ownedOrgs, staffOrgs]);

  return (
    <FirebaseContext.Provider value={{ user, userProfile, loading, organizations, currentOrg, setCurrentOrg, isAuthReady, db }}>
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
