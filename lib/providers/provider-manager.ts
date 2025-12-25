// Provider Manager - Handles switching between providers
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { IBackendProvider, ProviderType } from './types';
import { SupabaseProvider } from './supabase-provider';
import { FirebaseProvider } from './firebase-provider';

const STORAGE_KEY = 'dreambiz_backend_provider';
const DEFAULT_PROVIDER: ProviderType = 'supabase'; // Supabase is the default provider

export class ProviderManager {
  private currentProvider: IBackendProvider | null = null;
  private providers: Map<ProviderType, IBackendProvider> = new Map();
  private listeners: Set<(provider: IBackendProvider) => void> = new Set();

  constructor() {
    // Initialize available providers
    // Supabase is the default and primary provider
    this.providers.set('supabase', new SupabaseProvider());
    this.providers.set('firebase', new FirebaseProvider());
    // Hybrid provider would combine both
  }

  async initialize(): Promise<void> {
    // Load saved provider preference, default to Supabase
    const savedProvider = await AsyncStorage.getItem(STORAGE_KEY);
    const providerType: ProviderType = (savedProvider as ProviderType) || DEFAULT_PROVIDER;

    await this.setProvider(providerType);
  }

  async setProvider(type: ProviderType): Promise<void> {
    // Cleanup current provider
    if (this.currentProvider) {
      await this.currentProvider.cleanup();
    }

    // Get new provider
    const provider = this.providers.get(type);
    if (!provider) {
      throw new Error(`Provider ${type} not found`);
    }

    // Initialize new provider
    await provider.initialize();
    this.currentProvider = provider;

    // Save preference
    await AsyncStorage.setItem(STORAGE_KEY, type);

    // Notify listeners
    this.listeners.forEach(listener => listener(provider));

    console.log(`✅ Switched to ${provider.name} provider`);
  }

  getProvider(): IBackendProvider {
    if (!this.currentProvider) {
      throw new Error('No provider initialized. Call initialize() first.');
    }
    return this.currentProvider;
  }

  getCurrentProviderType(): ProviderType {
    if (!this.currentProvider) {
      return DEFAULT_PROVIDER; // Default to Supabase
    }
    return this.currentProvider.type;
  }

  getAvailableProviders(): ProviderType[] {
    return Array.from(this.providers.keys());
  }

  onProviderChange(callback: (provider: IBackendProvider) => void): () => void {
    this.listeners.add(callback);
    return () => {
      this.listeners.delete(callback);
    };
  }

  // Hybrid mode: use both providers
  async enableHybridMode(): Promise<void> {
    // This would allow using both providers simultaneously
    // For example: auth from one, database from another
    await this.setProvider('supabase'); // Default for now
    console.log('⚠️ Hybrid mode not fully implemented yet');
  }
}

// Singleton instance
export const providerManager = new ProviderManager();

