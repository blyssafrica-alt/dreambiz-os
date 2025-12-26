import { Stack } from 'expo-router';
import { 
  BarChart3, 
  TrendingUp, 
  TrendingDown,
  Download,
  Calendar,
  DollarSign,
  FileText
} from 'lucide-react-native';
import { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert as RNAlert,
  Share,
  Platform,
} from 'react-native';
import { useBusiness } from '@/contexts/BusinessContext';
import { useTheme } from '@/contexts/ThemeContext';
import type { Currency } from '@/types/business';

type ReportPeriod = 'today' | 'week' | 'month' | 'quarter' | 'year' | 'custom';

export default function ReportsScreen() {
  const { business, transactions, documents } = useBusiness();
  const { theme } = useTheme();
  const [period, setPeriod] = useState<ReportPeriod>('month');

  const formatCurrency = (amount: number) => {
    const symbol = business?.currency === 'USD' ? '$' : 'ZWL';
    return `${symbol}${amount.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`;
  };

  const getDateRange = (period: ReportPeriod) => {
    const now = new Date();
    let start: Date;
    let end = new Date(now);

    switch (period) {
      case 'today':
        start = new Date(now);
        start.setHours(0, 0, 0, 0);
        break;
      case 'week':
        start = new Date(now);
        start.setDate(now.getDate() - 7);
        break;
      case 'month':
        start = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case 'quarter':
        const quarter = Math.floor(now.getMonth() / 3);
        start = new Date(now.getFullYear(), quarter * 3, 1);
        break;
      case 'year':
        start = new Date(now.getFullYear(), 0, 1);
        break;
      default:
        start = new Date(now.getFullYear(), now.getMonth(), 1);
    }

    return { start: start.toISOString().split('T')[0], end: end.toISOString().split('T')[0] };
  };

  const reportData = useMemo(() => {
    const { start, end } = getDateRange(period);
    const filtered = transactions.filter(t => t.date >= start && t.date <= end);

    const sales = filtered.filter(t => t.type === 'sale');
    const expenses = filtered.filter(t => t.type === 'expense');

    const totalSales = sales.reduce((sum, t) => sum + t.amount, 0);
    const totalExpenses = expenses.reduce((sum, t) => sum + t.amount, 0);
    const profit = totalSales - totalExpenses;
    const profitMargin = totalSales > 0 ? (profit / totalSales) * 100 : 0;

    // Category breakdown
    const categorySales = new Map<string, number>();
    const categoryExpenses = new Map<string, number>();

    sales.forEach(t => {
      const current = categorySales.get(t.category) || 0;
      categorySales.set(t.category, current + t.amount);
    });

    expenses.forEach(t => {
      const current = categoryExpenses.get(t.category) || 0;
      categoryExpenses.set(t.category, current + t.amount);
    });

    const topSalesCategories = Array.from(categorySales.entries())
      .map(([category, amount]) => ({ category, amount }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5);

    const topExpenseCategories = Array.from(categoryExpenses.entries())
      .map(([category, amount]) => ({ category, amount }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5);

    // Invoice status breakdown
    const invoiceDocs = documents.filter(d => d.type === 'invoice' && d.date >= start && d.date <= end);
    const invoiceStatus = {
      draft: invoiceDocs.filter(d => d.status === 'draft').length,
      sent: invoiceDocs.filter(d => d.status === 'sent').length,
      paid: invoiceDocs.filter(d => d.status === 'paid').length,
      cancelled: invoiceDocs.filter(d => d.status === 'cancelled').length,
    };
    const totalInvoiced = invoiceDocs.reduce((sum, d) => sum + d.total, 0);
    const paidInvoices = invoiceDocs.filter(d => d.status === 'paid');
    const totalPaid = paidInvoices.reduce((sum, d) => sum + d.total, 0);
    const outstanding = totalInvoiced - totalPaid;

    return {
      totalSales,
      totalExpenses,
      profit,
      profitMargin,
      topSalesCategories,
      topExpenseCategories,
      invoiceStatus,
      totalInvoiced,
      totalPaid,
      outstanding,
      transactionCount: filtered.length,
    };
  }, [transactions, documents, period]);

  const handleExport = async (type: 'summary' | 'detailed') => {
    const { start, end } = getDateRange(period);
    let content = '';

    if (type === 'summary') {
      content = `FINANCIAL REPORT - ${period.toUpperCase()}\n`;
      content += `Period: ${start} to ${end}\n\n`;
      content += `SUMMARY\n`;
      content += `Total Sales: ${formatCurrency(reportData.totalSales)}\n`;
      content += `Total Expenses: ${formatCurrency(reportData.totalExpenses)}\n`;
      content += `Profit: ${formatCurrency(reportData.profit)}\n`;
      content += `Profit Margin: ${reportData.profitMargin.toFixed(2)}%\n\n`;
      content += `TOP SALES CATEGORIES\n`;
      reportData.topSalesCategories.forEach((cat, i) => {
        content += `${i + 1}. ${cat.category}: ${formatCurrency(cat.amount)}\n`;
      });
      content += `\nTOP EXPENSE CATEGORIES\n`;
      reportData.topExpenseCategories.forEach((cat, i) => {
        content += `${i + 1}. ${cat.category}: ${formatCurrency(cat.amount)}\n`;
      });
    } else {
      content = `DETAILED TRANSACTION REPORT - ${period.toUpperCase()}\n`;
      content += `Period: ${start} to ${end}\n\n`;
      content += `Date,Type,Category,Description,Amount,Currency\n`;
      const filtered = transactions.filter(t => t.date >= start && t.date <= end);
      filtered.forEach(t => {
        content += `${t.date},${t.type},${t.category},"${t.description}",${t.amount},${t.currency}\n`;
      });
    }

    try {
      if (Platform.OS === 'web') {
        const blob = new Blob([content], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = (global as any).document.createElement('a');
        a.href = url;
        a.download = `report-${period}-${new Date().toISOString().split('T')[0]}.txt`;
        a.click();
        URL.revokeObjectURL(url);
      } else {
        await Share.share({
          message: content,
          title: `Financial Report - ${period}`,
        });
      }
    } catch (error) {
      console.error('Export failed:', error);
      RNAlert.alert('Export Failed', 'Could not export report');
    }
  };

  const periods: { label: string; value: ReportPeriod }[] = [
    { label: 'Today', value: 'today' },
    { label: 'Week', value: 'week' },
    { label: 'Month', value: 'month' },
    { label: 'Quarter', value: 'quarter' },
    { label: 'Year', value: 'year' },
  ];

  return (
    <View style={[styles.container, { backgroundColor: theme.background.secondary }]}>
      <Stack.Screen options={{ title: 'Reports', headerShown: false }} />
      
      <View style={[styles.header, { backgroundColor: theme.background.card }]}>
        <Text style={[styles.headerTitle, { color: theme.text.primary }]}>Reports & Analytics</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={[styles.exportButton, { backgroundColor: theme.background.secondary }]}
            onPress={() => handleExport('summary')}
          >
            <Download size={18} color={theme.accent.primary} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.periodSelector}>
        {periods.map(p => (
          <TouchableOpacity
            key={p.value}
            style={[
              styles.periodChip,
              {
                backgroundColor: period === p.value ? theme.accent.primary : theme.background.card,
              }
            ]}
            onPress={() => setPeriod(p.value)}
          >
            <Text style={[
              styles.periodText,
              { color: period === p.value ? '#fff' : theme.text.primary }
            ]}>
              {p.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView style={styles.scrollView}>
        {/* Profit & Loss Summary */}
        <View style={[styles.card, { backgroundColor: theme.background.card }]}>
          <Text style={[styles.cardTitle, { color: theme.text.primary }]}>Profit & Loss</Text>
          
          <View style={styles.metricRow}>
            <View style={styles.metric}>
              <Text style={[styles.metricLabel, { color: theme.text.tertiary }]}>Total Sales</Text>
              <Text style={[styles.metricValue, { color: '#10B981' }]}>
                {formatCurrency(reportData.totalSales)}
              </Text>
            </View>
            <View style={styles.metric}>
              <Text style={[styles.metricLabel, { color: theme.text.tertiary }]}>Total Expenses</Text>
              <Text style={[styles.metricValue, { color: '#EF4444' }]}>
                {formatCurrency(reportData.totalExpenses)}
              </Text>
            </View>
          </View>

          <View style={[styles.profitCard, { backgroundColor: reportData.profit >= 0 ? '#D1FAE5' : '#FEE2E2' }]}>
            <Text style={[styles.profitLabel, { color: theme.text.secondary }]}>Net Profit</Text>
            <Text style={[styles.profitValue, { color: reportData.profit >= 0 ? '#065F46' : '#991B1B' }]}>
              {formatCurrency(reportData.profit)}
            </Text>
            <Text style={[styles.profitMargin, { color: theme.text.tertiary }]}>
              Margin: {reportData.profitMargin.toFixed(2)}%
            </Text>
          </View>
        </View>

        {/* Top Categories */}
        <View style={[styles.card, { backgroundColor: theme.background.card }]}>
          <Text style={[styles.cardTitle, { color: theme.text.primary }]}>Top Sales Categories</Text>
          {reportData.topSalesCategories.length > 0 ? (
            reportData.topSalesCategories.map((cat, i) => (
              <View key={i} style={styles.categoryRow}>
                <View style={styles.categoryInfo}>
                  <Text style={[styles.categoryName, { color: theme.text.primary }]}>{cat.category}</Text>
                  <View style={[styles.categoryBar, { backgroundColor: theme.background.secondary }]}>
                    <View
                      style={[
                        styles.categoryBarFill,
                        {
                          width: `${(cat.amount / reportData.totalSales) * 100}%`,
                          backgroundColor: theme.accent.primary,
                        }
                      ]}
                    />
                  </View>
                </View>
                <Text style={[styles.categoryAmount, { color: theme.text.primary }]}>
                  {formatCurrency(cat.amount)}
                </Text>
              </View>
            ))
          ) : (
            <Text style={[styles.emptyText, { color: theme.text.tertiary }]}>No sales data</Text>
          )}
        </View>

        <View style={[styles.card, { backgroundColor: theme.background.card }]}>
          <Text style={[styles.cardTitle, { color: theme.text.primary }]}>Top Expense Categories</Text>
          {reportData.topExpenseCategories.length > 0 ? (
            reportData.topExpenseCategories.map((cat, i) => (
              <View key={i} style={styles.categoryRow}>
                <View style={styles.categoryInfo}>
                  <Text style={[styles.categoryName, { color: theme.text.primary }]}>{cat.category}</Text>
                  <View style={[styles.categoryBar, { backgroundColor: theme.background.secondary }]}>
                    <View
                      style={[
                        styles.categoryBarFill,
                        {
                          width: `${(cat.amount / reportData.totalExpenses) * 100}%`,
                          backgroundColor: '#EF4444',
                        }
                      ]}
                    />
                  </View>
                </View>
                <Text style={[styles.categoryAmount, { color: theme.text.primary }]}>
                  {formatCurrency(cat.amount)}
                </Text>
              </View>
            ))
          ) : (
            <Text style={[styles.emptyText, { color: theme.text.tertiary }]}>No expense data</Text>
          )}
        </View>

        {/* Invoice Status */}
        <View style={[styles.card, { backgroundColor: theme.background.card }]}>
          <Text style={[styles.cardTitle, { color: theme.text.primary }]}>Invoice Status</Text>
          <View style={styles.invoiceStats}>
            <View style={styles.invoiceStat}>
              <Text style={[styles.invoiceStatLabel, { color: theme.text.tertiary }]}>Total Invoiced</Text>
              <Text style={[styles.invoiceStatValue, { color: theme.text.primary }]}>
                {formatCurrency(reportData.totalInvoiced)}
              </Text>
            </View>
            <View style={styles.invoiceStat}>
              <Text style={[styles.invoiceStatLabel, { color: theme.text.tertiary }]}>Paid</Text>
              <Text style={[styles.invoiceStatValue, { color: '#10B981' }]}>
                {formatCurrency(reportData.totalPaid)}
              </Text>
            </View>
            <View style={styles.invoiceStat}>
              <Text style={[styles.invoiceStatLabel, { color: theme.text.tertiary }]}>Outstanding</Text>
              <Text style={[styles.invoiceStatValue, { color: '#F59E0B' }]}>
                {formatCurrency(reportData.outstanding)}
              </Text>
            </View>
          </View>
          <View style={styles.statusBreakdown}>
            <View style={styles.statusItem}>
              <View style={[styles.statusDot, { backgroundColor: '#94A3B8' }]} />
              <Text style={[styles.statusText, { color: theme.text.secondary }]}>
                Draft: {reportData.invoiceStatus.draft}
              </Text>
            </View>
            <View style={styles.statusItem}>
              <View style={[styles.statusDot, { backgroundColor: '#3B82F6' }]} />
              <Text style={[styles.statusText, { color: theme.text.secondary }]}>
                Sent: {reportData.invoiceStatus.sent}
              </Text>
            </View>
            <View style={styles.statusItem}>
              <View style={[styles.statusDot, { backgroundColor: '#10B981' }]} />
              <Text style={[styles.statusText, { color: theme.text.secondary }]}>
                Paid: {reportData.invoiceStatus.paid}
              </Text>
            </View>
            <View style={styles.statusItem}>
              <View style={[styles.statusDot, { backgroundColor: '#EF4444' }]} />
              <Text style={[styles.statusText, { color: theme.text.secondary }]}>
                Cancelled: {reportData.invoiceStatus.cancelled}
              </Text>
            </View>
          </View>
        </View>

        {/* Export Options */}
        <View style={[styles.card, { backgroundColor: theme.background.card }]}>
          <Text style={[styles.cardTitle, { color: theme.text.primary }]}>Export Reports</Text>
          <TouchableOpacity
            style={[styles.exportOption, { backgroundColor: theme.background.secondary }]}
            onPress={() => handleExport('summary')}
          >
            <FileText size={20} color={theme.accent.primary} />
            <View style={styles.exportInfo}>
              <Text style={[styles.exportTitle, { color: theme.text.primary }]}>Summary Report</Text>
              <Text style={[styles.exportDesc, { color: theme.text.tertiary }]}>
                Export financial summary
              </Text>
            </View>
            <Download size={18} color={theme.text.tertiary} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.exportOption, { backgroundColor: theme.background.secondary }]}
            onPress={() => handleExport('detailed')}
          >
            <FileText size={20} color={theme.accent.primary} />
            <View style={styles.exportInfo}>
              <Text style={[styles.exportTitle, { color: theme.text.primary }]}>Detailed Report</Text>
              <Text style={[styles.exportDesc, { color: theme.text.tertiary }]}>
                Export all transactions (CSV)
              </Text>
            </View>
            <Download size={18} color={theme.text.tertiary} />
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    paddingTop: 60,
    paddingBottom: 16,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  exportButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  periodSelector: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    maxHeight: 60,
  },
  periodChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
  },
  periodText: {
    fontSize: 14,
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
    padding: 16,
  },
  card: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 16,
  },
  metricRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  metric: {
    flex: 1,
  },
  metricLabel: {
    fontSize: 12,
    marginBottom: 4,
  },
  metricValue: {
    fontSize: 20,
    fontWeight: '700',
  },
  profitCard: {
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  profitLabel: {
    fontSize: 14,
    marginBottom: 4,
  },
  profitValue: {
    fontSize: 32,
    fontWeight: '700',
    marginBottom: 4,
  },
  profitMargin: {
    fontSize: 14,
  },
  categoryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  categoryInfo: {
    flex: 1,
    marginRight: 12,
  },
  categoryName: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 4,
  },
  categoryBar: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  categoryBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  categoryAmount: {
    fontSize: 14,
    fontWeight: '600',
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
    paddingVertical: 20,
  },
  invoiceStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
  },
  invoiceStat: {
    alignItems: 'center',
  },
  invoiceStatLabel: {
    fontSize: 12,
    marginBottom: 4,
  },
  invoiceStatValue: {
    fontSize: 18,
    fontWeight: '700',
  },
  statusBreakdown: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  statusItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 12,
  },
  exportOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    gap: 12,
  },
  exportInfo: {
    flex: 1,
  },
  exportTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  exportDesc: {
    fontSize: 12,
  },
});

