import { router } from 'expo-router';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  AlertCircle,
  Plus,
  ArrowUpRight,
  ArrowDownRight,
  Sparkles,
  Activity
} from 'lucide-react-native';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity,
  Animated,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useBusiness } from '@/contexts/BusinessContext';
import { useTheme } from '@/contexts/ThemeContext';
import type { Alert } from '@/types/business';
import { useEffect, useRef } from 'react';

export default function DashboardScreen() {
  const { business, getDashboardMetrics } = useBusiness();
  const { theme } = useTheme();
  const metrics = getDashboardMetrics();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeAnim, slideAnim]);

  const formatCurrency = (amount: number) => {
    const symbol = business?.currency === 'USD' ? '$' : 'ZWL';
    return `${symbol}${amount.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`;
  };

  const renderAlert = (alert: Alert) => {
    const colors = {
      danger: { bg: theme.surface.danger, border: theme.accent.danger, text: theme.accent.danger },
      warning: { bg: theme.surface.warning, border: theme.accent.warning, text: theme.accent.warning },
      info: { bg: theme.surface.info, border: theme.accent.info, text: theme.accent.info },
    };

    const color = colors[alert.type];

    return (
      <View key={alert.id} style={[styles.alert, { backgroundColor: color.bg, borderColor: color.border }]}>
        <AlertCircle size={20} color={color.text} />
        <View style={styles.alertContent}>
          <Text style={[styles.alertText, { color: color.text }]}>{alert.message}</Text>
          {alert.action && (
            <Text style={[styles.alertAction, { color: color.text }]}>{alert.action}</Text>
          )}
        </View>
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background.secondary }]}>
      <LinearGradient
        colors={theme.gradient.primary as [string, string]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.headerGradient}
      >
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Welcome back 👋</Text>
            <Text style={styles.businessName}>{business?.name}</Text>
          </View>
          <TouchableOpacity 
            style={[styles.quickAddButton, { backgroundColor: theme.background.card }]} 
            onPress={() => router.push('/(tabs)/finances' as any)}
          >
            <Plus size={20} color={theme.accent.primary} strokeWidth={3} />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <ScrollView 
        style={styles.scrollContainer} 
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View style={{
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        }}>
          <View style={styles.todaySection}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: theme.text.primary }]}>Today</Text>
              <View style={[styles.badge, { backgroundColor: theme.surface.info }]}>
                <Sparkles size={12} color={theme.accent.info} />
                <Text style={[styles.badgeText, { color: theme.accent.info }]}>Live</Text>
              </View>
            </View>

            <View style={styles.metricsGrid}>
              <View style={[styles.metricCard, { backgroundColor: theme.background.card }]}>
                <View style={[styles.metricIconContainer, { backgroundColor: theme.surface.success }]}>
                  <ArrowUpRight size={18} color={theme.accent.success} strokeWidth={2.5} />
                </View>
                <Text style={[styles.metricLabel, { color: theme.text.secondary }]}>Sales</Text>
                <Text style={[styles.metricValue, { color: theme.text.primary }]}>{formatCurrency(metrics.todaySales)}</Text>
              </View>

              <View style={[styles.metricCard, { backgroundColor: theme.background.card }]}>
                <View style={[styles.metricIconContainer, { backgroundColor: theme.surface.danger }]}>
                  <ArrowDownRight size={18} color={theme.accent.danger} strokeWidth={2.5} />
                </View>
                <Text style={[styles.metricLabel, { color: theme.text.secondary }]}>Expenses</Text>
                <Text style={[styles.metricValue, { color: theme.text.primary }]}>{formatCurrency(metrics.todayExpenses)}</Text>
              </View>
            </View>

            <LinearGradient
              colors={metrics.todayProfit >= 0 ? [theme.accent.success, theme.accent.success] : [theme.accent.danger, theme.accent.danger] as [string, string]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.profitCard}
            >
              <View style={styles.profitContent}>
                <View style={styles.profitHeader}>
                  <Text style={styles.profitLabel}>Today&apos;s Profit</Text>
                  <View style={styles.profitIconBg}>
                    {metrics.todayProfit >= 0 ? (
                      <TrendingUp size={20} color="#FFF" strokeWidth={2.5} />
                    ) : (
                      <TrendingDown size={20} color="#FFF" strokeWidth={2.5} />
                    )}
                  </View>
                </View>
                <Text style={styles.profitValue}>
                  {formatCurrency(metrics.todayProfit)}
                </Text>
              </View>
            </LinearGradient>
          </View>

          <View style={styles.monthSection}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: theme.text.primary }]}>This Month</Text>
              <Activity size={16} color={theme.text.tertiary} />
            </View>
            
            <View style={[styles.summaryCard, { backgroundColor: theme.background.card }]}>
              <View style={styles.summaryRow}>
                <Text style={[styles.summaryLabel, { color: theme.text.secondary }]}>Sales</Text>
                <Text style={[styles.summaryValue, { color: theme.text.primary }]}>{formatCurrency(metrics.monthSales)}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={[styles.summaryLabel, { color: theme.text.secondary }]}>Expenses</Text>
                <Text style={[styles.summaryValue, { color: theme.text.primary }]}>{formatCurrency(metrics.monthExpenses)}</Text>
              </View>
              <View style={[styles.summaryDivider, { backgroundColor: theme.border.light }]} />
              <View style={styles.summaryRow}>
                <Text style={[styles.summaryLabelBold, { color: theme.text.primary }]}>Net Profit</Text>
                <Text style={[
                  styles.summaryValueBold,
                  { color: metrics.monthProfit >= 0 ? theme.accent.success : theme.accent.danger }
                ]}>
                  {formatCurrency(metrics.monthProfit)}
                </Text>
              </View>
            </View>

            <View style={[styles.cashCard, { backgroundColor: theme.background.card }]}>
              <LinearGradient
                colors={theme.gradient.primary as [string, string]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.cashGradient}
              >
                <View style={[styles.cashIconBg, { backgroundColor: theme.background.card }]}>
                  <DollarSign size={20} color={theme.accent.primary} strokeWidth={2.5} />
                </View>
              </LinearGradient>
              <View style={styles.cashContent}>
                <Text style={[styles.cashLabel, { color: theme.text.secondary }]}>Cash Position</Text>
                <Text style={[styles.cashValue, { color: theme.accent.primary }]}>{formatCurrency(metrics.cashPosition)}</Text>
              </View>
            </View>
          </View>

          {metrics.alerts.length > 0 && (
            <View style={styles.alertsSection}>
              <Text style={[styles.sectionTitle, { color: theme.text.primary }]}>Alerts</Text>
              {metrics.alerts.map(renderAlert)}
            </View>
          )}

          {metrics.topCategories.length > 0 && (
            <View style={styles.categoriesSection}>
              <Text style={[styles.sectionTitle, { color: theme.text.primary }]}>Top Categories</Text>
              {metrics.topCategories.map((cat, index) => (
                <View key={index} style={[styles.categoryItem, { backgroundColor: theme.background.card }]}>
                  <View style={[styles.categoryRank, { backgroundColor: theme.accent.primary }]}>
                    <Text style={styles.categoryRankText}>{index + 1}</Text>
                  </View>
                  <Text style={[styles.categoryName, { color: theme.text.primary }]}>{cat.category}</Text>
                  <Text style={[styles.categoryAmount, { color: theme.accent.primary }]}>{formatCurrency(cat.amount)}</Text>
                </View>
              ))}
            </View>
          )}

          <View style={styles.actionsSection}>
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={() => router.push('/(tabs)/finances' as any)}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={theme.gradient.primary as [string, string]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.actionButtonGradient}
              >
                <Plus size={20} color="#FFF" strokeWidth={2.5} />
                <Text style={styles.actionButtonText}>Add Transaction</Text>
              </LinearGradient>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.actionButtonSecondary, { 
                backgroundColor: theme.background.card, 
                borderColor: theme.border.medium 
              }]}
              onPress={() => router.push('/(tabs)/documents' as any)}
              activeOpacity={0.8}
            >
              <Text style={[styles.actionButtonSecondaryText, { color: theme.accent.primary }]}>Create Document</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerGradient: {
    paddingTop: Platform.OS === 'ios' ? 60 : 50,
    paddingBottom: 30,
    paddingHorizontal: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  greeting: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
    fontWeight: '500' as const,
  },
  businessName: {
    fontSize: 28,
    fontWeight: '700' as const,
    color: '#FFF',
    marginTop: 4,
  },
  quickAddButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  scrollContainer: {
    flex: 1,
  },
  content: {
    padding: 20,
    paddingTop: 0,
    paddingBottom: 40,
  },
  todaySection: {
    marginTop: -20,
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700' as const,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600' as const,
  },
  metricsGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  metricCard: {
    flex: 1,
    padding: 18,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  metricIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  metricLabel: {
    fontSize: 13,
    fontWeight: '500' as const,
    marginBottom: 6,
  },
  metricValue: {
    fontSize: 22,
    fontWeight: '700' as const,
  },
  profitCard: {
    borderRadius: 24,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 6,
  },
  profitContent: {
    position: 'relative',
  },
  profitHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  profitLabel: {
    fontSize: 15,
    color: 'rgba(255, 255, 255, 0.9)',
    fontWeight: '600' as const,
  },
  profitIconBg: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  profitValue: {
    fontSize: 36,
    fontWeight: '800' as const,
    color: '#FFF',
  },
  monthSection: {
    marginBottom: 24,
  },
  summaryCard: {
    padding: 20,
    borderRadius: 20,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  summaryLabel: {
    fontSize: 15,
    fontWeight: '500' as const,
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: '600' as const,
  },
  summaryDivider: {
    height: 1,
    marginVertical: 8,
  },
  summaryLabelBold: {
    fontSize: 16,
    fontWeight: '700' as const,
  },
  summaryValueBold: {
    fontSize: 20,
    fontWeight: '800' as const,
  },
  cashCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    borderRadius: 20,
    gap: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  cashGradient: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cashIconBg: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cashContent: {
    flex: 1,
  },
  cashLabel: {
    fontSize: 14,
    marginBottom: 4,
    fontWeight: '500' as const,
  },
  cashValue: {
    fontSize: 24,
    fontWeight: '800' as const,
  },
  alertsSection: {
    marginBottom: 24,
  },
  alert: {
    flexDirection: 'row',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1.5,
    marginBottom: 10,
    gap: 12,
  },
  alertContent: {
    flex: 1,
  },
  alertText: {
    fontSize: 14,
    fontWeight: '600' as const,
    marginBottom: 4,
  },
  alertAction: {
    fontSize: 13,
    fontWeight: '500' as const,
  },
  categoriesSection: {
    marginBottom: 24,
  },
  categoryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
    gap: 12,
  },
  categoryRank: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryRankText: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: '#FFF',
  },
  categoryName: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600' as const,
  },
  categoryAmount: {
    fontSize: 16,
    fontWeight: '700' as const,
  },
  actionsSection: {
    gap: 12,
    marginBottom: 20,
  },
  actionButton: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  actionButtonGradient: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  actionButtonText: {
    fontSize: 17,
    fontWeight: '700' as const,
    color: '#FFF',
  },
  actionButtonSecondary: {
    height: 56,
    borderRadius: 16,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionButtonSecondaryText: {
    fontSize: 17,
    fontWeight: '700' as const,
  },
});
