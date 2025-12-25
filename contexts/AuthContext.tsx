import createContextHook from '@nkzw/create-context-hook';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { User as SupabaseUser } from '@supabase/supabase-js';

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
  const [supabaseUser, setSupabaseUser] = useState<SupabaseUser | null>(null);

  useEffect(() => {
    const initAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          setSupabaseUser(session.user);
          await loadUserProfile(session.user.id);
        }
      } catch (error) {
        console.error('Failed to load user:', error);
      } finally {
        setIsLoading(false);
      }
    };

    initAuth();
    
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth state changed:', event);
      if (session?.user) {
        await loadUserProfile(session.user.id);
        setSupabaseUser(session.user);
      } else {
        setUser(null);
        setSupabaseUser(null);
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  const loadUserProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) throw error;

      if (data) {
        setUser({
          id: data.id,
          name: data.name,
          email: data.email,
          createdAt: data.created_at,
          isSuperAdmin: data.is_super_admin,
        });
      }
    } catch (error) {
      console.error('Failed to load user profile:', error);
    }
  };

  const signUp = async (name: string, email: string, password: string) => {
    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error('No user returned');

      const { error: profileError } = await supabase
        .from('users')
        .insert({
          id: authData.user.id,
          email,
          name,
          password_hash: '',
          is_super_admin: false,
        });

      if (profileError) throw profileError;

      const newUser: User = {
        id: authData.user.id,
        name,
        email,
        createdAt: new Date().toISOString(),
        isSuperAdmin: false,
      };
      
      setUser(newUser);
      setSupabaseUser(authData.user);
      return newUser;
    } catch (error: any) {
      console.error('Sign up error:', error);
      throw new Error(error.message || 'Failed to sign up');
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;
      if (!data.user) throw new Error('No user returned');

      setSupabaseUser(data.user);
      await loadUserProfile(data.user.id);
      
      return user;
    } catch (error: any) {
      console.error('Sign in error:', error);
      throw new Error(error.message || 'Invalid credentials');
    }
  };

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      
      setUser(null);
      setSupabaseUser(null);
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
    supabaseUser,
  };
});
