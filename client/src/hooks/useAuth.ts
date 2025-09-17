import { useState, useEffect } from 'react';
import { User as FirebaseUser, onAuthStateChanged, signOut as firebaseSignOut } from 'firebase/auth';
import { useQuery } from "@tanstack/react-query";
import { auth } from '@/lib/firebase';
import { apiRequest } from '@/lib/queryClient';

interface User {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  role: 'student' | 'instructor' | 'admin';
  profileImageUrl?: string;
}

export function useAuth() {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Listen to Firebase auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setFirebaseUser(user);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Sync user data with our database when Firebase user exists
  const { data: user, isLoading: userDataLoading } = useQuery({
    queryKey: ["/api/auth/user", firebaseUser?.uid],
    queryFn: async () => {
      if (!firebaseUser) return null;
      
      // Sync the Firebase user with our database
      return await apiRequest('/api/auth/sync-user', 'POST', {
        uid: firebaseUser.uid,
        email: firebaseUser.email,
        displayName: firebaseUser.displayName
      });
    },
    enabled: !!firebaseUser,
    retry: false,
  });

  const signOut = async () => {
    try {
      await firebaseSignOut(auth);
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  return {
    user: user as User | null,
    firebaseUser,
    isLoading: isLoading || userDataLoading,
    isAuthenticated: !!firebaseUser && !!user,
    signOut,
  };
}
