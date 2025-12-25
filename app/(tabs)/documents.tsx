import { Stack, router } from 'expo-router';
import { FileText, Plus, Receipt, FileCheck } from 'lucide-react-native';
import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert as RNAlert,
  Modal,
} from 'react-native';
import { useBusiness } from '@/contexts/BusinessContext';
import type { DocumentType, DocumentItem } from '@/types/business';

export default function DocumentsScreen() {
  const { business, documents, addDocument } = useBusiness();
  const [showModal, setShowModal] = useState(false);
  const [docType, setDocType] = useState<DocumentType>('invoice');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [items, setItems] = useState<{ description: string; quantity: string; price: string }[]>([
    { description: '', quantity: '1', price: '' }
  ]);

  const addItem = () => {
    setItems([...items, { description: '', quantity: '1', price: '' }]);
  };

  const updateItem = (index: number, field: string, value: string) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    setItems(newItems);
  };

  const handleCreate = async () => {
    if (!customerName) {
      RNAlert.alert('Missing Info', 'Please enter customer name');
      return;
    }

    const validItems = items.filter(item => item.description && item.price);
    if (validItems.length === 0) {
      RNAlert.alert('Missing Items', 'Please add at least one item');
      return;
    }

    const documentItems: DocumentItem[] = validItems.map((item, index) => {
      const qty = parseFloat(item.quantity) || 1;
      const price = parseFloat(item.price) || 0;
      return {
        id: `${Date.now()}-${index}`,
        description: item.description,
        quantity: qty,
        unitPrice: price,
        total: qty * price,
      };
    });

    const subtotal = documentItems.reduce((sum, item) => sum + item.total, 0);

    await addDocument({
      type: docType,
      customerName,
      customerPhone: customerPhone || undefined,
      items: documentItems,
      subtotal,
      total: subtotal,
      currency: business?.currency || 'USD',
      date: new Date().toISOString().split('T')[0],
    });

    setCustomerName('');
    setCustomerPhone('');
    setItems([{ description: '', quantity: '1', price: '' }]);
    setShowModal(false);
    RNAlert.alert('Success', `${docType.charAt(0).toUpperCase() + docType.slice(1)} created`);
  };

  const formatCurrency = (amount: number) => {
    const symbol = business?.currency === 'USD' ? '$' : 'ZWL';
    return `${symbol}${amount.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-ZW', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const getIcon = (type: DocumentType) => {
    switch (type) {
      case 'invoice':
        return <FileText size={20} color="#0066CC" />;
      case 'receipt':
        return <Receipt size={20} color="#10B981" />;
      case 'quotation':
        return <FileCheck size={20} color="#F59E0B" />;
    }
  };

  return (
    <>
      <Stack.Screen options={{ title: 'Documents' }} />
      <View style={styles.container}>
        <ScrollView contentContainerStyle={styles.content}>
          {documents.length === 0 ? (
            <View style={styles.emptyState}>
              <FileText size={48} color="#CBD5E1" />
              <Text style={styles.emptyTitle}>No documents yet</Text>
              <Text style={styles.emptyDesc}>Create professional invoices and receipts</Text>
            </View>
          ) : (
            documents.map((doc) => (
              <TouchableOpacity 
                key={doc.id} 
                style={styles.docCard}
                onPress={() => router.push(`/document/${doc.id}` as any)}
              >
                <View style={styles.docHeader}>
                  <View style={styles.docLeft}>
                    <View style={styles.docIcon}>{getIcon(doc.type)}</View>
                    <View>
                      <Text style={styles.docNumber}>{doc.documentNumber}</Text>
                      <Text style={styles.docCustomer}>{doc.customerName}</Text>
                    </View>
                  </View>
                  <View style={styles.docRight}>
                    <Text style={styles.docAmount}>{formatCurrency(doc.total)}</Text>
                    <Text style={styles.docDate}>{formatDate(doc.date)}</Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))
          )}
        </ScrollView>

        <TouchableOpacity style={styles.fab} onPress={() => setShowModal(true)}>
          <Plus size={24} color="#FFF" />
        </TouchableOpacity>

        <Modal visible={showModal} animationType="slide" transparent>
          <View style={styles.modalOverlay}>
            <ScrollView contentContainerStyle={styles.modalScrollContent}>
              <View style={styles.modalContent}>
                <Text style={styles.modalTitle}>Create Document</Text>

                <View style={styles.typeSelector}>
                  <TouchableOpacity
                    style={[styles.typeChip, docType === 'invoice' && styles.typeChipActive]}
                    onPress={() => setDocType('invoice')}
                  >
                    <Text style={[styles.typeChipText, docType === 'invoice' && styles.typeChipTextActive]}>
                      Invoice
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.typeChip, docType === 'receipt' && styles.typeChipActive]}
                    onPress={() => setDocType('receipt')}
                  >
                    <Text style={[styles.typeChipText, docType === 'receipt' && styles.typeChipTextActive]}>
                      Receipt
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.typeChip, docType === 'quotation' && styles.typeChipActive]}
                    onPress={() => setDocType('quotation')}
                  >
                    <Text style={[styles.typeChipText, docType === 'quotation' && styles.typeChipTextActive]}>
                      Quotation
                    </Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Customer Name *</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Enter customer name"
                    value={customerName}
                    onChangeText={setCustomerName}
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Customer Phone</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="+263..."
                    keyboardType="phone-pad"
                    value={customerPhone}
                    onChangeText={setCustomerPhone}
                  />
                </View>

                <Text style={styles.itemsTitle}>Items</Text>
                {items.map((item, index) => (
                  <View key={index} style={styles.itemCard}>
                    <TextInput
                      style={styles.itemInput}
                      placeholder="Item description"
                      value={item.description}
                      onChangeText={(text) => updateItem(index, 'description', text)}
                    />
                    <View style={styles.itemRow}>
                      <TextInput
                        style={styles.itemInputSmall}
                        placeholder="Qty"
                        keyboardType="decimal-pad"
                        value={item.quantity}
                        onChangeText={(text) => updateItem(index, 'quantity', text)}
                      />
                      <TextInput
                        style={styles.itemInputPrice}
                        placeholder="Price"
                        keyboardType="decimal-pad"
                        value={item.price}
                        onChangeText={(text) => updateItem(index, 'price', text)}
                      />
                    </View>
                  </View>
                ))}

                <TouchableOpacity style={styles.addItemButton} onPress={addItem}>
                  <Plus size={16} color="#0066CC" />
                  <Text style={styles.addItemText}>Add Item</Text>
                </TouchableOpacity>

                <View style={styles.modalButtons}>
                  <TouchableOpacity
                    style={styles.cancelButton}
                    onPress={() => setShowModal(false)}
                  >
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.createButton} onPress={handleCreate}>
                    <Text style={styles.createButtonText}>Create</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </ScrollView>
          </View>
        </Modal>
      </View>
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
    paddingBottom: 100,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: '#0F172A',
    marginTop: 16,
  },
  emptyDesc: {
    fontSize: 15,
    color: '#64748B',
    marginTop: 8,
  },
  docCard: {
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#FFF',
    marginBottom: 12,
  },
  docHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  docLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  docIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  docNumber: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: '#0F172A',
    marginBottom: 2,
  },
  docCustomer: {
    fontSize: 13,
    color: '#64748B',
  },
  docRight: {
    alignItems: 'flex-end',
  },
  docAmount: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: '#0066CC',
    marginBottom: 2,
  },
  docDate: {
    fontSize: 13,
    color: '#64748B',
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#0066CC',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalScrollContent: {
    flexGrow: 1,
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
    minHeight: '80%',
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '700' as const,
    color: '#0F172A',
    marginBottom: 24,
  },
  typeSelector: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 24,
  },
  typeChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  typeChipActive: {
    backgroundColor: '#0066CC',
    borderColor: '#0066CC',
  },
  typeChipText: {
    fontSize: 14,
    color: '#64748B',
    fontWeight: '600' as const,
  },
  typeChipTextActive: {
    color: '#FFF',
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#334155',
    marginBottom: 8,
  },
  input: {
    height: 48,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    backgroundColor: '#FFF',
    color: '#0F172A',
  },
  itemsTitle: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: '#0F172A',
    marginBottom: 12,
  },
  itemCard: {
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
    marginBottom: 12,
  },
  itemInput: {
    height: 44,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    paddingHorizontal: 12,
    fontSize: 15,
    backgroundColor: '#FFF',
    color: '#0F172A',
    marginBottom: 8,
  },
  itemRow: {
    flexDirection: 'row',
    gap: 8,
  },
  itemInputSmall: {
    flex: 1,
    height: 44,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    paddingHorizontal: 12,
    fontSize: 15,
    backgroundColor: '#FFF',
    color: '#0F172A',
  },
  itemInputPrice: {
    flex: 2,
    height: 44,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    paddingHorizontal: 12,
    fontSize: 15,
    backgroundColor: '#FFF',
    color: '#0F172A',
  },
  addItemButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#0066CC',
    borderStyle: 'dashed',
    marginBottom: 24,
  },
  addItemText: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: '#0066CC',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    height: 52,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#64748B',
  },
  createButton: {
    flex: 1,
    height: 52,
    borderRadius: 12,
    backgroundColor: '#0066CC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  createButtonText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#FFF',
  },
});
