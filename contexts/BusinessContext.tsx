import createContextHook from '@nkzw/create-context-hook';
import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from './AuthContext';
import { getProvider } from '@/lib/providers';
import type { 
  BusinessProfile, 
  Transaction, 
  Document, 
  ExchangeRate,
  DashboardMetrics,
  Alert 
} from '@/types/business';

export const [BusinessContext, useBusiness] = createContextHook(() => {
  const { user, authUser } = useAuth();
  const [business, setBusiness] = useState<BusinessProfile | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [exchangeRate, setExchangeRate] = useState<ExchangeRate>({
    usdToZwl: 25000,
    lastUpdated: new Date().toISOString(),
  });
  const [isLoading, setIsLoading] = useState(true);
  const [hasOnboarded, setHasOnboarded] = useState(false);

  // Get user ID - use authUser.id if available (even if profile not loaded yet)
  const userId = authUser?.id || user?.id;

  const loadData = useCallback(async () => {
    if (!userId) {
      setIsLoading(false);
      return;
    }

    try {
      const [businessRes, transactionsRes, documentsRes, exchangeRateRes] = await Promise.all([
        supabase.from('business_profiles').select('*').eq('user_id', userId).single(),
        supabase.from('transactions').select('*').eq('user_id', userId).order('date', { ascending: false }),
        supabase.from('documents').select('*').eq('user_id', userId).order('date', { ascending: false }),
        supabase.from('exchange_rates').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(1).single(),
      ]);

      if (businessRes.data) {
        setBusiness({
          id: businessRes.data.id,
          name: businessRes.data.name,
          type: businessRes.data.type as any,
          stage: businessRes.data.stage as any,
          location: businessRes.data.location,
          capital: Number(businessRes.data.capital),
          currency: businessRes.data.currency as any,
          owner: businessRes.data.owner,
          phone: businessRes.data.phone || undefined,
          email: businessRes.data.email || undefined,
          address: businessRes.data.address || undefined,
          createdAt: businessRes.data.created_at,
        });
        setHasOnboarded(true);
      }

      if (transactionsRes.data) {
        setTransactions(transactionsRes.data.map(t => ({
          id: t.id,
          type: t.type as any,
          amount: Number(t.amount),
          currency: t.currency as any,
          description: t.description,
          category: t.category,
          date: t.date,
          createdAt: t.created_at,
        })));
      }

      if (documentsRes.data) {
        setDocuments(documentsRes.data.map(d => ({
          id: d.id,
          type: d.type as any,
          documentNumber: d.document_number,
          customerName: d.customer_name,
          customerPhone: d.customer_phone || undefined,
          items: d.items as any,
          subtotal: Number(d.subtotal),
          tax: d.tax ? Number(d.tax) : undefined,
          total: Number(d.total),
          currency: d.currency as any,
          date: d.date,
          createdAt: d.created_at,
          notes: d.notes || undefined,
        })));
      }

      if (exchangeRateRes.data) {
        setExchangeRate({
          usdToZwl: Number(exchangeRateRes.data.usd_to_zwl),
          lastUpdated: exchangeRateRes.data.created_at,
        });
      }
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    if (userId) {
      loadData();
    } else {
      setIsLoading(false);
    }
  }, [userId, loadData]);

  const saveBusiness = async (newBusiness: BusinessProfile) => {
    if (!userId) throw new Error('User not authenticated');

    try {
      // First, ensure the user profile exists in the users table
      // This is required because business_profiles has a foreign key constraint on user_id
      // Note: If a database trigger is set up, the profile should be created automatically
      let profileExists = false; // Track if we know the profile exists (even if we can't read it)
      let profileExistsButUnreadable = false; // Track if profile exists but RLS prevents reading it
      
      if (!user && authUser) {
        
        try {
          const provider = getProvider();
          
          // First, try to get the profile (it might already exist or be created by trigger)
          let profile = await provider.getUserProfile(authUser.id);
          
          if (!profile) {
            // Profile doesn't exist, try to create it
            // createUserProfile will throw if it can't actually create the profile in DB
            try {
              profile = await provider.createUserProfile(authUser.id, {
                email: authUser.email,
                name: authUser.metadata?.name || authUser.name || 'User',
                isSuperAdmin: false,
              });
              profileExists = true;
            } catch (createError: any) {
              // Extract error message
              const createErrorMessage = createError?.message || (typeof createError === 'string' ? createError : JSON.stringify(createError));
              const createErrorCode = (createError as any)?.code || '';
              
              // If it's a duplicate key error, the profile EXISTS in database
              if (createErrorMessage.includes('duplicate key') || 
                  createErrorMessage.includes('duplicate') || 
                  createErrorMessage.includes('already exists') ||
                  createErrorCode === '23505' ||
                  createErrorMessage.includes('users_email_key') ||
                  createErrorMessage.includes('users_pkey')) {
                // Profile exists in DB - foreign key will be satisfied
                // But we might not be able to read it due to RLS
                profileExists = true;
                profileExistsButUnreadable = true;
                console.log('✅ Profile exists (duplicate key) - proceeding with business creation');
              } else {
                // For RLS errors, we need the trigger to be set up
                // Don't proceed - the profile must exist in DB
                throw new Error(`Cannot create user profile: ${createErrorMessage}. Please ensure the database trigger is set up (see database/create_user_profile_trigger.sql)`);
              }
            }
          } else {
            console.log('✅ User profile already exists');
            profileExists = true;
          }
        } catch (profileError: any) {
          // Check if it's a duplicate key error - if so, profile exists, proceed anyway
          const errorMessage = profileError?.message || (typeof profileError === 'string' ? profileError : '');
          if (errorMessage.includes('duplicate key') || 
              errorMessage.includes('users_email_key') || 
              errorMessage.includes('users_pkey') ||
              errorMessage.includes('23505')) {
            // Duplicate key means profile exists in database
            profileExists = true;
            console.warn('⚠️ Duplicate key error - profile exists in database. Proceeding with business profile creation...');
          } else {
            // Extract error message properly to avoid [object Object]
            let errorMsg = '';
            if (typeof profileError === 'string') {
              errorMsg = profileError;
            } else if (profileError?.message) {
              errorMsg = profileError.message;
            } else if (profileError?.toString && typeof profileError.toString === 'function') {
              errorMsg = profileError.toString();
            } else {
              try {
                errorMsg = JSON.stringify(profileError, null, 2);
              } catch {
                errorMsg = 'Unknown error occurred while creating user profile';
              }
            }
            
            // Log with proper stringification
            const errorCode = profileError?.code || '';
            const errorDetails = profileError?.details || '';
            console.error('Failed to ensure user profile exists:', errorMsg);
            if (errorCode) console.error('Error code:', errorCode);
            if (errorDetails) console.error('Error details:', errorDetails);
            
            throw new Error(`Cannot save business profile: ${errorMsg}`);
          }
        }
        
        // If we know the profile exists (even if we can't read it), we can proceed
        // The foreign key constraint will be satisfied
        if (!profileExists && !profileExistsButUnreadable) {
          throw new Error('User profile is required but could not be created or verified. Please ensure the database trigger is set up (see database/create_user_profile_trigger.sql)');
        }
      }
      
      // Verify user_id exists before proceeding
      if (!userId) {
        throw new Error('User authentication required to save business profile');
      }
      
      // Final check: Try to verify the user exists in the database by attempting a simple query
      // This helps catch cases where the profile doesn't actually exist despite duplicate key errors
      try {
        const provider = getProvider();
        const verifyProfile = await provider.getUserProfile(userId);
        if (!verifyProfile && !profileExistsButUnreadable) {
          // Profile doesn't exist and we can't create it - must set up trigger
          throw new Error('User profile does not exist in database. Please run the SQL in database/create_user_profile_trigger.sql in your Supabase SQL Editor, then run: SELECT public.sync_existing_users();');
        }
      } catch (verifyError: any) {
        // If it's just a "not found" error and we got a duplicate key earlier, that's okay
        // The duplicate key confirms the profile exists in DB
        if (!profileExistsButUnreadable && !profileExists) {
          const verifyMsg = verifyError?.message || String(verifyError);
          if (!verifyMsg.includes('PGRST116') && !verifyMsg.includes('No rows returned')) {
            throw new Error(`Cannot verify user profile: ${verifyMsg}. Please ensure the database trigger is set up.`);
          }
        }
      }

      // Prepare the data object - only include id if it's a valid UUID
      // For new businesses, let the database generate the UUID
      const isExistingBusiness = business?.id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(business.id);
      
      const upsertData: any = {
        user_id: userId,
          name: newBusiness.name,
          type: newBusiness.type,
          stage: newBusiness.stage,
          location: newBusiness.location,
          capital: newBusiness.capital,
          currency: newBusiness.currency,
          owner: newBusiness.owner,
          phone: newBusiness.phone || null,
          email: newBusiness.email || null,
          address: newBusiness.address || null,
      };

      // Only include id if we have an existing business with a valid UUID
      if (isExistingBusiness) {
        upsertData.id = business.id;
      }

      // Use upsert with user_id as conflict target (since user_id is UNIQUE)
      const { data, error } = await supabase
        .from('business_profiles')
        .upsert(upsertData, {
          onConflict: 'user_id',
        })
        .select()
        .single();

      if (error) {
        // Better error message handling
        const errorMessage = error?.message || String(error);
        const errorCode = (error as any)?.code || '';
        const errorDetails = (error as any)?.details || '';
        const errorHint = (error as any)?.hint || '';
        
        // Log with proper stringification (avoid [object Object])
        console.error('Failed to save business:', errorMessage);
        if (errorCode) console.error('Error code:', errorCode);
        if (errorDetails) console.error('Error details:', errorDetails);
        if (errorHint) console.error('Error hint:', errorHint);
        
        // Create a more descriptive error
        const enhancedError = new Error(errorMessage);
        (enhancedError as any).code = errorCode;
        (enhancedError as any).details = errorDetails;
        (enhancedError as any).hint = errorHint;
        throw enhancedError;
      }

      // Use the data returned from the database (includes the generated UUID if it was new)
      const savedBusiness: BusinessProfile = {
        id: data.id,
        name: data.name,
        type: data.type as any,
        stage: data.stage as any,
        location: data.location,
        capital: Number(data.capital),
        currency: data.currency as any,
        owner: data.owner,
        phone: data.phone || undefined,
        email: data.email || undefined,
        address: data.address || undefined,
        createdAt: data.created_at,
      };

      setBusiness(savedBusiness);
      setHasOnboarded(true);
    } catch (error: any) {
      // Better error logging - extract message properly
      let errorMessage = '';
      if (typeof error === 'string') {
        errorMessage = error;
      } else if (error?.message) {
        errorMessage = error.message;
      } else if (error?.toString && typeof error.toString === 'function') {
        errorMessage = error.toString();
      } else {
        // Try to stringify, but handle circular references
        try {
          errorMessage = JSON.stringify(error, null, 2);
        } catch {
          errorMessage = 'Unknown error occurred while saving business profile';
        }
      }
      
      const errorCode = error?.code || '';
      const errorDetails = error?.details || '';
      const errorHint = error?.hint || '';
      
      // Log with proper stringification (avoid [object Object])
      console.error('Failed to save business:', errorMessage);
      if (errorCode) console.error('Error code:', errorCode);
      if (errorDetails) console.error('Error details:', errorDetails);
      if (errorHint) console.error('Error hint:', errorHint);
      
      // Create enhanced error with all details
      const enhancedError = new Error(errorMessage);
      (enhancedError as any).code = errorCode;
      (enhancedError as any).details = errorDetails;
      (enhancedError as any).hint = errorHint;
      throw enhancedError;
    }
  };

  const addTransaction = async (transaction: Omit<Transaction, 'id' | 'createdAt'>) => {
    if (!userId || !business?.id) throw new Error('User or business not found');

    try {
      const { data, error } = await supabase
        .from('transactions')
        .insert({
          user_id: userId,
          business_id: business.id,
          type: transaction.type,
          amount: transaction.amount,
          currency: transaction.currency,
          description: transaction.description,
          category: transaction.category,
          date: transaction.date,
        })
        .select()
        .single();

      if (error) throw error;

      const newTransaction: Transaction = {
        id: data.id,
        type: data.type as any,
        amount: Number(data.amount),
        currency: data.currency as any,
        description: data.description,
        category: data.category,
        date: data.date,
        createdAt: data.created_at,
      };

      setTransactions([newTransaction, ...transactions]);
    } catch (error) {
      console.error('Failed to add transaction:', error);
      throw error;
    }
  };

  const updateTransaction = async (id: string, updates: Partial<Transaction>) => {
    try {
      const { error } = await supabase
        .from('transactions')
        .update({
          type: updates.type,
          amount: updates.amount,
          description: updates.description,
          category: updates.category,
        })
        .eq('id', id);

      if (error) throw error;

      const updated = transactions.map(t => 
        t.id === id ? { ...t, ...updates } : t
      );
      setTransactions(updated);
    } catch (error) {
      console.error('Failed to update transaction:', error);
      throw error;
    }
  };

  const deleteTransaction = async (id: string) => {
    try {
      const { error } = await supabase
        .from('transactions')
        .delete()
        .eq('id', id);

      if (error) throw error;

      const updated = transactions.filter(t => t.id !== id);
      setTransactions(updated);
    } catch (error) {
      console.error('Failed to delete transaction:', error);
      throw error;
    }
  };

  const addDocument = async (document: Omit<Document, 'id' | 'createdAt' | 'documentNumber'>) => {
    if (!userId || !business?.id) throw new Error('User or business not found');

    try {
      const count = documents.filter(d => d.type === document.type).length + 1;
      const prefix = document.type === 'invoice' ? 'INV' : document.type === 'receipt' ? 'REC' : 'QUO';
      const documentNumber = `${prefix}-${String(count).padStart(4, '0')}`;

      const { data, error } = await supabase
        .from('documents')
        .insert({
          user_id: userId,
          business_id: business.id,
          type: document.type,
          document_number: documentNumber,
          customer_name: document.customerName,
          customer_phone: document.customerPhone || null,
          items: document.items,
          subtotal: document.subtotal,
          tax: document.tax || null,
          total: document.total,
          currency: document.currency,
          date: document.date,
          notes: document.notes || null,
        })
        .select()
        .single();

      if (error) throw error;

      const newDocument: Document = {
        id: data.id,
        type: data.type as any,
        documentNumber: data.document_number,
        customerName: data.customer_name,
        customerPhone: data.customer_phone || undefined,
        items: data.items as any,
        subtotal: Number(data.subtotal),
        tax: data.tax ? Number(data.tax) : undefined,
        total: Number(data.total),
        currency: data.currency as any,
        date: data.date,
        createdAt: data.created_at,
        notes: data.notes || undefined,
      };

      setDocuments([newDocument, ...documents]);
    } catch (error) {
      console.error('Failed to add document:', error);
      throw error;
    }
  };

  const updateExchangeRate = async (rate: number) => {
    if (!userId) throw new Error('User not authenticated');

    try {
      const { data, error } = await supabase
        .from('exchange_rates')
        .insert({
          user_id: userId,
          usd_to_zwl: rate,
        })
        .select()
        .single();

      if (error) throw error;

      const newRate: ExchangeRate = {
        usdToZwl: Number(data.usd_to_zwl),
        lastUpdated: data.created_at,
      };
      setExchangeRate(newRate);
    } catch (error) {
      console.error('Failed to update exchange rate:', error);
      throw error;
    }
  };

  const getDashboardMetrics = (): DashboardMetrics => {
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

    const todayTransactions = transactions.filter(t => t.date.startsWith(today));
    const monthTransactions = transactions.filter(t => t.date >= monthStart);

    const todaySales = todayTransactions
      .filter(t => t.type === 'sale')
      .reduce((sum, t) => sum + t.amount, 0);

    const todayExpenses = todayTransactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);

    const monthSales = monthTransactions
      .filter(t => t.type === 'sale')
      .reduce((sum, t) => sum + t.amount, 0);

    const monthExpenses = monthTransactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);

    const categoryTotals = new Map<string, number>();
    const expenseTotals = new Map<string, number>();
    monthTransactions.forEach(t => {
      const current = categoryTotals.get(t.category) || 0;
      categoryTotals.set(t.category, current + t.amount);
      
      if (t.type === 'expense') {
        const expenseCurrent = expenseTotals.get(t.category) || 0;
        expenseTotals.set(t.category, expenseCurrent + t.amount);
      }
    });

    const topCategories = Array.from(categoryTotals.entries())
      .map(([category, amount]) => ({ category, amount }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5);

    const alerts: Alert[] = [];
    
    if (monthExpenses > monthSales && monthSales > 0) {
      alerts.push({
        id: '1',
        type: 'danger',
        message: 'Expenses exceed sales this month',
        action: 'Urgent: Review and cut costs or increase sales',
      });
    }

    const profitMargin = monthSales > 0 ? ((monthSales - monthExpenses) / monthSales) * 100 : 0;
    if (profitMargin < 20 && profitMargin > 0 && monthSales > 0) {
      alerts.push({
        id: '2',
        type: 'warning',
        message: `Low profit margin (${profitMargin.toFixed(1)}%)`,
        action: 'Consider raising prices or reducing costs',
      });
    }

    const cashPosition = (business?.capital || 0) + monthSales - monthExpenses;
    
    if (cashPosition < 0) {
      alerts.push({
        id: '3',
        type: 'danger',
        message: 'Negative cash position',
        action: 'You need to inject capital or reduce expenses immediately',
      });
    } else if (cashPosition > 0 && cashPosition < (business?.capital || 0) * 0.3) {
      alerts.push({
        id: '4',
        type: 'warning',
        message: 'Cash running low (below 30% of starting capital)',
        action: 'Plan for capital injection or focus on profitability',
      });
    }

    const highestExpense = Array.from(expenseTotals.entries())
      .sort((a, b) => b[1] - a[1])[0];
    
    if (highestExpense && highestExpense[1] > monthExpenses * 0.4) {
      alerts.push({
        id: '5',
        type: 'info',
        message: `${highestExpense[0]} is ${((highestExpense[1] / monthExpenses) * 100).toFixed(0)}% of expenses`,
        action: 'Consider if this cost can be optimized',
      });
    }

    if (monthSales === 0 && monthTransactions.length > 0) {
      alerts.push({
        id: '6',
        type: 'danger',
        message: 'No sales recorded this month',
        action: 'Focus on generating revenue immediately',
      });
    }

    const lastWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const recentTransactions = transactions.filter(t => t.date >= lastWeek);
    
    if (transactions.length > 10 && recentTransactions.length === 0) {
      alerts.push({
        id: '7',
        type: 'warning',
        message: 'No transactions in the last 7 days',
        action: 'Keep your records up to date for accurate tracking',
      });
    }

    return {
      todaySales,
      todayExpenses,
      todayProfit: todaySales - todayExpenses,
      monthSales,
      monthExpenses,
      monthProfit: monthSales - monthExpenses,
      cashPosition,
      topCategories,
      alerts,
    };
  };

  return {
    business,
    transactions,
    documents,
    exchangeRate,
    isLoading,
    hasOnboarded,
    saveBusiness,
    addTransaction,
    updateTransaction,
    deleteTransaction,
    addDocument,
    updateExchangeRate,
    getDashboardMetrics,
  };
});
