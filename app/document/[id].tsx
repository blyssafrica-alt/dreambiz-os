import { Stack, useLocalSearchParams } from 'expo-router';
import { Share as ShareIcon, Download, Mail, FileDown, Plus, DollarSign, Trash2, X } from 'lucide-react-native';
import { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity,
  Alert as RNAlert,
  Platform,
  Share,
  Linking,
  Modal,
  TextInput,
} from 'react-native';
import { useBusiness } from '@/contexts/BusinessContext';
import { useTheme } from '@/contexts/ThemeContext';
import type { Document } from '@/types/business';
import { getDocumentTemplate, generateDocumentContent } from '@/lib/document-templates';
import { exportToPDF } from '@/lib/pdf-export';
import type { Payment } from '@/types/payments';

export default function DocumentDetailScreen() {
  const { id } = useLocalSearchParams();
  const { documents, business, getDocumentPayments, getDocumentPaidAmount, addPayment, deletePayment } = useBusiness();
  const { theme } = useTheme();
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'bank_transfer' | 'mobile_money' | 'card' | 'other'>('cash');
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [paymentReference, setPaymentReference] = useState('');
  
  const document = documents.find(d => d.id === id) as Document | undefined;
  
  const template = business && document 
    ? getDocumentTemplate(document.type, business.type)
    : null;

  const documentPayments = document ? getDocumentPayments(document.id) : [];
  const paidAmount = document ? getDocumentPaidAmount(document.id) : 0;
  const outstandingAmount = document ? document.total - paidAmount : 0;
  const isFullyPaid = document && paidAmount >= document.total;

  if (!document) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Document not found</Text>
      </View>
    );
  }

  const formatCurrency = (amount: number) => {
    const symbol = document.currency === 'USD' ? '$' : 'ZWL';
    return `${symbol}${amount.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-ZW', { 
      month: 'long', 
      day: 'numeric', 
      year: 'numeric' 
    });
  };

  const handleShare = async () => {
    if (!document || !business) return;
    
    const content = template
      ? generateDocumentContent(document, business, template)
      : generateDocumentContent(document, business, getDocumentTemplate(document.type, 'other'));

    try {
      if (Platform.OS === 'web') {
        const blob = new Blob([content], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = (global as any).document.createElement('a');
        a.href = url;
        a.download = `${document.documentNumber}-${document.customerName}.txt`;
        a.click();
        URL.revokeObjectURL(url);
      } else {
        await Share.share({
          message: content,
          title: `${document.type.charAt(0).toUpperCase() + document.type.slice(1)} ${document.documentNumber}`,
        });
      }
    } catch (error) {
      console.error('Share failed:', error);
      RNAlert.alert('Error', 'Failed to share document');
    }
  };

  const handleExportPDF = async () => {
    if (!document || !business) return;
    
    try {
      await exportToPDF(document, business);
      RNAlert.alert('Success', 'PDF exported successfully');
    } catch (error: any) {
      console.error('PDF export failed:', error);
      RNAlert.alert('Error', error.message || 'Failed to export PDF. Make sure expo-print is installed.');
    }
  };

  const handleEmail = () => {
    if (!document.customerEmail) {
      RNAlert.alert('No Email', 'Customer email not available');
      return;
    }

    const subject = encodeURIComponent(`${document.documentNumber} - ${business?.name}`);
    const body = encodeURIComponent(
      template && business
        ? generateDocumentContent(document, business, template)
        : 'Please find attached document.'
    );

    const mailtoUrl = `mailto:${document.customerEmail}?subject=${subject}&body=${body}`;
    Linking.openURL(mailtoUrl).catch(() => {
      RNAlert.alert('Error', 'Could not open email client');
    });
  };

  const handleAddPayment = async () => {
    if (!document) return;

    const amount = parseFloat(paymentAmount);
    if (isNaN(amount) || amount <= 0) {
      RNAlert.alert('Invalid Amount', 'Please enter a valid payment amount');
      return;
    }

    if (amount > outstandingAmount) {
      RNAlert.alert('Invalid Amount', `Payment cannot exceed outstanding amount of ${formatCurrency(outstandingAmount)}`);
      return;
    }

    try {
      await addPayment({
        documentId: document.id,
        amount,
        currency: document.currency,
        paymentDate,
        paymentMethod,
        reference: paymentReference || undefined,
      });

      setShowPaymentModal(false);
      setPaymentAmount('');
      setPaymentReference('');
      RNAlert.alert('Success', 'Payment recorded successfully');
    } catch (error: any) {
      RNAlert.alert('Error', error.message || 'Failed to record payment');
    }
  };

  const handleDeletePayment = (paymentId: string) => {
    RNAlert.alert(
      'Delete Payment',
      'Are you sure you want to delete this payment?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deletePayment(paymentId);
            } catch (error: any) {
              RNAlert.alert('Error', error.message || 'Failed to delete payment');
            }
          },
        },
      ]
    );
  };

  const docTypeLabel = document.type.charAt(0).toUpperCase() + document.type.slice(1);

  return (
    <>
      <Stack.Screen 
        options={{ 
          title: document.documentNumber,
          headerRight: () => (
            <View style={{ flexDirection: 'row', gap: 12, marginRight: 16 }}>
              <TouchableOpacity onPress={handleExportPDF}>
                <FileDown size={22} color={theme.accent.primary} />
              </TouchableOpacity>
              {document.customerEmail && (
                <TouchableOpacity onPress={handleEmail}>
                  <Mail size={22} color={theme.accent.primary} />
                </TouchableOpacity>
              )}
              <TouchableOpacity onPress={handleShare}>
                <ShareIcon size={22} color={theme.accent.primary} />
              </TouchableOpacity>
            </View>
          )
        }} 
      />
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <View style={[
          styles.header,
          template && { 
            backgroundColor: `${template.styling.primaryColor}15`,
            borderLeftWidth: 4,
            borderLeftColor: template.styling.primaryColor,
          }
        ]}>
          <View style={[
            styles.badge,
            template && { backgroundColor: template.styling.primaryColor + '20' }
          ]}>
            <Text style={[
              styles.badgeText,
              template && { color: template.styling.primaryColor }
            ]}>
              {template?.name || docTypeLabel}
            </Text>
          </View>
          <Text style={styles.docNumber}>{document.documentNumber}</Text>
          <Text style={styles.date}>{formatDate(document.date)}</Text>
          {template && (
            <Text style={styles.templateInfo}>
              {business?.type.charAt(0).toUpperCase() + business?.type.slice(1)} Business Template
            </Text>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>From</Text>
          <View style={styles.infoCard}>
            <Text style={styles.businessName}>{business?.name}</Text>
            {business?.phone && <Text style={styles.infoText}>{business.phone}</Text>}
            {business?.location && <Text style={styles.infoText}>{business.location}</Text>}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>To</Text>
          <View style={styles.infoCard}>
            <Text style={styles.customerName}>{document.customerName}</Text>
            {document.customerPhone && (
              <Text style={styles.infoText}>{document.customerPhone}</Text>
            )}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Items</Text>
          {document.items.map((item, index) => (
            <View key={item.id} style={styles.itemCard}>
              <View style={styles.itemHeader}>
                <Text style={styles.itemNumber}>{index + 1}</Text>
                <View style={styles.itemInfo}>
                  <Text style={styles.itemDescription}>{item.description}</Text>
                  <Text style={styles.itemMeta}>
                    {item.quantity} x {formatCurrency(item.unitPrice)}
                  </Text>
                </View>
                <Text style={styles.itemTotal}>{formatCurrency(item.total)}</Text>
              </View>
            </View>
          ))}
        </View>

        <View style={styles.totalsCard}>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Subtotal</Text>
            <Text style={styles.totalValue}>{formatCurrency(document.subtotal)}</Text>
          </View>
          {document.tax && (
            <>
              <View style={styles.totalDivider} />
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Tax</Text>
                <Text style={styles.totalValue}>{formatCurrency(document.tax)}</Text>
              </View>
            </>
          )}
          <View style={styles.totalDivider} />
          <View style={styles.totalRow}>
            <Text style={styles.totalLabelFinal}>Total</Text>
            <Text style={styles.totalValueFinal}>{formatCurrency(document.total)}</Text>
          </View>
        </View>

        {/* Template-specific fields */}
        {template && (() => {
          try {
            const templateData = document.notes ? JSON.parse(document.notes) : null;
            if (templateData && templateData.fields && Object.keys(templateData.fields).length > 0) {
              return (
                <View style={styles.templateFieldsCard}>
                  <Text style={styles.templateFieldsTitle}>Additional Information</Text>
                  {Object.entries(templateData.fields).map(([key, value]) => {
                    const field = template.fields.find(f => f.id === key);
                    if (!field || !value) return null;
                    return (
                      <View key={key} style={styles.templateFieldRow}>
                        <Text style={styles.templateFieldLabel}>{field.label}:</Text>
                        <Text style={styles.templateFieldValue}>{String(value)}</Text>
                      </View>
                    );
                  })}
                </View>
              );
            }
          } catch (e) {
            // If notes is not JSON, treat as regular notes
          }
          return null;
        })()}

        {document.notes && (() => {
          try {
            JSON.parse(document.notes);
            return null; // Already displayed as template fields
          } catch {
            return (
              <View style={styles.notesCard}>
                <Text style={styles.notesTitle}>Notes</Text>
                <Text style={styles.notesText}>{document.notes}</Text>
              </View>
            );
          }
        })()}

        <View style={styles.actionButtons}>
          <TouchableOpacity 
            style={[styles.actionButton, { backgroundColor: theme.accent.primary }]} 
            onPress={handleExportPDF}
          >
            <FileDown size={20} color="#FFF" />
            <Text style={styles.actionButtonText}>Export PDF</Text>
          </TouchableOpacity>
          {document.customerEmail && (
            <TouchableOpacity 
              style={[styles.actionButton, styles.emailButton, { backgroundColor: theme.accent.success }]} 
              onPress={handleEmail}
            >
              <Mail size={20} color="#FFF" />
              <Text style={styles.actionButtonText}>Email</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity 
            style={[styles.actionButton, styles.shareButton, { backgroundColor: theme.text.secondary }]} 
            onPress={handleShare}
          >
            <ShareIcon size={20} color="#FFF" />
            <Text style={styles.actionButtonText}>Share</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
    paddingBottom: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  badge: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#EFF6FF',
    marginBottom: 12,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: '#0066CC',
    textTransform: 'uppercase',
  },
  docNumber: {
    fontSize: 28,
    fontWeight: '700' as const,
    color: '#0F172A',
    marginBottom: 4,
  },
  date: {
    fontSize: 15,
    color: '#64748B',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700' as const,
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  infoCard: {
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  businessName: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: '#0F172A',
    marginBottom: 4,
  },
  customerName: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: '#0F172A',
    marginBottom: 4,
  },
  infoText: {
    fontSize: 14,
    color: '#64748B',
    marginTop: 2,
  },
  itemCard: {
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 8,
  },
  itemHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  itemNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#EFF6FF',
    color: '#0066CC',
    fontSize: 12,
    fontWeight: '700' as const,
    textAlign: 'center',
    lineHeight: 24,
  },
  itemInfo: {
    flex: 1,
  },
  itemDescription: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: '#0F172A',
    marginBottom: 4,
  },
  itemMeta: {
    fontSize: 13,
    color: '#64748B',
  },
  itemTotal: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: '#0066CC',
  },
  totalsCard: {
    padding: 20,
    borderRadius: 16,
    backgroundColor: '#0F172A',
    marginBottom: 16,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 8,
  },
  totalLabel: {
    fontSize: 15,
    color: '#94A3B8',
  },
  totalValue: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: '#FFF',
  },
  totalDivider: {
    height: 1,
    backgroundColor: '#334155',
    marginVertical: 4,
  },
  totalLabelFinal: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: '#FFF',
  },
  totalValueFinal: {
    fontSize: 24,
    fontWeight: '700' as const,
    color: '#10B981',
  },
  notesCard: {
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FEF3C7',
    marginBottom: 16,
  },
  notesTitle: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: '#92400E',
    marginBottom: 8,
  },
  notesText: {
    fontSize: 14,
    color: '#78350F',
    lineHeight: 20,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 52,
    borderRadius: 12,
  },
  emailButton: {
    backgroundColor: '#10B981',
  },
  shareButton: {
    backgroundColor: '#0066CC',
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#FFF',
  },
  templateInfo: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 4,
    fontStyle: 'italic',
  },
  errorText: {
    fontSize: 16,
    color: '#EF4444',
    textAlign: 'center',
    marginTop: 40,
  },
  templateFieldsCard: {
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#F0F9FF',
    borderWidth: 1,
    borderColor: '#BAE6FD',
    marginBottom: 16,
  },
  templateFieldsTitle: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: '#0369A1',
    marginBottom: 12,
  },
  templateFieldRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#DBEAFE',
  },
  templateFieldLabel: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: '#0369A1',
    flex: 1,
  },
  templateFieldValue: {
    fontSize: 13,
    color: '#0C4A6E',
    flex: 1,
    textAlign: 'right',
  },
});
