export type Currency = 'USD' | 'ZWL';

export type BusinessStage = 'idea' | 'running' | 'growing';

export type BusinessType = 
  | 'retail' | 'services' | 'manufacturing' | 'agriculture' 
  | 'restaurant' | 'salon' | 'construction' | 'transport' | 'other';

export interface ExchangeRate {
  usdToZwl: number;
  lastUpdated: string;
}

export interface BusinessProfile {
  id: string;
  name: string;
  type: BusinessType;
  stage: BusinessStage;
  location: string;
  capital: number;
  currency: Currency;
  createdAt: string;
  owner: string;
  phone?: string;
  email?: string;
  address?: string;
}

export type TransactionType = 'sale' | 'expense';

export interface Transaction {
  id: string;
  type: TransactionType;
  amount: number;
  currency: Currency;
  description: string;
  category: string;
  date: string;
  createdAt: string;
}

export type DocumentType = 'invoice' | 'receipt' | 'quotation';

export interface Document {
  id: string;
  type: DocumentType;
  documentNumber: string;
  customerName: string;
  customerPhone?: string;
  items: DocumentItem[];
  subtotal: number;
  tax?: number;
  total: number;
  currency: Currency;
  date: string;
  createdAt: string;
  notes?: string;
}

export interface DocumentItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface ViabilityInput {
  capital: number;
  monthlyExpenses: number;
  pricePerUnit: number;
  costPerUnit: number;
  expectedSalesPerMonth: number;
  currency: Currency;
}

export interface ViabilityResult {
  breakEvenUnits: number;
  breakEvenRevenue: number;
  monthlyProfit: number;
  monthsToRecoverCapital: number;
  verdict: 'viable' | 'risky' | 'not-viable';
  warnings: string[];
  profitMargin: number;
}

export interface DashboardMetrics {
  todaySales: number;
  todayExpenses: number;
  todayProfit: number;
  monthSales: number;
  monthExpenses: number;
  monthProfit: number;
  cashPosition: number;
  topCategories: { category: string; amount: number }[];
  alerts: Alert[];
}

export interface Alert {
  id: string;
  type: 'warning' | 'danger' | 'info';
  message: string;
  action?: string;
}
