import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { 
  doc, 
  onSnapshot, 
  collection, 
  query, 
  where, 
  getDoc,
  setDoc,
  serverTimestamp
} from 'firebase/firestore';
import { auth, db } from '../firebase';

interface Organization {
  id: string;
  name: string;
  ownerUid: string;
  plan: string;
  subscriptionStatus: string;
  createdAt: any;
}

interface FirebaseContextType {
  user: FirebaseUser | null;
  loading: boolean;
  organizations: Organization[];
  currentOrg: Organization | null;
  setCurrentOrg: (org: Organization | null) => void;
  isAuthReady: boolean;
}

const FirebaseContext = createContext<FirebaseContextType | undefined>(undefined);

export const FirebaseProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<FirebaseUser | null>(null);
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
          const userDoc = await getDoc(userDocRef);
          
          if (!userDoc.exists()) {
            await setDoc(userDocRef, {
              uid: firebaseUser.uid,
              email: firebaseUser.email,
              displayName: firebaseUser.displayName,
              photoURL: firebaseUser.photoURL,
              createdAt: serverTimestamp()
            });
          }
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

    const orgsQuery = query(collection(db, 'organizations'), where('ownerUid', '==', user.uid));
    const unsubscribeOrgs = onSnapshot(orgsQuery, (snapshot) => {
      const orgsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Organization));
      setOrganizations(orgsData);
      
      if (orgsData.length > 0) {
        setCurrentOrg(prev => {
          if (!prev || !orgsData.find(o => o.id === prev.id)) {
            return orgsData[0];
          }
          return prev;
        });
      } else {
        setCurrentOrg(null);
      }
    }, (error) => {
      console.error("Error fetching organizations:", error);
    });

    return () => unsubscribeOrgs();
  }, [user]);

  return (
    <FirebaseContext.Provider value={{ user, loading, organizations, currentOrg, setCurrentOrg, isAuthReady }}>
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
