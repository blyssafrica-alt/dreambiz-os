import type { 
  Transaction, 
  Document, 
  Product, 
  Customer, 
  Supplier, 
  Budget, 
  CashflowProjection,
  TaxRate,
  Employee,
  Project,
  BusinessProfile
} from '@/types/business';

export interface ExportOptions {
  format: 'csv' | 'json';
  includeTransactions?: boolean;
  includeDocuments?: boolean;
  includeProducts?: boolean;
  includeCustomers?: boolean;
  includeSuppliers?: boolean;
  includeBudgets?: boolean;
  includeCashflow?: boolean;
  includeTaxRates?: boolean;
  includeEmployees?: boolean;
  includeProjects?: boolean;
  dateRange?: { start: string; end: string };
}

export function exportToCSV(data: any[], headers: string[]): string {
  const csvRows = [headers.join(',')];
  
  for (const row of data) {
    const values = headers.map(header => {
      const value = row[header];
      if (value === null || value === undefined) return '';
      if (typeof value === 'object') return JSON.stringify(value).replace(/"/g, '""');
      return String(value).replace(/"/g, '""');
    });
    csvRows.push(`"${values.join('","')}"`);
  }
  
  return csvRows.join('\n');
}

export function exportTransactionsToCSV(transactions: Transaction[]): string {
  const headers = ['Date', 'Type', 'Description', 'Category', 'Amount', 'Currency'];
  const rows = transactions.map(t => ({
    Date: t.date,
    Type: t.type,
    Description: t.description,
    Category: t.category,
    Amount: t.amount,
    Currency: t.currency,
  }));
  return exportToCSV(rows, headers);
}

export function exportDocumentsToCSV(documents: Document[]): string {
  const headers = ['Document Number', 'Type', 'Date', 'Due Date', 'Customer Name', 'Customer Email', 'Customer Phone', 'Subtotal', 'Tax', 'Total', 'Currency', 'Status'];
  const rows = documents.map(d => ({
    'Document Number': d.documentNumber,
    'Type': d.type,
    'Date': d.date,
    'Due Date': d.dueDate || '',
    'Customer Name': d.customerName,
    'Customer Email': d.customerEmail || '',
    'Customer Phone': d.customerPhone || '',
    'Subtotal': d.subtotal,
    'Tax': d.tax || 0,
    'Total': d.total,
    'Currency': d.currency,
    'Status': d.status || 'draft',
  }));
  return exportToCSV(rows, headers);
}

export function exportProductsToCSV(products: Product[]): string {
  const headers = ['Name', 'SKU', 'Category', 'Quantity', 'Cost Price', 'Selling Price', 'Currency', 'Low Stock Threshold'];
  const rows = products.map(p => ({
    Name: p.name,
    SKU: p.sku || '',
    Category: p.category || '',
    Quantity: p.qty,
    'Cost Price': p.costPrice || 0,
    'Selling Price': p.sellingPrice || 0,
    Currency: p.currency,
    'Low Stock Threshold': p.lowStockThreshold || 10,
  }));
  return exportToCSV(rows, headers);
}

export function exportCustomersToCSV(customers: Customer[]): string {
  const headers = ['Name', 'Email', 'Phone', 'Address', 'Total Purchases', 'Last Purchase Date'];
  const rows = customers.map(c => ({
    Name: c.name,
    Email: c.email || '',
    Phone: c.phone || '',
    Address: c.address || '',
    'Total Purchases': c.totalPurchases,
    'Last Purchase Date': c.lastPurchaseDate || '',
  }));
  return exportToCSV(rows, headers);
}

export function exportAllData(
  data: {
    transactions?: Transaction[];
    documents?: Document[];
    products?: Product[];
    customers?: Customer[];
    suppliers?: Supplier[];
    budgets?: Budget[];
    cashflowProjections?: CashflowProjection[];
    taxRates?: TaxRate[];
    employees?: Employee[];
    projects?: Project[];
    business?: BusinessProfile;
  },
  options: ExportOptions
): string {
  if (options.format === 'json') {
    return JSON.stringify(data, null, 2);
  }

  const csvParts: string[] = [];
  
  if (options.includeTransactions && data.transactions) {
    csvParts.push('=== TRANSACTIONS ===');
    csvParts.push(exportTransactionsToCSV(data.transactions));
    csvParts.push('');
  }
  
  if (options.includeDocuments && data.documents) {
    csvParts.push('=== DOCUMENTS ===');
    csvParts.push(exportDocumentsToCSV(data.documents));
    csvParts.push('');
  }
  
  if (options.includeProducts && data.products) {
    csvParts.push('=== PRODUCTS ===');
    csvParts.push(exportProductsToCSV(data.products));
    csvParts.push('');
  }
  
  if (options.includeCustomers && data.customers) {
    csvParts.push('=== CUSTOMERS ===');
    csvParts.push(exportCustomersToCSV(data.customers));
    csvParts.push('');
  }
  
  return csvParts.join('\n');
}

export async function shareData(data: string, filename: string, mimeType: string) {
  // For React Native, we'll use expo-sharing
  // eslint-disable-next-line import/no-unresolved, import/no-extraneous-dependencies
  const { shareAsync } = await import('expo-sharing');
  // eslint-disable-next-line import/no-unresolved, import/no-extraneous-dependencies
  const { writeAsStringAsync, documentDirectory } = await import('expo-file-system');
  
  if (!documentDirectory) {
    throw new Error('File system not available');
  }
  
  const fileUri = `${documentDirectory}${filename}`;
  await writeAsStringAsync(fileUri, data, { encoding: 'utf8' });
  await shareAsync(fileUri, { mimeType, UTI: mimeType });
}

