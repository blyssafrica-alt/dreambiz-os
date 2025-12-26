import type { DreamBigBook } from '@/types/business';

export interface BookInfo {
  id: DreamBigBook;
  title: string;
  subtitle: string;
  description: string;
  color: string;
  unlocks: string[];
}

export const DREAMBIG_BOOKS: BookInfo[] = [
  {
    id: 'start-your-business',
    title: 'Start Your Business',
    subtitle: 'From Idea to Launch',
    description: 'Perfect for beginners ready to turn their business idea into reality',
    color: '#0066CC',
    unlocks: ['Business Plan Generator', 'Viability Calculator', 'Basic Financial Tracking']
  },
  {
    id: 'grow-your-business',
    title: 'Grow Your Business',
    subtitle: 'Scale with Confidence',
    description: 'For businesses ready to expand and increase sales',
    color: '#10B981',
    unlocks: ['Growth Analytics', 'Customer Management', 'Sales Tracking', 'Marketing Tools']
  },
  {
    id: 'manage-your-money',
    title: 'Manage Your Money',
    subtitle: 'Financial Control',
    description: 'Master cashflow, budgets, and financial planning',
    color: '#F59E0B',
    unlocks: ['Advanced Budgets', 'Cashflow Projections', 'Profit & Loss Reports', 'Tax Management']
  },
  {
    id: 'hire-and-lead',
    title: 'Hire and Lead',
    subtitle: 'Build Your Team',
    description: 'Learn to hire, manage, and lead employees effectively',
    color: '#8B5CF6',
    unlocks: ['Employee Management', 'Payroll Tracking', 'Performance Tools', 'Team Projects']
  },
  {
    id: 'marketing-mastery',
    title: 'Marketing Mastery',
    subtitle: 'Win More Customers',
    description: 'Attract customers and grow your market presence',
    color: '#EC4899',
    unlocks: ['Customer Insights', 'Marketing Campaigns', 'Sales Funnels', 'Customer Analytics']
  },
  {
    id: 'scale-up',
    title: 'Scale Up',
    subtitle: 'Multiply Your Success',
    description: 'For established businesses ready to scale operations',
    color: '#6366F1',
    unlocks: ['Advanced Reports', 'Multi-location', 'Supplier Management', 'Inventory Systems']
  },
  {
    id: 'none',
    title: 'No Book Yet',
    subtitle: 'Explore First',
    description: 'Get started with basic features (limited access)',
    color: '#64748B',
    unlocks: ['Basic Dashboard', 'Simple Tracking']
  }
];

export const getBookInfo = (bookId: DreamBigBook): BookInfo => {
  return DREAMBIG_BOOKS.find(b => b.id === bookId) || DREAMBIG_BOOKS[DREAMBIG_BOOKS.length - 1];
};

export const hasBookAccess = (userBook: DreamBigBook | undefined, requiredBook: DreamBigBook): boolean => {
  if (!userBook || userBook === 'none') return false;
  return true; // All book owners get access to all features for now
};
