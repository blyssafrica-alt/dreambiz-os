import createContextHook from '@nkzw/create-context-hook';
import { useEffect, useState } from 'react';
import { getProvider, type AuthUser } from '@/lib/providers';

export interface User {
  id: string;
  name: string;
  email: string;
  createdAt: string;
  isSuperAdmin?: boolean;
}

export const [AuthContext, useAuth] = createContextHook(() => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  let unsubscribeAuth: (() => void) | null = null;

  useEffect(() => {
    const initAuth = async () => {
      try {
        const provider = getProvider();
        const session = await provider.getCurrentSession();
        
        if (session?.user) {
          setAuthUser(session.user);
          await loadUserProfile(session.user.id);
        }
      } catch (error) {
        console.error('Failed to load user:', error);
      } finally {
        setIsLoading(false);
      }
    };

    initAuth();
    
    // Set up auth state listener
    const provider = getProvider();
    unsubscribeAuth = provider.onAuthStateChange(async (user) => {
      console.log('Auth state changed:', user ? 'signed in' : 'signed out');
      if (user) {
        setAuthUser(user);
        await loadUserProfile(user.id);
      } else {
        setUser(null);
        setAuthUser(null);
      }
    });

    return () => {
      if (unsubscribeAuth) {
        unsubscribeAuth();
      }
    };
  }, []);

  const loadUserProfile = async (userId: string) => {
    try {
      const provider = getProvider();
      const profile = await provider.getUserProfile(userId);

      if (profile) {
        setUser({
          id: profile.id,
          name: profile.name,
          email: profile.email,
          createdAt: profile.createdAt,
          isSuperAdmin: profile.isSuperAdmin,
        });
      }
    } catch (error) {
      console.error('Failed to load user profile:', error);
    }
  };

  const signUp = async (name: string, email: string, password: string) => {
    try {
      const provider = getProvider();
      
      // Sign up with provider
      const authUser = await provider.signUp(email, password, { name });

      // Create user profile
      const profile = await provider.createUserProfile(authUser.id, {
        email,
        name,
        isSuperAdmin: false,
      });

      const newUser: User = {
        id: profile.id,
        name: profile.name,
        email: profile.email,
        createdAt: profile.createdAt,
        isSuperAdmin: profile.isSuperAdmin,
      };
      
      setUser(newUser);
      setAuthUser(authUser);
      return newUser;
    } catch (error: any) {
      console.error('Sign up error:', error);
      throw new Error(error.message || 'Failed to sign up');
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      const provider = getProvider();
      const authUser = await provider.signIn(email, password);

      setAuthUser(authUser);
      await loadUserProfile(authUser.id);
      
      return user;
    } catch (error: any) {
      console.error('Sign in error:', error);
      throw new Error(error.message || 'Invalid credentials');
    }
  };

  const signOut = async () => {
    try {
      const provider = getProvider();
      await provider.signOut();
      
      setUser(null);
      setAuthUser(null);
    } catch (error) {
      console.error('Sign out error:', error);
      throw error;
    }
  };

  return {
    user,
    isLoading,
    signUp,
    signIn,
    signOut,
    isAuthenticated: !!user,
    authUser, // Generic auth user (replaces supabaseUser)
  };
});
