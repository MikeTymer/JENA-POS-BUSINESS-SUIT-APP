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
  logoUrl?: string;
  plan: string;
  subscriptionStatus: string;
  isPaid?: boolean;
  trialExpiresAt?: string;
  referredBy?: string;
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
    let unsubscribeUser: (() => void) | null = null;

    const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      
      if (unsubscribeUser) {
        unsubscribeUser();
        unsubscribeUser = null;
      }

      if (firebaseUser) {
        const userDocRef = doc(db, 'users', firebaseUser.uid);
        
        unsubscribeUser = onSnapshot(userDocRef, async (docSnap) => {
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
          setIsAuthReady(true);
          setLoading(false);
        }, (error) => {
          console.error("User profile snapshot error:", error);
          setIsAuthReady(true);
          setLoading(false);
        });
      } else {
        setUserProfile(null);
        setIsAuthReady(true);
        setLoading(false);
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeUser) unsubscribeUser();
    };
  }, []);

  useEffect(() => {
    if (!user) {
      setOrganizations([]);
      setCurrentOrg(null);
      return;
    }

    // 1. Subscribe to owned organizations
    const ownedQuery = query(collection(db, 'organizations'), where('ownerUid', '==', user.uid));
    const unsubOwned = onSnapshot(ownedQuery, (snapshot) => {
      const owned = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Organization));
      setOwnedOrgs(owned);
    });

    // 2. Subscribe to memberships to get staff organizations
    const membershipsQuery = query(collection(db, 'memberships'), where('userId', '==', user.uid));
    const unsubMemberships = onSnapshot(membershipsQuery, (snapshot) => {
      const ids = snapshot.docs.map(doc => doc.data().orgId as string);
      setStaffOrgIds(ids);
    });

    // 3. Check for unclaimed memberships
    const unclaimedQuery = query(collection(db, 'memberships'), where('email', '==', user.email), where('userId', '==', null));
    const unsubUnclaimed = onSnapshot(unclaimedQuery, async (snapshot) => {
      for (const d of snapshot.docs) {
        const data = d.data();
        await updateDocument('memberships', d.id, { userId: user.uid });
        await setDocument(`organizations/${data.orgId}/staff`, user.uid, {
          id: user.uid,
          uid: user.uid,
          email: user.email,
          displayName: user.displayName,
          role: data.role,
          addedAt: new Date().toISOString()
        });
      }
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

    const unsubs = staffOrgIds.map(id => 
      onSnapshot(doc(db, 'organizations', id), (docSnap) => {
        if (docSnap.exists()) {
          setStaffOrgs(prev => {
            const other = prev.filter(o => o.id !== id);
            return [...other, { id: docSnap.id, ...docSnap.data() } as Organization];
          });
        }
      })
    );

    return () => unsubs.forEach(unsub => unsub());
  }, [user, staffOrgIds]);

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
