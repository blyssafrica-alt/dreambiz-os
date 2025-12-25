import { supabase } from '@/lib/supabase';
import type { User as SupabaseUser } from '@supabase/supabase-js';
import type {
  IBackendProvider,
  ProviderType,
  AuthUser,
  UserProfile,
  AuthSession,
  DatabaseQuery,
  DatabaseResult,
  DatabaseListResult,
} from './types';

export class SupabaseProvider implements IBackendProvider {
  readonly type: ProviderType = 'supabase';
  readonly name = 'Supabase';
  private authStateUnsubscribe: (() => void) | null = null;

  async initialize(): Promise<void> {
    // Supabase is already initialized in lib/supabase.ts
    console.log('✅ Supabase provider initialized');
  }

  async cleanup(): Promise<void> {
    if (this.authStateUnsubscribe) {
      this.authStateUnsubscribe();
      this.authStateUnsubscribe = null;
    }
  }

  async getCurrentSession(): Promise<AuthSession | null> {
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error) throw error;
      if (!session?.user) return null;

      return {
        user: this.mapSupabaseUserToAuthUser(session.user),
        accessToken: session.access_token,
        refreshToken: session.refresh_token,
        expiresAt: session.expires_at ? session.expires_at * 1000 : undefined,
      };
    } catch (error) {
      console.error('Failed to get session:', error);
      return null;
    }
  }

  async signUp(email: string, password: string, metadata?: Record<string, any>): Promise<AuthUser> {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: metadata || {},
      },
    });

    if (error) throw error;
    if (!data.user) throw new Error('No user returned from sign up');

    return this.mapSupabaseUserToAuthUser(data.user);
  }

  async signIn(email: string, password: string): Promise<AuthUser> {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw error;
    if (!data.user) throw new Error('No user returned from sign in');

    return this.mapSupabaseUserToAuthUser(data.user);
  }

  async signOut(): Promise<void> {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  }

  onAuthStateChange(callback: (user: AuthUser | null) => void): () => void {
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      callback(session?.user ? this.mapSupabaseUserToAuthUser(session.user) : null);
    });

    this.authStateUnsubscribe = () => {
      data.subscription.unsubscribe();
    };

    return this.authStateUnsubscribe;
  }

  async getUserProfile(userId: string): Promise<UserProfile | null> {
    try {
      const result = await this.queryOne<any>({
        table: 'users',
        filters: { id: userId },
      });

      if (result.error) {
        // Extract error message properly
        const errorMessage = result.error?.message || result.error?.toString() || 'Unknown error';
        const errorCode = result.error?.code || '';
        
        // If it's a "not found" error (PGRST116), that's okay - profile doesn't exist yet
        if (errorCode === 'PGRST116' || errorMessage.includes('No rows returned')) {
          console.log(`User profile not found for userId: ${userId} (this is normal for new users)`);
          return null;
        }
        
        // For other errors, throw with proper message
        const error = new Error(errorMessage);
        (error as any).code = errorCode;
        (error as any).details = result.error?.details;
        (error as any).hint = result.error?.hint;
        throw error;
      }
      
      if (!result.data) return null;

      return {
        id: result.data.id,
        email: result.data.email,
        name: result.data.name,
        createdAt: result.data.createdAt || result.data.created_at,
        isSuperAdmin: result.data.isSuperAdmin || result.data.is_super_admin,
      };
    } catch (error: any) {
      // Re-throw with better error message
      const errorMessage = error?.message || error?.toString() || 'Failed to get user profile';
      const enhancedError = new Error(errorMessage);
      (enhancedError as any).code = error?.code;
      (enhancedError as any).details = error?.details;
      throw enhancedError;
    }
  }

  async createUserProfile(userId: string, profile: Omit<UserProfile, 'id' | 'createdAt'>): Promise<UserProfile> {
    const result = await this.insert<any>({
      table: 'users',
      data: {
        id: userId,
        email: profile.email,
        name: profile.name,
        password_hash: '',
        is_super_admin: profile.isSuperAdmin || false,
      },
    });

    if (result.error) throw result.error;
    if (!result.data) throw new Error('Failed to create user profile');

    return {
      id: result.data.id,
      email: result.data.email,
      name: result.data.name,
      createdAt: result.data.created_at || new Date().toISOString(),
      isSuperAdmin: result.data.is_super_admin,
    };
  }

  async updateUserProfile(userId: string, updates: Partial<UserProfile>): Promise<UserProfile> {
    const updateData: any = {};
    if (updates.email) updateData.email = updates.email;
    if (updates.name) updateData.name = updates.name;
    if (updates.isSuperAdmin !== undefined) updateData.is_super_admin = updates.isSuperAdmin;

    const result = await this.update<any>({
      table: 'users',
      id: userId,
      updates: updateData,
    });

    if (result.error) throw result.error;
    if (!result.data) throw new Error('Failed to update user profile');

    return {
      id: result.data.id,
      email: result.data.email,
      name: result.data.name,
      createdAt: result.data.created_at,
      isSuperAdmin: result.data.is_super_admin,
    };
  }

  async query<T>(query: DatabaseQuery): Promise<DatabaseListResult<T>> {
    try {
      let queryBuilder = supabase.from(query.table).select('*');

      // Apply filters
      if (query.filters) {
        Object.entries(query.filters).forEach(([key, value]) => {
          queryBuilder = queryBuilder.eq(key, value);
        });
      }

      // Apply ordering
      if (query.orderBy) {
        queryBuilder = queryBuilder.order(query.orderBy.column, {
          ascending: query.orderBy.ascending,
        });
      }

      // Apply limit
      if (query.limit) {
        queryBuilder = queryBuilder.limit(query.limit);
      }

      // Apply offset
      if (query.offset) {
        queryBuilder = queryBuilder.range(query.offset, query.offset + (query.limit || 10) - 1);
      }

      const { data, error } = await queryBuilder;

      if (error) {
        return { data: [], error };
      }

      return { data: (data as T[]) || [], error: null };
    } catch (error) {
      return { data: [], error: error as Error };
    }
  }

  async queryOne<T>(query: DatabaseQuery): Promise<DatabaseResult<T>> {
    try {
      let queryBuilder = supabase.from(query.table).select('*');

      // Apply filters
      if (query.filters) {
        Object.entries(query.filters).forEach(([key, value]) => {
          queryBuilder = queryBuilder.eq(key, value);
        });
      }

      const { data, error } = await queryBuilder.single();

      if (error) {
        // Convert Supabase error to Error object with proper message
        const errorObj = new Error(error.message || 'Database query failed');
        (errorObj as any).code = error.code;
        (errorObj as any).details = error.details;
        (errorObj as any).hint = error.hint;
        return { data: null, error: errorObj };
      }

      return { data: data as T, error: null };
    } catch (error: any) {
      // Ensure we return a proper Error object
      const errorObj = error instanceof Error ? error : new Error(error?.message || String(error));
      return { data: null, error: errorObj };
    }
  }

  async insert<T>(table: string, data: Omit<T, 'id' | 'created_at' | 'updated_at'>): Promise<DatabaseResult<T>> {
    try {
      const { data: result, error } = await supabase.from(table).insert(data).select().single();

      if (error) {
        return { data: null, error };
      }

      return { data: result as T, error: null };
    } catch (error) {
      return { data: null, error: error as Error };
    }
  }

  async update<T>(table: string, id: string, updates: Partial<T>): Promise<DatabaseResult<T>> {
    try {
      const { data, error } = await supabase
        .from(table)
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        return { data: null, error };
      }

      return { data: data as T, error: null };
    } catch (error) {
      return { data: null, error: error as Error };
    }
  }

  async delete(table: string, id: string): Promise<DatabaseResult<void>> {
    try {
      const { error } = await supabase.from(table).delete().eq('id', id);

      if (error) {
        return { data: null, error };
      }

      return { data: undefined, error: null };
    } catch (error) {
      return { data: null, error: error as Error };
    }
  }

  private mapSupabaseUserToAuthUser(user: SupabaseUser): AuthUser {
    return {
      id: user.id,
      email: user.email || '',
      emailVerified: user.email_confirmed_at !== null,
      metadata: user.user_metadata || {},
    };
  }
}

