import React, { useState, useEffect, useMemo } from 'react';
import { mtnMoMoService } from './services/mtnService';
import { 
  signInWithPopup, 
  signInWithRedirect,
  GoogleAuthProvider, 
  sendPasswordResetEmail,
  sendEmailVerification,
  signOut,
  getAdditionalUserInfo
} from 'firebase/auth';
import { 
  LayoutDashboard, 
  Package, 
  Receipt, 
  BarChart3, 
  Settings, 
  LogOut, 
  Plus, 
  Search, 
  TrendingUp, 
  TrendingDown, 
  Box, 
  DollarSign,
  Wallet,
  ChevronRight,
  Building2,
  Menu,
  X,
  Lock,
  CreditCard,
  Check,
  ArrowUpRight,
  ArrowDownRight,
  Trash2,
  Edit2,
  Sparkles,
  Loader2,
  ShoppingCart,
  Store,
  Users,
  ShieldCheck,
  FileText,
  Download,
  Filter,
  RotateCcw,
  RefreshCw,
  FileUp,
  FileDown,
  AlertTriangle,
  AlertCircle,
  MousePointer2,
  Image as ImageIcon,
  Camera,
  History,
  HelpCircle,
  Printer,
  MapPin,
  Hash,
  Bell,
  Clock,
  Sun,
  Moon,
  Github,
  Code2,
  ArrowLeft,
  User,
  Share2,
  Copy,
  Phone,
  ExternalLink
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell,
  LineChart,
  Line,
  AreaChart,
  Area
} from 'recharts';
import { auth, db, storage } from './firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { FirebaseProvider, useFirebase, Organization, UserProfile } from './components/FirebaseProvider';
import ErrorBoundary from './components/ErrorBoundary';
import { cn, formatCurrency, formatDate, getCurrencySymbol } from './lib/utils';
import { 
  createDocument, 
  subscribeToCollection, 
  removeDocument, 
  updateDocument,
  setDocument
} from './lib/firestore';
import { where, doc, getDoc, getDocs, collection, query, onSnapshot } from 'firebase/firestore';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { compressImage } from './lib/imageUtils';
import { deleteFile } from './lib/storageUtils';

// --- Types ---
interface InventoryItem {
  id: string;
  name: string;
  sku: string;
  quantity: number;
  price: number;
  cost: number;
  category: string;
  imageUrl?: string;
  createdAt: string;
  updatedAt: string;
}

interface DamageRecord {
  id: string;
  itemId: string;
  itemName: string;
  quantity: number;
  cost: number;
  reason: string;
  imageUrl?: string;
  date: string;
  reportedBy: string;
  createdAt: string;
  updatedAt: string;
}

interface TransactionItem {
  id: string;
  name: string;
  quantity: number;
  price: number;
  cost: number;
}

interface Transaction {
  id: string;
  type: 'income' | 'expense';
  amount: number;
  category: string;
  description: string;
  date: string;
  receiptId?: string;
  items?: TransactionItem[];
  paymentMethod?: string;
  phoneNumber?: string;
  createdAt: string;
  updatedAt: string;
}

interface StaffMember {
  id: string;
  uid?: string;
  email: string;
  displayName?: string;
  role: 'admin' | 'manager' | 'cashier';
  addedAt: string;
}

interface ReceiptData {
  id: string;
  transactionId: string;
  items: {
    name: string;
    quantity: number;
    price: number;
    total: number;
  }[];
  subtotal: number;
  tax: number;
  total: number;
  amountPaid?: number;
  balance?: number;
  paymentMethod: string;
  date: string;
  cashierName: string;
  createdAt: string;
  updatedAt: string;
}

// --- Components ---

const Notification = ({ message, type, onClose }: { message: string, type: 'success' | 'error', onClose: () => void }) => (
  <motion.div 
    initial={{ opacity: 0, y: 50 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: 50 }}
    className={cn(
      "fixed bottom-8 right-8 z-50 px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3 border",
      type === 'success' ? "bg-emerald-600 border-emerald-500 text-white" : "bg-rose-600 border-rose-500 text-white"
    )}
  >
    {type === 'success' ? <Sparkles className="w-5 h-5" /> : <X className="w-5 h-5" />}
    <p className="font-bold">{message}</p>
    <button onClick={onClose} className="ml-4 opacity-50 hover:opacity-100 transition-opacity">
      <X className="w-4 h-4" />
    </button>
  </motion.div>
);

const SidebarItem = ({ icon: Icon, label, active, onClick, theme }: any) => (
  <button
    onClick={onClick}
    className={cn(
      "flex items-center gap-3 w-full px-4 py-3 rounded-xl transition-all duration-200",
      active 
        ? "bg-indigo-600 text-white shadow-lg shadow-indigo-900/20" 
        : theme === 'dark'
          ? "text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
          : "text-slate-400 hover:bg-slate-800 hover:text-white"
    )}
  >
    <Icon className="w-5 h-5" />
    <span className="font-medium">{label}</span>
  </button>
);

const StatCard = ({ title, value, icon: Icon, trend, color, onClick }: any) => (
  <button 
    onClick={onClick}
    className={cn(
      "bg-zinc-900 border border-zinc-800 p-6 rounded-2xl text-left transition-all group",
      onClick && "hover:border-indigo-500/50 hover:shadow-lg hover:shadow-indigo-500/5 cursor-pointer"
    )}
  >
    <div className="flex justify-between items-start mb-4">
      <div className={cn("p-3 rounded-xl", color)}>
        <Icon className="w-6 h-6 text-white" />
      </div>
      {trend && (
        <div className={cn(
          "flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full",
          trend > 0 ? "bg-emerald-500/10 text-emerald-500" : "bg-rose-500/10 text-rose-500"
        )}>
          {trend > 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
          {Math.abs(trend)}%
        </div>
      )}
    </div>
    <div>
      <p className="text-zinc-400 text-sm font-medium uppercase tracking-wider">{title}</p>
      <h3 className="text-2xl font-black text-zinc-100 mt-1">{value}</h3>
    </div>
  </button>
);

const getBase64FromUrl = async (url: string): Promise<string> => {
  const data = await fetch(url);
  const blob = await data.blob();
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.readAsDataURL(blob);
    reader.onloadend = () => {
      const base64data = reader.result;
      resolve(base64data as string);
    };
  });
};

const ReceiptModal = ({ receipt, onClose }: { receipt: ReceiptData, onClose: () => void }) => {
  const { currentOrg } = useFirebase();
  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPDF = async () => {
    const doc = new jsPDF({
      unit: 'mm',
      format: [80, 200] // Typical receipt width 80mm
    });

    const margin = 5;
    let y = 10;

    // Logo
    if (currentOrg?.logoUrl) {
      try {
        const logoBase64 = await getBase64FromUrl(currentOrg.logoUrl);
        doc.addImage(logoBase64, 'PNG', 30, y, 20, 20);
        y += 25;
      } catch (e) {
        console.error('Failed to add logo to PDF:', e);
      }
    }

    // Header
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(currentOrg?.name || 'JENA POS', 40, y, { align: 'center' });
    y += 6;

    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    if (currentOrg?.address) {
      doc.text(currentOrg.address, 40, y, { align: 'center' });
      y += 4;
    }
    if (currentOrg?.uprsRegistrationNumber) {
      doc.text(`UPRS REG: ${currentOrg.uprsRegistrationNumber}`, 40, y, { align: 'center' });
      y += 4;
    }

    doc.text('Official Sale Receipt', 40, y, { align: 'center' });
    y += 6;

    doc.setFontSize(7);
    doc.setTextColor(100);
    doc.text(`ID: ${receipt.id}`, 40, y, { align: 'center' });
    y += 4;
    doc.text(`Date: ${formatDate(receipt.date)}`, 40, y, { align: 'center' });
    y += 6;

    // Items
    doc.setDrawColor(200);
    doc.line(margin, y, 80 - margin, y);
    y += 5;

    doc.setFontSize(8);
    doc.setTextColor(0);
    receipt.items.forEach(item => {
      doc.setFont('helvetica', 'bold');
      doc.text(item.name, margin, y);
      doc.setFont('helvetica', 'normal');
      doc.text(formatCurrency(item.total, currentOrg?.currency), 80 - margin, y, { align: 'right' });
      y += 4;
      doc.setFontSize(7);
      doc.setTextColor(100);
      doc.text(`${item.quantity} x ${formatCurrency(item.price, currentOrg?.currency)}`, margin, y);
      y += 5;
      doc.setFontSize(8);
      doc.setTextColor(0);
    });

    doc.line(margin, y, 80 - margin, y);
    y += 6;

    // Totals
    const drawTotalLine = (label: string, value: string, isBold = false) => {
      if (isBold) doc.setFont('helvetica', 'bold');
      else doc.setFont('helvetica', 'normal');
      doc.text(label, margin, y);
      doc.text(value, 80 - margin, y, { align: 'right' });
      y += 5;
    };

    drawTotalLine('Subtotal', formatCurrency(receipt.subtotal, currentOrg?.currency));
    drawTotalLine('Tax (0%)', formatCurrency(receipt.tax, currentOrg?.currency));
    y += 2;
    doc.setFontSize(10);
    drawTotalLine('TOTAL', formatCurrency(receipt.total, currentOrg?.currency), true);
    doc.setFontSize(8);

    if (receipt.amountPaid !== undefined) {
      y += 2;
      drawTotalLine('Amount Paid', formatCurrency(receipt.amountPaid, currentOrg?.currency));
    }
    if (receipt.balance !== undefined) {
      drawTotalLine('Balance (Change)', formatCurrency(receipt.balance, currentOrg?.currency), true);
    }

    y += 10;
    doc.setFontSize(8);
    doc.setFont('helvetica', 'italic');
    doc.text('Thank you for your business!', 40, y, { align: 'center' });

    doc.save(`receipt-${receipt.id}.pdf`);
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 print:p-0 print:bg-white">
      <motion.div 
        id="printable-area"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white text-zinc-950 p-8 rounded-3xl max-w-md w-full space-y-6 shadow-2xl print:p-8 print:shadow-none print:rounded-none"
      >
        <div className="text-center space-y-2">
          {currentOrg?.logoUrl && (
            <div className="flex justify-center mb-4">
              <img src={currentOrg.logoUrl} alt="Logo" className="h-16 w-auto object-contain" referrerPolicy="no-referrer" />
            </div>
          )}
          <h2 className="text-2xl font-black tracking-tighter">{currentOrg?.name || 'JENA POS'}</h2>
          {currentOrg?.address && (
            <p className="text-xs text-zinc-500">{currentOrg.address}</p>
          )}
          {currentOrg?.uprsRegistrationNumber && (
            <p className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest">
              UPRS REG: {currentOrg.uprsRegistrationNumber}
            </p>
          )}
          <p className="text-sm text-zinc-500">Official Sale Receipt</p>
          <div className="text-[10px] text-zinc-400 font-mono uppercase">
            ID: {receipt.id}<br/>
            Date: {formatDate(receipt.date)}
          </div>
        </div>

        <div className="border-y border-dashed border-zinc-200 py-4 space-y-3">
          {receipt.items.map((item, i) => (
            <div key={i} className="flex justify-between text-sm">
              <div className="flex-1">
                <p className="font-bold">{item.name}</p>
                <p className="text-xs text-zinc-500">{item.quantity} x {formatCurrency(item.price, currentOrg?.currency)}</p>
              </div>
              <p className="font-bold">{formatCurrency(item.total, currentOrg?.currency)}</p>
            </div>
          ))}
        </div>

        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-zinc-500">Subtotal</span>
            <span>{formatCurrency(receipt.subtotal, currentOrg?.currency)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-zinc-500">Tax (0%)</span>
            <span>{formatCurrency(receipt.tax, currentOrg?.currency)}</span>
          </div>
          <div className="flex justify-between text-xl font-black pt-2 border-t border-zinc-100">
            <span>Total</span>
            <span>{formatCurrency(receipt.total, currentOrg?.currency)}</span>
          </div>
          {receipt.amountPaid !== undefined && (
            <div className="flex justify-between text-sm text-zinc-500 pt-1">
              <span>Amount Paid</span>
              <span>{formatCurrency(receipt.amountPaid, currentOrg?.currency)}</span>
            </div>
          )}
          {receipt.balance !== undefined && (
            <div className="flex justify-between text-sm font-bold text-indigo-600 pt-1">
              <span>Balance (Change)</span>
              <span>{formatCurrency(receipt.balance, currentOrg?.currency)}</span>
            </div>
          )}
        </div>

        <div className="text-center space-y-4 print:hidden">
          <div className="grid grid-cols-2 gap-3">
            <button 
              onClick={handlePrint}
              className="bg-zinc-900 text-white font-bold py-3 rounded-xl hover:bg-zinc-800 transition-colors flex items-center justify-center gap-2"
            >
              <Printer className="w-4 h-4" /> Print
            </button>
            <button 
              onClick={handleDownloadPDF}
              className="bg-indigo-600 text-white font-bold py-3 rounded-xl hover:bg-indigo-500 transition-colors flex items-center justify-center gap-2"
            >
              <Download className="w-4 h-4" /> PDF
            </button>
            <button 
              onClick={onClose}
              className="col-span-2 bg-zinc-100 text-zinc-900 font-bold py-3 rounded-xl hover:bg-zinc-200 transition-colors"
            >
              Close
            </button>
          </div>
          <p className="text-[10px] text-zinc-400">Thank you for your business!</p>
        </div>
      </motion.div>
    </div>
  );
};

const InvoiceModal = ({ transaction, onClose }: { transaction: Transaction, onClose: () => void }) => {
  const { currentOrg } = useFirebase();
  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPDF = async () => {
    const doc = new jsPDF();
    const dateStr = new Date(transaction.date).toLocaleDateString();
    
    let y = 20;

    // Logo
    if (currentOrg?.logoUrl) {
      try {
        const logoBase64 = await getBase64FromUrl(currentOrg.logoUrl);
        doc.addImage(logoBase64, 'PNG', 160, 15, 30, 30);
      } catch (e) {
        console.error('Failed to add logo to PDF:', e);
      }
    }

    // Header
    doc.setFontSize(22);
    doc.setTextColor(15, 23, 42);
    doc.text('INVOICE', 20, y);
    y += 10;

    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`#${transaction.id.slice(0, 8).toUpperCase()}`, 20, y);
    y += 20;

    // Business Info
    doc.setFontSize(12);
    doc.setTextColor(15, 23, 42);
    doc.setFont('helvetica', 'bold');
    doc.text(currentOrg?.name || 'JENA POS', 20, y);
    y += 6;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    if (currentOrg?.address) {
      doc.text(currentOrg.address, 20, y);
      y += 5;
    }
    y += 10;

    // Details
    autoTable(doc, {
      startY: y,
      head: [['Description', 'Category', 'Date', 'Amount']],
      body: [[
        transaction.description,
        transaction.category,
        dateStr,
        formatCurrency(transaction.amount, currentOrg?.currency)
      ]],
      theme: 'grid',
      headStyles: { fillColor: [79, 70, 229] }
    });

    const finalY = (doc as any).lastAutoTable.finalY + 20;
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text(`Total Paid: ${formatCurrency(transaction.amount, currentOrg?.currency)}`, 190, finalY, { align: 'right' });

    doc.save(`invoice-${transaction.id.slice(0, 8)}.pdf`);
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 print:p-0 print:bg-white">
      <motion.div 
        id="printable-area"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white text-zinc-950 p-8 rounded-3xl max-w-md w-full space-y-6 shadow-2xl print:p-8 print:shadow-none print:rounded-none"
      >
        <div className="flex justify-between items-start">
          <div className="space-y-1">
            <h2 className="text-2xl font-black tracking-tighter uppercase">Invoice</h2>
            <p className="text-xs text-zinc-500">#{transaction.id.slice(0, 8).toUpperCase()}</p>
          </div>
          <div className="text-right flex flex-col items-end">
            {currentOrg?.logoUrl ? (
              <img src={currentOrg.logoUrl} alt="Logo" className="h-10 w-auto object-contain mb-2" referrerPolicy="no-referrer" />
            ) : (
              <h3 className="text-lg font-bold">{currentOrg?.name || 'JENA POS'}</h3>
            )}
            <p className="text-[10px] text-zinc-500 uppercase tracking-widest">{currentOrg?.name || 'Business Solutions'}</p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-wider">Date Issued</p>
              <p className="font-bold">{formatDate(transaction.date)}</p>
            </div>
            <div className="text-right">
              <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-wider">Status</p>
              <p className="font-bold text-emerald-600 uppercase">Paid</p>
            </div>
          </div>

          <div className="border-t border-zinc-100 pt-4">
            <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-wider mb-2">Description</p>
            <div className="bg-zinc-50 p-4 rounded-xl">
              <p className="text-sm font-medium">{transaction.description}</p>
              <p className="text-xs text-zinc-400 mt-1">Category: {transaction.category}</p>
            </div>
          </div>

          <div className="space-y-2 pt-4 border-t border-zinc-100">
            <div className="flex justify-between text-sm">
              <span className="text-zinc-500">Subtotal</span>
              <span>{formatCurrency(transaction.amount, currentOrg?.currency)}</span>
            </div>
            <div className="flex justify-between text-2xl font-black pt-2">
              <span>Total Paid</span>
              <span className="text-indigo-600">{formatCurrency(transaction.amount, currentOrg?.currency)}</span>
            </div>
          </div>
        </div>

        <div className="text-center space-y-4 print:hidden">
          <div className="flex gap-3">
            <button 
              onClick={handleDownloadPDF}
              className="flex-1 bg-zinc-900 text-white font-bold py-3 rounded-xl hover:bg-zinc-800 transition-colors flex items-center justify-center gap-2"
            >
              <Download className="w-4 h-4" /> Download
            </button>
            <button 
              onClick={onClose}
              className="flex-1 bg-zinc-100 text-zinc-900 font-bold py-3 rounded-xl hover:bg-zinc-200 transition-colors"
            >
              Close
            </button>
          </div>
          <p className="text-[10px] text-zinc-400">This is a computer generated document.</p>
        </div>
      </motion.div>
    </div>
  );
};

// --- Admin Panel Component ---

function Reports({ permissions }: { permissions: any }) {
  const { currentOrg } = useFirebase();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [damages, setDamages] = useState<DamageRecord[]>([]);
  const [activeTab, setActiveTab] = useState<'overview' | 'balance_sheet' | 'income_statement' | 'cash_flow' | 'equity_statement'>('overview');
  const [reportHistory, setReportHistory] = useState<string[]>(['overview']);

  useEffect(() => {
    setReportHistory(prev => {
      if (prev[prev.length - 1] === activeTab) return prev;
      return [...prev, activeTab];
    });
  }, [activeTab]);

  const goBackReport = () => {
    if (reportHistory.length <= 1) return;
    const newHistory = [...reportHistory];
    newHistory.pop();
    const prev = newHistory[newHistory.length - 1];
    setReportHistory(newHistory);
    setActiveTab(prev as any);
  };

  const [period, setPeriod] = useState<'7' | '30' | '90' | 'all'>('30');

  useEffect(() => {
    if (!currentOrg) return;
    const unsubTx = subscribeToCollection<Transaction>(
      `organizations/${currentOrg.id}/transactions`,
      [],
      setTransactions
    );
    const unsubInv = subscribeToCollection<InventoryItem>(
      `organizations/${currentOrg.id}/inventory`,
      [],
      setInventory
    );
    const unsubDmg = subscribeToCollection<DamageRecord>(
      `organizations/${currentOrg.id}/damages`,
      [],
      setDamages
    );
    return () => { unsubTx(); unsubInv(); unsubDmg(); };
  }, [currentOrg]);

  const financialData = useMemo(() => {
    const now = new Date();
    const filteredTransactions = transactions.filter(tx => {
      if (period === 'all') return true;
      const txDate = new Date(tx.date);
      const diffTime = Math.abs(now.getTime() - txDate.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays <= parseInt(period);
    });

    // --- Income Statement Calculations ---
    let revenue = 0;
    let cogs = 0;
    let operatingExpenses = 0;
    const incomeByCategory: Record<string, number> = {};
    const expenseByCategory: Record<string, number> = {};

    filteredTransactions.forEach(tx => {
      if (tx.type === 'income') {
        revenue += tx.amount;
        incomeByCategory[tx.category] = (incomeByCategory[tx.category] || 0) + tx.amount;
        if (tx.items) {
          tx.items.forEach(item => {
            cogs += (item.cost || 0) * item.quantity;
          });
        }
      } else {
        operatingExpenses += tx.amount;
        expenseByCategory[tx.category] = (expenseByCategory[tx.category] || 0) + tx.amount;
      }
    });

    const filteredDamages = damages.filter(d => {
      if (period === 'all') return true;
      const dDate = new Date(d.date);
      const diffTime = Math.abs(now.getTime() - dDate.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays <= parseInt(period);
    });

    const damageLosses = filteredDamages.reduce((acc, d) => {
      const cost = d.cost || inventory.find(i => i.id === d.itemId)?.cost || 0;
      return acc + (cost * d.quantity);
    }, 0);

    const totalOperatingExpenses = operatingExpenses + damageLosses;
    const grossProfit = revenue - cogs;
    const operatingIncome = grossProfit - totalOperatingExpenses;
    const netIncome = operatingIncome; // Assuming no tax/interest for now

    // --- Balance Sheet Calculations ---
    const inventoryValue = inventory.reduce((acc, item) => acc + (item.quantity * item.cost), 0);
    const cashBalance = transactions.reduce((acc, tx) => tx.type === 'income' ? acc + tx.amount : acc - tx.amount, 0);
    
    const assets = {
      current: {
        cash: cashBalance,
        inventory: inventoryValue,
        accountsReceivable: 0 // Placeholder
      },
      nonCurrent: {
        equipment: 0, // Placeholder
        property: 0 // Placeholder
      }
    };
    const totalAssets = assets.current.cash + assets.current.inventory + assets.current.accountsReceivable + assets.nonCurrent.equipment + assets.nonCurrent.property;

    const liabilities = {
      current: {
        accountsPayable: 0, // Placeholder
        shortTermLoans: 0 // Placeholder
      },
      nonCurrent: {
        longTermDebt: 0 // Placeholder
      }
    };
    const totalLiabilities = liabilities.current.accountsPayable + liabilities.current.shortTermLoans + liabilities.nonCurrent.longTermDebt;

    const equity = totalAssets - totalLiabilities;

    // --- Cash Flow Statement Calculations ---
    const cashFlow = {
      operating: {
        netIncome,
        adjustments: damageLosses, // Damages are non-cash expenses
        changesInWorkingCapital: -inventoryValue // Inventory increase is a cash outflow
      },
      investing: {
        assetPurchases: 0 // Placeholder
      },
      financing: {
        capitalInjection: 0, // Placeholder
        dividends: 0 // Placeholder
      }
    };
    const netCashFlow = (cashFlow.operating.netIncome + cashFlow.operating.adjustments + cashFlow.operating.changesInWorkingCapital) +
                        cashFlow.investing.assetPurchases +
                        (cashFlow.financing.capitalInjection - cashFlow.financing.dividends);

    // --- Charts Data ---
    const hourlyIncome: Record<number, number> = {};
    const periodProgress: Record<string, { income: number, expense: number }> = {};
    for (let i = 0; i < 24; i++) hourlyIncome[i] = 0;
    
    const periodDays = period === 'all' ? 365 : parseInt(period);
    const periodDates = Array.from({ length: periodDays }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (periodDays - 1 - i));
      return d.toISOString().split('T')[0];
    });
    
    periodDates.forEach(day => periodProgress[day] = { income: 0, expense: 0 });

    filteredTransactions.forEach(tx => {
      const txDate = new Date(tx.date);
      const dayKey = tx.date.split('T')[0];
      const hour = txDate.getHours();
      if (tx.type === 'income') {
        hourlyIncome[hour] += tx.amount;
        if (periodProgress[dayKey]) periodProgress[dayKey].income += tx.amount;
      } else {
        if (periodProgress[dayKey]) periodProgress[dayKey].expense += tx.amount;
      }
    });

    filteredDamages.forEach(d => {
      const dayKey = d.date.split('T')[0];
      const cost = d.cost || inventory.find(i => i.id === d.itemId)?.cost || 0;
      if (periodProgress[dayKey]) periodProgress[dayKey].expense += (cost * d.quantity);
    });

    const incomeData = Object.entries(incomeByCategory).map(([name, value]) => ({ name, value }));
    const expenseData = Object.entries(expenseByCategory).map(([name, value]) => ({ name, value }));
    const hourlyData = Object.entries(hourlyIncome).map(([hour, amount]) => ({
      hour: `${hour.padStart(2, '0')}:00`,
      amount
    }));
    
    const performanceData = periodDates.map(day => {
      const date = new Date(day);
      let label = '';
      if (period === '7') {
        label = date.toLocaleDateString('en-US', { weekday: 'short' });
      } else if (period === '30' || period === '90') {
        label = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      } else {
        label = date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
      }
      
      return {
        label,
        income: periodProgress[day].income,
        expense: periodProgress[day].expense,
        fullDate: day
      };
    });

    // If period is long, we might want to downsample or group by month for 'all'
    let finalPerformanceData = performanceData;
    if (period === 'all') {
      const monthlyData: Record<string, { income: number, expense: number }> = {};
      performanceData.forEach(d => {
        const monthKey = d.fullDate.substring(0, 7); // YYYY-MM
        if (!monthlyData[monthKey]) monthlyData[monthKey] = { income: 0, expense: 0 };
        monthlyData[monthKey].income += d.income;
        monthlyData[monthKey].expense += d.expense;
      });
      finalPerformanceData = Object.entries(monthlyData).map(([key, val]) => {
        const [y, m] = key.split('-');
        const date = new Date(parseInt(y), parseInt(m) - 1);
        return {
          label: date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
          income: val.income,
          expense: val.expense,
          fullDate: key
        };
      }).sort((a, b) => a.fullDate.localeCompare(b.fullDate));
    }

    return {
      incomeStatement: { revenue, cogs, grossProfit, operatingExpenses, damageLosses, totalOperatingExpenses, operatingIncome, netIncome, incomeByCategory, expenseByCategory },
      balanceSheet: { assets, totalAssets, liabilities, totalLiabilities, equity },
      cashFlow: { ...cashFlow, netCashFlow },
      charts: { incomeData, expenseData, hourlyData, performanceData: finalPerformanceData, totalIncome: revenue, totalExpense: operatingExpenses }
    };
  }, [transactions, inventory, damages, period]);

  const COLORS = ['#4f46e5', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

  const downloadReportPDF = async () => {
    const doc = new jsPDF();
    const dateStr = new Date().toLocaleDateString();
    
    let currentY = 20;

    // Logo
    if (currentOrg?.logoUrl) {
      try {
        const logoBase64 = await getBase64FromUrl(currentOrg.logoUrl);
        doc.addImage(logoBase64, 'PNG', 160, 15, 30, 30);
      } catch (e) {
        console.error('Failed to add logo to PDF:', e);
      }
    }

    doc.setFontSize(22);
    doc.setTextColor(15, 23, 42);
    doc.text(`${currentOrg?.name || 'Business'} Financial Report`, 14, currentY);
    currentY += 10;
    
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, currentY);
    currentY += 6;
    doc.text(`Reporting Period: ${period === 'all' ? 'All Time' : `Last ${period} Days`}`, 14, currentY);
    currentY += 15;

    const addSection = (title: string, data: any[][], headers: string[]) => {
      doc.setFontSize(16);
      doc.setTextColor(15, 23, 42);
      doc.text(title, 14, currentY);
      autoTable(doc, {
        startY: currentY + 5,
        head: [headers],
        body: data,
        theme: 'striped',
        headStyles: { fillColor: [15, 23, 42] },
        margin: { bottom: 20 }
      });
      currentY = (doc as any).lastAutoTable.finalY + 15;
    };

    // Income Statement
    const is = financialData.incomeStatement;
    addSection('Income Statement', [
      ['Revenue', formatCurrency(is.revenue, currentOrg?.currency)],
      ['Cost of Goods Sold (COGS)', `(${formatCurrency(is.cogs, currentOrg?.currency)})`],
      ['Gross Profit', formatCurrency(is.grossProfit, currentOrg?.currency)],
      ['Operating Expenses', `(${formatCurrency(is.operatingExpenses, currentOrg?.currency)})`],
      ['Damage Losses', `(${formatCurrency(is.damageLosses, currentOrg?.currency)})`],
      ['Total Operating Expenses', `(${formatCurrency(is.totalOperatingExpenses, currentOrg?.currency)})`],
      ['Net Income', formatCurrency(is.netIncome, currentOrg?.currency)],
    ], ['Account', 'Amount']);

    // Balance Sheet
    const bs = financialData.balanceSheet;
    addSection('Balance Sheet', [
      ['Current Assets (Cash, Inventory)', formatCurrency(bs.totalAssets, currentOrg?.currency)],
      ['Total Liabilities', formatCurrency(bs.totalLiabilities, currentOrg?.currency)],
      ['Total Equity', formatCurrency(bs.equity, currentOrg?.currency)],
    ], ['Category', 'Amount']);

    doc.save(`Financial_Report_${currentOrg?.name || 'Business'}_${dateStr}.pdf`);
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          {reportHistory.length > 1 && (
            <button 
              onClick={goBackReport}
              className="p-2 bg-zinc-900 border border-zinc-800 rounded-xl text-zinc-400 hover:text-indigo-400 hover:border-indigo-500/50 transition-all group"
              title="Go Back"
            >
              <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
            </button>
          )}
          <div className="p-3 bg-indigo-600/10 rounded-2xl">
            {currentOrg?.logoUrl ? (
              <img src={currentOrg.logoUrl} alt="Logo" className="w-12 h-12 object-contain" referrerPolicy="no-referrer" />
            ) : (
              <BarChart3 className="w-8 h-8 text-indigo-500" />
            )}
          </div>
          <div>
            <h2 className="text-3xl font-bold text-zinc-100">Financial Reports</h2>
            <p className="text-zinc-400">Standardized financial statements and performance analytics</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex bg-zinc-900 p-1 rounded-xl border border-zinc-800">
            {(['7', '30', '90', 'all'] as const).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={cn(
                  "px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-lg transition-all",
                  period === p ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/20" : "text-zinc-500 hover:text-zinc-300"
                )}
              >
                {p === 'all' ? 'All' : `${p}D`}
              </button>
            ))}
          </div>
          <button 
            onClick={downloadReportPDF}
            className="flex items-center gap-2 px-6 py-2.5 bg-zinc-100 hover:bg-white text-zinc-900 font-bold rounded-xl transition-all shadow-lg shadow-white/5"
          >
            <FileDown className="w-5 h-5" />
            Export PDF
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-zinc-800 overflow-x-auto no-scrollbar">
        {[
          { id: 'overview', label: 'Overview', icon: LayoutDashboard },
          { id: 'income_statement', label: 'Income Statement', icon: TrendingUp },
          { id: 'balance_sheet', label: 'Balance Sheet', icon: Building2 },
          { id: 'cash_flow', label: 'Cash Flow', icon: Wallet },
          { id: 'equity_statement', label: 'Equity', icon: ShieldCheck },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={cn(
              "flex items-center gap-2 px-6 py-4 text-sm font-bold transition-all border-b-2 whitespace-nowrap",
              activeTab === tab.id 
                ? "border-indigo-500 text-indigo-500 bg-indigo-500/5" 
                : "border-transparent text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50"
            )}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-8">
        {activeTab === 'overview' && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl">
                <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest mb-1">Total Revenue</p>
                <h3 className="text-2xl font-black text-zinc-100">{formatCurrency(financialData.charts.totalIncome, currentOrg?.currency)}</h3>
                <div className="mt-4 flex items-center gap-2 text-emerald-500 text-xs font-bold">
                  <TrendingUp className="w-4 h-4" />
                  <span>+12.5% from last period</span>
                </div>
              </div>
              <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl">
                <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest mb-1">Total Expenses</p>
                <h3 className="text-2xl font-black text-zinc-100">{formatCurrency(financialData.charts.totalExpense, currentOrg?.currency)}</h3>
                <div className="mt-4 flex items-center gap-2 text-rose-500 text-xs font-bold">
                  <TrendingDown className="w-4 h-4" />
                  <span>+5.2% from last period</span>
                </div>
              </div>
              <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl">
                <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest mb-1">Net Profit</p>
                <h3 className="text-2xl font-black text-indigo-400">{formatCurrency(financialData.incomeStatement.netIncome, currentOrg?.currency)}</h3>
                <div className="mt-4 flex items-center gap-2 text-indigo-500 text-xs font-bold">
                  <ShieldCheck className="w-4 h-4" />
                  <span>Healthy margin</span>
                </div>
              </div>
              <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl">
                <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest mb-1">Operating Margin</p>
                <h3 className="text-2xl font-black text-zinc-100">
                  {financialData.incomeStatement.revenue > 0 
                    ? ((financialData.incomeStatement.operatingIncome / financialData.incomeStatement.revenue) * 100).toFixed(1)
                    : '0.0'}%
                </h3>
                <div className="mt-4 flex items-center gap-2 text-zinc-500 text-xs font-bold">
                  <BarChart3 className="w-4 h-4" />
                  <span>Efficiency score</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="bg-zinc-900 border border-zinc-800 p-8 rounded-3xl">
                <h3 className="text-lg font-bold text-zinc-100 mb-8">Revenue by Category</h3>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={financialData.charts.incomeData}
                        cx="50%"
                        cy="50%"
                        innerRadius={80}
                        outerRadius={100}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {financialData.charts.incomeData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#18181b', border: '1px solid #27272a', borderRadius: '12px' }}
                        itemStyle={{ color: '#f4f4f5' }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="grid grid-cols-2 gap-4 mt-8">
                  {financialData.charts.incomeData.map((item, index) => (
                    <div key={item.name} className="flex items-center gap-3">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                      <span className="text-sm text-zinc-400">{item.name}</span>
                      <span className="text-sm font-bold text-zinc-100 ml-auto">{formatCurrency(item.value, currentOrg?.currency)}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-zinc-900 border border-zinc-800 p-8 rounded-3xl">
                <h3 className="text-lg font-bold text-zinc-100 mb-8">
                  {period === '7' ? 'Weekly Performance' : 
                   period === '30' ? 'Monthly Performance' : 
                   period === '90' ? 'Quarterly Performance' : 'Yearly Performance'}
                </h3>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={financialData.charts.performanceData}>
                      <defs>
                        <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                      <XAxis dataKey="label" stroke="#71717a" fontSize={12} tickLine={false} axisLine={false} />
                      <YAxis stroke="#71717a" fontSize={12} tickLine={false} axisLine={false} />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#18181b', border: '1px solid #27272a', borderRadius: '12px' }}
                        itemStyle={{ color: '#f4f4f5' }}
                      />
                      <Area type="monotone" dataKey="income" stroke="#4f46e5" fillOpacity={1} fill="url(#colorIncome)" strokeWidth={3} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </>
        )}

        {activeTab === 'income_statement' && (
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl overflow-hidden">
            <div className="p-8 border-b border-zinc-800 bg-zinc-800/30 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h3 className="text-xl font-bold text-zinc-100">Income Statement (Profit & Loss)</h3>
                <p className="text-zinc-400 text-sm">For the period ending {new Date().toLocaleDateString()}</p>
              </div>
              {currentOrg?.logoUrl && (
                <img src={currentOrg.logoUrl} alt="Logo" className="h-12 w-auto object-contain" referrerPolicy="no-referrer" />
              )}
            </div>
            <div className="p-8 space-y-8">
              {/* Revenue Section */}
              <section>
                <h4 className="text-xs font-bold text-indigo-500 uppercase tracking-widest mb-4">Revenue</h4>
                <div className="space-y-3">
                  {Object.entries(financialData.incomeStatement.incomeByCategory).map(([cat, amount]) => (
                    <div key={cat} className="flex justify-between items-center py-2 border-b border-zinc-800/50">
                      <span className="text-zinc-300">{cat}</span>
                      <span className="text-zinc-100 font-medium">{formatCurrency(amount as number, currentOrg?.currency)}</span>
                    </div>
                  ))}
                  <div className="flex justify-between items-center py-4 text-lg font-bold text-zinc-100">
                    <span>Total Revenue</span>
                    <span>{formatCurrency(financialData.incomeStatement.revenue, currentOrg?.currency)}</span>
                  </div>
                </div>
              </section>

              {/* COGS Section */}
              <section>
                <h4 className="text-xs font-bold text-rose-500 uppercase tracking-widest mb-4">Cost of Goods Sold</h4>
                <div className="flex justify-between items-center py-4 border-b border-zinc-800/50">
                  <span className="text-zinc-300">Direct Costs (Inventory Cost)</span>
                  <span className="text-zinc-100 font-medium">({formatCurrency(financialData.incomeStatement.cogs, currentOrg?.currency)})</span>
                </div>
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 py-6 text-xl font-black text-emerald-400">
                  <span>Gross Profit</span>
                  <span className="break-all sm:break-normal">{formatCurrency(financialData.incomeStatement.grossProfit, currentOrg?.currency)}</span>
                </div>
              </section>

              {/* Expenses Section */}
              <section>
                <h4 className="text-xs font-bold text-rose-500 uppercase tracking-widest mb-4">Operating Expenses</h4>
                <div className="space-y-3">
                  {Object.entries(financialData.incomeStatement.expenseByCategory).map(([cat, amount]) => (
                    <div key={cat} className="flex justify-between items-center py-2 border-b border-zinc-800/50">
                      <span className="text-zinc-300">{cat}</span>
                      <span className="text-zinc-100 font-medium">({formatCurrency(amount as number, currentOrg?.currency)})</span>
                    </div>
                  ))}
                  <div className="flex justify-between items-center py-2 border-b border-zinc-800/50">
                    <span className="text-zinc-300 italic">Damage Losses (Non-Cash)</span>
                    <span className="text-zinc-100 font-medium">({formatCurrency(financialData.incomeStatement.damageLosses, currentOrg?.currency)})</span>
                  </div>
                  <div className="flex justify-between items-center py-4 text-lg font-bold text-zinc-100">
                    <span>Total Operating Expenses</span>
                    <span>({formatCurrency(financialData.incomeStatement.totalOperatingExpenses, currentOrg?.currency)})</span>
                  </div>
                </div>
              </section>

              {/* Bottom Line */}
              <div className="p-6 bg-indigo-600 rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
                <div className="min-w-0">
                  <h4 className="text-white/70 text-xs font-bold uppercase tracking-widest">Net Income (Bottom Line)</h4>
                  <p className="text-2xl md:text-3xl font-black text-white mt-1 break-all sm:break-normal">{formatCurrency(financialData.incomeStatement.netIncome, currentOrg?.currency)}</p>
                </div>
                <div className="p-4 bg-white/10 rounded-xl shrink-0">
                  <TrendingUp className="w-8 h-8 text-white" />
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'balance_sheet' && (
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl overflow-hidden">
            <div className="p-8 border-b border-zinc-800 bg-zinc-800/30 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h3 className="text-xl font-bold text-zinc-100">Balance Sheet (Statement of Financial Position)</h3>
                <p className="text-zinc-400 text-sm">As of {new Date().toLocaleDateString()}</p>
              </div>
              {currentOrg?.logoUrl && (
                <img src={currentOrg.logoUrl} alt="Logo" className="h-12 w-auto object-contain" referrerPolicy="no-referrer" />
              )}
            </div>
            <div className="p-8 grid grid-cols-1 lg:grid-cols-2 gap-12">
              {/* Assets Column */}
              <div className="space-y-8">
                <section>
                  <h4 className="text-xs font-bold text-emerald-500 uppercase tracking-widest mb-6 pb-2 border-b border-emerald-500/20">Assets</h4>
                  <div className="space-y-6">
                    <div>
                      <h5 className="text-sm font-bold text-zinc-400 mb-3">Current Assets</h5>
                      <div className="space-y-2">
                        <div className="flex justify-between text-zinc-100">
                          <span>Cash & Equivalents</span>
                          <span>{formatCurrency(financialData.balanceSheet.assets.current.cash, currentOrg?.currency)}</span>
                        </div>
                        <div className="flex justify-between text-zinc-100">
                          <span>Inventory</span>
                          <span>{formatCurrency(financialData.balanceSheet.assets.current.inventory, currentOrg?.currency)}</span>
                        </div>
                        <div className="flex justify-between text-zinc-100">
                          <span>Accounts Receivable</span>
                          <span>{formatCurrency(financialData.balanceSheet.assets.current.accountsReceivable, currentOrg?.currency)}</span>
                        </div>
                      </div>
                    </div>
                    <div>
                      <h5 className="text-sm font-bold text-zinc-400 mb-3">Non-Current Assets</h5>
                      <div className="space-y-2">
                        <div className="flex justify-between text-zinc-100">
                          <span>Equipment & Machinery</span>
                          <span>{formatCurrency(financialData.balanceSheet.assets.nonCurrent.equipment, currentOrg?.currency)}</span>
                        </div>
                        <div className="flex justify-between text-zinc-100">
                          <span>Property</span>
                          <span>{formatCurrency(financialData.balanceSheet.assets.nonCurrent.property, currentOrg?.currency)}</span>
                        </div>
                      </div>
                    </div>
                    <div className="pt-4 border-t border-zinc-800 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 text-xl font-black text-zinc-100">
                      <span>Total Assets</span>
                      <span className="break-all sm:break-normal">{formatCurrency(financialData.balanceSheet.totalAssets, currentOrg?.currency)}</span>
                    </div>
                  </div>
                </section>
              </div>

              {/* Liabilities & Equity Column */}
              <div className="space-y-8">
                <section>
                  <h4 className="text-xs font-bold text-rose-500 uppercase tracking-widest mb-6 pb-2 border-b border-rose-500/20">Liabilities & Equity</h4>
                  <div className="space-y-6">
                    <div>
                      <h5 className="text-sm font-bold text-zinc-400 mb-3">Current Liabilities</h5>
                      <div className="space-y-2">
                        <div className="flex justify-between text-zinc-100">
                          <span>Accounts Payable</span>
                          <span>{formatCurrency(financialData.balanceSheet.liabilities.current.accountsPayable, currentOrg?.currency)}</span>
                        </div>
                        <div className="flex justify-between text-zinc-100">
                          <span>Short-term Loans</span>
                          <span>{formatCurrency(financialData.balanceSheet.liabilities.current.shortTermLoans, currentOrg?.currency)}</span>
                        </div>
                      </div>
                    </div>
                    <div>
                      <h5 className="text-sm font-bold text-zinc-400 mb-3">Non-Current Liabilities</h5>
                      <div className="space-y-2">
                        <div className="flex justify-between text-zinc-100">
                          <span>Long-term Debt</span>
                          <span>{formatCurrency(financialData.balanceSheet.liabilities.nonCurrent.longTermDebt, currentOrg?.currency)}</span>
                        </div>
                      </div>
                    </div>
                    <div className="pt-4 border-t border-zinc-800 flex justify-between font-bold text-zinc-100">
                      <span>Total Liabilities</span>
                      <span>{formatCurrency(financialData.balanceSheet.totalLiabilities, currentOrg?.currency)}</span>
                    </div>
                    
                    <div className="pt-8">
                      <h5 className="text-sm font-bold text-indigo-500 mb-3 uppercase tracking-widest">Shareholder Equity</h5>
                      <div className="space-y-2">
                        <div className="flex justify-between text-zinc-100">
                          <span>Retained Earnings</span>
                          <span>{formatCurrency(financialData.balanceSheet.equity, currentOrg?.currency)}</span>
                        </div>
                      </div>
                      <div className="pt-4 border-t border-zinc-800 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 text-xl font-black text-indigo-400">
                        <span>Total Liabilities & Equity</span>
                        <span className="break-all sm:break-normal">{formatCurrency(financialData.balanceSheet.totalLiabilities + financialData.balanceSheet.equity, currentOrg?.currency)}</span>
                      </div>
                    </div>
                  </div>
                </section>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'cash_flow' && (
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl overflow-hidden">
            <div className="p-8 border-b border-zinc-800 bg-zinc-800/30 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h3 className="text-xl font-bold text-zinc-100">Cash Flow Statement</h3>
                <p className="text-zinc-400 text-sm">Direct movement of cash for the period</p>
              </div>
              {currentOrg?.logoUrl && (
                <img src={currentOrg.logoUrl} alt="Logo" className="h-12 w-auto object-contain" referrerPolicy="no-referrer" />
              )}
            </div>
            <div className="p-8 space-y-10">
              <section>
                <h4 className="text-sm font-bold text-zinc-100 mb-6 flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-emerald-500" />
                  Operating Activities
                </h4>
                <div className="space-y-4 pl-4 border-l-2 border-zinc-800">
                  <div className="flex justify-between text-zinc-300">
                    <span>Net Income</span>
                    <span>{formatCurrency(financialData.cashFlow.operating.netIncome, currentOrg?.currency)}</span>
                  </div>
                  <div className="flex justify-between text-zinc-300">
                    <span>Adjustments (Damage Losses)</span>
                    <span className="text-emerald-400">+{formatCurrency(financialData.cashFlow.operating.adjustments, currentOrg?.currency)}</span>
                  </div>
                  <div className="flex justify-between text-zinc-300">
                    <span>Changes in Working Capital (Inventory)</span>
                    <span className="text-rose-400">({formatCurrency(Math.abs(financialData.cashFlow.operating.changesInWorkingCapital), currentOrg?.currency)})</span>
                  </div>
                </div>
              </section>

              <section>
                <h4 className="text-sm font-bold text-zinc-100 mb-6 flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-blue-500" />
                  Investing Activities
                </h4>
                <div className="space-y-4 pl-4 border-l-2 border-zinc-800">
                  <div className="flex justify-between text-zinc-300">
                    <span>Purchase of Fixed Assets</span>
                    <span>{formatCurrency(financialData.cashFlow.investing.assetPurchases, currentOrg?.currency)}</span>
                  </div>
                </div>
              </section>

              <section>
                <h4 className="text-sm font-bold text-zinc-100 mb-6 flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-purple-500" />
                  Financing Activities
                </h4>
                <div className="space-y-4 pl-4 border-l-2 border-zinc-800">
                  <div className="flex justify-between text-zinc-300">
                    <span>Capital Injection</span>
                    <span>{formatCurrency(financialData.cashFlow.financing.capitalInjection, currentOrg?.currency)}</span>
                  </div>
                  <div className="flex justify-between text-zinc-300">
                    <span>Dividends Paid</span>
                    <span>({formatCurrency(financialData.cashFlow.financing.dividends, currentOrg?.currency)})</span>
                  </div>
                </div>
              </section>

              <div className="pt-8 border-t border-zinc-800 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <h4 className="text-lg font-bold text-zinc-100">Net Increase/Decrease in Cash</h4>
                <span className={cn(
                  "text-xl md:text-2xl font-black break-all sm:break-normal",
                  financialData.cashFlow.netCashFlow >= 0 ? "text-emerald-400" : "text-rose-400"
                )}>
                  {formatCurrency(financialData.cashFlow.netCashFlow, currentOrg?.currency)}
                </span>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'equity_statement' && (
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl overflow-hidden">
            <div className="p-8 border-b border-zinc-800 bg-zinc-800/30 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h3 className="text-xl font-bold text-zinc-100">Statement of Changes in Equity</h3>
                <p className="text-zinc-400 text-sm">Tracking the net value of the business</p>
              </div>
              {currentOrg?.logoUrl && (
                <img src={currentOrg.logoUrl} alt="Logo" className="h-12 w-auto object-contain" referrerPolicy="no-referrer" />
              )}
            </div>
            <div className="p-8">
              <div className="bg-zinc-800/50 rounded-2xl p-8 space-y-6">
                <div className="flex flex-wrap justify-between items-center gap-4 text-zinc-400">
                  <span>Opening Balance (Retained Earnings)</span>
                  <span className="font-bold">{formatCurrency(financialData.balanceSheet.equity - financialData.incomeStatement.netIncome, currentOrg?.currency)}</span>
                </div>
                <div className="flex flex-wrap justify-between items-center gap-4 text-emerald-400 font-bold">
                  <span>Net Income for the Period</span>
                  <span>+{formatCurrency(financialData.incomeStatement.netIncome, currentOrg?.currency)}</span>
                </div>
                <div className="flex flex-wrap justify-between items-center gap-4 text-rose-400 font-bold">
                  <span>Dividends / Drawings</span>
                  <span>({formatCurrency(0, currentOrg?.currency)})</span>
                </div>
                <div className="pt-6 border-t border-zinc-700 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 text-xl md:text-2xl font-black text-indigo-400">
                  <span>Closing Balance</span>
                  <span className="break-all sm:break-normal">{formatCurrency(financialData.balanceSheet.equity, currentOrg?.currency)}</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function ConfirmModal({ 
  title, 
  message, 
  onConfirm, 
  onCancel, 
  confirmText = 'Delete', 
  cancelText = 'Cancel',
  isDestructive = true 
}: { 
  title: string; 
  message: string; 
  onConfirm: () => void; 
  onCancel: () => void; 
  confirmText?: string; 
  cancelText?: string;
  isDestructive?: boolean;
}) {
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-zinc-900 border border-zinc-800 p-8 rounded-3xl max-w-sm w-full space-y-6 shadow-2xl"
      >
        <div className="space-y-2">
          <h3 className="text-2xl font-bold text-zinc-100">{title}</h3>
          <p className="text-zinc-400 text-sm">{message}</p>
        </div>
        
        <div className="flex gap-3 pt-2">
          <button 
            onClick={onCancel}
            className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold py-3 rounded-2xl transition-colors"
          >{cancelText}</button>
          <button 
            onClick={onConfirm}
            className={cn(
              "flex-1 font-bold py-3 rounded-2xl transition-colors shadow-lg",
              isDestructive 
                ? "bg-rose-600 hover:bg-rose-500 text-white shadow-rose-900/20" 
                : "bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-900/20"
            )}
          >{confirmText}</button>
        </div>
      </motion.div>
    </div>
  );
}


function AdminPanel({ currentOrg, showNotification, setIsCreatingOrg, isSuperAdmin, permissions }: { currentOrg: any, showNotification: any, setIsCreatingOrg: (val: boolean) => void, isSuperAdmin: boolean, permissions: any }) {
  const { user, userProfile, organizations, setCurrentOrg } = useFirebase();
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [isAddingStaff, setIsAddingStaff] = useState(false);
  const [newStaffEmail, setNewStaffEmail] = useState('');
  const [newStaffRole, setNewStaffRole] = useState<'admin' | 'manager' | 'cashier'>('cashier');
  
  const [editingOrgId, setEditingOrgId] = useState<string | null>(null);
  const [editingOrgName, setEditingOrgName] = useState('');
  const [deletingOrgId, setDeletingOrgId] = useState<string | null>(null);
  const [adminTab, setAdminTab] = useState<'my-businesses' | 'staff' | 'settings'>('my-businesses');
  const [uploadingLogo, setUploadingLogo] = useState(false);

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !currentOrg) return;

    if (file.size > 10 * 1024 * 1024) { // 10MB limit
      showNotification('File is too large. Please select an image smaller than 10MB.', 'error');
      return;
    }

    setUploadingLogo(true);
    try {
      const optimizedFile = await compressImage(file, 0.2, 800); // Max 200KB for logos
      const storageRef = ref(storage, `organizations/${currentOrg.id}/logo/${Date.now()}_${file.name}`);
      await uploadBytes(storageRef, optimizedFile);
      const url = await getDownloadURL(storageRef);
      
      // Delete old logo if it exists
      if (currentOrg.logoUrl) {
        await deleteFile(currentOrg.logoUrl);
      }
      
      const success = await updateDocument('organizations', currentOrg.id, { logoUrl: url });
      if (success) {
        showNotification('Business logo updated successfully!');
      } else {
        showNotification('Failed to update business logo in database.', 'error');
      }
    } catch (error) {
      console.error('Logo upload error:', error);
      showNotification('Failed to upload business logo.', 'error');
    } finally {
      setUploadingLogo(false);
    }
  };
  const [adminHistory, setAdminHistory] = useState<string[]>(['my-businesses']);

  useEffect(() => {
    setAdminHistory(prev => {
      if (prev[prev.length - 1] === adminTab) return prev;
      return [...prev, adminTab];
    });
  }, [adminTab]);

  const goBackAdmin = () => {
    if (adminHistory.length <= 1) return;
    const newHistory = [...adminHistory];
    newHistory.pop();
    const prev = newHistory[newHistory.length - 1];
    setAdminHistory(newHistory);
    setAdminTab(prev as any);
  };

  const ownedOrgs = isSuperAdmin ? organizations : organizations.filter(o => o.ownerUid === user?.uid);

  useEffect(() => {
    if (!currentOrg) return;
    const unsub = subscribeToCollection<StaffMember>(
      `organizations/${currentOrg.id}/staff`,
      [],
      setStaff
    );
    return () => unsub();
  }, [currentOrg]);

  const handleAddStaff = async () => {
    if (!currentOrg || !newStaffEmail.trim()) return;
    
    // Check limits
    const limit = PLAN_LIMITS[currentOrg?.plan || 'trial'].staff;
    if (staff.length >= limit) {
      showNotification(`This business (${currentOrg?.name}) is on the ${currentOrg?.plan} plan which is limited to ${limit} staff member(s). Please upgrade the business plan to add more.`, 'error');
      return;
    }
    
    const staffId = Math.random().toString(36).substring(7);
    const email = newStaffEmail.toLowerCase();
    
    try {
      // 1. Add to staff subcollection
      const staffSuccess = await setDocument(`organizations/${currentOrg.id}/staff`, staffId, {
        id: staffId,
        email: email,
        role: newStaffRole,
        addedAt: new Date().toISOString()
      });

      if (!staffSuccess) throw new Error('Failed to add to staff collection');

      // 2. Add to memberships collection for discovery
      const membershipId = Math.random().toString(36).substring(7);
      await setDocument('memberships', membershipId, {
        email: email,
        orgId: currentOrg.id,
        orgName: currentOrg.name,
        role: newStaffRole
      });

      showNotification('Staff member added successfully');
      setIsAddingStaff(false);
      setNewStaffEmail('');
      setNewStaffRole('cashier');
    } catch (error) {
      console.error('Error adding staff:', error);
      showNotification('Failed to add staff member', 'error');
    }
  };

  const handleRemoveStaff = async (staffId: string) => {
    if (!currentOrg) return;
    const success = await removeDocument(`organizations/${currentOrg.id}/staff`, staffId);
    if (success) {
      showNotification('Staff member removed');
    } else {
      showNotification('Failed to remove staff member', 'error');
    }
  };

  const handleUpdateRole = async (staffId: string, newRole: 'admin' | 'manager' | 'cashier') => {
    if (!currentOrg) return;
    const success = await updateDocument(`organizations/${currentOrg.id}/staff`, staffId, { role: newRole });
    if (success) {
      showNotification('Role updated');
    } else {
      showNotification('Failed to update role', 'error');
    }
  };

  const handleUpdateOrgName = async (orgId: string) => {
    if (!editingOrgName.trim()) return;
    const success = await updateDocument('organizations', orgId, { name: editingOrgName });
    if (success) {
      showNotification('Business name updated');
      setEditingOrgId(null);
    } else {
      showNotification('Failed to update business name', 'error');
    }
  };

  const handleDeleteOrg = async (orgId: string) => {
    const orgToDelete = organizations.find(o => o.id === orgId);
    if (!orgToDelete) return;

    try {
      // 1. Delete logo
      if (orgToDelete.logoUrl) {
        await deleteFile(orgToDelete.logoUrl);
      }

      // 2. Delete all inventory images
      const invSnapshot = await getDocs(collection(db, `organizations/${orgId}/inventory`));
      const invDeletions = invSnapshot.docs.map(doc => {
        const data = doc.data() as InventoryItem;
        return data.imageUrl ? deleteFile(data.imageUrl) : Promise.resolve(true);
      });
      await Promise.all(invDeletions);

      // 3. Delete all damage images
      const damageSnapshot = await getDocs(collection(db, `organizations/${orgId}/damages`));
      const damageDeletions = damageSnapshot.docs.map(doc => {
        const data = doc.data() as DamageRecord;
        return data.imageUrl ? deleteFile(data.imageUrl) : Promise.resolve(true);
      });
      await Promise.all(damageDeletions);

      const success = await removeDocument('organizations', orgId);
      if (success) {
        showNotification('Business profile and all associated files deleted');
        if (currentOrg?.id === orgId) {
          const remaining = organizations.filter(o => o.id !== orgId);
          setCurrentOrg(remaining.length > 0 ? remaining[0] : null);
        }
      } else {
        showNotification('Failed to delete business profile', 'error');
      }
    } catch (error) {
      console.error('Error during business deletion cleanup:', error);
      showNotification('Failed to complete business deletion cleanup.', 'error');
    } finally {
      setDeletingOrgId(null);
    }
  };

  return (
    <div className="space-y-8">
      {/* Tab Navigation */}
      <div className="flex items-center gap-2 border-b border-zinc-800 pb-4 overflow-x-auto custom-scrollbar">
        {adminHistory.length > 1 && (
          <button 
            onClick={goBackAdmin}
            className="p-2 bg-zinc-900 border border-zinc-800 rounded-xl text-zinc-400 hover:text-indigo-400 hover:border-indigo-500/50 transition-all group mr-2"
            title="Go Back"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          </button>
        )}
        <button
          onClick={() => setAdminTab('my-businesses')}
          className={cn(
            "px-4 py-2 rounded-xl text-sm font-bold transition-all whitespace-nowrap",
            adminTab === 'my-businesses' ? "bg-indigo-600 text-white shadow-lg shadow-indigo-900/20" : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800"
          )}
        >
          My Businesses
        </button>
        {permissions.canManageStaff && (
          <button
            onClick={() => setAdminTab('staff')}
            className={cn(
              "px-4 py-2 rounded-xl text-sm font-bold transition-all whitespace-nowrap",
              adminTab === 'staff' ? "bg-indigo-600 text-white shadow-lg shadow-indigo-900/20" : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800"
            )}
          >
            Staff Management
          </button>
        )}
        <button
          onClick={() => setAdminTab('settings')}
          className={cn(
            "px-4 py-2 rounded-xl text-sm font-bold transition-all whitespace-nowrap",
            adminTab === 'settings' ? "bg-indigo-600 text-white shadow-lg shadow-indigo-900/20" : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800"
          )}
        >
          Business Settings
        </button>
      </div>

      <div className="min-h-[400px]">
        {adminTab === 'my-businesses' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-3xl font-black text-zinc-100 tracking-tight">Business Profiles</h2>
                <p className="text-zinc-400 mt-1">Manage your registered businesses</p>
              </div>
              <button 
                onClick={() => setIsCreatingOrg(true)}
                className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-6 py-3 rounded-2xl transition-all shadow-xl shadow-indigo-900/20 flex items-center gap-2"
              >
                <Plus className="w-5 h-5" />
                <span className="hidden sm:inline">Create Business Profile</span>
                <span className="sm:hidden">Create</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {ownedOrgs.map((org) => (
                <div key={org.id} className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl space-y-4 group relative">
                  <div className="flex justify-between items-start">
                    <div className="space-y-1 flex-1">
                      {editingOrgId === org.id ? (
                        <div className="flex gap-2">
                          <input 
                            type="text" 
                            value={editingOrgName}
                            onChange={(e) => setEditingOrgName(e.target.value)}
                            className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-1 text-zinc-100 outline-none focus:ring-2 focus:ring-indigo-500"
                            autoFocus
                          />
                          <button 
                            onClick={() => handleUpdateOrgName(org.id)}
                            className="bg-indigo-600 text-white px-3 py-1 rounded-lg text-xs font-bold"
                          >Save</button>
                          <button 
                            onClick={() => setEditingOrgId(null)}
                            className="bg-zinc-800 text-zinc-400 px-3 py-1 rounded-lg text-xs font-bold"
                          >Cancel</button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <h3 className="text-xl font-bold text-zinc-100">{org.name}</h3>
                          <button 
                            onClick={() => { setEditingOrgId(org.id); setEditingOrgName(org.name); }}
                            className="p-1 text-blue-500"
                          >
                            <Edit2 className="w-3 h-3" />
                          </button>
                        </div>
                      )}
                      <div className="flex items-center gap-3 text-xs text-zinc-500">
                        <span className="flex items-center gap-1">
                          <Building2 className="w-3 h-3" />
                          {org.country}
                        </span>
                        <span className="flex items-center gap-1">
                          <CreditCard className="w-3 h-3" />
                          {org.plan}
                        </span>
                      </div>
                    </div>
                    <button 
                      onClick={() => setDeletingOrgId(org.id)}
                      className="p-2 text-zinc-600 hover:text-rose-500 transition-colors"
                      title="Delete Business"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                  
                  <div className="pt-4 border-t border-zinc-800/50 flex justify-between items-center">
                    <p className="text-[10px] text-zinc-600 uppercase font-bold tracking-widest">
                      Created {formatDate(org.createdAt)}
                    </p>
                    {currentOrg?.id === org.id && (
                      <span className="bg-indigo-600/10 text-indigo-400 text-[10px] font-black px-2 py-0.5 rounded uppercase tracking-wider">
                        Active Session
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {adminTab === 'staff' && permissions.canManageStaff && (
          <div className="space-y-8">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-3xl font-black text-zinc-100 tracking-tight">Team Management</h2>
                <p className="text-zinc-400 mt-1">Manage staff for {currentOrg?.name}</p>
              </div>
              <button 
                onClick={() => setIsAddingStaff(true)}
                className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 px-6 rounded-2xl transition-all shadow-xl shadow-indigo-900/20 flex items-center gap-2"
              >
                <Plus className="w-5 h-5" />
                Add Team Member
              </button>
            </div>

            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-x-auto custom-scrollbar">
              <table className="w-full text-left border-collapse min-w-[600px]">
                <thead>
                  <tr className="bg-zinc-800/50 border-b border-zinc-800">
                    <th className="px-6 py-4 text-xs font-bold text-zinc-400 uppercase tracking-wider">Member</th>
                    <th className="px-6 py-4 text-xs font-bold text-zinc-400 uppercase tracking-wider">Role</th>
                    <th className="px-6 py-4 text-xs font-bold text-zinc-400 uppercase tracking-wider">Added</th>
                    <th className="px-6 py-4 text-xs font-bold text-zinc-400 uppercase tracking-wider text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800">
                  {staff.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-6 py-10 text-center text-zinc-500">
                        No team members added yet.
                      </td>
                    </tr>
                  ) : (
                    staff.map((member) => (
                      <tr key={member.id} className="hover:bg-zinc-800/30 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center text-zinc-400">
                              <Users className="w-5 h-5" />
                            </div>
                            <div>
                              <p className="font-bold text-zinc-100">{member.email}</p>
                              <p className="text-xs text-zinc-500">{member.displayName || 'Pending sign-in'}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <select 
                            value={member.role}
                            onChange={(e) => handleUpdateRole(member.id, e.target.value as any)}
                            className="bg-zinc-800 border border-zinc-700 text-xs font-bold text-zinc-200 rounded-lg px-2 py-1 outline-none focus:ring-1 focus:ring-indigo-500"
                          >
                            <option value="admin">Admin</option>
                            <option value="manager">Manager</option>
                            <option value="cashier">Cashier</option>
                          </select>
                        </td>
                        <td className="px-6 py-4 text-sm text-zinc-400">
                          {formatDate(member.addedAt)}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button 
                            onClick={() => handleRemoveStaff(member.id)}
                            className="p-2 text-zinc-500 hover:text-rose-500 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                { icon: ShieldCheck, title: 'Admin', color: 'text-indigo-500', bg: 'bg-indigo-500/10', permissions: ['Full System Access', 'Manage Team', 'Billing & Plans', 'Delete Records'] },
                { icon: Users, title: 'Manager', color: 'text-emerald-500', bg: 'bg-emerald-500/10', permissions: ['Inventory Management', 'View All Reports', 'Edit Transactions', 'Staff View'] },
                { icon: ShoppingCart, title: 'Cashier', color: 'text-amber-500', bg: 'bg-amber-500/10', permissions: ['POS Access', 'Basic Inventory View', 'Personal Sales History', 'No Admin Access'] }
              ].map((role) => (
                <div key={role.title} className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl space-y-4">
                  <div className="flex items-center gap-3">
                    <div className={cn("p-2 rounded-lg", role.bg)}>
                      <role.icon className={cn("w-5 h-5", role.color)} />
                    </div>
                    <h4 className="font-bold text-zinc-100">{role.title} Permissions</h4>
                  </div>
                  <ul className="space-y-2">
                    {role.permissions.map((p) => (
                      <li key={p} className="flex items-center gap-2 text-xs text-zinc-400">
                        <div className="w-1 h-1 rounded-full bg-zinc-600" />
                        {p}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        )}

        {adminTab === 'settings' && currentOrg && (
          <div className="space-y-8 max-w-2xl">
            <div>
              <h2 className="text-3xl font-black text-zinc-100 tracking-tight">Business Settings</h2>
              <p className="text-zinc-400 mt-1">Configure details for {currentOrg.name}</p>
            </div>

            <div className="bg-zinc-900 border border-zinc-800 p-8 rounded-3xl space-y-8">
              <div className="space-y-4">
                <label className="text-sm font-bold text-zinc-400 uppercase tracking-widest">Business Logo</label>
                <div className="flex flex-col sm:flex-row items-center gap-8">
                  <div className="w-32 h-32 rounded-2xl bg-zinc-800 border-2 border-dashed border-zinc-700 flex items-center justify-center overflow-hidden relative group">
                    {currentOrg.logoUrl ? (
                      <>
                        <img src={currentOrg.logoUrl} alt="Logo" className="w-full h-full object-contain" referrerPolicy="no-referrer" />
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <Camera className="w-8 h-8 text-white" />
                        </div>
                      </>
                    ) : (
                      <div className="text-center p-4">
                        <ImageIcon className="w-8 h-8 text-zinc-600 mx-auto mb-2" />
                        <p className="text-[10px] font-bold text-zinc-500 uppercase">No Logo</p>
                      </div>
                    )}
                    <input 
                      type="file" 
                      accept="image/*" 
                      onChange={handleLogoUpload}
                      className="absolute inset-0 opacity-0 cursor-pointer"
                      disabled={uploadingLogo}
                    />
                    {uploadingLogo && (
                      <div className="absolute inset-0 bg-zinc-900/80 flex items-center justify-center">
                        <Loader2 className="w-6 h-6 text-indigo-500 animate-spin" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 space-y-2">
                    <h4 className="font-bold text-zinc-100">Upload Company Logo</h4>
                    <p className="text-sm text-zinc-500 leading-relaxed">
                      This logo will appear on your receipts, invoices, and financial reports. 
                      Recommended size: 512x512px. PNG or JPG.
                    </p>
                    <div className="pt-2">
                      <label className="inline-flex items-center gap-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 px-4 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer">
                        <Plus className="w-4 h-4" />
                        {currentOrg.logoUrl ? 'Change Logo' : 'Select Logo'}
                        <input 
                          type="file" 
                          accept="image/*" 
                          onChange={handleLogoUpload}
                          className="hidden"
                          disabled={uploadingLogo}
                        />
                      </label>
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-8 border-t border-zinc-800 space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Business Name</label>
                    <input 
                      type="text" 
                      value={currentOrg.name}
                      readOnly
                      className="w-full bg-zinc-800/50 border border-zinc-800 rounded-xl px-4 py-3 text-zinc-400 outline-none cursor-not-allowed"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Currency</label>
                    <input 
                      type="text" 
                      value={currentOrg.currency || 'UGX'}
                      readOnly
                      className="w-full bg-zinc-800/50 border border-zinc-800 rounded-xl px-4 py-3 text-zinc-400 outline-none cursor-not-allowed"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest">UPRS Reg Number</label>
                    <input 
                      type="text" 
                      value={currentOrg.uprsRegistrationNumber || 'N/A'}
                      readOnly
                      className="w-full bg-zinc-800/50 border border-zinc-800 rounded-xl px-4 py-3 text-zinc-400 outline-none cursor-not-allowed"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Plan</label>
                    <div className="w-full bg-zinc-800/50 border border-zinc-800 rounded-xl px-4 py-3 text-indigo-400 font-bold flex items-center justify-between">
                      <span className="uppercase">{currentOrg.plan}</span>
                      <Sparkles className="w-4 h-4" />
                    </div>
                  </div>
                </div>
                <p className="text-[10px] text-zinc-600 italic">
                  * To change core business details, please contact support or use the "My Businesses" tab to edit the name.
                </p>
              </div>

              <div className="pt-8 border-t border-zinc-800 space-y-4">
                <h4 className="text-sm font-bold text-zinc-400 uppercase tracking-widest">Application</h4>
                <div className="flex items-center justify-between p-4 bg-zinc-800/30 rounded-2xl border border-zinc-800">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-indigo-600/10 rounded-xl">
                      <Download className="w-5 h-5 text-indigo-500" />
                    </div>
                    <div>
                      <p className="font-bold text-zinc-100">Offline Access</p>
                      <p className="text-xs text-zinc-500">Download the app for offline use</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => window.open('https://median.co/share/bnkaoey#apk', '_blank')}
                    className="bg-zinc-800 hover:bg-zinc-700 text-zinc-100 px-4 py-2 rounded-xl text-xs font-bold transition-colors border border-zinc-700"
                  >
                    Download App
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <AnimatePresence>
        {isAddingStaff && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-zinc-900 border border-zinc-800 p-8 rounded-3xl max-w-md w-full space-y-6 shadow-2xl"
            >
              <div className="flex justify-between items-center">
                <h3 className="text-2xl font-bold text-zinc-100">Add Team Member</h3>
                <button onClick={() => setIsAddingStaff(false)} className="text-zinc-500 hover:text-zinc-300">
                  <X className="w-6 h-6" />
                </button>
              </div>
              
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-zinc-500 uppercase">Email Address</label>
                  <input 
                    type="email" 
                    value={newStaffEmail}
                    onChange={(e) => setNewStaffEmail(e.target.value)}
                    placeholder="staff@example.com"
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-zinc-100 focus:ring-2 focus:ring-indigo-500 outline-none" 
                  />
                </div>
                
                <div className="space-y-2">
                  <label className="text-xs font-bold text-zinc-500 uppercase">Role & Permissions</label>
                  <div className="grid grid-cols-1 gap-3">
                    {[
                      { id: 'admin', label: 'Admin', desc: 'Full access to all features and settings' },
                      { id: 'manager', label: 'Manager', desc: 'Manage inventory and view reports' },
                      { id: 'cashier', label: 'Cashier', desc: 'POS access and basic inventory view' }
                    ].map((role) => (
                      <button
                        key={role.id}
                        onClick={() => setNewStaffRole(role.id as any)}
                        className={cn(
                          "flex items-start gap-3 p-4 rounded-xl border-2 text-left transition-all",
                          newStaffRole === role.id ? "border-indigo-600 bg-indigo-600/5" : "border-zinc-800 bg-zinc-800/50 hover:border-zinc-700"
                        )}
                      >
                        <div className={cn(
                          "mt-1 w-4 h-4 rounded-full border-2 flex items-center justify-center",
                          newStaffRole === role.id ? "border-indigo-600" : "border-zinc-600"
                        )}>
                          {newStaffRole === role.id && <div className="w-2 h-2 rounded-full bg-indigo-600" />}
                        </div>
                        <div>
                          <p className="font-bold text-zinc-100">{role.label}</p>
                          <p className="text-xs text-zinc-500">{role.desc}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button 
                  onClick={() => setIsAddingStaff(false)}
                  className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold py-4 rounded-2xl transition-colors"
                >Cancel</button>
                <button 
                  onClick={handleAddStaff}
                  className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-4 rounded-2xl transition-colors shadow-lg shadow-indigo-900/20"
                >Add Member</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {deletingOrgId && (
          <ConfirmModal
            title="Delete Business Profile"
            message="Are you sure you want to delete this business profile? This action cannot be undone and all associated data will be lost."
            onConfirm={() => handleDeleteOrg(deletingOrgId)}
            onCancel={() => setDeletingOrgId(null)}
            confirmText="Delete Profile"
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// --- Main App Logic ---

function Dashboard({ setActiveTab, setHighlightedTxId, isAdmin, isManager }: { setActiveTab: (t: any) => void, setHighlightedTxId: (id: string | null) => void, isAdmin: boolean, isManager: boolean }) {
  const { currentOrg } = useFirebase();
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [damages, setDamages] = useState<DamageRecord[]>([]);
  const [chartPeriod, setChartPeriod] = useState<'day' | 'week' | 'month' | 'year'>('month');

  useEffect(() => {
    if (!currentOrg) return;
    const unsubInv = subscribeToCollection<InventoryItem>(
      `organizations/${currentOrg.id}/inventory`,
      [],
      setInventory
    );
    const unsubTx = subscribeToCollection<Transaction>(
      `organizations/${currentOrg.id}/transactions`,
      [],
      setTransactions
    );
    const unsubDamages = subscribeToCollection<DamageRecord>(
      `organizations/${currentOrg.id}/damages`,
      [],
      setDamages
    );
    return () => { unsubInv(); unsubTx(); unsubDamages(); };
  }, [currentOrg]);

  const pnlData = useMemo(() => {
    const revenue = transactions
      .filter(t => t.type === 'income')
      .reduce((acc, t) => acc + t.amount, 0);

    const cogs = transactions
      .filter(t => t.type === 'income')
      .reduce((acc, t) => {
        const itemCost = t.items?.reduce((iAcc, item) => iAcc + (item.quantity * (item.cost || 0)), 0) || 0;
        return acc + itemCost;
      }, 0);

    const grossProfit = revenue - cogs;

    const operatingExpenses = transactions
      .filter(t => t.type === 'expense')
      .reduce((acc, t) => acc + t.amount, 0);

    const damageLosses = damages.reduce((acc, d) => {
      const item = inventory.find(i => i.id === d.itemId);
      const cost = item ? item.cost : 0; // Fallback if item not found
      return acc + (d.quantity * cost);
    }, 0);

    const totalOperatingExpenses = operatingExpenses + damageLosses;
    const operatingIncome = grossProfit - totalOperatingExpenses;
    const netIncome = operatingIncome; // Assuming no non-operating income/taxes for now as per simple POS

    return {
      revenue,
      cogs,
      grossProfit,
      operatingExpenses,
      damageLosses,
      totalOperatingExpenses,
      operatingIncome,
      netIncome
    };
  }, [inventory, transactions, damages]);

  const stats = useMemo(() => {
    const totalSales = pnlData.revenue;
    const totalExpenses = pnlData.totalOperatingExpenses;
    const stockValue = inventory.reduce((acc, item) => acc + (item.quantity * item.cost), 0);
    const profit = pnlData.netIncome;

    return { totalSales, totalExpenses, stockValue, profit };
  }, [inventory, pnlData]);

  const chartData = useMemo(() => {
    const now = new Date();
    let periods: string[] = [];
    let format: (d: Date) => string;

    if (chartPeriod === 'day') {
      periods = Array.from({ length: 24 }, (_, i) => `${i}:00`);
      format = (d) => `${d.getHours()}:00`;
    } else if (chartPeriod === 'week') {
      periods = Array.from({ length: 7 }, (_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - (6 - i));
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${y}-${m}-${day}`;
      });
      format = (d) => d.toLocaleDateString('en-US', { weekday: 'short' });
    } else if (chartPeriod === 'month') {
      periods = Array.from({ length: 30 }, (_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - (29 - i));
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${y}-${m}-${day}`;
      });
      format = (d) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    } else {
      periods = Array.from({ length: 12 }, (_, i) => {
        const d = new Date();
        d.setMonth(d.getMonth() - (11 - i));
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      });
      format = (d) => d.toLocaleDateString('en-US', { month: 'short' });
    }

    const allFinancialData = [
      ...transactions.map(t => ({ date: t.date, type: t.type, amount: t.amount })),
      ...damages.map(d => {
        const cost = d.cost || inventory.find(i => i.id === d.itemId)?.cost || 0;
        return { date: d.date, type: 'expense', amount: cost * d.quantity };
      })
    ];

    const groupedTxs = allFinancialData.reduce((acc, tx) => {
      let key = '';
      const txDate = new Date(tx.date);
      if (chartPeriod === 'day') {
        if (txDate.toDateString() !== now.toDateString()) return acc;
        key = `${txDate.getHours()}:00`;
      } else if (chartPeriod === 'year') {
        key = `${txDate.getFullYear()}-${String(txDate.getMonth() + 1).padStart(2, '0')}`;
      } else {
        const y = txDate.getFullYear();
        const m = String(txDate.getMonth() + 1).padStart(2, '0');
        const d = String(txDate.getDate()).padStart(2, '0');
        key = `${y}-${m}-${d}`;
      }

      if (!acc[key]) acc[key] = { income: 0, expense: 0 };
      if (tx.type === 'income') acc[key].income += tx.amount;
      else acc[key].expense += tx.amount;
      return acc;
    }, {} as Record<string, { income: number; expense: number }>);

    return periods.map(p => {
      const stats = groupedTxs[p] || { income: 0, expense: 0 };
      let name = p;
      if (chartPeriod !== 'day') {
        const parts = p.split('-').map(Number);
        const date = parts.length === 3 
          ? new Date(parts[0], parts[1] - 1, parts[2]) 
          : new Date(parts[0], parts[1] - 1, 1);
        name = format(date);
      }
      
      return {
        name,
        income: stats.income,
        expense: stats.expense,
        fullDate: p
      };
    });
  }, [transactions, damages, chartPeriod]);

  const handleDownloadData = () => {
    const headers = ['Date', 'Revenue', 'Expenses', 'Net'];
    const rows = chartData.map(d => [
      d.name,
      d.income,
      d.expense,
      d.income - d.expense
    ]);
    
    const csvContent = [
      headers.join(','),
      ...rows.map(r => r.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', `revenue_vs_expenses_${chartPeriod}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDownloadPNL = async () => {
    const doc = new jsPDF();
    const now = new Date();
    const dateStr = now.toLocaleDateString();
    
    // Logo
    if (currentOrg?.logoUrl) {
      try {
        const logoBase64 = await getBase64FromUrl(currentOrg.logoUrl);
        doc.addImage(logoBase64, 'PNG', 160, 15, 30, 30);
      } catch (e) {
        console.error('Failed to add logo to PDF:', e);
      }
    }

    // Header
    doc.setFontSize(22);
    doc.setTextColor(15, 23, 42); // Navy
    doc.text('Profit & Loss Statement', 20, 25);
    
    doc.setFontSize(14);
    doc.text(currentOrg?.name || 'JENA POS', 20, 35);
    
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Generated on: ${dateStr}`, 20, 43);
    
    // Summary Table
    const tableData: any[][] = [
      ['Revenue', formatCurrency(pnlData.revenue, currentOrg?.currency)],
      ['Cost of Goods Sold (COGS)', `(${formatCurrency(pnlData.cogs, currentOrg?.currency)})`],
      [{ content: 'Gross Profit', styles: { fontStyle: 'bold', fillColor: [241, 245, 249] } as any }, { content: formatCurrency(pnlData.grossProfit, currentOrg?.currency), styles: { fontStyle: 'bold', fillColor: [241, 245, 249] } as any }],
      ['', ''],
      ['Operating Expenses', `(${formatCurrency(pnlData.operatingExpenses, currentOrg?.currency)})`],
      ['Damage Losses', `(${formatCurrency(pnlData.damageLosses, currentOrg?.currency)})`],
      [{ content: 'Total Operating Expenses', styles: { fontStyle: 'bold' } as any }, `(${formatCurrency(pnlData.totalOperatingExpenses, currentOrg?.currency)})`],
      ['', ''],
      [{ content: 'Operating Income (EBIT)', styles: { fontStyle: 'bold', fillColor: [241, 245, 249] } as any }, { content: formatCurrency(pnlData.operatingIncome, currentOrg?.currency), styles: { fontStyle: 'bold', fillColor: [241, 245, 249] } as any }],
      [{ content: 'Net Income (Bottom Line)', styles: { fontStyle: 'bold', fillColor: [79, 70, 229], textColor: [255, 255, 255] } as any }, { content: formatCurrency(pnlData.netIncome, currentOrg?.currency), styles: { fontStyle: 'bold', fillColor: [79, 70, 229], textColor: [255, 255, 255] } as any }],
    ];

    autoTable(doc, {
      startY: 45,
      head: [['Description', 'Amount']],
      body: tableData,
      theme: 'striped',
      headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255] },
      columnStyles: {
        1: { halign: 'right' }
      }
    });

    // Footer
    const finalY = (doc as any).lastAutoTable.finalY + 20;
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text('This statement is generated automatically by JENA POS. Most P&L statements use the accrual method, recording revenue when earned and expenses when incurred.', 20, finalY, { maxWidth: 170 });
    
    doc.save(`PNL_Statement_${currentOrg?.name || 'Business'}_${dateStr}.pdf`);
  };

  return (
    <div className="space-y-8">
      {isManager ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatCard 
              title="Total Sales" 
              value={formatCurrency(stats.totalSales, currentOrg?.currency)} 
              icon={TrendingUp} 
              color="bg-indigo-600" 
              trend={12} 
              onClick={() => setActiveTab('sales-analytics')}
            />
            <StatCard 
              title="Total Expenses" 
              value={formatCurrency(stats.totalExpenses, currentOrg?.currency)} 
              icon={TrendingDown} 
              color="bg-rose-600" 
              trend={-5} 
              onClick={() => setActiveTab('expenses-analytics')}
            />
            <StatCard 
              title="Stock Value" 
              value={formatCurrency(stats.stockValue, currentOrg?.currency)} 
              icon={Box} 
              color="bg-amber-600" 
              onClick={() => setActiveTab('inventory')}
            />
            <StatCard 
              title="Net Profit" 
              value={formatCurrency(stats.profit, currentOrg?.currency)} 
              icon={Wallet} 
              color="bg-emerald-600" 
              trend={8} 
              onClick={() => setActiveTab('profit-analytics')}
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-zinc-900 border border-zinc-800 p-6 rounded-2xl">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <h3 className="text-lg font-bold text-zinc-100">Revenue vs Expenses</h3>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={handleDownloadPNL}
                    className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl transition-all shadow-lg shadow-indigo-600/20"
                  >
                    <FileDown className="w-4 h-4" />
                    Download P&L Statement
                  </button>
                  <div className="flex bg-zinc-800 p-1 rounded-xl">
                    {(['day', 'week', 'month', 'year'] as const).map((p) => (
                      <button
                        key={p}
                        onClick={() => setChartPeriod(p)}
                        className={cn(
                          "px-3 py-1 text-[10px] font-bold uppercase tracking-wider rounded-lg transition-all",
                          chartPeriod === p ? "bg-indigo-600 text-white" : "text-zinc-500 hover:text-zinc-300"
                        )}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                  <button 
                    onClick={handleDownloadData}
                    className="p-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white rounded-xl transition-all"
                    title="Download Data"
                  >
                    <Download className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                    <XAxis 
                      dataKey="name" 
                      stroke="#71717a" 
                      fontSize={10} 
                      tickLine={false} 
                      axisLine={false} 
                      interval={chartPeriod === 'month' ? 4 : 0}
                    />
                    <YAxis 
                      stroke="#71717a" 
                      fontSize={10} 
                      tickLine={false} 
                      axisLine={false} 
                      tickFormatter={(v) => `${getCurrencySymbol(currentOrg?.currency)}${v}`} 
                    />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#18181b', border: '1px solid #27272a', borderRadius: '12px', fontSize: '12px' }}
                      itemStyle={{ color: '#f4f4f5' }}
                      cursor={{ fill: '#27272a', opacity: 0.4 }}
                    />
                    <Bar dataKey="income" name="Revenue" fill="#4f46e5" radius={[4, 4, 0, 0]} barSize={20} />
                    <Bar dataKey="expense" name="Expenses" fill="#e11d48" radius={[4, 4, 0, 0]} barSize={20} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl">
              <h3 className="text-lg font-bold text-zinc-100 mb-6">Recent Transactions</h3>
              <div className="space-y-4">
                {transactions.slice(0, 5).map((tx) => (
                  <button 
                    key={tx.id} 
                    onClick={() => {
                      setHighlightedTxId(tx.id);
                      setActiveTab('transactions');
                    }}
                    className="flex items-center justify-between w-full p-3 hover:bg-zinc-800/50 rounded-xl transition-colors text-left"
                  >
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "p-2 rounded-lg",
                        tx.type === 'income' ? "bg-emerald-500/10 text-emerald-500" : "bg-rose-500/10 text-rose-500"
                      )}>
                        {tx.type === 'income' ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-zinc-100">{tx.category}</p>
                        <p className="text-xs text-zinc-500">{formatDate(tx.date)}</p>
                      </div>
                    </div>
                    <p className={cn(
                      "text-sm font-bold",
                      tx.type === 'income' ? "text-emerald-500" : "text-rose-500"
                    )}>
                      {tx.type === 'income' ? '+' : '-'}{formatCurrency(tx.amount, currentOrg?.currency)}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </>
      ) : (
        <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-zinc-800 flex items-center justify-center">
            <Lock className="w-8 h-8 text-zinc-600" />
          </div>
          <h3 className="text-xl font-bold text-zinc-100">Restricted Access</h3>
          <p className="text-zinc-500 max-w-sm">You don't have permission to view the financial dashboard. Please contact your administrator.</p>
        </div>
      )}
    </div>
  );
}

function Inventory({ showNotification, createNotification, permissions, highlightedItemId, setHighlightedItemId }: { showNotification: (m: string, t?: 'success' | 'error') => void, createNotification: any, permissions: any, highlightedItemId: string | null, setHighlightedItemId: (id: string | null) => void }) {
  const { currentOrg, user, userProfile } = useFirebase();
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [newItem, setNewItem] = useState({ name: '', sku: '', quantity: 0, price: 0, cost: 0, category: '', imageUrl: '' });
  const [lastDeleted, setLastDeleted] = useState<InventoryItem | null>(null);
  const [uploading, setUploading] = useState(false);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, isEdit = false) => {
    const file = e.target.files?.[0];
    if (!file || !currentOrg) return;

    if (file.size > 10 * 1024 * 1024) { // 10MB limit
      showNotification('File is too large. Please select an image smaller than 10MB.', 'error');
      return;
    }

    setUploading(true);
    try {
      const optimizedFile = await compressImage(file, 0.5, 1200); // Max 500KB for product images
      const storageRef = ref(storage, `organizations/${currentOrg.id}/inventory/${Date.now()}_${file.name}`);
      await uploadBytes(storageRef, optimizedFile);
      const url = await getDownloadURL(storageRef);
      if (isEdit && editingItem) {
        // Delete old image if it exists
        if (editingItem.imageUrl) {
          await deleteFile(editingItem.imageUrl);
        }
        setEditingItem({ ...editingItem, imageUrl: url });
      } else {
        // Delete previous uploaded image if user uploads multiple before saving
        if (newItem.imageUrl) {
          await deleteFile(newItem.imageUrl);
        }
        setNewItem(prev => ({ ...prev, imageUrl: url }));
      }
      showNotification('Product image uploaded successfully!');
    } catch (error) {
      console.error('Upload error:', error);
      showNotification('Failed to upload product image.', 'error');
    } finally {
      setUploading(false);
    }
  };
  
  // Filter states
  const [filters, setFilters] = useState({
    search: '',
    category: '',
    sku: '',
    minPrice: '',
    maxPrice: '',
    startDate: '',
    endDate: ''
  });
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    if (!currentOrg) return;
    return subscribeToCollection<InventoryItem>(
      `organizations/${currentOrg.id}/inventory`,
      [],
      setItems
    );
  }, [currentOrg]);

  useEffect(() => {
    if (highlightedItemId && items.length > 0) {
      // Clear filters to ensure item is visible
      setFilters({
        search: '',
        category: '',
        sku: '',
        minPrice: '',
        maxPrice: '',
        startDate: '',
        endDate: ''
      });

      const timer = setTimeout(() => {
        const element = document.getElementById(`inv-${highlightedItemId}`);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [highlightedItemId, items]);

  const filteredItems = useMemo(() => {
    return items.filter(item => {
      const matchesSearch = !filters.search || 
        item.name.toLowerCase().includes(filters.search.toLowerCase()) ||
        item.sku.toLowerCase().includes(filters.search.toLowerCase()) ||
        item.category.toLowerCase().includes(filters.search.toLowerCase());
      const matchesCategory = !filters.category || item.category.toLowerCase().includes(filters.category.toLowerCase());
      const matchesSku = !filters.sku || item.sku.toLowerCase().includes(filters.sku.toLowerCase());
      const matchesMinPrice = !filters.minPrice || item.price >= Number(filters.minPrice);
      const matchesMaxPrice = !filters.maxPrice || item.price <= Number(filters.maxPrice);
      
      let matchesDate = true;
      if (item.createdAt) {
        const itemDate = new Date(item.createdAt).getTime();
        if (filters.startDate) {
          matchesDate = matchesDate && itemDate >= new Date(filters.startDate).getTime();
        }
        if (filters.endDate) {
          const end = new Date(filters.endDate);
          end.setHours(23, 59, 59, 999);
          matchesDate = matchesDate && itemDate <= end.getTime();
        }
      }

      return matchesSearch && matchesCategory && matchesSku && matchesMinPrice && matchesMaxPrice && matchesDate;
    });
  }, [items, filters]);

  const handleAddItem = async () => {
    if (!currentOrg) return;
    
    // Check limits
    const limit = PLAN_LIMITS[currentOrg?.plan || 'trial'].inventory;
    if (items.length >= limit) {
      showNotification(`This business is on the ${currentOrg?.plan} plan which is limited to ${limit} products. Please upgrade to add more.`, 'error');
      return;
    }
    
    try {
      const now = new Date().toISOString();
      const id = await createDocument(`organizations/${currentOrg.id}/inventory`, {
        ...newItem,
        createdAt: now,
        updatedAt: now
      });
      if (id) {
        setIsAdding(false);
        setNewItem({ name: '', sku: '', quantity: 0, price: 0, cost: 0, category: '', imageUrl: '' });
        showNotification('Product saved successfully!');
        
        await createNotification(
          'inventory',
          'New Product Added',
          `${userProfile?.displayName || 'A user'} added a new product: ${newItem.name} (${newItem.quantity} units)`,
          { productId: id, name: newItem.name, quantity: newItem.quantity }
        );
      } else {
        showNotification('Failed to save product. Please check your permissions.', 'error');
      }
    } catch (error) {
      console.error('Error adding item:', error);
      showNotification('An error occurred while saving the product.', 'error');
    }
  };

  const handleUpdateItem = async () => {
    if (!currentOrg || !editingItem) return;
    try {
      const now = new Date().toISOString();
      const { id, ...data } = editingItem;
      const success = await updateDocument(`organizations/${currentOrg.id}/inventory`, id, {
        ...data,
        updatedAt: now
      });
      if (success) {
        setIsEditing(false);
        setEditingItem(null);
        showNotification('Product updated successfully!');
        
        await createNotification(
          'inventory',
          'Product Updated',
          `${userProfile?.displayName || 'A user'} updated product: ${data.name}`,
          { productId: id, name: data.name }
        );
      } else {
        showNotification('Failed to update product.', 'error');
      }
    } catch (error) {
      console.error('Error updating item:', error);
      showNotification('An error occurred while updating the product.', 'error');
    }
  };

  const handleDelete = async (item: InventoryItem) => {
    if (!currentOrg) return;
    try {
      await removeDocument(`organizations/${currentOrg.id}/inventory`, item.id);
      setLastDeleted(item);
      showNotification('Item deleted. You can undo this action.');
    } catch (error) {
      showNotification('Failed to delete item.', 'error');
    }
  };

  useEffect(() => {
    if (lastDeleted) {
      const timer = setTimeout(async () => {
        // Only delete file if it's still the same item being cleared
        if (lastDeleted.imageUrl) {
          await deleteFile(lastDeleted.imageUrl);
        }
        setLastDeleted(null);
      }, 10000);
      return () => clearTimeout(timer);
    }
  }, [lastDeleted]);

  const handleUndoDelete = async () => {
    if (!currentOrg || !lastDeleted) return;
    try {
      const { id, ...rest } = lastDeleted;
      await createDocument(`organizations/${currentOrg.id}/inventory`, rest);
      setLastDeleted(null);
      showNotification('Item restored successfully!');
    } catch (error) {
      showNotification('Failed to restore item.', 'error');
    }
  };

  const downloadStockPDF = () => {
    const doc = new jsPDF();
    const totalValue = filteredItems.reduce((sum, item) => sum + (item.quantity * item.price), 0);
    
    doc.setFontSize(18);
    doc.text('Inventory Stock Report', 14, 22);
    
    doc.setFontSize(11);
    doc.setTextColor(100);
    doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 30);
    doc.text(`Total Stock Value: ${formatCurrency(totalValue, currentOrg?.currency)}`, 14, 37);

    const tableData = filteredItems.map(item => [
      item.name,
      item.sku,
      item.category,
      item.quantity.toString(),
      formatCurrency(item.price, currentOrg?.currency),
      formatCurrency(item.quantity * item.price, currentOrg?.currency),
      item.quantity === 0 ? 'Out of Stock' : item.quantity <= 10 ? 'Low Stock' : 'Good'
    ]);

    autoTable(doc, {
      startY: 45,
      head: [['Product', 'SKU', 'Category', 'Stock', 'Price', 'Value', 'Status']],
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: [79, 70, 229] }
    });

    doc.save(`inventory-report-${new Date().toISOString().split('T')[0]}.pdf`);
  };

  const exportToExcel = () => {
    const data = filteredItems.map(item => ({
      Name: item.name,
      SKU: item.sku,
      Category: item.category,
      Quantity: item.quantity,
      Price: item.price,
      Cost: item.cost
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Inventory");
    XLSX.writeFile(wb, `inventory-template-${new Date().toISOString().split('T')[0]}.xlsx`);
    showNotification('Template downloaded successfully!');
  };

  const handleImportExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !currentOrg) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const data = new Uint8Array(event.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet) as any[];
        
        let importedCount = 0;
        const now = new Date().toISOString();
        const limit = PLAN_LIMITS[currentOrg?.plan || 'trial'].inventory;

        for (const row of jsonData) {
          if (items.length + importedCount >= limit) {
            showNotification(`Import partially completed: This business is on the ${currentOrg?.plan} plan which is limited to ${limit} products.`, 'error');
            break;
          }

          const name = row.Name || row.name || '';
          const sku = row.SKU || row.sku || '';
          const category = row.Category || row.category || '';
          const quantity = Number(row.Quantity || row.quantity || 0);
          const price = Number(row.Price || row.price || 0);
          const cost = Number(row.Cost || row.cost || 0);

          if (name) {
            await createDocument(`organizations/${currentOrg.id}/inventory`, {
              name, sku, category, quantity, price, cost,
              createdAt: now,
              updatedAt: now
            });
            importedCount++;
          }
        }

        showNotification(`Successfully imported ${importedCount} items!`);
        e.target.value = ''; // Reset input
      } catch (error) {
        console.error('Import failed:', error);
        showNotification('Failed to parse Excel file.', 'error');
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const getStatus = (qty: number) => {
    if (qty === 0) return { label: 'Out of Stock', color: 'bg-rose-500/10 text-rose-500' };
    if (qty <= 10) return { label: 'Available (Low)', color: 'bg-amber-500/10 text-amber-500' };
    return { label: 'Good', color: 'bg-emerald-500/10 text-emerald-500' };
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-4">
          {currentOrg?.logoUrl && (
            <img src={currentOrg.logoUrl} alt="Logo" className="h-12 w-auto object-contain" referrerPolicy="no-referrer" />
          )}
          <div>
            <h2 className="text-2xl font-bold text-zinc-100">Inventory Management</h2>
            <p className="text-sm text-zinc-500">Manage your products and stock levels</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
          {lastDeleted && (
            <button 
              onClick={handleUndoDelete}
              className="flex items-center gap-2 bg-amber-600/10 text-amber-500 border border-amber-500/20 px-4 py-2 rounded-xl hover:bg-amber-600/20 transition-colors"
            >
              <RotateCcw className="w-4 h-4" /> Undo Delete
            </button>
          )}
          <button 
            onClick={() => setShowFilters(!showFilters)}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-xl border transition-colors",
              showFilters ? "bg-zinc-800 border-zinc-700 text-zinc-100" : "bg-transparent border-zinc-800 text-zinc-500 hover:text-zinc-300"
            )}
          >
            <Filter className="w-4 h-4" /> Filters
          </button>
          {permissions.canManageInventory && (
            <>
              <button 
                onClick={exportToExcel}
                className="flex items-center gap-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-100 px-4 py-2 rounded-xl transition-colors border border-zinc-700"
                title="Download Excel template for re-upload"
              >
                <Download className="w-4 h-4 rotate-180" /> Download Template
              </button>
              <label className="flex items-center gap-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-100 px-4 py-2 rounded-xl transition-colors border border-zinc-700 cursor-pointer">
                <FileUp className="w-4 h-4" /> Upload Excel File
                <input 
                  type="file" 
                  accept=".xlsx, .xls, .csv" 
                  className="hidden" 
                  onChange={handleImportExcel}
                />
              </label>
            </>
          )}
          <button 
            onClick={downloadStockPDF}
            className="flex items-center gap-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-100 px-4 py-2 rounded-xl transition-colors border border-zinc-700"
          >
            <Download className="w-4 h-4" /> Export Report
          </button>
          {permissions.canManageInventory && (
            <button 
              onClick={() => setIsAdding(true)}
              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-xl transition-colors shadow-lg shadow-indigo-600/20"
            >
              <Plus className="w-4 h-4" /> Add Item
            </button>
          )}
        </div>
      </div>

      <AnimatePresence>
        {showFilters && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="bg-zinc-900/50 border border-zinc-800 p-6 rounded-2xl grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Search</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                  <input 
                    type="text" 
                    placeholder="Search name, SKU, category..."
                    value={filters.search}
                    onChange={(e) => setFilters({...filters, search: e.target.value})}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-xl pl-10 pr-4 py-2 text-sm text-zinc-100 focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-zinc-500 uppercase">Category</label>
                <input 
                  type="text" 
                  placeholder="Filter by category..."
                  value={filters.category}
                  onChange={(e) => setFilters({...filters, category: e.target.value})}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2 text-sm text-zinc-100 focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-zinc-500 uppercase">SKU</label>
                <input 
                  type="text" 
                  placeholder="Filter by SKU..."
                  value={filters.sku}
                  onChange={(e) => setFilters({...filters, sku: e.target.value})}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2 text-sm text-zinc-100 focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-zinc-500 uppercase">Price Range</label>
                <div className="flex gap-2">
                  <input 
                    type="number" 
                    placeholder="Min"
                    value={filters.minPrice}
                    onChange={(e) => setFilters({...filters, minPrice: e.target.value})}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2 text-sm text-zinc-100 focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                  <input 
                    type="number" 
                    placeholder="Max"
                    value={filters.maxPrice}
                    onChange={(e) => setFilters({...filters, maxPrice: e.target.value})}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2 text-sm text-zinc-100 focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-zinc-500 uppercase">Date Added</label>
                <div className="flex gap-2">
                  <input 
                    type="date" 
                    value={filters.startDate}
                    onChange={(e) => setFilters({...filters, startDate: e.target.value})}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2 text-sm text-zinc-100 focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                  <input 
                    type="date" 
                    value={filters.endDate}
                    onChange={(e) => setFilters({...filters, endDate: e.target.value})}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2 text-sm text-zinc-100 focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
              </div>
              <div className="lg:col-span-3 xl:col-span-5 flex justify-end">
                <button 
                  onClick={() => setFilters({ search: '', category: '', sku: '', minPrice: '', maxPrice: '', startDate: '', endDate: '' })}
                  className="text-xs font-bold text-zinc-500 hover:text-zinc-300 transition-colors"
                >
                  Reset Filters
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-x-auto custom-scrollbar">
        <table className="w-full text-left border-collapse min-w-[800px]">
          <thead>
            <tr className="bg-zinc-800/50 border-b border-zinc-800">
              <th className="px-6 py-4 text-xs font-bold text-zinc-400 uppercase tracking-wider">Product</th>
              <th className="px-6 py-4 text-xs font-bold text-zinc-400 uppercase tracking-wider">SKU</th>
              <th className="px-6 py-4 text-xs font-bold text-zinc-400 uppercase tracking-wider">Status</th>
              <th className="px-6 py-4 text-xs font-bold text-zinc-400 uppercase tracking-wider">Stock</th>
              <th className="px-6 py-4 text-xs font-bold text-zinc-400 uppercase tracking-wider">Price</th>
              <th className="px-6 py-4 text-xs font-bold text-zinc-400 uppercase tracking-wider">Cost</th>
              <th className="px-6 py-4 text-xs font-bold text-zinc-400 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800">
            {filteredItems.map((item) => {
              const status = getStatus(item.quantity);
              return (
                <tr 
                  key={item.id} 
                  id={`inv-${item.id}`}
                  className={cn(
                    "hover:bg-zinc-800/30 transition-colors group",
                    item.id === highlightedItemId && "bg-indigo-600/20 border-l-4 border-indigo-500"
                  )}
                  onClick={() => {
                    if (item.id === highlightedItemId) setHighlightedItemId(null);
                  }}
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-zinc-800 flex items-center justify-center overflow-hidden border border-zinc-700">
                        {item.imageUrl ? (
                          <a href={item.imageUrl} target="_blank" rel="noopener noreferrer" className="block w-full h-full">
                            <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                          </a>
                        ) : (
                          <ImageIcon className="w-5 h-5 text-zinc-600" />
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-zinc-100">{item.name}</p>
                        <p className="text-xs text-zinc-500">{item.category}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-zinc-400">{item.sku}</td>
                  <td className="px-6 py-4">
                    <span className={cn(
                      "px-2 py-1 rounded-full text-[10px] font-bold uppercase",
                      status.color
                    )}>
                      {status.label}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-zinc-300">
                    <span className="font-mono">{item.quantity}</span>
                  </td>
                  <td className="px-6 py-4 text-sm font-medium text-zinc-100">{formatCurrency(item.price, currentOrg?.currency)}</td>
                  <td className="px-6 py-4 text-sm text-zinc-400">{formatCurrency(item.cost, currentOrg?.currency)}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      {permissions.canManageInventory && (
                        <button 
                          onClick={() => {
                            setEditingItem(item);
                            setIsEditing(true);
                          }}
                          className="p-2 text-blue-500"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                      )}
                      {permissions.canDeleteInventory && (
                        <button onClick={() => handleDelete(item)} className="p-2 text-blue-500"><Trash2 className="w-4 h-4" /></button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
            {filteredItems.length === 0 && (
              <tr>
                <td colSpan={7} className="px-6 py-12 text-center text-zinc-500">
                  No products found matching your filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <AnimatePresence>
        {isAdding && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-zinc-900 border border-zinc-800 p-8 rounded-3xl max-w-lg w-full space-y-6 overflow-y-auto max-h-[90vh] custom-scrollbar"
            >
              <div className="flex justify-between items-center">
                <h3 className="text-xl font-bold text-zinc-100">Add New Product</h3>
                <button onClick={() => setIsAdding(false)} className="text-zinc-500 hover:text-zinc-200"><X className="w-6 h-6" /></button>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2 space-y-2">
                  <label className="text-xs font-bold text-zinc-500 uppercase">Product Name</label>
                  <input 
                    type="text" 
                    value={newItem.name}
                    onChange={(e) => setNewItem({...newItem, name: e.target.value})}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2 text-zinc-100 focus:ring-2 focus:ring-indigo-500 outline-none" 
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-zinc-500 uppercase">SKU</label>
                  <input 
                    type="text" 
                    value={newItem.sku}
                    onChange={(e) => setNewItem({...newItem, sku: e.target.value})}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2 text-zinc-100 focus:ring-2 focus:ring-indigo-500 outline-none" 
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-zinc-500 uppercase">Category</label>
                  <input 
                    type="text" 
                    value={newItem.category}
                    onChange={(e) => setNewItem({...newItem, category: e.target.value})}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2 text-zinc-100 focus:ring-2 focus:ring-indigo-500 outline-none" 
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-zinc-500 uppercase">Quantity</label>
                  <input 
                    type="number" 
                    value={newItem.quantity}
                    onChange={(e) => setNewItem({...newItem, quantity: Number(e.target.value)})}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2 text-zinc-100 focus:ring-2 focus:ring-indigo-500 outline-none" 
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-zinc-500 uppercase">Price</label>
                  <input 
                    type="number" 
                    value={newItem.price}
                    onChange={(e) => setNewItem({...newItem, price: Number(e.target.value)})}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2 text-zinc-100 focus:ring-2 focus:ring-indigo-500 outline-none" 
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-zinc-500 uppercase">Cost</label>
                  <input 
                    type="number" 
                    value={newItem.cost}
                    onChange={(e) => setNewItem({...newItem, cost: Number(e.target.value)})}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2 text-zinc-100 focus:ring-2 focus:ring-indigo-500 outline-none" 
                  />
                </div>

                <div className="col-span-2 space-y-2">
                  <label className="text-xs font-bold text-zinc-500 uppercase">Product Image</label>
                  <label className="flex flex-col items-center justify-center gap-2 p-4 border-2 border-dashed border-zinc-700 rounded-2xl hover:border-indigo-500 hover:bg-indigo-500/5 transition-all cursor-pointer group">
                    {uploading ? (
                      <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
                    ) : newItem.imageUrl ? (
                      <div className="relative w-full aspect-video rounded-lg overflow-hidden">
                        <img src={newItem.imageUrl} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <FileUp className="w-6 h-6 text-white" />
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center group-hover:bg-indigo-500/20 transition-colors">
                          <Camera className="w-5 h-5 text-zinc-400 group-hover:text-indigo-400" />
                        </div>
                        <div className="text-center">
                          <p className="text-sm font-medium text-zinc-300">Take Photo or Upload</p>
                          <p className="text-xs text-zinc-500">Tap to use camera or select file</p>
                        </div>
                      </>
                    )}
                    <input 
                      type="file" 
                      accept="image/*" 
                      capture="environment" 
                      onChange={(e) => handleFileUpload(e, false)}
                      className="hidden" 
                      disabled={uploading}
                    />
                  </label>
                </div>
              </div>
              <button 
                onClick={handleAddItem}
                className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 rounded-xl transition-colors"
              >
                Save Product
              </button>
            </motion.div>
          </div>
        )}

        {isEditing && editingItem && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-zinc-900 border border-zinc-800 p-8 rounded-3xl max-w-lg w-full space-y-6 overflow-y-auto max-h-[90vh] custom-scrollbar"
            >
              <div className="flex justify-between items-center">
                <h3 className="text-xl font-bold text-zinc-100">Edit Product</h3>
                <button onClick={() => { setIsEditing(false); setEditingItem(null); }} className="text-zinc-500 hover:text-zinc-200"><X className="w-6 h-6" /></button>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2 space-y-2">
                  <label className="text-xs font-bold text-zinc-500 uppercase">Product Name</label>
                  <input 
                    type="text" 
                    value={editingItem.name}
                    onChange={(e) => setEditingItem({...editingItem, name: e.target.value})}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2 text-zinc-100 focus:ring-2 focus:ring-indigo-500 outline-none" 
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-zinc-500 uppercase">SKU</label>
                  <input 
                    type="text" 
                    value={editingItem.sku}
                    onChange={(e) => setEditingItem({...editingItem, sku: e.target.value})}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2 text-zinc-100 focus:ring-2 focus:ring-indigo-500 outline-none" 
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-zinc-500 uppercase">Category</label>
                  <input 
                    type="text" 
                    value={editingItem.category}
                    onChange={(e) => setEditingItem({...editingItem, category: e.target.value})}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2 text-zinc-100 focus:ring-2 focus:ring-indigo-500 outline-none" 
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-zinc-500 uppercase">Quantity</label>
                  <input 
                    type="number" 
                    value={editingItem.quantity}
                    onChange={(e) => setEditingItem({...editingItem, quantity: Number(e.target.value)})}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2 text-zinc-100 focus:ring-2 focus:ring-indigo-500 outline-none" 
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-zinc-500 uppercase">Price</label>
                  <input 
                    type="number" 
                    value={editingItem.price}
                    onChange={(e) => setEditingItem({...editingItem, price: Number(e.target.value)})}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2 text-zinc-100 focus:ring-2 focus:ring-indigo-500 outline-none" 
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-zinc-500 uppercase">Cost</label>
                  <input 
                    type="number" 
                    value={editingItem.cost}
                    onChange={(e) => setEditingItem({...editingItem, cost: Number(e.target.value)})}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2 text-zinc-100 focus:ring-2 focus:ring-indigo-500 outline-none" 
                  />
                </div>

                <div className="col-span-2 space-y-2">
                  <label className="text-xs font-bold text-zinc-500 uppercase">Product Image</label>
                  <label className="flex flex-col items-center justify-center gap-2 p-4 border-2 border-dashed border-zinc-700 rounded-2xl hover:border-indigo-500 hover:bg-indigo-500/5 transition-all cursor-pointer group">
                    {uploading ? (
                      <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
                    ) : editingItem.imageUrl ? (
                      <div className="relative w-full aspect-video rounded-lg overflow-hidden">
                        <img src={editingItem.imageUrl} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <FileUp className="w-6 h-6 text-white" />
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center group-hover:bg-indigo-500/20 transition-colors">
                          <Camera className="w-5 h-5 text-zinc-400 group-hover:text-indigo-400" />
                        </div>
                        <div className="text-center">
                          <p className="text-sm font-medium text-zinc-300">Take Photo or Upload</p>
                          <p className="text-xs text-zinc-500">Tap to use camera or select file</p>
                        </div>
                      </>
                    )}
                    <input 
                      type="file" 
                      accept="image/*" 
                      capture="environment" 
                      onChange={(e) => handleFileUpload(e, true)}
                      className="hidden" 
                      disabled={uploading}
                    />
                  </label>
                </div>
              </div>
              <button 
                onClick={handleUpdateItem}
                className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 rounded-xl transition-colors"
              >
                Update Product
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Transactions({ showNotification, createNotification, permissions, highlightedTxId, setHighlightedTxId }: { showNotification: (m: string, t?: 'success' | 'error') => void, createNotification: any, permissions: any, highlightedTxId: string | null, setHighlightedTxId: (id: string | null) => void }) {
  const { currentOrg, userProfile, db } = useFirebase();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [newTx, setNewTx] = useState({ type: 'income' as 'income' | 'expense', amount: 0, category: '', description: '', date: new Date().toISOString().slice(0, 16) });
  
  const [selectedReceipt, setSelectedReceipt] = useState<ReceiptData | null>(null);
  const [selectedInvoice, setSelectedInvoice] = useState<Transaction | null>(null);
  const [loadingDoc, setLoadingDoc] = useState<string | null>(null);

  const [showFilters, setShowFilters] = useState(false);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'income' | 'expense'>('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  useEffect(() => {
    if (!currentOrg) return;
    return subscribeToCollection<Transaction>(
      `organizations/${currentOrg.id}/transactions`,
      [],
      setTransactions
    );
  }, [currentOrg]);

  const handleDeleteTransaction = async (tx: Transaction) => {
    if (!currentOrg) return;
    
    try {
      const success = await removeDocument(`organizations/${currentOrg.id}/transactions`, tx.id);
      if (success) {
        showNotification('Transaction deleted successfully');
        
        await createNotification(
          'system',
          'Transaction Deleted',
          `${userProfile?.displayName || 'A user'} deleted a ${tx.type} of ${tx.amount.toLocaleString()} ${currentOrg.currency}`,
          { txId: tx.id, amount: tx.amount, type: tx.type }
        );
      } else {
        showNotification('Failed to delete transaction', 'error');
      }
    } catch (error) {
      console.error('Error deleting transaction:', error);
      showNotification('An error occurred while deleting the transaction', 'error');
    }
  };

  useEffect(() => {
    if (highlightedTxId && transactions.length > 0) {
      // Clear filters to ensure the highlighted transaction is visible
      setSearch('');
      setTypeFilter('all');
      setStartDate('');
      setEndDate('');

      const timer = setTimeout(() => {
        const element = document.getElementById(`tx-${highlightedTxId}`);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [highlightedTxId, transactions]);

  const handleViewDoc = async (tx: Transaction) => {
    if (tx.id === highlightedTxId) {
      setHighlightedTxId(null);
    }
    if (!currentOrg) return;

    if (tx.type === 'expense') {
      setSelectedInvoice(tx);
      return;
    }

    if (tx.type === 'income') {
      if (tx.receiptId) {
        setLoadingDoc(tx.id);
        try {
          const receiptRef = doc(db, `organizations/${currentOrg.id}/receipts`, tx.receiptId);
          const receiptSnap = await getDoc(receiptRef);
          if (receiptSnap.exists()) {
            setSelectedReceipt({ id: receiptSnap.id, ...receiptSnap.data() } as ReceiptData);
          } else {
            showNotification('Receipt not found.', 'error');
          }
        } catch (error) {
          console.error('Error fetching receipt:', error);
          showNotification('Failed to load receipt.', 'error');
        } finally {
          setLoadingDoc(null);
        }
      } else {
        // Generate a generic receipt from transaction data if no receiptId exists
        const genericReceipt: ReceiptData = {
          id: `GEN-${tx.id.slice(0, 8)}`,
          transactionId: tx.id,
          items: [{ name: tx.category || 'General Sale', quantity: 1, price: tx.amount, total: tx.amount }],
          subtotal: tx.amount,
          tax: 0,
          total: tx.amount,
          paymentMethod: 'Other',
          date: tx.date,
          cashierName: 'System',
          createdAt: tx.createdAt || tx.date,
          updatedAt: tx.updatedAt || tx.date
        };
        setSelectedReceipt(genericReceipt);
      }
    }
  };

  const filteredTransactions = transactions.filter(tx => {
    const matchesSearch = !search || 
      tx.description?.toLowerCase().includes(search.toLowerCase()) || 
      tx.category?.toLowerCase().includes(search.toLowerCase());
    
    const matchesType = typeFilter === 'all' || tx.type === typeFilter;
    
    const txDate = new Date(tx.date);
    const matchesStartDate = !startDate || txDate >= new Date(startDate);
    const matchesEndDate = !endDate || txDate <= new Date(endDate + 'T23:59:59');
    
    return matchesSearch && matchesType && matchesStartDate && matchesEndDate;
  }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const handleAddTx = async () => {
    if (!currentOrg) return;
    try {
      const now = new Date().toISOString();
      const id = await createDocument(`organizations/${currentOrg.id}/transactions`, {
        ...newTx,
        date: new Date(newTx.date).toISOString(),
        createdAt: now,
        updatedAt: now
      });
      if (id) {
        setIsAdding(false);
        setNewTx({ type: 'income', amount: 0, category: '', description: '', date: new Date().toISOString().slice(0, 16) });
        showNotification('Transaction recorded successfully!');
        
        await createNotification(
          newTx.type === 'income' ? 'sale' : 'expense',
          newTx.type === 'income' ? 'New Income Recorded' : 'New Expense Recorded',
          `${userProfile?.displayName || 'A user'} recorded a ${newTx.type}: ${newTx.description || newTx.category} of ${currentOrg?.currency || 'UGX'} ${newTx.amount.toLocaleString()}`,
          { txId: id, amount: newTx.amount, type: newTx.type }
        );
      } else {
        showNotification('Failed to record transaction. Please check your permissions.', 'error');
      }
    } catch (error) {
      console.error('Error adding transaction:', error);
      showNotification('An error occurred while recording the transaction.', 'error');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          {currentOrg?.logoUrl && (
            <img src={currentOrg.logoUrl} alt="Logo" className="h-12 w-auto object-contain" referrerPolicy="no-referrer" />
          )}
          <div>
            <h2 className="text-2xl font-bold text-zinc-100">Transactions Ledger</h2>
            <p className="text-sm text-zinc-500">Record and track all business finances</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setShowFilters(!showFilters)}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-xl border transition-colors",
              showFilters ? "bg-zinc-800 border-zinc-700 text-zinc-100" : "bg-transparent border-zinc-800 text-zinc-500 hover:text-zinc-300"
            )}
          >
            <Filter className="w-4 h-4" /> Filters
          </button>
          <button 
            onClick={() => setIsAdding(true)}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-xl transition-colors shadow-lg shadow-indigo-600/20"
          >
            <Plus className="w-4 h-4" /> Record Transaction
          </button>
        </div>
      </div>

      <AnimatePresence>
        {showFilters && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="bg-zinc-900/50 border border-zinc-800 p-6 rounded-2xl grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Search</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                  <input 
                    type="text"
                    placeholder="Search description or category..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-xl pl-10 pr-4 py-2 text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Type</label>
                <select 
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value as any)}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2 text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all"
                >
                  <option value="all">All Types</option>
                  <option value="income">Income</option>
                  <option value="expense">Expense</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Start Date</label>
                <input 
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2 text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">End Date</label>
                <input 
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2 text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all"
                />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-x-auto custom-scrollbar">
        <table className="w-full text-left border-collapse min-w-[600px]">
          <thead>
            <tr className="bg-zinc-800/50 border-b border-zinc-800">
              <th className="px-6 py-4 text-xs font-bold text-zinc-400 uppercase tracking-wider">Date</th>
              <th className="px-6 py-4 text-xs font-bold text-zinc-400 uppercase tracking-wider">Description</th>
              <th className="px-6 py-4 text-xs font-bold text-zinc-400 uppercase tracking-wider">Category</th>
              <th className="px-6 py-4 text-xs font-bold text-zinc-400 uppercase tracking-wider">Type</th>
              <th className="px-6 py-4 text-xs font-bold text-zinc-400 uppercase tracking-wider">Amount</th>
              <th className="px-6 py-4 text-xs font-bold text-zinc-400 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800">
            {filteredTransactions.map((tx) => (
              <tr 
                key={tx.id} 
                id={`tx-${tx.id}`}
                className={cn(
                  "hover:bg-zinc-800/30 transition-colors",
                  tx.id === highlightedTxId && "bg-indigo-600/20 border-l-4 border-indigo-500"
                )}
                onClick={() => {
                  if (tx.id === highlightedTxId) setHighlightedTxId(null);
                }}
              >
                <td className="px-6 py-4 text-sm text-zinc-400">{formatDate(tx.date)}</td>
                <td className="px-6 py-4 text-sm text-zinc-100">{tx.description}</td>
                <td className="px-6 py-4 text-sm text-zinc-400">{tx.category}</td>
                <td className="px-6 py-4">
                  <span className={cn(
                    "px-2 py-1 rounded-full text-[10px] font-bold uppercase",
                    tx.type === 'income' ? "bg-emerald-500/10 text-emerald-500" : "bg-rose-500/10 text-rose-500"
                  )}>
                    {tx.type}
                  </span>
                </td>
                <td className={cn(
                  "px-6 py-4 text-sm font-bold",
                  tx.type === 'income' ? "text-emerald-500" : "text-rose-500"
                )}>
                  {tx.type === 'income' ? '+' : '-'}{formatCurrency(tx.amount, currentOrg?.currency)}
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => handleViewDoc(tx)}
                      disabled={loadingDoc === tx.id}
                      className="flex items-center gap-2 text-xs font-bold text-indigo-400 hover:text-indigo-300 transition-colors disabled:opacity-50"
                    >
                      {loadingDoc === tx.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <>
                          <FileText className="w-4 h-4" />
                          {tx.type === 'income' ? 'Receipt' : 'Invoice'}
                        </>
                      )}
                    </button>
                    {permissions.canDeleteTransactions && (
                      <button 
                        onClick={() => handleDeleteTransaction(tx)}
                        className="p-2 text-rose-500 hover:text-rose-400 transition-colors"
                        title="Delete Transaction"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <AnimatePresence>
        {selectedReceipt && (
          <ReceiptModal receipt={selectedReceipt} onClose={() => setSelectedReceipt(null)} />
        )}
        {selectedInvoice && (
          <InvoiceModal transaction={selectedInvoice} onClose={() => setSelectedInvoice(null)} />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isAdding && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-zinc-900 border border-zinc-800 p-8 rounded-3xl max-w-lg w-full space-y-6"
            >
              <div className="flex justify-between items-center">
                <h3 className="text-xl font-bold text-zinc-100">Record Transaction</h3>
                <button onClick={() => setIsAdding(false)} className="text-zinc-500 hover:text-zinc-200"><X className="w-6 h-6" /></button>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2 flex p-1 bg-zinc-800 rounded-xl">
                  <button 
                    onClick={() => setNewTx({...newTx, type: 'income'})}
                    className={cn(
                      "flex-1 py-2 rounded-lg text-sm font-bold transition-all",
                      newTx.type === 'income' ? "bg-emerald-600 text-white shadow-lg" : "text-zinc-500 hover:text-zinc-300"
                    )}
                  >Income</button>
                  <button 
                    onClick={() => setNewTx({...newTx, type: 'expense'})}
                    className={cn(
                      "flex-1 py-2 rounded-lg text-sm font-bold transition-all",
                      newTx.type === 'expense' ? "bg-rose-600 text-white shadow-lg" : "text-zinc-500 hover:text-zinc-300"
                    )}
                  >Expense</button>
                </div>
                <div className="col-span-2 space-y-2">
                  <label className="text-xs font-bold text-zinc-500 uppercase">Amount</label>
                  <input 
                    type="number" 
                    value={newTx.amount}
                    onChange={(e) => setNewTx({...newTx, amount: Number(e.target.value)})}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2 text-zinc-100 focus:ring-2 focus:ring-indigo-500 outline-none" 
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-zinc-500 uppercase">Category</label>
                  <input 
                    type="text" 
                    value={newTx.category}
                    onChange={(e) => setNewTx({...newTx, category: e.target.value})}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2 text-zinc-100 focus:ring-2 focus:ring-indigo-500 outline-none" 
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-zinc-500 uppercase">Date & Time</label>
                  <input 
                    type="datetime-local" 
                    value={newTx.date}
                    onChange={(e) => setNewTx({...newTx, date: e.target.value})}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2 text-zinc-100 focus:ring-2 focus:ring-indigo-500 outline-none" 
                  />
                </div>
                <div className="col-span-2 space-y-2">
                  <label className="text-xs font-bold text-zinc-500 uppercase">Description</label>
                  <textarea 
                    value={newTx.description}
                    onChange={(e) => setNewTx({...newTx, description: e.target.value})}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2 text-zinc-100 focus:ring-2 focus:ring-indigo-500 outline-none h-24 resize-none" 
                  />
                </div>
              </div>
              <button 
                onClick={handleAddTx}
                className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 rounded-xl transition-colors"
              >
                Record Entry
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

// --- POS View ---
const POSView = ({ currentOrg, showNotification, createNotification, userProfile, permissions }: { currentOrg: any, showNotification: (m: string, t?: 'success' | 'error') => void, createNotification: any, userProfile: any, permissions: any }) => {
  const { user } = useFirebase();
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [cart, setCart] = useState<{item: InventoryItem, quantity: number}[]>([]);
  const [search, setSearch] = useState('');
  const [lastReceipt, setLastReceipt] = useState<ReceiptData | null>(null);
  const [amountPaid, setAmountPaid] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<'Cash' | 'Card' | 'MTN Mobile Money'>('Cash');
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState('');

  useEffect(() => {
    if (!currentOrg) return;
    return subscribeToCollection<InventoryItem>(
      `organizations/${currentOrg.id}/inventory`,
      [],
      setInventory
    );
  }, [currentOrg]);

  const filteredInventory = search.trim() === '' ? [] : inventory.filter(item => 
    item.name.toLowerCase().includes(search.toLowerCase()) || 
    item.sku.toLowerCase().includes(search.toLowerCase())
  );

  const addToCart = (item: InventoryItem) => {
    if (item.quantity <= 0) return;
    setCart(prev => {
      const existing = prev.find(i => i.item.id === item.id);
      if (existing) {
        if (existing.quantity >= item.quantity) return prev;
        return prev.map(i => i.item.id === item.id ? { ...i, quantity: i.quantity + 1 } : i);
      }
      return [...prev, { item, quantity: 1 }];
    });
  };

  const removeFromCart = (itemId: string) => {
    setCart(prev => prev.filter(i => i.item.id !== itemId));
  };

  const updateCartQuantity = (itemId: string, delta: number) => {
    setCart(prev => prev.map(i => {
      if (i.item.id === itemId) {
        const newQty = Math.max(1, Math.min(i.item.quantity, i.quantity + delta));
        return { ...i, quantity: newQty };
      }
      return i;
    }));
  };

  const total = cart.reduce((sum, i) => sum + (i.item.price * i.quantity), 0);
  const paid = Number(amountPaid) || 0;
  const balance = Math.max(0, paid - total);

  const handleCheckout = async () => {
    if (!currentOrg || cart.length === 0) return;
    if (paid < total) {
      showNotification('Insufficient amount paid.', 'error');
      return;
    }

    setIsProcessingPayment(true);
    try {
      if (paymentMethod === 'MTN Mobile Money') {
        if (!phoneNumber) {
          showNotification('Please enter an MTN phone number.', 'error');
          setIsProcessingPayment(false);
          return;
        }

        showNotification('Initiating MTN Mobile Money payment...', 'success');
        const referenceId = await mtnMoMoService.requestToPay(
          total,
          currentOrg.currency || 'UGX',
          phoneNumber,
          `POS-${Date.now()}`
        );

        // Polling for status
        let status: 'SUCCESSFUL' | 'FAILED' | 'PENDING' = 'PENDING';
        let attempts = 0;
        const maxAttempts = 12; // 1 minute (5s * 12)

        while (status === 'PENDING' && attempts < maxAttempts) {
          await new Promise(resolve => setTimeout(resolve, 5000));
          status = await mtnMoMoService.getTransactionStatus(referenceId);
          attempts++;
        }

        if (status !== 'SUCCESSFUL') {
          throw new Error(`MTN Payment ${status === 'PENDING' ? 'timed out' : 'failed'}.`);
        }
      }

      const now = new Date().toISOString();
      // 1. Create transaction
      const txId = await createDocument(`organizations/${currentOrg.id}/transactions`, {
        type: 'income',
        amount: total,
        category: 'Sales',
        description: `POS Sale: ${cart.map(i => `${i.quantity}x ${i.item.name}`).join(', ')}`,
        items: cart.map(i => ({
          id: i.item.id,
          name: i.item.name,
          quantity: i.quantity,
          price: i.item.price,
          cost: i.item.cost
        })),
        date: now,
        createdAt: now,
        updatedAt: now,
        paymentMethod: paymentMethod,
        phoneNumber: paymentMethod === 'MTN Mobile Money' ? phoneNumber : null
      });

      if (!txId) throw new Error('Failed to create transaction');

      // Create notification for sale
      await createNotification(
        'sale',
        'New Sale Made',
        `${userProfile?.displayName || 'A user'} made a sale of ${currentOrg.currency || 'UGX'} ${total.toLocaleString()}`,
        { txId, total, itemsCount: cart.length }
      );

      // 2. Create Receipt
      const receiptData = {
        transactionId: txId,
        items: cart.map(i => ({
          name: i.item.name,
          quantity: i.quantity,
          price: i.item.price,
          total: i.item.price * i.quantity
        })),
        subtotal: total,
        tax: 0,
        total: total,
        amountPaid: paid,
        balance: balance,
        paymentMethod: paymentMethod,
        date: now,
        cashierName: user?.displayName || user?.email || 'Staff',
        createdAt: now,
        updatedAt: now
      };

      const receiptId = await createDocument(`organizations/${currentOrg.id}/receipts`, receiptData);
      
      if (receiptId) {
        setLastReceipt({ ...receiptData, id: receiptId });
        // Link receipt back to transaction
        await updateDocument(`organizations/${currentOrg.id}/transactions`, txId, { 
          receiptId,
          updatedAt: now
        });
      }

      // 3. Update inventory
      for (const cartItem of cart) {
        await updateDocument(
          `organizations/${currentOrg.id}/inventory`,
          cartItem.item.id,
          { 
            quantity: cartItem.item.quantity - cartItem.quantity,
            updatedAt: now
          }
        );
      }

      setCart([]);
      setAmountPaid('');
      setPhoneNumber('');
      showNotification('Sale processed successfully!');
    } catch (error: any) {
      console.error('Checkout failed:', error);
      let errorMessage = error.message || 'Failed to process sale.';
      try {
        const parsed = JSON.parse(error.message);
        if (parsed.error.includes('insufficient permissions')) {
          errorMessage = `Permission denied on ${parsed.path || 'unknown path'}. Please check your staff role.`;
        }
      } catch (e) {
        // Not a JSON error
      }
      showNotification(errorMessage, 'error');
    } finally {
      setIsProcessingPayment(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 min-h-[calc(100vh-12rem)]">
      <AnimatePresence>
        {lastReceipt && (
          <ReceiptModal receipt={lastReceipt} onClose={() => setLastReceipt(null)} />
        )}
      </AnimatePresence>
      {/* Product Selection */}
      <div className="lg:col-span-2 flex flex-col space-y-4">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
          <input 
            type="text" 
            placeholder="Search products by name, SKU or scan barcode..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && filteredInventory.length === 1) {
                addToCart(filteredInventory[0]);
                setSearch('');
              }
            }}
            className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl pl-12 pr-4 py-4 text-zinc-100 focus:ring-2 focus:ring-indigo-500 outline-none"
          />
        </div>

        <div className="flex-1 overflow-y-auto pr-2">
          {search.trim() === '' ? (
            <div className="h-full flex flex-col items-center justify-center text-center space-y-4 opacity-30 py-20">
              <Search className="w-16 h-16" />
              <p className="text-lg font-bold">Start typing to search products</p>
            </div>
          ) : filteredInventory.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center space-y-4 opacity-30 py-20">
              <AlertTriangle className="w-16 h-16" />
              <p className="text-lg font-bold">No products found for "{search}"</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {filteredInventory.map(item => (
                <motion.button 
                  key={item.id}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => addToCart(item)}
                  disabled={item.quantity <= 0}
                  className={cn(
                    "bg-zinc-900 border border-zinc-800 p-4 rounded-2xl text-left space-y-2 transition-all hover:border-indigo-500/50 group relative overflow-hidden",
                    item.quantity <= 0 && "opacity-50 grayscale cursor-not-allowed"
                  )}
                >
                  <div className="flex justify-between items-start">
                    <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider">{item.category}</span>
                    <span className={cn(
                      "text-[10px] font-bold px-1.5 py-0.5 rounded",
                      item.quantity > 10 ? "bg-emerald-500/10 text-emerald-500" : "bg-amber-500/10 text-amber-500"
                    )}>
                      {item.quantity} in stock
                    </span>
                  </div>
                  <h4 className="font-bold text-zinc-100 line-clamp-1">{item.name}</h4>
                  <p className="text-lg font-black text-indigo-400">{formatCurrency(item.price, currentOrg?.currency)}</p>
                  <div className="absolute inset-0 bg-indigo-600/0 group-hover:bg-indigo-600/5 transition-colors" />
                </motion.button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Cart / Checkout */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-[32px] flex flex-col shadow-2xl h-fit sticky top-24">
        <div className="p-6 border-b border-zinc-800 flex justify-between items-center">
          <h3 className="text-xl font-bold text-zinc-100 flex items-center gap-2">
            <ShoppingCart className="w-6 h-6 text-indigo-500" />
            Current Cart
          </h3>
          <div className="flex items-center gap-3">
            {cart.length > 0 && (
              <motion.button 
                whileTap={{ scale: 0.9 }}
                onClick={() => setCart([])}
                className="text-xs font-bold text-rose-500 hover:text-rose-400 transition-colors"
              >
                Clear
              </motion.button>
            )}
            <motion.span 
              key={cart.length}
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              className="bg-zinc-800 text-zinc-400 text-xs font-bold px-2 py-1 rounded-lg"
            >
              {cart.length} items
            </motion.span>
          </div>
        </div>

        <div className="p-6 space-y-4">
          <AnimatePresence initial={false}>
            {cart.length === 0 ? (
              <motion.div 
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.3 }}
                exit={{ opacity: 0 }}
                className="h-full flex flex-col items-center justify-center text-center space-y-4"
              >
                <ShoppingCart className="w-12 h-12 text-indigo-500" />
                <p className="text-sm font-medium text-indigo-400">Your cart is empty.<br/>Select products to start a sale.</p>
              </motion.div>
            ) : (
              cart.map(item => (
                <motion.div 
                  key={item.item.id}
                  layout
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="flex items-center gap-4 group"
                >
                  <div className="flex-1 min-w-0">
                    <h5 className="text-sm font-bold text-zinc-100 truncate">{item.item.name}</h5>
                    <p className="text-xs text-zinc-500">{formatCurrency(item.item.price, currentOrg?.currency)} each</p>
                  </div>
                  <div className="flex items-center gap-2 bg-zinc-800 rounded-lg p-1">
                    <motion.button 
                      whileTap={{ scale: 0.8 }}
                      onClick={() => updateCartQuantity(item.item.id, -1)}
                      className="w-6 h-6 flex items-center justify-center text-zinc-400 hover:text-white"
                    >-</motion.button>
                    <span className="text-xs font-bold w-6 text-center">{item.quantity}</span>
                    <motion.button 
                      whileTap={{ scale: 0.8 }}
                      onClick={() => updateCartQuantity(item.item.id, 1)}
                      className="w-6 h-6 flex items-center justify-center text-zinc-400 hover:text-white"
                    >+</motion.button>
                  </div>
                  <motion.button 
                    whileTap={{ scale: 0.8 }}
                    onClick={() => removeFromCart(item.item.id)}
                    className="text-zinc-600 hover:text-rose-500 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </motion.button>
                </motion.div>
              ))
            )}
          </AnimatePresence>
        </div>

        <div className="p-6 bg-zinc-800/50 border-t border-zinc-800 space-y-4">
          <div className="flex justify-between items-center text-zinc-400 text-sm">
            <span>Subtotal</span>
            <span>{formatCurrency(total, currentOrg?.currency)}</span>
          </div>
          
          {cart.length > 0 && (
            <div className="space-y-4 pt-2 border-t border-zinc-700/50">
              <div className="space-y-2">
                <label className="text-xs font-bold text-zinc-500 uppercase">Payment Method</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['Cash', 'Card', 'MTN Mobile Money'] as const).map((method) => (
                    <button
                      key={method}
                      onClick={() => {
                        setPaymentMethod(method);
                        if (method === 'MTN Mobile Money') setAmountPaid(total.toString());
                      }}
                      className={cn(
                        "px-2 py-2 rounded-xl text-[10px] font-bold transition-all border",
                        paymentMethod === method 
                          ? "bg-indigo-600 border-indigo-500 text-white" 
                          : "bg-zinc-800 border-zinc-700 text-zinc-400 hover:border-zinc-600"
                      )}
                    >
                      {method}
                    </button>
                  ))}
                </div>
              </div>

              {paymentMethod === 'MTN Mobile Money' && (
                <div className="space-y-2">
                  <label className="text-xs font-bold text-zinc-500 uppercase">MTN Phone Number</label>
                  <input 
                    type="tel" 
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    placeholder="e.g. 077XXXXXXX"
                    className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-4 py-2 text-sm text-zinc-100 focus:ring-1 focus:ring-indigo-500 outline-none"
                  />
                </div>
              )}

              <div className="flex justify-between items-center">
                <label className="text-xs font-bold text-zinc-500 uppercase">
                  {paymentMethod === 'MTN Mobile Money' ? 'Amount to Charge' : 'Amount Paid'}
                </label>
                <div className="relative w-32">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 text-sm">
                    {getCurrencySymbol(currentOrg?.currency)}
                  </span>
                  <input 
                    type="number" 
                    value={amountPaid}
                    onChange={(e) => setAmountPaid(e.target.value)}
                    placeholder="0.00"
                    disabled={paymentMethod === 'MTN Mobile Money'}
                    className="w-full bg-zinc-900 border border-zinc-700 rounded-lg pl-8 pr-3 py-2 text-sm text-zinc-100 focus:ring-1 focus:ring-indigo-500 outline-none text-right disabled:opacity-50"
                  />
                </div>
              </div>
              
              {paymentMethod !== 'MTN Mobile Money' && (
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-zinc-500 uppercase">Balance (Change)</span>
                  <span className={cn(
                    "text-sm font-bold",
                    balance > 0 ? "text-emerald-500" : "text-zinc-500"
                  )}>
                    {formatCurrency(balance, currentOrg?.currency)}
                  </span>
                </div>
              )}
            </div>
          )}

          <div className="flex justify-between items-center text-zinc-100 text-xl font-black pt-2">
            <span>Total</span>
            <motion.span 
              key={total}
              initial={{ scale: 1.1, color: '#818cf8' }}
              animate={{ scale: 1, color: '#818cf8' }}
              className="text-indigo-400"
            >
              {formatCurrency(total, currentOrg?.currency)}
            </motion.span>
          </div>
          <motion.button 
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleCheckout}
            disabled={cart.length === 0 || (paymentMethod !== 'MTN Mobile Money' && paid < total) || isProcessingPayment}
            className={cn(
              "w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:grayscale text-white font-bold py-4 rounded-2xl transition-all shadow-xl shadow-indigo-900/20 flex items-center justify-center gap-2",
              isProcessingPayment && "cursor-wait"
            )}
          >
            {isProcessingPayment ? (
              <>
                <RefreshCw className="w-5 h-5 animate-spin" />
                Processing Payment...
              </>
            ) : (
              <>
                <CreditCard className="w-5 h-5" />
                {paid < total && cart.length > 0 && paymentMethod !== 'MTN Mobile Money' 
                  ? `Pay ${formatCurrency(total - paid, currentOrg?.currency)} more` 
                  : 'Checkout & Process Sale'}
              </>
            )}
          </motion.button>
        </div>
      </div>
      </div>
    </div>
  );
};

function Damages({ showNotification, createNotification, permissions, highlightedDamageId, setHighlightedDamageId }: { showNotification: (m: string, t?: 'success' | 'error') => void, createNotification: any, permissions: any, highlightedDamageId: string | null, setHighlightedDamageId: (id: string | null) => void }) {
  const { currentOrg, userProfile } = useFirebase();
  const [damages, setDamages] = useState<DamageRecord[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [newDamage, setNewDamage] = useState({ itemId: '', quantity: 1, reason: '', imageUrl: '' });
  const [isEditing, setIsEditing] = useState(false);
  const [editingDamage, setEditingDamage] = useState<DamageRecord | null>(null);
  const [uploading, setUploading] = useState(false);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, isEdit = false) => {
    const file = e.target.files?.[0];
    if (!file || !currentOrg) return;

    if (file.size > 10 * 1024 * 1024) { // 10MB limit
      showNotification('File is too large. Please select an image smaller than 10MB.', 'error');
      return;
    }

    setUploading(true);
    try {
      const optimizedFile = await compressImage(file, 0.5, 1200); // Max 500KB for damage evidence
      const storageRef = ref(storage, `organizations/${currentOrg.id}/damages/${Date.now()}_${file.name}`);
      await uploadBytes(storageRef, optimizedFile);
      const url = await getDownloadURL(storageRef);
      if (isEdit && editingDamage) {
        // Delete old image if it exists
        if (editingDamage.imageUrl) {
          await deleteFile(editingDamage.imageUrl);
        }
        setEditingDamage({ ...editingDamage, imageUrl: url });
      } else {
        // Delete previous uploaded image if user uploads multiple before saving
        if (newDamage.imageUrl) {
          await deleteFile(newDamage.imageUrl);
        }
        setNewDamage(prev => ({ ...prev, imageUrl: url }));
      }
      showNotification('Image uploaded successfully!');
    } catch (error) {
      console.error('Upload error:', error);
      showNotification('Failed to upload image.', 'error');
    } finally {
      setUploading(false);
    }
  };

  useEffect(() => {
    if (!currentOrg) return;
    const unsubDamages = subscribeToCollection<DamageRecord>(
      `organizations/${currentOrg.id}/damages`,
      [],
      setDamages
    );
    const unsubInventory = subscribeToCollection<InventoryItem>(
      `organizations/${currentOrg.id}/inventory`,
      [],
      setInventory
    );
    return () => {
      unsubDamages();
      unsubInventory();
    };
  }, [currentOrg]);

  useEffect(() => {
    if (highlightedDamageId && damages.length > 0) {
      const timer = setTimeout(() => {
        const element = document.getElementById(`dmg-${highlightedDamageId}`);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [highlightedDamageId, damages]);

  const handleRecordDamage = async () => {
    if (!currentOrg || !newDamage.itemId) return;
    
    const item = inventory.find(i => i.id === newDamage.itemId);
    if (!item) return;

    if (item.quantity < newDamage.quantity) {
      showNotification('Not enough stock to record this damage.', 'error');
      return;
    }

    try {
      const now = new Date().toISOString();
      const damageId = await createDocument(`organizations/${currentOrg.id}/damages`, {
        ...newDamage,
        itemName: item.name,
        cost: item.cost,
        date: now,
        createdAt: now,
        updatedAt: now
      });

      await createNotification(
        'damage',
        'Damage Recorded',
        `${userProfile?.displayName || 'A user'} recorded damage for ${item.name}: ${newDamage.quantity} units`,
        { damageId, itemName: item.name, quantity: newDamage.quantity }
      );

      await updateDocument(`organizations/${currentOrg.id}/inventory`, item.id, {
        quantity: item.quantity - newDamage.quantity,
        updatedAt: now
      });

      setIsRecording(false);
      setNewDamage({ itemId: '', quantity: 1, reason: '', imageUrl: '' });
      showNotification('Damage recorded and stock updated!');
    } catch (error) {
      showNotification('Failed to record damage.', 'error');
    }
  };

  const handleDeleteDamage = async (damage: DamageRecord) => {
    if (!currentOrg) return;
    try {
      // Delete evidence image if it exists
      if (damage.imageUrl) {
        await deleteFile(damage.imageUrl);
      }
      const item = inventory.find(i => i.id === damage.itemId);
      if (item) {
        await updateDocument(`organizations/${currentOrg.id}/inventory`, item.id, {
          quantity: item.quantity + damage.quantity,
          updatedAt: new Date().toISOString()
        });
      }
      await removeDocument(`organizations/${currentOrg.id}/damages`, damage.id);
      showNotification('Damage record deleted and stock restored!');
    } catch (error) {
      showNotification('Failed to delete damage record.', 'error');
    }
  };

  const handleUpdateDamage = async () => {
    if (!currentOrg || !editingDamage) return;
    try {
      const originalDamage = damages.find(d => d.id === editingDamage.id);
      if (!originalDamage) return;

      const item = inventory.find(i => i.id === editingDamage.itemId);
      if (item) {
        const qtyDiff = editingDamage.quantity - originalDamage.quantity;
        if (item.quantity < qtyDiff) {
          showNotification('Not enough stock to update this damage.', 'error');
          return;
        }
        await updateDocument(`organizations/${currentOrg.id}/inventory`, item.id, {
          quantity: item.quantity - qtyDiff,
          updatedAt: new Date().toISOString()
        });
      }

      const { id, ...data } = editingDamage;
      await updateDocument(`organizations/${currentOrg.id}/damages`, id, {
        ...data,
        updatedAt: new Date().toISOString()
      });
      setIsEditing(false);
      setEditingDamage(null);
      showNotification('Damage record updated!');
    } catch (error) {
      showNotification('Failed to update damage record.', 'error');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          {currentOrg?.logoUrl && (
            <img src={currentOrg.logoUrl} alt="Logo" className="h-12 w-auto object-contain" referrerPolicy="no-referrer" />
          )}
          <div>
            <h2 className="text-2xl font-bold text-zinc-100">Damage Records</h2>
            <p className="text-sm text-zinc-500">Track and manage damaged stock</p>
          </div>
        </div>
        <button 
          onClick={() => setIsRecording(true)}
          className="flex items-center gap-2 bg-rose-600 hover:bg-rose-500 text-white px-4 py-2 rounded-xl transition-colors shadow-lg shadow-rose-600/20"
        >
          <AlertTriangle className="w-4 h-4" /> Record Damage
        </button>
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-x-auto custom-scrollbar">
        <table className="w-full text-left border-collapse min-w-[800px]">
          <thead>
            <tr className="bg-zinc-800/50 border-b border-zinc-800">
              <th className="px-6 py-4 text-xs font-bold text-zinc-400 uppercase tracking-wider">Item</th>
              <th className="px-6 py-4 text-xs font-bold text-zinc-400 uppercase tracking-wider">Quantity</th>
              <th className="px-6 py-4 text-xs font-bold text-zinc-400 uppercase tracking-wider">Reason</th>
              <th className="px-6 py-4 text-xs font-bold text-zinc-400 uppercase tracking-wider">Evidence</th>
              <th className="px-6 py-4 text-xs font-bold text-zinc-400 uppercase tracking-wider">Date</th>
              <th className="px-6 py-4 text-xs font-bold text-zinc-400 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800">
            {damages.map((damage) => (
              <tr 
                key={damage.id} 
                id={`dmg-${damage.id}`}
                className={cn(
                  "hover:bg-zinc-800/30 transition-colors group",
                  damage.id === highlightedDamageId && "bg-indigo-600/20 border-l-4 border-indigo-500"
                )}
                onClick={() => {
                  if (damage.id === highlightedDamageId) setHighlightedDamageId(null);
                }}
              >
                <td className="px-6 py-4 text-sm font-medium text-zinc-100">{damage.itemName}</td>
                <td className="px-6 py-4 text-sm text-rose-400 font-mono">-{damage.quantity}</td>
                <td className="px-6 py-4 text-sm text-zinc-400">{damage.reason || 'No reason provided'}</td>
                <td className="px-6 py-4">
                  {damage.imageUrl ? (
                    <a href={damage.imageUrl} target="_blank" rel="noopener noreferrer" className="block w-10 h-10 rounded-lg overflow-hidden border border-zinc-700 hover:border-indigo-500 transition-colors">
                      <img src={damage.imageUrl} alt="Damage evidence" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    </a>
                  ) : (
                    <span className="text-xs text-zinc-600 italic">No image</span>
                  )}
                </td>
                <td className="px-6 py-4 text-sm text-zinc-500">{new Date(damage.date).toLocaleString()}</td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    {permissions.canManageDamages && (
                      <button 
                        onClick={() => {
                          setEditingDamage(damage);
                          setIsEditing(true);
                        }}
                        className="p-2 text-blue-500"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                    )}
                    {permissions.canDeleteDamages && (
                      <button 
                        onClick={() => handleDeleteDamage(damage)}
                        className="p-2 text-rose-500"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {damages.length === 0 && (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-zinc-500">No damage records found.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <AnimatePresence>
        {isRecording && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-zinc-900 border border-zinc-800 p-8 rounded-3xl max-w-lg w-full space-y-6"
            >
              <div className="flex justify-between items-center">
                <h3 className="text-xl font-bold text-zinc-100">Record Damaged Stock</h3>
                <button onClick={() => setIsRecording(false)} className="text-zinc-500 hover:text-zinc-200"><X className="w-6 h-6" /></button>
              </div>
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-zinc-500 uppercase">Select Item</label>
                  <select 
                    value={newDamage.itemId}
                    onChange={(e) => setNewDamage({...newDamage, itemId: e.target.value})}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2 text-zinc-100 focus:ring-2 focus:ring-rose-500 outline-none"
                  >
                    <option value="">Select a product...</option>
                    {inventory.map(item => (
                      <option key={item.id} value={item.id}>{item.name} ({item.quantity} in stock)</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-zinc-500 uppercase">Quantity Damaged</label>
                  <input 
                    type="number" 
                    min="1"
                    value={newDamage.quantity}
                    onChange={(e) => setNewDamage({...newDamage, quantity: Number(e.target.value)})}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2 text-zinc-100 focus:ring-2 focus:ring-rose-500 outline-none"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-zinc-500 uppercase">Reason / Description</label>
                  <textarea 
                    value={newDamage.reason}
                    onChange={(e) => setNewDamage({...newDamage, reason: e.target.value})}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2 text-zinc-100 focus:ring-2 focus:ring-rose-500 outline-none h-24 resize-none"
                    placeholder="Describe the damage..."
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-zinc-500 uppercase">Evidence (Photo)</label>
                  <label className="flex flex-col items-center justify-center gap-2 p-4 border-2 border-dashed border-zinc-700 rounded-2xl hover:border-indigo-500 hover:bg-indigo-500/5 transition-all cursor-pointer group">
                    {uploading ? (
                      <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
                    ) : newDamage.imageUrl ? (
                      <div className="relative w-full aspect-video rounded-lg overflow-hidden">
                        <img src={newDamage.imageUrl} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <FileUp className="w-6 h-6 text-white" />
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center group-hover:bg-indigo-500/20 transition-colors">
                          <Camera className="w-5 h-5 text-zinc-400 group-hover:text-indigo-400" />
                        </div>
                        <div className="text-center">
                          <p className="text-sm font-medium text-zinc-300">Take Photo or Upload</p>
                          <p className="text-xs text-zinc-500">Tap to use camera or select file</p>
                        </div>
                      </>
                    )}
                    <input 
                      type="file" 
                      accept="image/*" 
                      capture="environment" 
                      onChange={handleFileUpload}
                      className="hidden" 
                      disabled={uploading}
                    />
                  </label>
                </div>
              </div>
              <button 
                onClick={handleRecordDamage}
                disabled={!newDamage.itemId || newDamage.quantity <= 0}
                className="w-full bg-rose-600 hover:bg-rose-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3 rounded-xl transition-colors"
              >
                Record Damage & Reduce Stock
              </button>
            </motion.div>
          </div>
        )}

        {isEditing && editingDamage && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-zinc-900 border border-zinc-800 p-8 rounded-3xl max-w-lg w-full space-y-6"
            >
              <div className="flex justify-between items-center">
                <h3 className="text-xl font-bold text-zinc-100">Edit Damage Record</h3>
                <button onClick={() => { setIsEditing(false); setEditingDamage(null); }} className="text-zinc-500 hover:text-zinc-200"><X className="w-6 h-6" /></button>
              </div>
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-zinc-500 uppercase">Item</label>
                  <input 
                    type="text" 
                    value={editingDamage.itemName}
                    disabled
                    className="w-full bg-zinc-800/50 border border-zinc-800 rounded-xl px-4 py-2 text-zinc-500 cursor-not-allowed outline-none"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-zinc-500 uppercase">Quantity Damaged</label>
                  <input 
                    type="number" 
                    min="1"
                    value={editingDamage.quantity}
                    onChange={(e) => setEditingDamage({...editingDamage, quantity: Number(e.target.value)})}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2 text-zinc-100 focus:ring-2 focus:ring-rose-500 outline-none"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-zinc-500 uppercase">Reason / Description</label>
                  <textarea 
                    value={editingDamage.reason}
                    onChange={(e) => setEditingDamage({...editingDamage, reason: e.target.value})}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2 text-zinc-100 focus:ring-2 focus:ring-rose-500 outline-none h-24 resize-none"
                    placeholder="Describe the damage..."
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-zinc-500 uppercase">Evidence (Photo)</label>
                  <label className="flex flex-col items-center justify-center gap-2 p-4 border-2 border-dashed border-zinc-700 rounded-2xl hover:border-indigo-500 hover:bg-indigo-500/5 transition-all cursor-pointer group">
                    {uploading ? (
                      <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
                    ) : editingDamage.imageUrl ? (
                      <div className="relative w-full aspect-video rounded-lg overflow-hidden">
                        <img src={editingDamage.imageUrl} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <FileUp className="w-6 h-6 text-white" />
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center group-hover:bg-indigo-500/20 transition-colors">
                          <Camera className="w-5 h-5 text-zinc-400 group-hover:text-indigo-400" />
                        </div>
                        <div className="text-center">
                          <p className="text-sm font-medium text-zinc-300">Take Photo or Upload</p>
                          <p className="text-xs text-zinc-500">Tap to use camera or select file</p>
                        </div>
                      </>
                    )}
                    <input 
                      type="file" 
                      accept="image/*" 
                      capture="environment" 
                      onChange={(e) => handleFileUpload(e, true)}
                      className="hidden" 
                      disabled={uploading}
                    />
                  </label>
                </div>
              </div>
              <button 
                onClick={handleUpdateDamage}
                disabled={editingDamage.quantity <= 0}
                className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3 rounded-xl transition-colors"
              >
                Update Damage Record
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function HelpCard({ title, description, steps }: { title: string, description: string, steps: string[] }) {
  return (
    <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl space-y-4">
      <h3 className="text-xl font-bold text-zinc-100">{title}</h3>
      <p className="text-sm text-zinc-400 leading-relaxed">{description}</p>
      <ul className="space-y-2">
        {steps.map((step, i) => (
          <li key={i} className="flex gap-3 text-sm text-zinc-300">
            <span className="flex-shrink-0 w-5 h-5 rounded-full bg-indigo-600/20 text-indigo-400 flex items-center justify-center text-[10px] font-bold">{i + 1}</span>
            {step}
          </li>
        ))}
      </ul>
    </div>
  );
}

function HelpSection() {
  const { userProfile } = useFirebase();
  // Using the GitHub profile image
  const developerImage = "https://github.com/MikeTymer.png";

  return (
    <div className="max-w-5xl space-y-12 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="p-4 bg-indigo-600/10 rounded-3xl">
            <HelpCircle className="w-10 h-10 text-indigo-500" />
          </div>
          <div>
            <h2 className="text-4xl font-black text-zinc-100 tracking-tight">Help Center</h2>
            <p className="text-zinc-400 text-lg">Master your business with JENA POS v2.0</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <button 
            onClick={() => window.open('https://median.co/share/bnkaoey#apk', '_blank')}
            className="flex items-center gap-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-100 px-6 py-3 rounded-2xl transition-all border border-zinc-700 font-bold shadow-lg"
          >
            <Download className="w-5 h-5" /> Download App
          </button>
          <div className="flex items-center gap-2 px-4 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-full">
            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
            <span className="text-emerald-500 text-xs font-bold uppercase tracking-widest">System Online & Updated</span>
          </div>
        </div>
      </div>

      {/* Recent Updates Banner */}
      <div className="bg-indigo-600 p-8 rounded-[2.5rem] relative overflow-hidden group">
        <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform duration-500">
          <Sparkles className="w-32 h-32 text-white" />
        </div>
        <div className="relative z-10 space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/20 rounded-full text-white text-[10px] font-bold uppercase tracking-widest">
            New Update
          </div>
          <h3 className="text-3xl font-black text-white">Professional Financial Reporting</h3>
          <p className="text-white/80 max-w-2xl text-lg leading-relaxed">
            We've upgraded our reporting engine to follow international accounting standards. 
            You now have access to professional Income Statements, Balance Sheets, and Cash Flow tracking.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <HelpCard 
          title="Financial Statements" 
          description="Redesigned reports page with GAAP/IFRS compliant financial statements."
          steps={[
            "Income Statement: View Revenue, COGS, and Net Profit",
            "Balance Sheet: Track Assets, Liabilities, and Equity",
            "Cash Flow: Monitor actual cash movement",
            "Export PDF: Generate professional reports for stakeholders"
          ]}
        />
        <HelpCard 
          title="Performance Analytics" 
          description="Dynamic charts that adapt to your selected time period (7d, 30d, 90d, All)."
          steps={[
            "Weekly/Monthly Performance: Track income vs expense trends",
            "Revenue by Category: See which products drive your business",
            "Peak Sales Hour: Identify your busiest times of day",
            "Period Filtering: Analyze quarterly or yearly growth"
          ]}
        />
        <HelpCard 
          title="Damage Management" 
          description="Track inventory losses and their impact on your bottom line."
          steps={[
            "Record damages directly from the 'Damages' tab",
            "Automatic stock adjustment upon recording",
            "Losses are automatically added to the Income Statement",
            "Historical cost tracking for accurate financial reporting"
          ]}
        />
        <HelpCard 
          title="Inventory & POS" 
          description="Efficient sales processing and robust stock control."
          steps={[
            "POS: Quick search and multi-item checkout",
            "Inventory: Low-stock alerts and cost tracking",
            "Receipts: Automatic generation for every transaction",
            "Categories: Organize products for better reporting"
          ]}
        />
      </div>

      <div className="bg-zinc-900 border border-zinc-800 p-10 rounded-[2.5rem] space-y-8">
        <div className="flex items-center gap-6">
          <div className="p-4 bg-indigo-600/10 rounded-2xl">
            <Users className="w-10 h-10 text-indigo-500" />
          </div>
          <div>
            <h3 className="text-3xl font-black text-zinc-100 tracking-tight">About Developer</h3>
            <p className="text-zinc-400 text-lg">The vision behind the platform</p>
          </div>
        </div>
        
        <div className="flex flex-col lg:flex-row gap-12 items-center lg:items-start">
          <div className="w-48 h-48 rounded-[3rem] bg-zinc-800 border-8 border-zinc-800/50 flex items-center justify-center overflow-hidden shrink-0 shadow-2xl rotate-3 hover:rotate-0 transition-transform duration-500">
            <img 
              src={developerImage} 
              alt="Micheal Sakwa" 
              className="w-full h-full object-cover scale-110"
              referrerPolicy="no-referrer"
            />
          </div>
          <div className="space-y-6">
            <h4 className="text-2xl font-black text-zinc-100">Micheal Sakwa</h4>
            <p className="text-zinc-400 leading-relaxed text-lg italic">
              "My mission is to democratize professional business tools for every entrepreneur."
            </p>
            <p className="text-zinc-400 leading-relaxed">
              Micheal Sakwa is a visionary software developer dedicated to building innovative solutions that empower small businesses. 
              With a focus on user experience and robust financial accuracy, he creates tools that simplify complex business processes. 
              JENA POS is a testament to his commitment to delivering high-quality, scalable software that addresses real-world challenges.
            </p>
            <div className="flex flex-wrap gap-6 pt-4">
              <a href="https://github.com/MikeTymer" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-indigo-400 hover:text-indigo-300 font-bold transition-colors">
                <Github className="w-5 h-5" />
                <span>GitHub Profile</span>
              </a>
              <div className="flex items-center gap-2 text-zinc-500">
                <Code2 className="w-5 h-5" />
                <span>Software Engineer & Product Designer</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const PLAN_LIMITS = {
  trial: { orgs: 1, inventory: 1000, staff: Infinity },
  starter: { orgs: 1, inventory: 1000, staff: Infinity },
  business: { orgs: 4, inventory: 5000, staff: Infinity },
  enterprise: { orgs: Infinity, inventory: Infinity, staff: Infinity }
};

const PLAN_DETAILS = {
  trial: { price: 0, limits: PLAN_LIMITS.trial, label: 'Trial', features: ['3-month Free Trial', 'Basic POS', 'Inventory', 'Reports'] },
  starter: { price: 8000, limits: PLAN_LIMITS.starter, label: 'Starter', features: ['POS Sales', 'Inventory', 'Reports', '1 Business'] },
  business: { price: 20000, limits: PLAN_LIMITS.business, label: 'Business', features: ['POS', 'Inventory', 'Reports', 'Expense Tracking', '4 Businesses'] },
  enterprise: { price: 80000, limits: PLAN_LIMITS.enterprise, label: 'Enterprise', features: ['All Features', 'Unlimited Businesses', 'Priority Support'] }
};

function getPlanPrice(ugxPrice: number, currency?: string) {
  if (ugxPrice === 0) return 'Free';
  const effectiveCurrency = currency || 'UGX';
  
  // Fixed conversion rates from UGX (approximate)
  const rates: Record<string, number> = {
    'UGX': 1,
    'USD': 1 / 3800,
    'GBP': 1 / 4800,
    'EUR': 1 / 4100,
    'NGN': 1 / 2.5,
    'KES': 1 / 28,
    'ZAR': 1 / 200,
    'GHS': 1 / 280,
    'CAD': 1 / 2800,
    'AUD': 1 / 2500,
  };

  const rate = rates[effectiveCurrency] || 1; 
  const convertedAmount = ugxPrice * rate;
  
  return `${formatCurrency(convertedAmount, effectiveCurrency)}/mo`;
}

interface Notification {
  id: string;
  type: 'sale' | 'login' | 'logout' | 'system' | 'inventory' | 'damage' | 'expense';
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  metadata?: any;
}

function SalesAnalytics() {
  const { currentOrg } = useFirebase();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [period, setPeriod] = useState<'day' | 'week' | 'month' | 'year'>('month');

  useEffect(() => {
    if (!currentOrg) return;
    return subscribeToCollection<Transaction>(
      `organizations/${currentOrg.id}/transactions`,
      [],
      setTransactions
    );
  }, [currentOrg]);

  const sales = useMemo(() => transactions.filter(t => t.type === 'income'), [transactions]);

  const stats = useMemo(() => {
    const now = new Date();
    const filtered = sales.filter(s => {
      const d = new Date(s.date);
      if (period === 'day') return d.toDateString() === now.toDateString();
      if (period === 'week') {
        const weekAgo = new Date();
        weekAgo.setDate(now.getDate() - 7);
        return d >= weekAgo;
      }
      if (period === 'month') return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      return d.getFullYear() === now.getFullYear();
    });

    const total = filtered.reduce((acc, s) => acc + s.amount, 0);

    // Best selling products
    const productCounts: Record<string, { qty: number; revenue: number }> = {};
    filtered.forEach(s => {
      if (s.items) {
        s.items.forEach(item => {
          if (!productCounts[item.name]) productCounts[item.name] = { qty: 0, revenue: 0 };
          productCounts[item.name].qty += item.quantity;
          productCounts[item.name].revenue += item.price * item.quantity;
        });
      }
    });
    const bestProducts = Object.entries(productCounts)
      .sort((a, b) => b[1].qty - a[1].qty)
      .slice(0, 5);

    // Best selling days
    const dayCounts: Record<string, number> = {};
    filtered.forEach(s => {
      const day = new Date(s.date).toLocaleDateString('en-US', { weekday: 'long' });
      dayCounts[day] = (dayCounts[day] || 0) + s.amount;
    });
    const bestDays = Object.entries(dayCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    return { total, bestProducts, bestDays };
  }, [sales, period]);

  const trendData = useMemo(() => {
    const now = new Date();
    let periods: string[] = [];
    let format: (d: Date) => string;

    if (period === 'day') {
      periods = Array.from({ length: 24 }, (_, i) => `${i}:00`);
      format = (d) => `${d.getHours()}:00`;
    } else if (period === 'week') {
      periods = Array.from({ length: 7 }, (_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - (6 - i));
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${y}-${m}-${day}`;
      });
      format = (d) => d.toLocaleDateString('en-US', { weekday: 'short' });
    } else if (period === 'month') {
      periods = Array.from({ length: 30 }, (_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - (29 - i));
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${y}-${m}-${day}`;
      });
      format = (d) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    } else {
      periods = Array.from({ length: 12 }, (_, i) => {
        const d = new Date();
        d.setMonth(d.getMonth() - (11 - i));
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      });
      format = (d) => d.toLocaleDateString('en-US', { month: 'short' });
    }

    const groupedSales = sales.reduce((acc, tx) => {
      let key = '';
      const txDate = new Date(tx.date);
      if (period === 'day') {
        if (txDate.toDateString() !== now.toDateString()) return acc;
        key = `${txDate.getHours()}:00`;
      } else if (period === 'year') {
        key = `${txDate.getFullYear()}-${String(txDate.getMonth() + 1).padStart(2, '0')}`;
      } else {
        const y = txDate.getFullYear();
        const m = String(txDate.getMonth() + 1).padStart(2, '0');
        const d = String(txDate.getDate()).padStart(2, '0');
        key = `${y}-${m}-${d}`;
      }

      if (!acc[key]) acc[key] = 0;
      acc[key] += tx.amount;
      return acc;
    }, {} as Record<string, number>);

    return periods.map(p => {
      const amount = groupedSales[p] || 0;
      let name = p;
      if (period !== 'day') {
        const parts = p.split('-').map(Number);
        const date = parts.length === 3 
          ? new Date(parts[0], parts[1] - 1, parts[2]) 
          : new Date(parts[0], parts[1] - 1, 1);
        name = format(date);
      }
      
      return {
        name,
        sales: amount,
        fullDate: p
      };
    });
  }, [sales, period]);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-indigo-600/10 rounded-2xl">
            <TrendingUp className="w-8 h-8 text-indigo-500" />
          </div>
          <div>
            <h2 className="text-3xl font-bold text-zinc-100">Sales Analytics</h2>
            <p className="text-zinc-400">Detailed breakdown of your revenue performance</p>
          </div>
        </div>
        <div className="flex bg-zinc-900 p-1 rounded-xl border border-zinc-800">
          {(['day', 'week', 'month', 'year'] as const).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={cn(
                "px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-lg transition-all",
                period === p ? "bg-indigo-600 text-white" : "text-zinc-500 hover:text-zinc-300"
              )}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-bold text-zinc-100">Sales Trend</h3>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 px-3 py-1 bg-emerald-500/10 rounded-full">
              <div className="w-2 h-2 rounded-full bg-emerald-500" />
              <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-wider">Total Sales: {formatCurrency(stats.total, currentOrg?.currency)}</span>
            </div>
          </div>
        </div>
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={trendData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
              <XAxis 
                dataKey="name" 
                stroke="#71717a" 
                fontSize={10} 
                tickLine={false} 
                axisLine={false}
                interval={period === 'month' ? 4 : (period === 'year' ? 1 : 0)}
              />
              <YAxis 
                stroke="#71717a" 
                fontSize={10} 
                tickLine={false} 
                axisLine={false}
                tickFormatter={(v) => `${getCurrencySymbol(currentOrg?.currency)}${v}`}
              />
              <Tooltip 
                contentStyle={{ backgroundColor: '#18181b', border: '1px solid #27272a', borderRadius: '12px', fontSize: '12px' }}
                itemStyle={{ color: '#f4f4f5' }}
                cursor={{ stroke: '#4f46e5', strokeWidth: 2 }}
              />
              <Line 
                type="monotone" 
                dataKey="sales" 
                name="Sales" 
                stroke="#4f46e5" 
                strokeWidth={3} 
                dot={{ fill: '#4f46e5', strokeWidth: 2, r: 4 }}
                activeDot={{ r: 6, strokeWidth: 0 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl md:col-span-2">
          <h3 className="text-lg font-bold text-zinc-100 mb-6">Best Selling Products</h3>
          <div className="space-y-4">
            {stats.bestProducts.length === 0 ? (
              <p className="text-zinc-500 text-center py-10">No sales data for this period</p>
            ) : stats.bestProducts.map(([name, data]) => (
              <div key={name} className="flex items-center justify-between p-4 bg-zinc-800/50 rounded-xl border border-zinc-800/50 hover:border-indigo-500/30 transition-colors">
                <div>
                  <p className="font-bold text-zinc-100">{name}</p>
                  <p className="text-xs text-zinc-500">{data.qty} units sold</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-indigo-400">{formatCurrency(data.revenue, currentOrg?.currency)}</p>
                  <p className="text-[10px] text-zinc-500 uppercase tracking-widest">Revenue</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl">
          <h3 className="text-lg font-bold text-zinc-100 mb-6">Best Selling Days</h3>
          <div className="space-y-4">
            {stats.bestDays.length === 0 ? (
              <p className="text-zinc-500 text-center py-10">No sales data</p>
            ) : stats.bestDays.map(([day, amount]) => (
              <div key={day} className="flex items-center justify-between p-4 bg-zinc-800/50 rounded-xl border border-zinc-800/50">
                <p className="font-bold text-zinc-100">{day}</p>
                <div className="text-right">
                  <p className="font-bold text-emerald-400">{formatCurrency(amount, currentOrg?.currency)}</p>
                  <p className="text-[10px] text-zinc-500 uppercase tracking-widest">Total</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function ExpensesAnalytics() {
  const { currentOrg } = useFirebase();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [period, setPeriod] = useState<'day' | 'week' | 'month' | 'year'>('month');

  useEffect(() => {
    if (!currentOrg) return;
    return subscribeToCollection<Transaction>(
      `organizations/${currentOrg.id}/transactions`,
      [],
      setTransactions
    );
  }, [currentOrg]);

  const expenses = useMemo(() => transactions.filter(t => t.type === 'expense'), [transactions]);

  const stats = useMemo(() => {
    const now = new Date();
    const filtered = expenses.filter(s => {
      const d = new Date(s.date);
      if (period === 'day') return d.toDateString() === now.toDateString();
      if (period === 'week') {
        const weekAgo = new Date();
        weekAgo.setDate(now.getDate() - 7);
        return d >= weekAgo;
      }
      if (period === 'month') return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      return d.getFullYear() === now.getFullYear();
    });

    const total = filtered.reduce((acc, s) => acc + s.amount, 0);

    // Most expenditure category
    const catCounts: Record<string, number> = {};
    filtered.forEach(s => {
      catCounts[s.category] = (catCounts[s.category] || 0) + s.amount;
    });
    const topCategories = Object.entries(catCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    // Most expenditure days
    const dayCounts: Record<string, number> = {};
    filtered.forEach(s => {
      const day = new Date(s.date).toLocaleDateString('en-US', { weekday: 'long' });
      dayCounts[day] = (dayCounts[day] || 0) + s.amount;
    });
    const topDays = Object.entries(dayCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    return { total, topCategories, topDays };
  }, [expenses, period]);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-rose-600/10 rounded-2xl">
            <TrendingDown className="w-8 h-8 text-rose-500" />
          </div>
          <div>
            <h2 className="text-3xl font-bold text-zinc-100">Expenses Analytics</h2>
            <p className="text-zinc-400">Detailed breakdown of your business costs</p>
          </div>
        </div>
        <div className="flex bg-zinc-900 p-1 rounded-xl border border-zinc-800">
          {(['day', 'week', 'month', 'year'] as const).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={cn(
                "px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-lg transition-all",
                period === p ? "bg-indigo-600 text-white" : "text-zinc-500 hover:text-zinc-300"
              )}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl md:col-span-2">
          <h3 className="text-lg font-bold text-zinc-100 mb-6">Top Expenditure Categories</h3>
          <div className="space-y-4">
            {stats.topCategories.length === 0 ? (
              <p className="text-zinc-500 text-center py-10">No expense data for this period</p>
            ) : stats.topCategories.map(([name, amount]) => (
              <div key={name} className="flex items-center justify-between p-4 bg-zinc-800/50 rounded-xl border border-zinc-800/50 hover:border-rose-500/30 transition-colors">
                <p className="font-bold text-zinc-100">{name}</p>
                <div className="text-right">
                  <p className="font-bold text-rose-400">{formatCurrency(amount, currentOrg?.currency)}</p>
                  <p className="text-[10px] text-zinc-500 uppercase tracking-widest">Total Cost</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl">
          <h3 className="text-lg font-bold text-zinc-100 mb-6">Most Expenditure Days</h3>
          <div className="space-y-4">
            {stats.topDays.length === 0 ? (
              <p className="text-zinc-500 text-center py-10">No expense data</p>
            ) : stats.topDays.map(([day, amount]) => (
              <div key={day} className="flex items-center justify-between p-4 bg-zinc-800/50 rounded-xl border border-zinc-800/50">
                <p className="font-bold text-zinc-100">{day}</p>
                <div className="text-right">
                  <p className="font-bold text-rose-400">{formatCurrency(amount, currentOrg?.currency)}</p>
                  <p className="text-[10px] text-zinc-500 uppercase tracking-widest">Total</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function ProfitAnalytics() {
  const { currentOrg } = useFirebase();
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  useEffect(() => {
    if (!currentOrg) return;
    return subscribeToCollection<Transaction>(
      `organizations/${currentOrg.id}/transactions`,
      [],
      setTransactions
    );
  }, [currentOrg]);

  const saleProfits = useMemo(() => {
    return transactions
      .filter(t => t.type === 'income' && t.items)
      .map(t => {
        const cost = t.items!.reduce((acc, item) => acc + (item.cost * item.quantity), 0);
        const profit = t.amount - cost;
        return { ...t, profit };
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [transactions]);

  const totalProfit = useMemo(() => saleProfits.reduce((acc, s) => acc + s.profit, 0), [saleProfits]);

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-4">
        <div className="p-3 bg-emerald-600/10 rounded-2xl">
          <Wallet className="w-8 h-8 text-emerald-500" />
        </div>
        <div>
          <h2 className="text-3xl font-bold text-zinc-100">Profit Analytics</h2>
          <p className="text-zinc-400">Detailed breakdown of profit generated per sale</p>
        </div>
      </div>
      
      <div className="bg-zinc-900 border border-zinc-800 rounded-3xl overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-zinc-800/50 border-b border-zinc-800">
                <th className="px-6 py-5 text-xs font-bold text-zinc-500 uppercase tracking-widest">Date</th>
                <th className="px-6 py-5 text-xs font-bold text-zinc-500 uppercase tracking-widest">Items Sold</th>
                <th className="px-6 py-5 text-xs font-bold text-zinc-500 uppercase tracking-widest text-right">Revenue</th>
                <th className="px-6 py-5 text-xs font-bold text-zinc-500 uppercase tracking-widest text-right">Net Profit</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {saleProfits.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-20 text-center text-zinc-500">No sales data available for profit calculation</td>
                </tr>
              ) : saleProfits.map((sale) => (
                <tr key={sale.id} className="hover:bg-zinc-800/30 transition-colors group">
                  <td className="px-6 py-4 text-sm text-zinc-400">{formatDate(sale.date)}</td>
                  <td className="px-6 py-4">
                    <div className="flex flex-wrap gap-1">
                      {sale.items?.map((i, idx) => (
                        <span key={idx} className="inline-flex items-center px-2 py-0.5 rounded-md bg-zinc-800 text-[10px] font-bold text-zinc-300 border border-zinc-700">
                          {i.name} x{i.quantity}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm font-medium text-zinc-100 text-right">
                    {formatCurrency(sale.amount, currentOrg?.currency)}
                  </td>
                  <td className="px-6 py-4 text-sm font-bold text-emerald-500 text-right">
                    {formatCurrency(sale.profit, currentOrg?.currency)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-emerald-600/5 border-t border-emerald-600/20">
                <td colSpan={3} className="px-6 py-8 text-xl font-black text-zinc-100 text-right uppercase tracking-widest">Total Net Profit</td>
                <td className="px-6 py-8 text-2xl font-black text-emerald-500 text-right">
                  {formatCurrency(totalProfit, currentOrg?.currency)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}

function AffiliateView({ user, showNotification, setActiveTab }: { user: any, showNotification: (m: string, t?: 'success' | 'error') => void, setActiveTab: (tab: any) => void }) {
  const [affiliate, setAffiliate] = useState<any>(null);
  const [referrals, setReferrals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isJoining, setIsJoining] = useState(false);

  useEffect(() => {
    if (!user) return;

    const affiliateRef = doc(db, 'affiliates', user.uid);
    const unsubscribeAffiliate = onSnapshot(affiliateRef, (doc) => {
      if (doc.exists()) {
        setAffiliate(doc.data());
      }
      setLoading(false);
    }, (error) => {
      console.error('Error listening to affiliate data:', error);
      setLoading(false);
    });

    const referralsQuery = query(collection(db, 'referrals'), where('affiliateUid', '==', user.uid));
    const unsubscribeReferrals = onSnapshot(referralsQuery, (snapshot) => {
      setReferrals(snapshot.docs.map(d => d.data()));
    }, (error) => {
      console.error('Error listening to referrals:', error);
    });

    return () => {
      unsubscribeAffiliate();
      unsubscribeReferrals();
    };
  }, [user]);

  const handleJoinProgram = async () => {
    if (!user) return;
    setIsJoining(true);
    try {
      const affiliateCode = Math.random().toString(36).substring(2, 8).toUpperCase();
      const newAffiliate = {
        uid: user.uid,
        affiliateCode,
        status: 'active',
        totalEarnings: 0,
        unpaidEarnings: 0,
        totalClicks: 0,
        createdAt: new Date().toISOString()
      };
      await setDocument('affiliates', user.uid, newAffiliate);
      setAffiliate(newAffiliate);
      showNotification('Successfully joined the affiliate program!');
    } catch (error) {
      console.error('Error joining affiliate program:', error);
      showNotification('Failed to join the program.', 'error');
    } finally {
      setIsJoining(false);
    }
  };

  const copyReferralLink = () => {
    if (!affiliate) return;
    const link = `${window.location.origin}?ref=${affiliate.affiliateCode}`;
    navigator.clipboard.writeText(link);
    showNotification('Referral link copied to clipboard!');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
      </div>
    );
  }

  if (!affiliate) {
    return (
      <div className="max-w-4xl mx-auto py-12 px-4">
        <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-8 md:p-12 text-center space-y-8 shadow-2xl">
          <div className="w-20 h-20 bg-indigo-600/10 rounded-2xl flex items-center justify-center mx-auto border border-indigo-600/20">
            <Share2 className="w-10 h-10 text-indigo-500" />
          </div>
          <div className="space-y-4">
            <h2 className="text-4xl font-black text-zinc-100 uppercase tracking-tighter">Join Our Affiliate Program</h2>
            <p className="text-zinc-400 text-lg max-w-2xl mx-auto">
              Share JENA POS with your network and earn a <span className="text-indigo-500 font-bold">10% commission</span> for every business that signs up and makes their one-time payment.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
            <div className="p-6 bg-zinc-800/50 rounded-2xl border border-zinc-700/50">
              <div className="w-10 h-10 bg-emerald-500/10 rounded-xl flex items-center justify-center mb-4">
                <Plus className="w-5 h-5 text-emerald-500" />
              </div>
              <h3 className="font-bold text-zinc-100 mb-2">1. Sign Up</h3>
              <p className="text-xs text-zinc-400 leading-relaxed">Join the program with one click and get your unique referral code.</p>
            </div>
            <div className="p-6 bg-zinc-800/50 rounded-2xl border border-zinc-700/50">
              <div className="w-10 h-10 bg-blue-500/10 rounded-xl flex items-center justify-center mb-4">
                <Share2 className="w-5 h-5 text-blue-500" />
              </div>
              <h3 className="font-bold text-zinc-100 mb-2">2. Share Link</h3>
              <p className="text-xs text-zinc-400 leading-relaxed">Share your referral link with business owners and managers.</p>
            </div>
            <div className="p-6 bg-zinc-800/50 rounded-2xl border border-zinc-700/50">
              <div className="w-10 h-10 bg-amber-500/10 rounded-xl flex items-center justify-center mb-4">
                <DollarSign className="w-5 h-5 text-amber-500" />
              </div>
              <h3 className="font-bold text-zinc-100 mb-2">3. Get Paid (10%)</h3>
              <p className="text-xs text-zinc-400 leading-relaxed">Earn a 10% commission for every referred user who completes their one-time payment. Paid via Mobile Money.</p>
            </div>
          </div>
          <button
            onClick={handleJoinProgram}
            disabled={isJoining}
            className="bg-indigo-600 hover:bg-indigo-500 text-white font-black py-4 px-12 rounded-2xl transition-all hover:scale-[1.02] active:scale-[0.98] uppercase tracking-widest shadow-xl shadow-indigo-600/20 disabled:opacity-50"
          >
            {isJoining ? 'Joining...' : 'Become an Affiliate'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-20">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-indigo-600/10 rounded-2xl">
            <Share2 className="w-8 h-8 text-indigo-500" />
          </div>
          <div>
            <h2 className="text-3xl font-bold text-zinc-100">Affiliate Dashboard</h2>
            <p className="text-zinc-400">Track your referrals and earnings</p>
          </div>
        </div>
        <div className="flex items-center gap-3 bg-zinc-900 border border-zinc-800 p-2 rounded-2xl">
          <div className="px-4 py-2 bg-zinc-800 rounded-xl">
            <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Your Code</p>
            <p className="text-lg font-black text-indigo-500 font-mono">{affiliate.affiliateCode}</p>
          </div>
          <button
            onClick={copyReferralLink}
            className="p-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl transition-colors shadow-lg shadow-indigo-600/20"
            title="Copy Link"
          >
            <Copy className="w-5 h-5" />
          </button>
          <button
            onClick={() => setActiveTab('affiliate-referrals')}
            className="p-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 rounded-xl transition-colors border border-zinc-700"
            title="View Registered Referrals"
          >
            <Users className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-3xl shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-emerald-500/10 rounded-xl">
              <DollarSign className="w-5 h-5 text-emerald-500" />
            </div>
            <span className="text-[10px] font-bold text-emerald-500 bg-emerald-500/10 px-2 py-1 rounded-full uppercase tracking-widest">Total Earned</span>
          </div>
          <p className="text-3xl font-black text-zinc-100">{formatCurrency(affiliate.totalEarnings, 'UGX')}</p>
          <p className="text-xs text-zinc-500 mt-1">Lifetime earnings</p>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-3xl shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-amber-500/10 rounded-xl">
              <Wallet className="w-5 h-5 text-amber-500" />
            </div>
            <span className="text-[10px] font-bold text-amber-500 bg-amber-500/10 px-2 py-1 rounded-full uppercase tracking-widest">Unpaid Balance</span>
          </div>
          <p className="text-3xl font-black text-zinc-100">{formatCurrency(affiliate.unpaidEarnings, 'UGX')}</p>
          <p className="text-xs text-zinc-500 mt-1">Available for withdrawal</p>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-3xl shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-blue-500/10 rounded-xl">
              <Users className="w-5 h-5 text-blue-500" />
            </div>
            <span className="text-[10px] font-bold text-blue-500 bg-blue-500/10 px-2 py-1 rounded-full uppercase tracking-widest">Total Referrals</span>
          </div>
          <p className="text-3xl font-black text-zinc-100">{referrals.length}</p>
          <p className="text-xs text-zinc-500 mt-1">Registered businesses</p>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-3xl shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-indigo-500/10 rounded-xl">
              <MousePointer2 className="w-5 h-5 text-indigo-500" />
            </div>
            <span className="text-[10px] font-bold text-indigo-500 bg-indigo-500/10 px-2 py-1 rounded-full uppercase tracking-widest">Link Clicks</span>
          </div>
          <p className="text-3xl font-black text-zinc-100">{affiliate.totalClicks || 0}</p>
          <p className="text-xs text-zinc-500 mt-1">Total visits via your link</p>
        </div>
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-3xl overflow-hidden shadow-2xl">
        <div className="p-6 border-b border-zinc-800 flex justify-between items-center">
          <h3 className="text-lg font-bold text-zinc-100">Recent Referrals</h3>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500" />
            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Real-time tracking</span>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-zinc-800/50 border-b border-zinc-800">
                <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-widest">Date</th>
                <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-widest">Business / Email</th>
                <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-widest">Status</th>
                <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-widest text-right">Commission</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {referrals.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-zinc-500">No referrals yet. Start sharing your link!</td>
                </tr>
              ) : referrals.map((ref, idx) => (
                <tr key={idx} className="hover:bg-zinc-800/30 transition-colors">
                  <td className="px-6 py-4 text-sm text-zinc-400">{formatDate(ref.createdAt)}</td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                      <span className="text-sm font-bold text-zinc-100">{ref.referredOrgName || 'New Business'}</span>
                      <span className="text-xs text-zinc-500">
                        {(!ref.referredEmail || ['n/a', 'undefined', 'null', ''].includes(String(ref.referredEmail).toLowerCase())) ? 'Old Record' : ref.referredEmail}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={cn(
                      "px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-widest",
                      ref.status === 'completed' ? "bg-emerald-500/10 text-emerald-500" :
                      ref.status === 'paid' ? "bg-blue-500/10 text-blue-500" :
                      "bg-zinc-500/10 text-zinc-500"
                    )}>
                      {ref.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm font-bold text-zinc-100 text-right">
                    {formatCurrency(ref.amountEarned || 0, 'UGX')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function ReferralsListView({ user, onBack }: { user: any, onBack: () => void }) {
  const [referrals, setReferrals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const referralsQuery = query(collection(db, 'referrals'), where('affiliateUid', '==', user.uid));
    const unsubscribe = onSnapshot(referralsQuery, (snapshot) => {
      setReferrals(snapshot.docs.map(d => d.data()).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
      setLoading(false);
    }, (error) => {
      console.error('Error listening to referrals:', error);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [user]);

  return (
    <div className="space-y-8 pb-20">
      <div className="flex items-center gap-4">
        <button 
          onClick={onBack}
          className="p-2 hover:bg-zinc-800 rounded-xl text-zinc-400 transition-colors"
        >
          <ArrowLeft className="w-6 h-6" />
        </button>
        <div>
          <h2 className="text-3xl font-bold text-zinc-100 uppercase tracking-tighter italic">Referred Businesses</h2>
          <p className="text-zinc-500 font-medium">Detailed list of all your registered referrals</p>
        </div>
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-3xl overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-zinc-800/50 border-b border-zinc-800">
                <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-widest">Date</th>
                <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-widest">Business Name</th>
                <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-widest">Owner Email</th>
                <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-widest">Status</th>
                <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-widest text-right">Commission</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center">
                    <Loader2 className="w-6 h-6 text-indigo-500 animate-spin mx-auto" />
                  </td>
                </tr>
              ) : referrals.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-zinc-500">No referrals found.</td>
                </tr>
              ) : referrals.map((ref, idx) => (
                <tr key={idx} className="hover:bg-zinc-800/30 transition-colors">
                  <td className="px-6 py-4 text-sm text-zinc-400">{formatDate(ref.createdAt)}</td>
                  <td className="px-6 py-4 text-sm font-bold text-zinc-100">{ref.referredOrgName || 'N/A'}</td>
                  <td className="px-6 py-4 text-sm text-zinc-400">
                    {(!ref.referredEmail || ['n/a', 'undefined', 'null', ''].includes(String(ref.referredEmail).toLowerCase())) ? 'Not captured (Old Record)' : ref.referredEmail}
                  </td>
                  <td className="px-6 py-4">
                    <span className={cn(
                      "px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-widest",
                      ref.status === 'completed' ? "bg-emerald-500/10 text-emerald-500" :
                      ref.status === 'paid' ? "bg-blue-500/10 text-blue-500" :
                      "bg-zinc-500/10 text-zinc-500"
                    )}>
                      {ref.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm font-bold text-zinc-100 text-right">
                    {formatCurrency(ref.amountEarned || 0, 'UGX')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function PaymentRequired({ currentOrg, handleSignOut, showNotification, handlePayment, isProcessing }: { currentOrg: any, handleSignOut: () => void, showNotification: (m: string, t?: 'success' | 'error') => void, handlePayment: (method: 'card' | 'momo', plan: string) => Promise<void>, isProcessing: boolean }) {
  const [selectedPlan, setSelectedPlan] = useState('starter');

  const plans = [
    {
      id: 'starter',
      name: 'Starter',
      price: '8000',
      features: PLAN_DETAILS.starter.features,
      color: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
    },
    {
      id: 'business',
      name: 'Business',
      price: '20000',
      features: PLAN_DETAILS.business.features,
      color: 'bg-indigo-500/10 text-indigo-500 border-indigo-500/20'
    },
    {
      id: 'enterprise',
      name: 'Enterprise',
      price: '80000',
      features: PLAN_DETAILS.enterprise.features,
      color: 'bg-amber-500/10 text-amber-500 border-amber-500/20'
    }
  ];

  return (
    <div className="flex flex-col items-center justify-center py-10 text-center space-y-8 max-w-5xl mx-auto px-4">
      <div className="space-y-4">
        <div className="w-20 h-20 rounded-3xl bg-rose-500/10 flex items-center justify-center border border-rose-500/20 mx-auto">
          <History className="w-10 h-10 text-rose-500" />
        </div>
        <div className="space-y-2">
          <h2 className="text-4xl font-black text-zinc-100 uppercase tracking-tighter italic">Trial Period Expired</h2>
          <p className="text-zinc-400 text-lg">Your 3-month trial for <span className="text-zinc-100 font-bold">{currentOrg?.name}</span> has ended. Choose a plan to continue.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full">
        {plans.map((plan) => (
          <button
            key={plan.id}
            onClick={() => setSelectedPlan(plan.id)}
            className={`relative p-8 rounded-3xl border-2 transition-all text-left flex flex-col h-full group ${
              selectedPlan === plan.id 
                ? 'bg-zinc-900 border-indigo-500 shadow-2xl shadow-indigo-500/10' 
                : 'bg-zinc-900/50 border-zinc-800 hover:border-zinc-700'
            }`}
          >
            {selectedPlan === plan.id && (
              <div className="absolute -top-3 -right-3 w-8 h-8 rounded-full bg-indigo-500 flex items-center justify-center shadow-lg">
                <Check className="w-5 h-5 text-white" />
              </div>
            )}
            <div className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest w-fit mb-4 ${plan.color}`}>
              {plan.name}
            </div>
            <div className="mb-6">
              <span className="text-3xl font-black text-zinc-100 tracking-tighter">{plan.price}</span>
              <span className="text-zinc-500 text-sm ml-2">/month</span>
            </div>
            <ul className="space-y-4 mb-8 flex-grow">
              {plan.features.map((feature, i) => (
                <li key={i} className="flex items-center gap-3 text-sm text-zinc-400">
                  <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0" />
                  {feature}
                </li>
              ))}
            </ul>
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-4 w-full max-w-md pt-4">
        <button 
          onClick={() => handlePayment('momo', selectedPlan)}
          disabled={isProcessing}
          className="flex items-center justify-center gap-3 bg-amber-500 hover:bg-amber-400 text-white font-black py-4 rounded-2xl transition-all hover:scale-[1.02] active:scale-[0.98] uppercase tracking-widest shadow-xl shadow-amber-600/20 disabled:opacity-50"
        >
          {isProcessing ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <Wallet className="w-5 h-5" />
          )}
          <span>Mobile Money</span>
        </button>
        <button 
          onClick={handleSignOut}
          className="w-full bg-zinc-800/50 hover:bg-zinc-800 text-zinc-500 hover:text-zinc-300 font-bold py-4 rounded-2xl transition-all uppercase tracking-widest text-xs"
        >
          Sign Out
        </button>
      </div>
    </div>
  );
}

function TermsAndConditions({ onBack }: { onBack: () => void }) {
  return (
    <div className="max-w-4xl mx-auto py-12 px-6 space-y-8">
      <button 
        onClick={onBack}
        className="flex items-center gap-2 text-zinc-500 hover:text-zinc-300 transition-colors mb-8 group"
      >
        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
        <span className="text-sm font-bold uppercase tracking-widest">Back</span>
      </button>

      <div className="space-y-4">
        <h1 className="text-5xl font-black text-zinc-100 tracking-tighter uppercase italic">Terms & Conditions</h1>
        <p className="text-zinc-500 font-medium">Last updated: April 5, 2026</p>
      </div>

      <div className="prose prose-invert max-w-none space-y-8 text-zinc-400 leading-relaxed">
        <section className="space-y-4">
          <h2 className="text-2xl font-bold text-zinc-100">1. Acceptance of Terms</h2>
          <p>
            By accessing and using JENA POS (the "App"), you agree to be bound by these Terms and Conditions. If you do not agree to these terms, please do not use the App.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-bold text-zinc-100">2. Description of Service</h2>
          <p>
            JENA POS is a point-of-sale and inventory management system designed for small businesses. We provide tools for tracking sales, managing stock, and generating reports.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-bold text-zinc-100">3. Subscription and Payments</h2>
          <p>
            The App offers a 3-month free trial for every business profile. After the trial, a monthly subscription is required to continue using the service. We offer three plans:
          </p>
          <ul className="list-disc pl-6 space-y-2">
            <li><strong>Starter:</strong> UGX 8,000/month - Includes POS Sales, Inventory, Reports, and 1 business profile.</li>
            <li><strong>Business:</strong> UGX 20,000/month - Includes POS, Inventory, Reports, Expense Tracking, and up to 4 business profiles.</li>
            <li><strong>Enterprise:</strong> UGX 80,000/month - Includes All Features, Unlimited business profiles, and Priority Support.</li>
          </ul>
          <p>
            Payments are non-refundable once processed. We use third-party payment processors and do not store your full credit card details.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-bold text-zinc-100">4. User Accounts</h2>
          <p>
            You are responsible for maintaining the confidentiality of your account credentials. You agree to notify us immediately of any unauthorized use of your account.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-bold text-zinc-100">5. Data Ownership</h2>
          <p>
            You retain all rights to the data you input into the App. We do not claim ownership of your business data. However, you grant us a license to host and process this data to provide the service.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-bold text-zinc-100">6. Limitation of Liability</h2>
          <p>
            JENA POS is provided "as is" without warranties of any kind. We are not liable for any direct, indirect, or incidental damages arising from your use of the App, including data loss or business interruption.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-bold text-zinc-100">7. Changes to Terms</h2>
          <p>
            We reserve the right to modify these terms at any time. Continued use of the App after changes constitutes acceptance of the new terms.
          </p>
        </section>
      </div>
    </div>
  );
}

function PrivacyPolicy({ onBack }: { onBack: () => void }) {
  return (
    <div className="max-w-4xl mx-auto py-12 px-6 space-y-8">
      <button 
        onClick={onBack}
        className="flex items-center gap-2 text-zinc-500 hover:text-zinc-300 transition-colors mb-8 group"
      >
        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
        <span className="text-sm font-bold uppercase tracking-widest">Back</span>
      </button>

      <div className="space-y-4">
        <h1 className="text-5xl font-black text-zinc-100 tracking-tighter uppercase italic">Privacy Policy</h1>
        <p className="text-zinc-500 font-medium">Last updated: April 5, 2026</p>
      </div>

      <div className="prose prose-invert max-w-none space-y-8 text-zinc-400 leading-relaxed">
        <section className="space-y-4">
          <h2 className="text-2xl font-bold text-zinc-100">1. Information We Collect</h2>
          <p>
            We collect information you provide directly to us, such as when you create an account, update your profile, or input business data (sales, inventory, expenses). This includes your name, email address, and business details.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-bold text-zinc-100">2. How We Use Your Information</h2>
          <p>
            We use the information we collect to:
          </p>
          <ul className="list-disc pl-6 space-y-2">
            <li>Provide, maintain, and improve our services.</li>
            <li>Process transactions and send related information.</li>
            <li>Send you technical notices, updates, and support messages.</li>
            <li>Monitor and analyze trends, usage, and activities.</li>
          </ul>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-bold text-zinc-100">3. Data Security</h2>
          <p>
            We take reasonable measures to help protect information about you from loss, theft, misuse, and unauthorized access. We use encryption and secure servers to store your data.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-bold text-zinc-100">4. Sharing of Information</h2>
          <p>
            We do not share your personal or business data with third parties except as required by law or to provide the service (e.g., with payment processors). We never sell your data to advertisers.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-bold text-zinc-100">5. Your Choices</h2>
          <p>
            You can update or delete your account information at any time through the App's settings. You can also request a full export of your data.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-bold text-zinc-100">6. Cookies</h2>
          <p>
            We use cookies to maintain your session and remember your preferences. You can disable cookies in your browser, but some features of the App may not function correctly.
          </p>
        </section>
      </div>
    </div>
  );
}

function TermsAcceptanceModal({ userProfile }: { userProfile: UserProfile }) {
  const [hasScrolledToBottom, setHasScrolledToBottom] = useState(false);
  const [isAccepted, setIsAccepted] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    const checkScroll = () => {
      if (scrollRef.current) {
        const { scrollHeight, clientHeight } = scrollRef.current;
        // If content is shorter than container, or already at bottom
        if (scrollHeight <= clientHeight + 20) {
          setHasScrolledToBottom(true);
        }
      }
    };
    
    // Check after a short delay to ensure content is rendered
    const timer = setTimeout(checkScroll, 500);
    window.addEventListener('resize', checkScroll);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', checkScroll);
    };
  }, []);

  const handleScroll = () => {
    if (scrollRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
      // Even more lenient: If we're within 50px of the bottom
      if (scrollHeight - scrollTop <= clientHeight + 50) {
        setHasScrolledToBottom(true);
      }
    }
  };

  const isSuperAdmin = userProfile?.email === 'sakwamikes@gmail.com';

  const handleAccept = async () => {
    if (!isAccepted || (!hasScrolledToBottom && !isSuperAdmin)) return;
    setIsProcessing(true);
    setError(null);
    try {
      console.log('Attempting to accept terms for user:', userProfile.uid);
      const success = await updateDocument('users', userProfile.uid, {
        termsAcceptedAt: new Date().toISOString()
      });
      if (!success) {
        throw new Error("The server rejected the update. This might be a security rule issue. Please contact support.");
      }
      console.log('Terms accepted successfully');
    } catch (err: any) {
      console.error("Failed to accept terms:", err);
      setError(err.message || "An unexpected error occurred. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-zinc-950/90 backdrop-blur-md z-[100] flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-zinc-900 border border-zinc-800 rounded-3xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden"
      >
        <div className="p-8 border-b border-zinc-800 shrink-0">
          <div className="flex items-center gap-4 mb-2">
            <div className="w-12 h-12 rounded-2xl bg-indigo-600/10 flex items-center justify-center border border-indigo-600/20">
              <ShieldCheck className="w-6 h-6 text-indigo-500" />
            </div>
            <div>
              <h2 className="text-2xl font-black text-zinc-100 tracking-tighter uppercase italic">Welcome to JENA POS</h2>
              <p className="text-sm text-zinc-500">Please review and accept our terms to continue</p>
            </div>
          </div>
          <div className="mt-6 p-4 bg-indigo-600/5 border border-indigo-600/20 rounded-2xl">
            <p className="text-xs text-indigo-400 font-medium italic">
              Tip: Please scroll to the very bottom of this window to enable the acceptance checkbox.
            </p>
          </div>
        </div>

        <div 
          ref={scrollRef}
          onScroll={handleScroll}
          className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar"
        >
          <div className="prose prose-invert max-w-none space-y-8 text-zinc-400 leading-relaxed">
            <section className="space-y-4">
              <h3 className="text-xl font-bold text-zinc-100 uppercase tracking-tight">Terms & Conditions</h3>
              <p>By using JENA POS, you agree to these terms. JENA POS provides inventory and sales management tools for small businesses. We offer a 3-month free trial for your first shop, followed by a one-time $10 fee for lifetime access. Additional shops require a monthly subscription.</p>
              <p>You are responsible for your account security and data accuracy. We are not liable for business interruptions or data loss. We reserve the right to modify these terms at any time.</p>
            </section>

            <section className="space-y-4">
              <h3 className="text-xl font-bold text-zinc-100 uppercase tracking-tight">Privacy Policy</h3>
              <p>We collect your email, name, and business data to provide our services. We use industry-standard encryption to protect your data. We do not sell your data to third parties. We use cookies to maintain your session and preferences.</p>
              <p>You retain ownership of your data and can export or delete it at any time through the settings panel.</p>
            </section>
          </div>
        </div>

        <div className="p-8 border-t border-zinc-800 bg-zinc-900/50 shrink-0 space-y-6">
          <label className={cn(
            "flex items-start gap-3 cursor-pointer group transition-opacity",
            (!hasScrolledToBottom && !isSuperAdmin) && "opacity-50 cursor-not-allowed"
          )}>
            <div className="relative flex items-center mt-1">
              <input 
                type="checkbox" 
                checked={isAccepted}
                onChange={(e) => setIsAccepted(e.target.checked)}
                disabled={!hasScrolledToBottom && !isSuperAdmin}
                className="peer h-5 w-5 appearance-none rounded-md border border-zinc-700 bg-zinc-800 checked:bg-indigo-600 checked:border-indigo-600 transition-all cursor-pointer disabled:cursor-not-allowed"
              />
              <ShieldCheck className="absolute h-3.5 w-3.5 text-white opacity-0 peer-checked:opacity-100 left-0.5 pointer-events-none transition-opacity" />
            </div>
            <span className="text-sm text-zinc-400 group-hover:text-zinc-300 transition-colors">
              I have read and agree to the <span className="text-zinc-200 font-bold">Terms & Conditions</span> and <span className="text-zinc-200 font-bold">Privacy Policy</span>.
            </span>
          </label>

          {isSuperAdmin && !hasScrolledToBottom && (
            <p className="text-[10px] text-indigo-400 italic">Admin: Scroll bypass enabled</p>
          )}

          {error && (
            <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
              <p className="text-sm text-red-500 font-medium">{error}</p>
            </div>
          )}

          <button 
            onClick={handleAccept}
            disabled={!isAccepted || (!hasScrolledToBottom && !isSuperAdmin) || isProcessing}
            className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:bg-zinc-800 disabled:text-zinc-600 text-white font-black py-4 rounded-2xl transition-all uppercase tracking-widest flex items-center justify-center gap-2 shadow-xl shadow-indigo-600/10"
          >
            {isProcessing ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                <Sparkles className="w-5 h-5" />
                Accept and Continue
              </>
            )}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

function MomoPaymentModal({ planName, price, currency, onClose, onConfirm, isProcessing }: { planName: string, price: number, currency: string, onClose: () => void, onConfirm: (phone: string) => void, isProcessing: boolean }) {
  const [phoneNumber, setPhoneNumber] = useState('');

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/80 backdrop-blur-md z-[100] flex items-center justify-center p-4"
    >
      <motion.div 
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        className="bg-zinc-900 border border-zinc-800 p-8 rounded-[32px] max-w-md w-full space-y-8 relative overflow-hidden"
      >
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-amber-500 to-amber-600" />
        
        <div className="flex justify-between items-start">
          <div className="space-y-1">
            <h3 className="text-2xl font-black text-zinc-100 uppercase tracking-tighter italic">Mobile Money Checkout</h3>
            <div className="flex items-center gap-2">
              <p className="text-zinc-400 text-sm">Complete your subscription for <span className="text-amber-500 font-bold uppercase">{planName}</span></p>
              {import.meta.env.VITE_MTN_MOMO_TARGET_ENVIRONMENT === 'mtnuganda' && (
                <span className="text-[10px] font-bold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full uppercase tracking-widest border border-emerald-500/20">Production</span>
              )}
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-zinc-800 rounded-xl transition-colors">
            <X className="w-6 h-6 text-zinc-500" />
          </button>
        </div>

        <div className="bg-zinc-800/50 p-6 rounded-2xl border border-zinc-700/50 space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-zinc-500 font-bold uppercase text-xs tracking-widest">Amount to Pay</span>
            <span className="text-2xl font-black text-zinc-100 tracking-tighter">{price}</span>
          </div>
          <div className="h-px bg-zinc-700/50" />
          <div className="space-y-2">
            <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest">MTN Phone Number</label>
            <div className="relative">
              <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
              <input 
                type="tel" 
                placeholder="e.g. 256770000000"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-700 rounded-xl pl-12 pr-4 py-4 text-zinc-100 focus:ring-2 focus:ring-amber-500 outline-none transition-all"
                autoFocus
              />
            </div>
            <p className="text-[10px] text-zinc-500 italic">Enter number in international format (e.g., 2567...)</p>
          </div>
        </div>

        <button 
          onClick={() => onConfirm(phoneNumber)}
          disabled={!phoneNumber || isProcessing}
          className="w-full bg-amber-500 hover:bg-amber-400 disabled:opacity-50 disabled:hover:bg-amber-500 text-white font-black py-5 rounded-2xl transition-all shadow-xl shadow-amber-900/20 flex items-center justify-center gap-3 uppercase tracking-widest"
        >
          {isProcessing ? (
            <>
              <Loader2 className="w-6 h-6 animate-spin" />
              <span>Processing...</span>
            </>
          ) : (
            <>
              <Wallet className="w-6 h-6" />
              <span>Pay Now</span>
            </>
          )}
        </button>

        <p className="text-[10px] text-center text-zinc-500">
          By clicking "Pay Now", a prompt will be sent to your phone. Please enter your PIN to authorize the transaction.
        </p>
      </motion.div>
    </motion.div>
  );
}

function MainApp({ theme, setTheme }: { theme: 'light' | 'dark', setTheme: (t: 'light' | 'dark') => void }) {
  const { user, userProfile, organizations, currentOrg, setCurrentOrg } = useFirebase();
  const [activeTab, setActiveTab] = useState<'dashboard' | 'pos' | 'inventory' | 'damages' | 'transactions' | 'admin' | 'reports' | 'help' | 'settings' | 'sales-analytics' | 'expenses-analytics' | 'profit-analytics' | 'affiliate' | 'affiliate-referrals' | 'terms' | 'privacy'>('dashboard');
  const [navigationHistory, setNavigationHistory] = useState<string[]>(['dashboard']);
  const [highlightedTxId, setHighlightedTxId] = useState<string | null>(null);
  const [highlightedItemId, setHighlightedItemId] = useState<string | null>(null);
  const [highlightedDamageId, setHighlightedDamageId] = useState<string | null>(null);

  useEffect(() => {
    setNavigationHistory(prev => {
      if (prev[prev.length - 1] === activeTab) return prev;
      return [...prev, activeTab];
    });
  }, [activeTab]);

  const goBack = () => {
    if (navigationHistory.length <= 1) return;
    const newHistory = [...navigationHistory];
    newHistory.pop(); // remove current
    const previousTab = newHistory[newHistory.length - 1];
    setNavigationHistory(newHistory);
    setActiveTab(previousTab as any);
  };

  const [showHelpReminder, setShowHelpReminder] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isCreatingOrg, setIsCreatingOrg] = useState(false);
  const [newOrgName, setNewOrgName] = useState('');
  const [notification, setNotification] = useState<{ message: string, type: 'success' | 'error' } | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [settingsTab, setSettingsTab] = useState<'business' | 'profile' | 'security' | 'notifications' | 'billing'>(() => {
    const saved = localStorage.getItem('settingsTab');
    return (saved as any) || 'business';
  });

  useEffect(() => {
    localStorage.setItem('settingsTab', settingsTab);
  }, [settingsTab]);
  
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [payments, setPayments] = useState<any[]>([]);

  const currentStaffMember = staff.find(s => s.uid === user?.uid || s.email === user?.email);
  const isSuperAdmin = user?.email === 'sakwamikes@gmail.com';
  const isAdmin = currentOrg?.ownerUid === user?.uid || currentStaffMember?.role === 'admin' || isSuperAdmin;
  const isManager = isAdmin || currentStaffMember?.role === 'manager';
  const isCashier = isManager || currentStaffMember?.role === 'cashier';

  // Granular Permissions
  const permissions = {
    canManageStaff: isAdmin,
    canManageInventory: isManager,
    canDeleteInventory: isAdmin,
    canDeleteTransactions: isAdmin,
    canDeleteDamages: isAdmin,
    canViewReports: isManager,
    canAccessSettings: isAdmin,
    canAccessPOS: isCashier,
    canManageDamages: isCashier,
    canViewAnalytics: isManager,
    canManageNotifications: isManager,
  };

  const trialEndDate = useMemo(() => {
    if (!currentOrg) return null;
    if (currentOrg.trialExpiresAt) {
      const d = new Date(currentOrg.trialExpiresAt);
      if (!isNaN(d.getTime())) return d;
    }
    // Fallback to createdAt + 3 months
    if (currentOrg.createdAt) {
      const d = new Date(currentOrg.createdAt);
      if (!isNaN(d.getTime())) {
        const fallbackDate = new Date(d);
        fallbackDate.setMonth(fallbackDate.getMonth() + 3);
        return fallbackDate;
      }
    }
    return null;
  }, [currentOrg]);

  const isTrialExpired = useMemo(() => {
    if (!trialEndDate || currentOrg?.isPaid || isSuperAdmin) return false;
    return new Date() > trialEndDate;
  }, [trialEndDate, currentOrg?.isPaid, isSuperAdmin]);

  const getPlanLimits = (plan: string | undefined) => {
    const p = (plan || 'trial').toLowerCase() as keyof typeof PLAN_LIMITS;
    return PLAN_LIMITS[p] || PLAN_LIMITS.trial;
  };

  const orgLimits = getPlanLimits(userProfile?.plan);
  const currentOrgLimits = getPlanLimits(currentOrg?.plan);

  const createNotification = async (type: 'sale' | 'login' | 'logout' | 'system' | 'inventory' | 'damage' | 'expense', title: string, message: string, metadata: any = {}) => {
    if (!currentOrg) return;
    try {
      await createDocument(`organizations/${currentOrg.id}/notifications`, {
        type,
        title,
        message,
        timestamp: new Date().toISOString(),
        read: false,
        metadata
      });
    } catch (error) {
      console.error('Error creating notification:', error);
    }
  };

  const handleSignOut = async () => {
    if (userProfile && currentOrg) {
      await createNotification(
        'logout',
        'User Logged Out',
        `${userProfile.displayName || userProfile.email} has logged out of the system.`,
        { userId: userProfile.uid, email: userProfile.email }
      );
    }
    await signOut(auth);
  };

  // Track login
  useEffect(() => {
    if (userProfile && currentOrg) {
      const lastLogin = sessionStorage.getItem(`last_login_${currentOrg.id}_${userProfile.uid}`);
      if (!lastLogin) {
        createNotification(
          'login',
          'User Logged In',
          `${userProfile.displayName || userProfile.email} has logged into the system.`,
          { userId: userProfile.uid, email: userProfile.email }
        );
        sessionStorage.setItem(`last_login_${currentOrg.id}_${userProfile.uid}`, new Date().toISOString());
      }
    }
  }, [userProfile?.uid, currentOrg?.id]);

  // Fetch notifications
  useEffect(() => {
    if (!currentOrg) return;
    const unsubscribe = subscribeToCollection<Notification>(
      `organizations/${currentOrg.id}/notifications`,
      [],
      (data) => {
        setNotifications(data.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()));
      }
    );
    return () => unsubscribe();
  }, [currentOrg?.id]);

  // Fetch payments
  useEffect(() => {
    if (!currentOrg) return;
    const unsubscribe = subscribeToCollection<any>(
      'payments',
      [where('orgId', '==', currentOrg.id)],
      (data) => {
        setPayments(data.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
      }
    );
    return () => unsubscribe();
  }, [currentOrg?.id]);

  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [momoPaymentData, setMomoPaymentData] = useState<{ planName: string, price: number } | null>(null);

  const handlePayment = async (method: 'card' | 'momo', planName: string = 'starter', phoneNumber?: string) => {
    if (!currentOrg || !user) return;
    
    const plan = PLAN_DETAILS[planName as keyof typeof PLAN_DETAILS] || PLAN_DETAILS.starter;
    const ugxPrice = plan.price;
    const targetEnv = import.meta.env.VITE_MTN_MOMO_TARGET_ENVIRONMENT || 'mtnuganda';
    const isSandbox = targetEnv === 'sandbox';
    const currency = isSandbox ? 'EUR' : 'UGX';
    
    // Convert price if using EUR in sandbox (approx 1 EUR = 4100 UGX)
    const finalPrice = currency === 'EUR' ? Math.ceil(ugxPrice / 4100) : ugxPrice;

    if (method === 'momo' && !phoneNumber) {
      setMomoPaymentData({ planName, price: finalPrice });
      return;
    }

    setIsProcessingPayment(true);
    const paymentId = Math.random().toString(36).substring(7);
    
    try {
      if (method === 'momo') {
        if (!phoneNumber) throw new Error('Phone number is required for Mobile Money');
        
        try {
          showNotification('Initiating payment request...', 'success');
          const referenceId = await mtnMoMoService.requestToPay(
            finalPrice,
            currency,
            phoneNumber,
            `plan_${planName}_${currentOrg.id}_${paymentId}`
          );
          
          showNotification('Payment request sent. Please confirm on your phone.');
          
          let status: 'SUCCESSFUL' | 'FAILED' | 'PENDING' = 'PENDING';
          let attempts = 0;
          const maxAttempts = 20; // Increase timeout to 100 seconds (20 * 5s)
          
          while (status === 'PENDING' && attempts < maxAttempts) {
            await new Promise(resolve => setTimeout(resolve, 5000));
            const currentStatus = await mtnMoMoService.getTransactionStatus(referenceId);
            
            // Log for debugging
            console.log(`Payment status attempt ${attempts + 1}: ${currentStatus}`);
            
            if (currentStatus) {
              status = currentStatus;
            }
            attempts++;
          }
          
          if (status === 'SUCCESSFUL') {
            showNotification('Payment successful! Your account has been updated.', 'success');
          } else if (status === 'PENDING') {
            throw new Error('Payment timed out. If you entered your PIN, please wait a few minutes for your account to update.');
          } else {
            throw new Error(`Mobile Money payment failed with status: ${status || 'UNKNOWN'}.`);
          }
        } catch (momoErr: any) {
          console.error('MoMo error:', momoErr);
          
          // Track failed payment
          await setDocument('payments', paymentId, {
            id: paymentId,
            orgId: currentOrg.id,
            userId: user.uid,
            amount: finalPrice,
            currency: currency,
            status: 'failed',
            error: momoErr.message || 'Unknown MoMo error',
            method,
            plan: planName,
            phoneNumber,
            createdAt: new Date().toISOString()
          });

          throw momoErr;
        }
      } else {
        // Stripe Integration - Removed as requested
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
      
      // Track successful payment
      await setDocument('payments', paymentId, {
        id: paymentId,
        orgId: currentOrg.id,
        userId: user.uid,
        amount: finalPrice,
        currency: currency,
        status: 'completed',
        method,
        plan: planName,
        phoneNumber: phoneNumber || null,
        createdAt: new Date().toISOString()
      });

      await updateDocument('organizations', currentOrg.id, {
        isPaid: true,
        subscriptionStatus: 'active',
        plan: planName,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
      });

      if (user) {
        await updateDocument('users', user.uid, {
          plan: planName
        });
      }

      if (currentOrg.referredBy) {
        try {
          console.log('Processing referral for org:', currentOrg.id, 'Referred by:', currentOrg.referredBy);
          const referralsSnap = await getDocs(query(collection(db, 'referrals'), where('referredOrgId', '==', currentOrg.id)));
          if (!referralsSnap.empty) {
            const referralDoc = referralsSnap.docs[0];
            const referralData = referralDoc.data();
            const commission = plan.price * 0.1;
            console.log('Referral found! ID:', referralDoc.id, 'Commission:', commission);
            
            await updateDocument('referrals', referralDoc.id, {
              status: 'paid',
              amountEarned: commission,
              paidAt: new Date().toISOString()
            });

            console.log('Updating affiliate earnings for:', referralData.affiliateUid);
            const affiliateDoc = await getDoc(doc(db, 'affiliates', referralData.affiliateUid));
            if (affiliateDoc.exists()) {
              const affiliateData = affiliateDoc.data();
              
              // Attempt to transfer commission via Mobile Money
              try {
                const affiliateUserDoc = await getDoc(doc(db, 'users', referralData.affiliateUid));
                if (affiliateUserDoc.exists()) {
                  const affiliateUser = affiliateUserDoc.data();
                  const affiliatePhone = affiliateUser.phoneNumber;
                  
                  if (affiliatePhone) {
                    console.log('Initiating commission transfer to:', affiliatePhone);
                    // In sandbox, we use EUR. In production, we use UGX.
                    const transferCurrency = isSandbox ? 'EUR' : (import.meta.env.VITE_MTN_MOMO_CURRENCY || 'UGX');
                    const transferAmount = transferCurrency === 'EUR' ? Math.ceil(commission / 4100) : commission;
                    
                    await mtnMoMoService.transfer(
                      transferAmount,
                      transferCurrency,
                      affiliatePhone,
                      `comm_${referralDoc.id}`
                    );
                    
                    // Update referral status to completed if transfer initiated
                    await updateDocument('referrals', referralDoc.id, {
                      status: 'completed',
                      transferredAt: new Date().toISOString()
                    });
                    
                    console.log('Commission transfer initiated successfully');
                  } else {
                    console.warn('Affiliate has no phone number for transfer');
                  }
                }
              } catch (transferErr) {
                console.error('Error transferring commission:', transferErr);
                // We don't throw here, the earnings are still recorded in DB for manual payout if needed
              }

              await updateDocument('affiliates', referralData.affiliateUid, {
                totalEarnings: (affiliateData.totalEarnings || 0) + commission,
                unpaidEarnings: (affiliateData.unpaidEarnings || 0) + commission
              });
              console.log('Affiliate earnings updated successfully');
            } else {
              console.warn('Affiliate document not found for UID:', referralData.affiliateUid);
            }
          } else {
            console.warn('No referral document found for org ID:', currentOrg.id);
          }
        } catch (refError) {
          console.error('Error processing referral commission:', refError);
          // Don't throw here, so the user still gets their payment confirmation
        }
      }

      showNotification(`Payment successful! You are now on the ${plan.label} plan.`);
    } catch (error: any) {
      console.error('Payment error:', error);
      showNotification(error.message || 'Payment failed. Please try again.', 'error');
    } finally {
      setIsProcessingPayment(false);
    }
  };

  const planCountdown = useMemo(() => {
    if (!currentOrg) return '';
    if (currentOrg.isPaid && currentOrg.plan === 'basic') return 'Lifetime';
    
    const target = currentOrg.isPaid ? (currentOrg.expiresAt ? new Date(currentOrg.expiresAt) : null) : trialEndDate;
    if (!target || isNaN(target.getTime())) return `${currentOrg.plan} Plan`;
    
    const now = new Date();
    const diffTime = target.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) return 'Expired';
    if (diffDays === 0) return 'Expires Today';
    return `${diffDays} Days Left`;
  }, [currentOrg, trialEndDate]);

  const handleNotificationClick = async (n: any) => {
    if (!currentOrg) return;
    
    // Mark as read
    if (!n.read) {
      try {
        await updateDocument(`organizations/${currentOrg.id}/notifications`, n.id, { read: true });
      } catch (error) {
        console.error('Error marking notification as read:', error);
      }
    }

    // Redirect based on type
    if (n.type === 'sale' || n.type === 'expense') {
      if (n.data?.txId) setHighlightedTxId(n.data.txId);
      setActiveTab('transactions');
    } else if (n.type === 'inventory') {
      if (n.data?.productId) setHighlightedItemId(n.data.productId);
      setActiveTab('inventory');
    } else if (n.type === 'damage') {
      if (n.data?.damageId) setHighlightedDamageId(n.data.damageId);
      setActiveTab('damages');
    }
    
    setShowNotifications(false);
  };

  useEffect(() => {
    if (!currentOrg) return;
    const unsubInv = subscribeToCollection<InventoryItem>(
      `organizations/${currentOrg.id}/inventory`,
      [],
      setInventory
    );
    const unsubStaff = subscribeToCollection<StaffMember>(
      `organizations/${currentOrg.id}/staff`,
      [],
      setStaff
    );
    return () => {
      unsubInv();
      unsubStaff();
    };
  }, [currentOrg]);

  const showNotification = (message: string, type: 'success' | 'error' = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 5000);
  };

  const [uploadingLogo, setUploadingLogo] = useState(false);

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !currentOrg) return;

    if (file.size > 10 * 1024 * 1024) { // 10MB limit
      showNotification('File is too large. Please select an image smaller than 10MB.', 'error');
      return;
    }

    setUploadingLogo(true);
    try {
      const optimizedFile = await compressImage(file, 0.2, 800); // Max 200KB for logos
      const storageRef = ref(storage, `organizations/${currentOrg.id}/logo/${Date.now()}_${file.name}`);
      await uploadBytes(storageRef, optimizedFile);
      const url = await getDownloadURL(storageRef);
      
      // Delete old logo if it exists
      if (currentOrg.logoUrl) {
        await deleteFile(currentOrg.logoUrl);
      }
      
      const success = await updateDocument('organizations', currentOrg.id, { logoUrl: url });
      if (success) {
        showNotification('Business logo updated successfully!');
      } else {
        showNotification('Failed to update business logo in database.', 'error');
      }
    } catch (error) {
      console.error('Logo upload error:', error);
      showNotification('Failed to upload business logo.', 'error');
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleCreateOrg = async () => {
    if (!user || !userProfile || !newOrgName.trim()) return;
    
    // Check limits
    const ownedOrgs = organizations.filter(o => o.ownerUid === user.uid);
    const plan = userProfile.plan || 'trial';
    const limit = PLAN_LIMITS[plan as keyof typeof PLAN_LIMITS].orgs;
    
    if (ownedOrgs.length >= limit) {
      if (plan === 'trial') {
        showNotification(`You have reached the limit of 1 free business profile. Please upgrade to a monthly subscription for more shops.`, 'error');
      } else {
        showNotification(`You have reached the limit of ${limit} business profile(s) for your current plan.`, 'error');
      }
      return;
    }

    const orgId = Math.random().toString(36).substring(7);
    try {
      const isFirstOrg = ownedOrgs.length === 0;
      
      // Set expiration: 3 months for all new organizations as per new pricing
      const trialMonths = 3;
      const expiresAt = new Date(Date.now() + trialMonths * 30 * 24 * 60 * 60 * 1000).toISOString();
      const trialExpiresAt = expiresAt;
      
      // Check for referral code in URL
      const urlParams = new URLSearchParams(window.location.search);
      const rawReferralCode = urlParams.get('ref') || localStorage.getItem('jena_pos_ref');
      const referralCode = rawReferralCode?.trim().toUpperCase();

      const success = await setDocument('organizations', orgId, {
        id: orgId,
        name: newOrgName,
        ownerUid: user.uid,
        country: 'US',
        currency: 'USD',
        address: '',
        uprsRegistrationNumber: '',
        plan: userProfile.plan,
        subscriptionStatus: 'active',
        isPaid: false,
        trialExpiresAt,
        referredBy: referralCode || '',
        createdAt: new Date().toISOString(),
        ...(expiresAt && { expiresAt })
      });

      if (success && referralCode) {
        // Create referral record
        const referralId = Math.random().toString(36).substring(7);
        
        // Find affiliate by code
        const affiliatesSnap = await getDocs(query(collection(db, 'affiliates'), where('affiliateCode', '==', referralCode)));
        
        if (!affiliatesSnap.empty) {
          const affiliate = affiliatesSnap.docs[0].data();
          
          // Extremely robust email capture
          let emailToSave = user?.email || userProfile?.email || auth.currentUser?.email;
          
          if (!emailToSave) {
            try {
              const userDoc = await getDoc(doc(db, 'users', user.uid));
              if (userDoc.exists()) {
                emailToSave = userDoc.data().email;
              }
            } catch (e) {
              console.error('Error fetching user email for referral:', e);
            }
          }
          
          emailToSave = emailToSave || 'N/A';
          
          console.log('Creating referral record. Email:', emailToSave, 'Org:', newOrgName, 'Affiliate:', affiliate.affiliateCode);
          await setDocument('referrals', referralId, {
            id: referralId,
            affiliateUid: affiliate.uid,
            referredOrgId: orgId,
            referredOrgName: newOrgName,
            referredUid: user.uid,
            referredEmail: emailToSave,
            status: 'registered',
            amountEarned: 0,
            createdAt: new Date().toISOString()
          });
          console.log('Referral record created successfully');
        } else {
          console.warn('No affiliate found for code:', referralCode);
        }
      }

      if (success) {
        setIsCreatingOrg(false);
        setNewOrgName('');
        showNotification('Organization created successfully!');
      } else {
        showNotification('Failed to create organization. Please check your permissions.', 'error');
      }
    } catch (error) {
      console.error('Error in handleCreateOrg:', error);
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
      showNotification(`Error: ${errorMessage}`, 'error');
    }
  };

  const handleUpdateOrg = async (updates: Partial<Organization>) => {
    if (!currentOrg) return;
    try {
      const success = await updateDocument('organizations', currentOrg.id, { ...updates, updatedAt: new Date().toISOString() });
      if (success) {
        showNotification('Organization updated successfully!');
      } else {
        showNotification('Failed to update organization.', 'error');
      }
    } catch (error) {
      console.error('Error updating organization:', error);
      showNotification('An error occurred while updating.', 'error');
    }
  };

  const handleUpdatePlan = async (newPlan: string) => {
    if (!user) return;
    const isPaidPlan = newPlan !== 'trial' && newPlan !== 'basic';
    await updateDocument('users', user.uid, { plan: newPlan });
    
    // Update all owned organizations
    const ownedOrgs = organizations.filter(o => o.ownerUid === user.uid);
    for (const org of ownedOrgs) {
      const updates: any = { plan: newPlan };
      // Reset expiration when plan is updated (simulating payment)
      const days = isPaidPlan ? 30 : 14;
      updates.expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
      await updateDocument('organizations', org.id, updates);
    }
    
    showNotification(`Plan updated to ${newPlan}! All your businesses have been upgraded.`);
  };

  const handleUpdateProfile = async (updates: Partial<UserProfile>) => {
    if (!user) return;
    const success = await updateDocument('users', user.uid, updates);
    if (success) {
      showNotification('Profile updated successfully!');
    } else {
      showNotification('Failed to update profile.', 'error');
    }
  };

  // Auto-upgrade to essentials if on basic and owner (legacy check)
  useEffect(() => {
    if (currentOrg && currentOrg.plan === 'basic' && currentOrg.ownerUid === user?.uid && userProfile?.plan === 'trial') {
      handleUpdatePlan('essentials');
    }
  }, [currentOrg, user, userProfile]);

  // Claim staff memberships on login
  useEffect(() => {
    if (!user?.email) return;
    
    // This is a simplified version. In a real app, you'd use a collection group query
    // or a dedicated invites collection. For this demo, we'll assume the user
    // is added to the organizations they are staff of.
    const claimStaff = async () => {
      // Check all organizations for this email in staff subcollection
      // (This is expensive without a collection group index, but works for demo)
      // For now, we'll just log it.
      console.log('Checking for staff memberships for:', user.email);
    };
    claimStaff();
  }, [user]);

  if (organizations.length === 0 && !isCreatingOrg) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-950 p-4">
        <div className="text-center space-y-6 max-w-md">
          <div className="bg-indigo-600/20 w-20 h-20 rounded-3xl flex items-center justify-center mx-auto">
            <Building2 className="w-10 h-10 text-indigo-500" />
          </div>
          <h2 className="text-3xl font-bold text-zinc-100">Welcome to JENA POS</h2>
          <p className="text-zinc-400">Logged in as <span className="text-indigo-400 font-medium">{user?.email}</span></p>
          <p className="text-zinc-400">To get started, create your first business organization profile or find an existing one.</p>
          <div className="space-y-3">
            <button 
              onClick={() => setIsCreatingOrg(true)}
              className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-4 rounded-2xl transition-all shadow-xl shadow-indigo-900/20 flex items-center justify-center gap-2"
            >
              <Plus className="w-5 h-5" />
              Create New Organization
            </button>
            <div className="grid grid-cols-2 gap-3">
              <button 
                onClick={() => {
                  const orgId = prompt("Enter Organization ID to join:");
                  if (orgId) {
                    showNotification("Checking for organization access...");
                    window.location.reload();
                  }
                }}
                className="bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-zinc-300 font-bold py-3 rounded-2xl transition-all flex items-center justify-center gap-2"
              >
                <Search className="w-4 h-4" />
                Find Existing
              </button>
              <button 
                onClick={handleSignOut}
                className="bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-zinc-400 font-bold py-3 rounded-2xl transition-all flex items-center justify-center gap-2"
              >
                <LogOut className="w-4 h-4" />
                Switch Account
              </button>
            </div>
          </div>
          <p className="text-xs text-zinc-600">
            Tip: All organizations are linked to your Google account. If you can't find your organization, try switching to the account you used to create it.
          </p>
        </div>
      </div>
    );
  }

  if (isCreatingOrg) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-950 p-4">
        <div className="bg-zinc-900 border border-zinc-800 p-8 rounded-3xl max-w-md w-full space-y-6">
          <h3 className="text-2xl font-bold text-zinc-100">New Organization</h3>
          <div className="space-y-2">
            <label className="text-xs font-bold text-zinc-500 uppercase">Business Name</label>
            <input 
              type="text" 
              value={newOrgName}
              onChange={(e) => setNewOrgName(e.target.value)}
              placeholder="e.g. Acme Corp"
              className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-zinc-100 focus:ring-2 focus:ring-indigo-500 outline-none" 
            />
          </div>
          <div className="flex gap-3">
            <button 
              onClick={() => setIsCreatingOrg(false)}
              className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold py-3 rounded-xl transition-colors"
            >Cancel</button>
            <button 
              onClick={handleCreateOrg}
              className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 rounded-xl transition-colors"
            >Create</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 flex">
      {/* MoMo Payment Modal */}
      <AnimatePresence>
        {momoPaymentData && (
          <MomoPaymentModal 
            planName={momoPaymentData.planName}
            price={momoPaymentData.price}
            currency={currentOrg?.currency || 'UGX'}
            onClose={() => setMomoPaymentData(null)}
            onConfirm={async (phoneNumber) => {
              const plan = momoPaymentData.planName;
              setMomoPaymentData(null);
              await handlePayment('momo', plan, phoneNumber);
            }}
            isProcessing={isProcessingPayment}
          />
        )}
      </AnimatePresence>

      {/* Mobile Overlay */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsSidebarOpen(false)}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-10 lg:hidden"
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <aside className={cn(
        "fixed lg:static inset-y-0 left-0 z-40 transition-all duration-300 overflow-y-auto lg:overflow-visible custom-scrollbar",
        theme === 'dark' 
          ? "bg-zinc-900 border-r border-zinc-800" 
          : "bg-[#0f172a] border-r border-slate-800",
        isSidebarOpen ? "w-64 translate-x-0 pointer-events-auto" : "w-0 lg:w-20 -translate-x-full lg:translate-x-0 pointer-events-none lg:pointer-events-auto"
      )}>
        <div className="h-full flex flex-col p-4">
          <div className="flex items-center justify-between gap-3 px-2 mb-10">
            <div className="flex items-center gap-3">
              {currentOrg?.logoUrl ? (
                <div className="w-10 h-10 rounded-xl bg-zinc-800 border border-zinc-700 flex items-center justify-center overflow-hidden">
                  <img src={currentOrg.logoUrl} alt="Logo" className="w-full h-full object-contain" referrerPolicy="no-referrer" />
                </div>
              ) : (
                <div className="bg-indigo-600 p-2 rounded-xl">
                  <Sparkles className="w-6 h-6 text-white" />
                </div>
              )}
              {isSidebarOpen && (
                <div className="flex flex-col">
                  <span className="text-xl font-bold text-zinc-100 tracking-tight leading-none">JENA POS</span>
                  <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest mt-1 truncate max-w-[120px]">
                    {currentOrg?.name || 'Business'}
                  </span>
                </div>
              )}
            </div>
            {isSidebarOpen && (
              <button onClick={() => setIsSidebarOpen(false)} className="lg:hidden p-2 text-zinc-500 hover:bg-zinc-800 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            )}
          </div>

          <nav className="flex-1 space-y-2">
            <SidebarItem theme={theme} icon={LayoutDashboard} label={isSidebarOpen ? "Dashboard" : ""} active={activeTab === 'dashboard'} onClick={() => { setActiveTab('dashboard'); if(window.innerWidth < 1024) setIsSidebarOpen(false); }} />
            {permissions.canAccessPOS && (
              <SidebarItem theme={theme} icon={Store} label={isSidebarOpen ? "POS" : ""} active={activeTab === 'pos'} onClick={() => { setActiveTab('pos'); if(window.innerWidth < 1024) setIsSidebarOpen(false); }} />
            )}
            {permissions.canManageInventory && (
              <SidebarItem theme={theme} icon={Package} label={isSidebarOpen ? "Inventory" : ""} active={activeTab === 'inventory'} onClick={() => { setActiveTab('inventory'); if(window.innerWidth < 1024) setIsSidebarOpen(false); }} />
            )}
            {permissions.canManageDamages && (
              <SidebarItem theme={theme} icon={AlertTriangle} label={isSidebarOpen ? "Damages" : ""} active={activeTab === 'damages'} onClick={() => { setActiveTab('damages'); if(window.innerWidth < 1024) setIsSidebarOpen(false); }} />
            )}
            {permissions.canViewReports && (
              <SidebarItem theme={theme} icon={Receipt} label={isSidebarOpen ? "Transactions" : ""} active={activeTab === 'transactions'} onClick={() => { setActiveTab('transactions'); if(window.innerWidth < 1024) setIsSidebarOpen(false); }} />
            )}
            {permissions.canViewReports && (
              <SidebarItem theme={theme} icon={BarChart3} label={isSidebarOpen ? "Reports" : ""} active={activeTab === 'reports'} onClick={() => { setActiveTab('reports'); if(window.innerWidth < 1024) setIsSidebarOpen(false); }} />
            )}
            {permissions.canManageStaff && (
              <SidebarItem theme={theme} icon={ShieldCheck} label={isSidebarOpen ? "Admin" : ""} active={activeTab === 'admin'} onClick={() => { setActiveTab('admin'); if(window.innerWidth < 1024) setIsSidebarOpen(false); }} />
            )}
            {permissions.canAccessSettings && (
              <SidebarItem theme={theme} icon={Settings} label={isSidebarOpen ? "Settings" : ""} active={activeTab === 'settings'} onClick={() => { setActiveTab('settings'); if(window.innerWidth < 1024) setIsSidebarOpen(false); }} />
            )}
            <SidebarItem theme={theme} icon={Share2} label={isSidebarOpen ? "Affiliate" : ""} active={activeTab === 'affiliate'} onClick={() => { setActiveTab('affiliate'); if(window.innerWidth < 1024) setIsSidebarOpen(false); }} />
            <SidebarItem theme={theme} icon={HelpCircle} label={isSidebarOpen ? "Help" : ""} active={activeTab === 'help'} onClick={() => { setActiveTab('help'); if(window.innerWidth < 1024) setIsSidebarOpen(false); }} />
          </nav>

          <div className="pt-4 border-t border-zinc-800 space-y-2">
            <button 
              onClick={handleSignOut}
              className="flex items-center gap-3 w-full px-4 py-3 text-zinc-500 hover:text-rose-500 transition-colors"
            >
              <LogOut className="w-5 h-5" />
              {isSidebarOpen && <span className="font-medium">Logout</span>}
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className={cn(
          "h-16 backdrop-blur-md border-b px-6 flex items-center justify-between sticky top-0 z-30",
          theme === 'dark'
            ? "bg-zinc-950/50 border-zinc-800"
            : "bg-[#0f172a]/90 border-slate-800 text-white"
        )}>
          <div className="flex items-center gap-4">
            <button onClick={() => setIsSidebarOpen(prev => !prev)} className={cn(
              "p-2 rounded-lg",
              theme === 'dark' ? "text-zinc-400 hover:bg-zinc-800" : "text-slate-400 hover:bg-slate-800"
            )}>
              <Menu className="w-6 h-6" />
            </button>

            {navigationHistory.length > 1 && (
              <button 
                onClick={goBack}
                className={cn(
                  "p-2 rounded-lg flex items-center gap-2 transition-all group",
                  theme === 'dark' ? "text-zinc-400 hover:bg-zinc-800 hover:text-indigo-400" : "text-slate-400 hover:bg-slate-800 hover:text-indigo-400"
                )}
              >
                <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
                <span className="text-xs font-bold uppercase tracking-widest hidden sm:inline">Back</span>
              </button>
            )}

            <div className={cn(
              "flex items-center gap-2 border px-3 py-1.5 rounded-xl",
              theme === 'dark' ? "bg-zinc-900 border-zinc-800" : "bg-slate-800 border-slate-700"
            )}>
              <Building2 className="w-4 h-4 text-indigo-500" />
              <select 
                value={currentOrg?.id}
                onChange={(e) => setCurrentOrg(organizations.find(o => o.id === e.target.value) || null)}
                className={cn(
                  "bg-transparent text-sm font-bold outline-none cursor-pointer",
                  theme === 'dark' ? "text-zinc-200" : "text-white"
                )}
              >
                {organizations.map(org => (
                  <option key={org.id} value={org.id}>{org.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="relative">
              <button 
                onClick={() => setShowNotifications(!showNotifications)}
                className={cn(
                  "w-10 h-10 rounded-xl border flex items-center justify-center transition-all relative",
                  theme === 'dark' 
                    ? "bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-indigo-500 hover:border-indigo-500/50" 
                    : "bg-slate-800 border-slate-700 text-slate-300 hover:text-white hover:border-indigo-400"
                )}
              >
                <Bell className="w-5 h-5" />
                {notifications.filter(n => !n.read).length > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-rose-500 text-[10px] font-bold text-white rounded-full flex items-center justify-center border-2 border-zinc-950">
                    {notifications.filter(n => !n.read).length}
                  </span>
                )}
              </button>

              <AnimatePresence>
                {showNotifications && (
                  <>
                    <div 
                      className="fixed inset-0 z-40" 
                      onClick={() => setShowNotifications(false)} 
                    />
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      className="absolute top-full mt-3 right-0 w-80 sm:w-96 bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl z-50 overflow-hidden"
                    >
                      <div className="p-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/50">
                        <h3 className="font-bold text-zinc-100">Notifications</h3>
                        <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
                          {notifications.length} Total
                        </span>
                      </div>
                      <div className="max-h-[400px] overflow-y-auto custom-scrollbar">
                        {notifications.length === 0 ? (
                          <div className="p-10 text-center space-y-2">
                            <Bell className="w-8 h-8 text-zinc-700 mx-auto" />
                            <p className="text-sm text-zinc-500">No notifications yet</p>
                          </div>
                        ) : (
                          <div className="divide-y divide-zinc-800/50">
                            {notifications.map((n) => (
                              <div 
                                key={n.id} 
                                onClick={() => handleNotificationClick(n)}
                                className={cn(
                                  "p-4 hover:bg-zinc-800/50 transition-colors cursor-pointer group",
                                  !n.read && "bg-indigo-500/5"
                                )}
                              >
                                <div className="flex gap-3">
                                  <div className={cn(
                                    "mt-1 w-8 h-8 rounded-lg flex items-center justify-center shrink-0",
                                    n.type === 'sale' ? "bg-emerald-500/10 text-emerald-500" :
                                    n.type === 'inventory' ? "bg-blue-500/10 text-blue-500" :
                                    n.type === 'damage' ? "bg-rose-500/10 text-rose-500" :
                                    n.type === 'expense' ? "bg-amber-500/10 text-amber-500" :
                                    n.type === 'login' ? "bg-indigo-500/10 text-indigo-500" :
                                    n.type === 'logout' ? "bg-amber-500/10 text-amber-500" :
                                    "bg-zinc-500/10 text-zinc-500"
                                  )}>
                                    {n.type === 'sale' ? <ShoppingCart className="w-4 h-4" /> :
                                     n.type === 'inventory' ? <Package className="w-4 h-4" /> :
                                     n.type === 'damage' ? <AlertTriangle className="w-4 h-4" /> :
                                     n.type === 'expense' ? <TrendingDown className="w-4 h-4" /> :
                                     n.type === 'login' ? <ShieldCheck className="w-4 h-4" /> :
                                     n.type === 'logout' ? <LogOut className="w-4 h-4" /> :
                                     <Bell className="w-4 h-4" />}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between gap-2">
                                      <p className={cn("text-sm font-bold truncate", n.read ? "text-zinc-400" : "text-zinc-100")}>
                                        {n.title}
                                      </p>
                                      <span className="text-[10px] text-zinc-500 whitespace-nowrap">
                                        {new Date(n.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                      </span>
                                    </div>
                                    <p className="text-xs text-zinc-400 mt-0.5 line-clamp-2 leading-relaxed">
                                      {n.message}
                                    </p>
                                    {n.type === 'sale' && n.metadata?.total && (
                                      <div className="mt-2 flex items-center gap-2">
                                        <span className="text-[10px] font-bold text-emerald-500 bg-emerald-500/10 px-1.5 py-0.5 rounded uppercase">
                                          {n.metadata.total.toLocaleString()} UGX
                                        </span>
                                        <span className="text-[10px] text-zinc-500">
                                          {n.metadata.items} items
                                        </span>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                      {notifications.length > 0 && (
                        <div className="p-3 bg-zinc-900/80 border-t border-zinc-800 text-center">
                          <button 
                            onClick={() => setShowNotifications(false)}
                            className="text-[10px] font-bold text-zinc-500 hover:text-zinc-300 uppercase tracking-widest"
                          >
                            Close Panel
                          </button>
                        </div>
                      )}
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>

            <button 
              onClick={() => { setActiveTab('settings'); setSettingsTab('billing'); }}
              className="hidden sm:flex items-center gap-2 bg-zinc-900 border border-zinc-800 px-3 py-1.5 rounded-xl hover:bg-zinc-800 transition-colors group"
            >
              <CreditCard className="w-4 h-4 text-amber-500 group-hover:scale-110 transition-transform" />
              <span className="text-[10px] font-bold text-zinc-300 uppercase tracking-wider">{planCountdown}</span>
            </button>
            <div className="relative">
              <button 
                onClick={() => { setActiveTab('help'); setShowHelpReminder(false); }}
                className="w-8 h-8 rounded-full bg-indigo-600 hover:bg-indigo-500 flex items-center justify-center text-white transition-colors relative group"
              >
                <HelpCircle className="w-5 h-5" />
                {showHelpReminder && (
                  <span className="absolute -top-1 -right-1 w-3 h-3 bg-rose-500 rounded-full border-2 border-zinc-950 animate-pulse" />
                )}
                <div className="absolute top-full mt-2 right-0 w-48 bg-zinc-900 border border-zinc-800 p-3 rounded-xl shadow-2xl opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50">
                  <p className="text-xs font-bold text-zinc-100">Need help?</p>
                  <p className="text-[10px] text-zinc-400 mt-1">Click here to learn how to use JENA POS</p>
                </div>
              </button>
            </div>
          </div>
        </header>

        <main className="flex-1 p-6 lg:p-10 overflow-y-auto custom-scrollbar">
          {isTrialExpired ? (
            <PaymentRequired currentOrg={currentOrg} handleSignOut={handleSignOut} showNotification={showNotification} handlePayment={handlePayment} isProcessing={isProcessingPayment} />
          ) : (
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
            >
                {activeTab === 'dashboard' && <Dashboard setActiveTab={setActiveTab} setHighlightedTxId={setHighlightedTxId} isAdmin={isAdmin} isManager={isManager} />}
                {activeTab === 'pos' && <POSView currentOrg={currentOrg} showNotification={showNotification} createNotification={createNotification} userProfile={userProfile} permissions={permissions} />}
                {activeTab === 'inventory' && <Inventory showNotification={showNotification} createNotification={createNotification} permissions={permissions} highlightedItemId={highlightedItemId} setHighlightedItemId={setHighlightedItemId} />}
                {activeTab === 'damages' && <Damages showNotification={showNotification} createNotification={createNotification} permissions={permissions} highlightedDamageId={highlightedDamageId} setHighlightedDamageId={setHighlightedDamageId} />}
                {activeTab === 'transactions' && <Transactions showNotification={showNotification} createNotification={createNotification} permissions={permissions} highlightedTxId={highlightedTxId} setHighlightedTxId={setHighlightedTxId} />}
                {activeTab === 'admin' && <AdminPanel currentOrg={currentOrg} showNotification={showNotification} setIsCreatingOrg={setIsCreatingOrg} isSuperAdmin={isSuperAdmin} permissions={permissions} />}
                {activeTab === 'reports' && <Reports permissions={permissions} />}
                {activeTab === 'help' && <HelpSection />}
                {activeTab === 'sales-analytics' && <SalesAnalytics />}
                {activeTab === 'expenses-analytics' && <ExpensesAnalytics />}
                {activeTab === 'profit-analytics' && <ProfitAnalytics />}
                {activeTab === 'affiliate' && <AffiliateView user={user} showNotification={showNotification} setActiveTab={setActiveTab} />}
                {activeTab === 'affiliate-referrals' && <ReferralsListView user={user} onBack={() => setActiveTab('affiliate')} />}
                {activeTab === 'terms' && <TermsAndConditions onBack={() => setActiveTab(navigationHistory[navigationHistory.length - 2] as any || 'dashboard')} />}
                {activeTab === 'privacy' && <PrivacyPolicy onBack={() => setActiveTab(navigationHistory[navigationHistory.length - 2] as any || 'dashboard')} />}
              {activeTab === 'settings' && (
              <div className="max-w-6xl mx-auto space-y-8 pb-20">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                  <div>
                    <h2 className="text-4xl font-black text-zinc-100 tracking-tighter uppercase italic">Settings</h2>
                    <p className="text-zinc-500 font-medium">Configure your workspace and personal preferences</p>
                  </div>
                </div>

                <div className="flex flex-col lg:flex-row gap-12">
                  {/* Sidebar Navigation */}
                  <aside className="w-full lg:w-72 shrink-0">
                    <nav className="flex flex-row lg:flex-col gap-2 overflow-x-auto lg:overflow-visible pb-4 lg:pb-0 no-scrollbar">
                      {[
                        { id: 'business', label: 'Business Profile', icon: Building2, desc: 'Company details & identity' },
                        { id: 'profile', label: 'Personal Profile', icon: User, desc: 'Your account & appearance' },
                        { id: 'billing', label: 'Billing & Plan', icon: CreditCard, desc: 'Trial status & payments' },
                        { id: 'security', label: 'Security', icon: ShieldCheck, desc: 'Password & access control' },
                        { id: 'notifications', label: 'Notifications', icon: Bell, desc: 'Alerts & communication' },
                      ].map((tab) => (
                        <button
                          key={tab.id}
                          onClick={() => setSettingsTab(tab.id as any)}
                          className={cn(
                            "flex items-center gap-4 px-4 py-3 rounded-2xl transition-all text-left w-full group",
                            settingsTab === tab.id 
                              ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/20" 
                              : "text-zinc-500 hover:bg-zinc-900 hover:text-zinc-300"
                          )}
                        >
                          <div className={cn(
                            "w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-colors",
                            settingsTab === tab.id ? "bg-white/20" : "bg-zinc-800 group-hover:bg-zinc-700"
                          )}>
                            <tab.icon className="w-5 h-5" />
                          </div>
                          <div className="hidden lg:block overflow-hidden">
                            <p className="text-sm font-bold truncate">{tab.label}</p>
                            <p className={cn(
                              "text-[10px] truncate uppercase tracking-widest font-bold opacity-60",
                              settingsTab === tab.id ? "text-indigo-100" : "text-zinc-600"
                            )}>{tab.desc}</p>
                          </div>
                        </button>
                      ))}
                    </nav>
                  </aside>

                  {/* Content Area */}
                  <div className="flex-1 min-w-0">
                    <AnimatePresence mode="wait">
                      <motion.div
                        key={settingsTab}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.2 }}
                      >
                        {settingsTab === 'business' && (
                          <div className="bg-zinc-900 border border-zinc-800 p-8 rounded-3xl space-y-8 shadow-2xl">
                            <div className="flex items-center gap-4 mb-2">
                              <div className="w-12 h-12 rounded-2xl bg-indigo-600/10 flex items-center justify-center border border-indigo-600/20">
                                <Building2 className="w-6 h-6 text-indigo-500" />
                              </div>
                              <div>
                                <h3 className="text-xl font-bold text-zinc-100">Business Profile</h3>
                                <p className="text-sm text-zinc-500">Manage your company's public identity and local settings</p>
                              </div>
                            </div>
                            
                            {/* Logo Section */}
                            <div className="space-y-4 pt-4">
                              <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Business Logo</label>
                              <div className="flex flex-col sm:flex-row items-center gap-8 p-6 bg-zinc-800/30 rounded-2xl border border-zinc-800">
                                <div className="w-32 h-32 rounded-2xl bg-zinc-800 border-2 border-dashed border-zinc-700 flex items-center justify-center overflow-hidden relative group">
                                  {currentOrg?.logoUrl ? (
                                    <>
                                      <img src={currentOrg.logoUrl} alt="Logo" className="w-full h-full object-contain" referrerPolicy="no-referrer" />
                                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                        <Camera className="w-8 h-8 text-white" />
                                      </div>
                                    </>
                                  ) : (
                                    <div className="text-center p-4">
                                      <ImageIcon className="w-8 h-8 text-zinc-600 mx-auto mb-2" />
                                      <p className="text-[10px] font-bold text-zinc-500 uppercase">No Logo</p>
                                    </div>
                                  )}
                                  <input 
                                    type="file" 
                                    accept="image/*" 
                                    onChange={handleLogoUpload}
                                    className="absolute inset-0 opacity-0 cursor-pointer"
                                    disabled={uploadingLogo}
                                  />
                                  {uploadingLogo && (
                                    <div className="absolute inset-0 bg-zinc-900/80 flex items-center justify-center">
                                      <Loader2 className="w-6 h-6 text-indigo-500 animate-spin" />
                                    </div>
                                  )}
                                </div>
                                <div className="flex-1 space-y-2">
                                  <h4 className="font-bold text-zinc-100">Official Company Logo</h4>
                                  <p className="text-sm text-zinc-500 leading-relaxed">
                                    This logo will be displayed on all official documents including receipts, invoices, and financial reports.
                                  </p>
                                  <div className="pt-2">
                                    <label className="inline-flex items-center gap-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 px-4 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer border border-zinc-700">
                                      <Plus className="w-4 h-4" />
                                      {currentOrg?.logoUrl ? 'Change Logo' : 'Upload Logo'}
                                      <input 
                                        type="file" 
                                        accept="image/*" 
                                        onChange={handleLogoUpload}
                                        className="hidden"
                                        disabled={uploadingLogo}
                                      />
                                    </label>
                                  </div>
                                </div>
                              </div>
                            </div>

                            <div className="pt-8 border-t border-zinc-800 grid grid-cols-1 md:grid-cols-2 gap-6">
                              <div className="space-y-2">
                                <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Business Name</label>
                                <input 
                                  type="text" 
                                  defaultValue={currentOrg?.name} 
                                  onBlur={(e) => handleUpdateOrg({ name: e.target.value })}
                                  className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-zinc-100 focus:ring-2 focus:ring-indigo-500 outline-none transition-all" 
                                />
                              </div>

                              <div className="space-y-2">
                                <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest">UPRS Registration Number</label>
                                <input 
                                  type="text" 
                                  defaultValue={currentOrg?.uprsRegistrationNumber} 
                                  onBlur={(e) => handleUpdateOrg({ uprsRegistrationNumber: e.target.value })}
                                  placeholder="e.g. UPRS-2024-XXXX"
                                  className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-zinc-100 focus:ring-2 focus:ring-indigo-500 outline-none transition-all" 
                                />
                              </div>

                              <div className="space-y-2 md:col-span-2">
                                <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Physical Address / P.O. Box</label>
                                <input 
                                  type="text" 
                                  defaultValue={currentOrg?.address} 
                                  onBlur={(e) => handleUpdateOrg({ address: e.target.value })}
                                  placeholder="e.g. 123 Business St, Kampala"
                                  className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-zinc-100 focus:ring-2 focus:ring-indigo-500 outline-none transition-all" 
                                />
                              </div>
                              
                              <div className="space-y-2">
                                <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Country</label>
                                <select 
                                  value={currentOrg?.country || 'US'}
                                  onChange={(e) => handleUpdateOrg({ country: e.target.value })}
                                  className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-zinc-100 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                                >
                                  <option value="US">United States</option>
                                  <option value="GB">United Kingdom</option>
                                  <option value="NG">Nigeria</option>
                                  <option value="KE">Kenya</option>
                                  <option value="ZA">South Africa</option>
                                  <option value="GH">Ghana</option>
                                  <option value="CA">Canada</option>
                                  <option value="AU">Australia</option>
                                  <option value="DE">Germany</option>
                                  <option value="FR">France</option>
                                  <option value="UG">Uganda</option>
                                </select>
                              </div>
                              <div className="space-y-2">
                                <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Base Currency</label>
                                <select 
                                  value={currentOrg?.currency || 'USD'}
                                  onChange={(e) => handleUpdateOrg({ currency: e.target.value })}
                                  className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-zinc-100 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                                >
                                  <option value="USD">USD ($)</option>
                                  <option value="GBP">GBP (£)</option>
                                  <option value="NGN">NGN (₦)</option>
                                  <option value="KES">KES (KSh)</option>
                                  <option value="ZAR">ZAR (R)</option>
                                  <option value="GHS">GHS (GH₵)</option>
                                  <option value="CAD">CAD ($)</option>
                                  <option value="AUD">AUD ($)</option>
                                  <option value="EUR">EUR (€)</option>
                                  <option value="UGX">UGX (USh)</option>
                                </select>
                              </div>
                            </div>
                          </div>
                        )}

                        {settingsTab === 'profile' && (
                          <div className="bg-zinc-900 border border-zinc-800 p-8 rounded-3xl space-y-8 shadow-2xl">
                            <div className="flex items-center gap-4 mb-2">
                              <div className="w-12 h-12 rounded-2xl bg-indigo-600/10 flex items-center justify-center border border-indigo-600/20">
                                <User className="w-6 h-6 text-indigo-500" />
                              </div>
                              <div>
                                <h3 className="text-xl font-bold text-zinc-100">Personal Profile</h3>
                                <p className="text-sm text-zinc-500">Manage your personal information and application appearance</p>
                              </div>
                            </div>
                            
                            <div className="space-y-8">
                              <div className="space-y-4">
                                <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Appearance Theme</label>
                                <div className="flex items-center gap-4">
                                  <button 
                                    onClick={() => setTheme('light')}
                                    className={cn(
                                      "flex-1 flex flex-col items-center justify-center gap-3 py-6 rounded-2xl border-2 transition-all",
                                      theme === 'light' ? "bg-white text-zinc-950 border-indigo-600 shadow-xl" : "bg-zinc-800/50 text-zinc-400 border-zinc-800 hover:border-zinc-700"
                                    )}
                                  >
                                    <Sun className="w-6 h-6" />
                                    <span className="text-sm font-bold">Light Mode</span>
                                  </button>
                                  <button 
                                    onClick={() => setTheme('dark')}
                                    className={cn(
                                      "flex-1 flex flex-col items-center justify-center gap-3 py-6 rounded-2xl border-2 transition-all",
                                      theme === 'dark' ? "bg-zinc-800 text-white border-indigo-600 shadow-xl shadow-indigo-600/10" : "bg-zinc-800/50 text-zinc-400 border-zinc-800 hover:border-zinc-700"
                                    )}
                                  >
                                    <Moon className="w-6 h-6" />
                                    <span className="text-sm font-bold">Dark Mode</span>
                                  </button>
                                </div>
                              </div>

                              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-8 border-t border-zinc-800">
                                <div className="space-y-2">
                                  <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Display Name</label>
                                  <input 
                                    type="text" 
                                    defaultValue={userProfile?.displayName || ''} 
                                    onBlur={(e) => handleUpdateProfile({ displayName: e.target.value })}
                                    placeholder="Your full name"
                                    className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-zinc-100 focus:ring-2 focus:ring-indigo-500 outline-none transition-all" 
                                  />
                                </div>
                                <div className="space-y-2">
                                  <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Contact Number</label>
                                  <input 
                                    type="text" 
                                    defaultValue={userProfile?.phoneNumber || ''} 
                                    onBlur={(e) => handleUpdateProfile({ phoneNumber: e.target.value })}
                                    placeholder="e.g. +256 7XX XXX XXX"
                                    className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-zinc-100 focus:ring-2 focus:ring-indigo-500 outline-none transition-all" 
                                  />
                                </div>
                                <div className="space-y-2 md:col-span-2">
                                  <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Email Address</label>
                                  <input 
                                    type="email" 
                                    value={user?.email || ''} 
                                    disabled
                                    className="w-full bg-zinc-800/50 border border-zinc-800 rounded-xl px-4 py-3 text-zinc-500 cursor-not-allowed italic" 
                                  />
                                  <p className="text-[10px] text-zinc-600 font-bold uppercase tracking-widest">Email cannot be changed for security reasons</p>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}

                        {settingsTab === 'security' && (
                          <div className="bg-zinc-900 border border-zinc-800 p-8 rounded-3xl space-y-8 shadow-2xl">
                            <div className="flex items-center gap-4 mb-2">
                              <div className="w-12 h-12 rounded-2xl bg-rose-600/10 flex items-center justify-center border border-rose-600/20">
                                <ShieldCheck className="w-6 h-6 text-rose-500" />
                              </div>
                              <div>
                                <h3 className="text-xl font-bold text-zinc-100">Security & Access</h3>
                                <p className="text-sm text-zinc-500">Protect your account and manage access credentials</p>
                              </div>
                            </div>

                            <div className="space-y-6">
                              <div className="p-6 bg-zinc-800/30 rounded-2xl border border-zinc-800 space-y-4">
                                <div className="flex items-start gap-4">
                                  <div className="w-10 h-10 rounded-xl bg-zinc-800 flex items-center justify-center shrink-0">
                                    <Clock className="w-5 h-5 text-zinc-400" />
                                  </div>
                                  <div>
                                    <h4 className="font-bold text-zinc-100">Password Management</h4>
                                    <p className="text-sm text-zinc-500 mt-1">We recommend changing your password every 90 days to keep your account secure.</p>
                                  </div>
                                </div>
                                <button 
                                  onClick={async () => {
                                    if (!user?.email) return;
                                    try {
                                      console.log('Attempting to send password reset email to:', user.email);
                                      await sendPasswordResetEmail(auth, user.email);
                                      showNotification('Password reset email sent! Please check your inbox.', 'success');
                                      await createNotification('system', 'Password Reset', 'Password reset email sent to ' + user.email, { email: user.email });
                                    } catch (err: any) {
                                      console.error("Password reset error:", err);
                                      let errorMessage = 'Failed to send reset email. Please try again later.';
                                      if (err.code === 'auth/user-not-found') {
                                        errorMessage = 'No user found with this email address.';
                                      } else if (err.code === 'auth/too-many-requests') {
                                        errorMessage = 'Too many requests. Please try again later.';
                                      }
                                      showNotification(errorMessage, 'error');
                                      await createNotification('system', 'Password Reset Failed', 'Failed to send reset email to ' + user.email, { error: err.message });
                                    }
                                  }}
                                  className="w-full sm:w-auto bg-zinc-800 hover:bg-zinc-700 text-zinc-300 px-6 py-3 rounded-xl text-xs font-bold uppercase tracking-widest transition-colors border border-zinc-700"
                                >
                                  Reset Password via Email
                                </button>
                              </div>

                              <div className="p-6 bg-zinc-800/30 rounded-2xl border border-zinc-800 space-y-4">
                                <div className="flex items-start gap-4">
                                  <div className="w-10 h-10 rounded-xl bg-zinc-800 flex items-center justify-center shrink-0">
                                    <Users className="w-5 h-5 text-zinc-400" />
                                  </div>
                                  <div>
                                    <h4 className="font-bold text-zinc-100">Session Management</h4>
                                    <p className="text-sm text-zinc-500 mt-1">You are currently logged in as <span className="text-indigo-400 font-bold">{user?.email}</span>. If you suspect unauthorized access, sign out from all devices.</p>
                                  </div>
                                </div>
                                <button 
                                  onClick={handleSignOut}
                                  className="w-full sm:w-auto bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 px-6 py-3 rounded-xl text-xs font-bold uppercase tracking-widest transition-colors border border-rose-500/20"
                                >
                                  Sign Out from this Session
                                </button>
                              </div>
                            </div>
                          </div>
                        )}

                        {settingsTab === 'notifications' && (
                          <div className="bg-zinc-900 border border-zinc-800 p-8 rounded-3xl space-y-8 shadow-2xl">
                            <div className="flex items-center gap-4 mb-2">
                              <div className="w-12 h-12 rounded-2xl bg-indigo-600/10 flex items-center justify-center border border-indigo-600/20">
                                <Bell className="w-6 h-6 text-indigo-500" />
                              </div>
                              <div>
                                <h3 className="text-xl font-bold text-zinc-100">Notification Preferences</h3>
                                <p className="text-sm text-zinc-500">Choose how and when you want to be notified</p>
                              </div>
                            </div>

                            <div className="space-y-4">
                              {[
                                { id: 'sales', label: 'Sales Alerts', desc: 'Get notified when a new sale is completed' },
                                { id: 'inventory', label: 'Low Stock Alerts', desc: 'Alerts when products fall below minimum levels' },
                                { id: 'reports', label: 'Daily Reports', desc: 'Receive a summary of daily business performance' },
                                { id: 'security', label: 'Security Alerts', desc: 'Notifications for new logins or password changes' },
                              ].map((pref) => {
                                const isEnabled = userProfile?.notificationPreferences?.[pref.id as keyof typeof userProfile.notificationPreferences] ?? true;
                                return (
                                  <div key={pref.id} className="flex items-center justify-between p-4 bg-zinc-800/30 rounded-2xl border border-zinc-800">
                                    <div>
                                      <p className="font-bold text-zinc-100">{pref.label}</p>
                                      <p className="text-xs text-zinc-500">{pref.desc}</p>
                                    </div>
                                    <button 
                                      onClick={() => {
                                        const currentPrefs = userProfile?.notificationPreferences || {};
                                        handleUpdateProfile({
                                          notificationPreferences: {
                                            ...currentPrefs,
                                            [pref.id]: !isEnabled
                                          }
                                        });
                                      }}
                                      className={cn(
                                        "w-12 h-6 rounded-full relative transition-all duration-200",
                                        isEnabled ? "bg-indigo-600" : "bg-zinc-700 hover:bg-zinc-600"
                                      )}
                                    >
                                      <div className={cn(
                                        "absolute top-1 w-4 h-4 rounded-full bg-white transition-all duration-200",
                                        isEnabled ? "left-7" : "left-1"
                                      )} />
                                    </button>
                                  </div>
                                );
                              })}
                              
                              <div className="pt-6">
                                <p className="text-[10px] text-zinc-600 font-bold uppercase tracking-widest text-center">Notification settings are synced across all your devices</p>
                              </div>
                            </div>
                          </div>
                        )}

                        {settingsTab === 'billing' && (
                          <div className="bg-zinc-900 border border-zinc-800 p-8 rounded-3xl space-y-8 shadow-2xl">
                            <div className="flex items-center gap-4 mb-2">
                              <div className="w-12 h-12 rounded-2xl bg-indigo-600/10 flex items-center justify-center border border-indigo-600/20">
                                <CreditCard className="w-6 h-6 text-indigo-500" />
                              </div>
                              <div>
                                <h3 className="text-xl font-bold text-zinc-100">Billing & Subscription</h3>
                                <p className="text-sm text-zinc-500">Manage your shop's access and subscription plan</p>
                              </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                              <div className="p-6 bg-zinc-800/30 rounded-2xl border border-zinc-800 space-y-4">
                                <div className="flex items-start gap-4">
                                  <div className="w-10 h-10 rounded-xl bg-zinc-800 flex items-center justify-center shrink-0">
                                    <Clock className="w-5 h-5 text-indigo-400" />
                                  </div>
                                  <div>
                                    <h4 className="font-bold text-zinc-100">Trial Countdown</h4>
                                    <div className="mt-1">
                                      <p className="text-3xl font-black text-indigo-500 tracking-tighter">
                                        {trialEndDate 
                                          ? Math.max(0, Math.ceil((trialEndDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)))
                                          : 0}
                                        <span className="text-sm font-bold text-zinc-500 ml-2 uppercase tracking-widest">Days Left</span>
                                      </p>
                                      <p className="text-sm text-zinc-500 mt-2 leading-relaxed">
                                        Your 3-month free trial ends on <span className="text-zinc-300 font-bold">{trialEndDate ? formatDate(trialEndDate) : 'N/A'}</span>.
                                      </p>
                                    </div>
                                  </div>
                                </div>
                              </div>

                              <div className="p-6 bg-zinc-800/30 rounded-2xl border border-zinc-800 space-y-4">
                                <div className="flex items-start gap-4">
                                  <div className="w-10 h-10 rounded-xl bg-zinc-800 flex items-center justify-center shrink-0">
                                    <ShieldCheck className="w-5 h-5 text-emerald-400" />
                                  </div>
                                  <div>
                                    <h4 className="font-bold text-zinc-100">Active Plan</h4>
                                    <div className="mt-1">
                                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-500 text-xs font-bold uppercase tracking-widest border border-emerald-500/20">
                                        {PLAN_DETAILS[currentOrg?.plan as keyof typeof PLAN_DETAILS]?.label || 'Trial'}
                                      </span>
                                      <p className="text-sm text-zinc-500 mt-3 leading-relaxed">
                                        {currentOrg?.isPaid ? 'Your subscription is active.' : 'You are currently on a free trial.'}
                                      </p>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>

                            <div className="space-y-6">
                              <h4 className="text-sm font-bold text-zinc-500 uppercase tracking-widest">Available Plans</h4>
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                {[
                                  { id: 'starter', name: 'Starter', price: '8000', color: 'text-emerald-500', features: PLAN_DETAILS.starter.features },
                                  { id: 'business', name: 'Business', price: '20000', color: 'text-indigo-500', features: PLAN_DETAILS.business.features },
                                  { id: 'enterprise', name: 'Enterprise', price: '80000', color: 'text-amber-500', features: PLAN_DETAILS.enterprise.features }
                                ].map((plan) => (
                                  <div key={plan.id} className={cn(
                                    "p-6 rounded-2xl border transition-all flex flex-col",
                                    currentOrg?.plan === plan.id ? "bg-zinc-800/50 border-indigo-500" : "bg-zinc-900 border-zinc-800"
                                  )}>
                                    <p className={cn("text-[10px] font-bold uppercase tracking-widest mb-1", plan.color)}>{plan.name}</p>
                                    <p className="text-xl font-black text-zinc-100 tracking-tighter mb-4">{plan.price}<span className="text-[10px] text-zinc-500 ml-1">/mo</span></p>
                                    
                                    <ul className="space-y-2 mb-6 flex-grow">
                                      {plan.features.map((feature, i) => (
                                        <li key={i} className="flex items-center gap-2 text-[10px] text-zinc-400">
                                          <Check className="w-3 h-3 text-indigo-500 shrink-0" />
                                          {feature}
                                        </li>
                                      ))}
                                    </ul>

                                    <div className="space-y-2">
                                      <button 
                                        onClick={() => handlePayment('momo', plan.id)}
                                        disabled={isProcessingPayment || currentOrg?.plan === plan.id}
                                        className={cn(
                                          "w-full py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all flex items-center justify-center gap-2",
                                          currentOrg?.plan === plan.id 
                                            ? "bg-zinc-800 text-zinc-500 cursor-default" 
                                            : "bg-amber-600 hover:bg-amber-500 text-white shadow-lg shadow-amber-600/20"
                                        )}
                                      >
                                        {isProcessingPayment ? (
                                          <Loader2 className="w-3 h-3 animate-spin" />
                                        ) : (
                                          <Wallet className="w-3 h-3" />
                                        )}
                                        {currentOrg?.plan === plan.id ? 'Current Plan' : 'Mobile Money'}
                                      </button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>

                            {/* Payment History */}
                            <div className="space-y-6">
                              <div className="flex items-center justify-between">
                                <h4 className="text-sm font-bold text-zinc-500 uppercase tracking-widest">Recent Payment Attempts</h4>
                                <span className="text-[10px] text-zinc-600 italic">Tracking all Mobile Money & Card transactions</span>
                              </div>
                              
                              <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
                                <div className="overflow-x-auto">
                                  <table className="w-full text-left border-collapse">
                                    <thead>
                                      <tr className="border-b border-zinc-800 bg-zinc-800/20">
                                        <th className="px-6 py-4 text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Date</th>
                                        <th className="px-6 py-4 text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Plan</th>
                                        <th className="px-6 py-4 text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Method</th>
                                        <th className="px-6 py-4 text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Amount</th>
                                        <th className="px-6 py-4 text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Status</th>
                                        <th className="px-6 py-4 text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Details</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-zinc-800">
                                      {payments.length === 0 ? (
                                        <tr>
                                          <td colSpan={6} className="px-6 py-12 text-center text-zinc-500 italic text-sm">
                                            No payment attempts recorded yet.
                                          </td>
                                        </tr>
                                      ) : (
                                        payments.slice(0, 10).map((payment) => (
                                          <tr key={payment.id} className="hover:bg-zinc-800/30 transition-colors">
                                            <td className="px-6 py-4 text-xs text-zinc-400 whitespace-nowrap">
                                              {formatDate(payment.createdAt)}
                                            </td>
                                            <td className="px-6 py-4">
                                              <span className="text-xs font-bold text-zinc-100 uppercase">{payment.plan}</span>
                                            </td>
                                            <td className="px-6 py-4">
                                              <div className="flex items-center gap-2">
                                                {payment.method === 'momo' ? (
                                                  <Wallet className="w-3 h-3 text-amber-500" />
                                                ) : (
                                                  <CreditCard className="w-3 h-3 text-indigo-500" />
                                                )}
                                                <span className="text-xs text-zinc-400 capitalize">{payment.method}</span>
                                              </div>
                                            </td>
                                            <td className="px-6 py-4 text-xs font-bold text-zinc-100">
                                              {formatCurrency(payment.amount, payment.currency)}
                                            </td>
                                            <td className="px-6 py-4">
                                              <span className={cn(
                                                "px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-widest border",
                                                payment.status === 'completed' 
                                                  ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" 
                                                  : "bg-rose-500/10 text-rose-500 border-rose-500/20"
                                              )}>
                                                {payment.status}
                                              </span>
                                            </td>
                                            <td className="px-6 py-4">
                                              <p className="text-[10px] text-zinc-500 max-w-[200px] truncate" title={payment.error || payment.phoneNumber}>
                                                {payment.error || payment.phoneNumber || '-'}
                                              </p>
                                            </td>
                                          </tr>
                                        ))
                                      )}
                                    </tbody>
                                  </table>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                      </motion.div>
                    </AnimatePresence>
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        )}

        <footer className="mt-auto pt-10 pb-6 border-t border-zinc-800/50">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-2 text-zinc-500">
              <span className="text-xs">© {new Date().getFullYear()}</span>
              <span className="text-xs font-bold text-zinc-400">@MichealSakwa</span>
              <span className="text-zinc-800">|</span>
              <span className="text-xs">All rights reserved</span>
              <span className="text-zinc-800">|</span>
              <span className="text-[10px] text-zinc-600 italic">Terms & Conditions apply</span>
            </div>
            <div className="flex items-center gap-6">
              <button 
                onClick={() => setActiveTab('terms')}
                className="text-[10px] font-bold text-zinc-500 hover:text-zinc-300 uppercase tracking-widest transition-colors"
              >
                Terms & Conditions
              </button>
              <button 
                onClick={() => setActiveTab('privacy')}
                className="text-[10px] font-bold text-zinc-500 hover:text-zinc-300 uppercase tracking-widest transition-colors"
              >
                Privacy Policy
              </button>
              <button className="text-[10px] font-bold text-zinc-500 hover:text-zinc-300 uppercase tracking-widest transition-colors">Contact Support</button>
            </div>
          </div>
        </footer>
      </main>
      </div>

      <AnimatePresence>
        {notification && (
          <Notification 
            message={notification.message} 
            type={notification.type} 
            onClose={() => setNotification(null)} 
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function AuthScreen() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [showRedirectOption, setShowRedirectOption] = useState(false);
  const [referrerName, setReferrerName] = useState<string | null>(null);

  useEffect(() => {
    const checkReferral = async () => {
      const urlParams = new URLSearchParams(window.location.search);
      const refCode = urlParams.get('ref') || localStorage.getItem('jena_pos_ref');
      if (refCode) {
        try {
          const affiliatesSnap = await getDocs(query(collection(db, 'affiliates'), where('affiliateCode', '==', refCode.trim().toUpperCase())));
          if (!affiliatesSnap.empty) {
            const affiliateData = affiliatesSnap.docs[0].data();
            const userDoc = await getDoc(doc(db, 'users', affiliateData.uid));
            if (userDoc.exists()) {
              setReferrerName(userDoc.data().displayName);
              localStorage.setItem('jena_pos_ref', refCode.trim().toUpperCase());
            }
          }
        } catch (err) {
          console.error('Error checking referral code:', err);
        }
      }
    };
    checkReferral();
  }, []);

  const handleLogin = async (useRedirect = false) => {
    setIsLoading(true);
    setError(null);
    setMessage(null);
    setShowRedirectOption(false);
    try {
      const provider = new GoogleAuthProvider();
      // Force account selection to ensure the popup is triggered correctly
      provider.setCustomParameters({ prompt: 'select_account' });

      if (useRedirect) {
        await signInWithRedirect(auth, provider);
        return;
      }

      const result = await signInWithPopup(auth, provider);
      const additionalInfo = getAdditionalUserInfo(result);
      
      // If this is a new user or email not verified, send verification email
      if (result.user && !result.user.emailVerified) {
        try {
          await sendEmailVerification(result.user);
          setMessage("A verification email has been sent to your inbox. Please verify your email to access all features.");
        } catch (verifyErr: any) {
          console.error("Verification email failed:", verifyErr);
          // Don't block login if verification email fails (might be rate limited)
          if (additionalInfo?.isNewUser) {
            setMessage("Welcome! Please verify your email later to access all features.");
          }
        }
      } else if (additionalInfo?.isNewUser) {
        setMessage("Welcome to JENA POS! Your account has been created.");
      }
    } catch (err: any) {
      console.error("Login failed:", err);
      if (err.code === 'auth/popup-blocked') {
        setError("Your browser blocked the login window. Please allow pop-ups for this site or click the 'Open in New Tab' button in the top right of the preview.");
        setShowRedirectOption(true);
      } else if (err.code === 'auth/popup-closed-by-user') {
        setError("The login window was closed before completion. Please try again or use the redirect method.");
        setShowRedirectOption(true);
      } else if (err.message?.includes('missing initial state') || err.code === 'auth/internal-error') {
        setError("Authentication failed due to browser restrictions in the preview iframe. Please open the application in a new tab using the button in the top right corner to sign in.");
        setShowRedirectOption(true);
      } else {
        setError(err.message || "An unexpected error occurred during login.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden -z-10">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-600/20 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-emerald-600/10 blur-[120px] rounded-full" />
      </div>

      <div className="max-w-md w-full space-y-8 text-center">
        <div className="space-y-4">
          <div className="bg-indigo-600 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto shadow-2xl shadow-indigo-600/40">
            <Sparkles className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-4xl font-black text-zinc-100 tracking-tight">JENA POS</h1>
          <p className="text-zinc-400 text-lg">The modern operating system for your business finances.</p>
        </div>

        <div className="bg-zinc-900/50 backdrop-blur-xl border border-zinc-800 p-8 rounded-[32px] shadow-2xl space-y-6">
          <div className="space-y-2">
            <h2 className="text-xl font-bold text-zinc-100">Get Started</h2>
            {referrerName ? (
              <p className="text-sm text-indigo-400 font-medium bg-indigo-500/10 py-2 px-4 rounded-xl inline-block border border-indigo-500/20">
                You were referred by <span className="font-bold">{referrerName}</span>
              </p>
            ) : (
              <p className="text-sm text-zinc-500">Sign in with your Google account to access all your business organizations.</p>
            )}
          </div>
          
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs p-4 rounded-xl text-left flex gap-3">
              <div className="flex-shrink-0 mt-0.5">⚠️</div>
              <p>{error}</p>
            </div>
          )}

          {message && (
            <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs p-4 rounded-xl text-left flex gap-3">
              <div className="flex-shrink-0 mt-0.5">✨</div>
              <p>{message}</p>
            </div>
          )}
          
          <div className="space-y-3">
            <button 
              onClick={() => handleLogin()}
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-3 bg-white hover:bg-zinc-100 text-zinc-950 font-bold py-4 rounded-2xl transition-all shadow-xl disabled:opacity-50"
            >
              {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                <>
                  <img src="https://www.google.com/favicon.ico" className="w-5 h-5" alt="Google" />
                  Continue with Google
                </>
              )}
            </button>

            {showRedirectOption && (
              <button 
                onClick={() => handleLogin(true)}
                disabled={isLoading}
                className="w-full flex items-center justify-center gap-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-100 font-bold py-4 rounded-2xl transition-all border border-zinc-700 disabled:opacity-50"
              >
                {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                  <>
                    <RefreshCw className="w-5 h-5" />
                    Try Redirect Sign-in
                  </>
                )}
              </button>
            )}
          </div>

          <div className="pt-4 flex items-center justify-center gap-6 text-zinc-600">
            <div className="flex flex-col items-center gap-1">
              <TrendingUp className="w-5 h-5" />
              <span className="text-[10px] uppercase font-bold tracking-widest">Growth</span>
            </div>
            <div className="flex flex-col items-center gap-1">
              <Box className="w-5 h-5" />
              <span className="text-[10px] uppercase font-bold tracking-widest">Stock</span>
            </div>
            <div className="flex flex-col items-center gap-1">
              <CreditCard className="w-5 h-5" />
              <span className="text-[10px] uppercase font-bold tracking-widest">Billing</span>
            </div>
          </div>
        </div>

        <div className="pt-8 border-t border-zinc-800/50 flex flex-col items-center gap-4">
          <div className="flex items-center gap-2 text-zinc-500">
            <span className="text-[10px] font-bold uppercase tracking-widest">© {new Date().getFullYear()} @MichealSakwa</span>
            <span className="text-zinc-800">•</span>
            <span className="text-[10px] uppercase tracking-widest">All rights reserved</span>
            <span className="text-zinc-800">•</span>
            <span className="text-[9px] text-zinc-600 italic">Terms & Conditions apply</span>
          </div>
          <div className="flex gap-6">
            <button className="text-[10px] font-bold text-zinc-600 hover:text-zinc-400 uppercase tracking-widest transition-colors">Terms & Conditions</button>
            <button className="text-[10px] font-bold text-zinc-600 hover:text-zinc-400 uppercase tracking-widest transition-colors">Privacy Policy</button>
          </div>
          <p className="text-[9px] text-zinc-700 max-w-[200px] leading-tight">
            By continuing, you agree to our Terms and Conditions and Privacy Policy.
          </p>
        </div>
      </div>
    </div>
  );
}

function AppContent() {
  const { user, userProfile, loading, isAuthReady } = useFirebase();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const refCode = params.get('ref');
    console.log('AppContent mounted. URL Search:', window.location.search, 'Ref Code:', refCode);
    
    if (refCode) {
      localStorage.setItem('jena_pos_ref', refCode);
      if (!sessionStorage.getItem(`ref_tracked_${refCode}`)) {
        console.log('Affiliate link detected with code:', refCode);
        const trackClick = async () => {
          try {
            const normalizedCode = refCode.trim().toUpperCase();
            console.log('Searching for affiliate in Firestore with normalized code:', normalizedCode);
            const affiliatesSnap = await getDocs(query(collection(db, 'affiliates'), where('affiliateCode', '==', normalizedCode)));
            if (!affiliatesSnap.empty) {
              const affiliateDoc = affiliatesSnap.docs[0];
              const currentClicks = affiliateDoc.data().totalClicks || 0;
              console.log('Affiliate found! Current clicks:', currentClicks, 'Incrementing for:', affiliateDoc.id);
              await updateDocument('affiliates', affiliateDoc.id, {
                totalClicks: currentClicks + 1
              });
              sessionStorage.setItem(`ref_tracked_${refCode}`, 'true');
              console.log('Click tracked successfully!');
            } else {
              console.warn('Affiliate not found for code:', normalizedCode);
            }
          } catch (error) {
            console.error('Error tracking referral click:', error);
          }
        };
        trackClick();
      }
    }
  }, []);
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const saved = localStorage.getItem('jena-pos-theme');
    if (saved === 'light' || saved === 'dark') return saved;
    
    // Detect system preference
    if (typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'dark';
    }
    return 'light';
  });

  useEffect(() => {
    localStorage.setItem('jena-pos-theme', theme);
    if (theme === 'light') {
      document.documentElement.classList.add('light');
      document.documentElement.classList.remove('dark');
    } else {
      document.documentElement.classList.add('dark');
      document.documentElement.classList.remove('light');
    }
  }, [theme]);

  if (!isAuthReady || loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <Loader2 className="w-10 h-10 animate-spin text-indigo-600" />
      </div>
    );
  }

  if (user) {
    if (!userProfile) {
      return (
        <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
          <Loader2 className="w-10 h-10 animate-spin text-indigo-600" />
        </div>
      );
    }
    if (!userProfile.termsAcceptedAt) {
      return <TermsAcceptanceModal userProfile={userProfile} />;
    }
    return <MainApp theme={theme} setTheme={setTheme} />;
  }
  
  return <AuthScreen />;
}

export default function App() {
  return (
    <ErrorBoundary>
      <FirebaseProvider>
        <AppContent />
      </FirebaseProvider>
    </ErrorBoundary>
  );
}
