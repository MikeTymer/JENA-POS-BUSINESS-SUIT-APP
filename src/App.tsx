import React, { useState, useEffect, useMemo } from 'react';
import { mtnMoMoService } from './services/mtnService';
import { 
  signInWithPopup, 
  GoogleAuthProvider, 
  signOut 
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
  CreditCard,
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
  AlertTriangle,
  Image as ImageIcon,
  Camera,
  History,
  HelpCircle,
  Printer,
  MapPin,
  Hash,
  Bell,
  Clock
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
import { where, doc, getDoc, getDocs, collection, query } from 'firebase/firestore';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

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

const SidebarItem = ({ icon: Icon, label, active, onClick }: any) => (
  <button
    onClick={onClick}
    className={cn(
      "flex items-center gap-3 w-full px-4 py-3 rounded-xl transition-all duration-200",
      active 
        ? "bg-indigo-600 text-white shadow-lg shadow-indigo-900/20" 
        : "text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
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

const ReceiptModal = ({ receipt, onClose }: { receipt: ReceiptData, onClose: () => void }) => {
  const { currentOrg } = useFirebase();
  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPDF = () => {
    const doc = new jsPDF({
      unit: 'mm',
      format: [80, 200] // Typical receipt width 80mm
    });

    const margin = 5;
    let y = 10;

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
          <div className="text-right">
            <h3 className="text-lg font-bold">JENA POS</h3>
            <p className="text-[10px] text-zinc-500 uppercase tracking-widest">Business Solutions</p>
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
              onClick={handlePrint}
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

function Reports({ isManager }: { isManager: boolean }) {
  const { currentOrg } = useFirebase();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [receipts, setReceipts] = useState<ReceiptData[]>([]);
  const [selectedReceipt, setSelectedReceipt] = useState<ReceiptData | null>(null);
  const [period, setPeriod] = useState<'7' | '30' | '90' | 'all'>('30');

  useEffect(() => {
    if (!currentOrg) return;
    const unsubTx = subscribeToCollection<Transaction>(
      `organizations/${currentOrg.id}/transactions`,
      [],
      setTransactions
    );
    const unsubRc = subscribeToCollection<ReceiptData>(
      `organizations/${currentOrg.id}/receipts`,
      [],
      setReceipts
    );
    return () => { unsubTx(); unsubRc(); };
  }, [currentOrg]);

  const analysis = useMemo(() => {
    const now = new Date();
    const filteredTransactions = transactions.filter(tx => {
      if (period === 'all') return true;
      const txDate = new Date(tx.date);
      const diffTime = Math.abs(now.getTime() - txDate.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays <= parseInt(period);
    });

    const incomeByCategory: Record<string, number> = {};
    const expenseByCategory: Record<string, number> = {};
    const hourlyIncome: Record<number, number> = {};
    const weeklyProgress: Record<string, { income: number, expense: number }> = {};
    
    let totalIncome = 0;
    let totalExpense = 0;

    // Initialize hourly data
    for (let i = 0; i < 24; i++) hourlyIncome[i] = 0;

    // Initialize weekly data (last 7 days)
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      return d.toISOString().split('T')[0];
    });
    last7Days.forEach(day => weeklyProgress[day] = { income: 0, expense: 0 });

    filteredTransactions.forEach(tx => {
      const txDate = new Date(tx.date);
      const dayKey = tx.date.split('T')[0];
      const hour = txDate.getHours();

      if (tx.type === 'income') {
        incomeByCategory[tx.category] = (incomeByCategory[tx.category] || 0) + tx.amount;
        totalIncome += tx.amount;
        hourlyIncome[hour] += tx.amount;
        if (weeklyProgress[dayKey]) weeklyProgress[dayKey].income += tx.amount;
      } else {
        expenseByCategory[tx.category] = (expenseByCategory[tx.category] || 0) + tx.amount;
        totalExpense += tx.amount;
        if (weeklyProgress[dayKey]) weeklyProgress[dayKey].expense += tx.amount;
      }
    });

    const incomeData = Object.entries(incomeByCategory).map(([name, value]) => ({ name, value }));
    const expenseData = Object.entries(expenseByCategory).map(([name, value]) => ({ name, value }));
    
    const hourlyData = Object.entries(hourlyIncome).map(([hour, amount]) => ({
      hour: `${hour.padStart(2, '0')}:00`,
      amount
    }));

    const weeklyData = last7Days.map(day => {
      const date = new Date(day);
      return {
        day: date.toLocaleDateString('en-US', { weekday: 'short' }),
        income: weeklyProgress[day].income,
        expense: weeklyProgress[day].expense,
        fullDate: day
      };
    });

    // Find peak hour
    const peakHour = Object.entries(hourlyIncome).reduce((a, b) => a[1] > b[1] ? a : b);
    
    // Find best day
    const bestDay = weeklyData.reduce((a, b) => a.income > b.income ? a : b);

    return { 
      incomeData, 
      expenseData, 
      totalIncome, 
      totalExpense, 
      hourlyData, 
      weeklyData,
      peakHour: `${peakHour[0].padStart(2, '0')}:00`,
      bestDay: bestDay.day
    };
  }, [transactions, period]);

  const COLORS = ['#4f46e5', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

  const downloadReportPDF = () => {
    const doc = new jsPDF();
    
    doc.setFontSize(20);
    doc.text(`${currentOrg?.name || 'Business'} Financial Report`, 14, 22);
    
    doc.setFontSize(10);
    doc.setTextColor(100);
    let currentY = 28;
    if (currentOrg?.address) {
      doc.text(currentOrg.address, 14, currentY);
      currentY += 5;
    }
    if (currentOrg?.uprsRegistrationNumber) {
      doc.text(`UPRS REG: ${currentOrg.uprsRegistrationNumber}`, 14, currentY);
      currentY += 5;
    }

    doc.setFontSize(11);
    doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, currentY + 5);
    doc.text(`Period: ${period === 'all' ? 'All Time' : `Last ${period} Days`}`, 14, currentY + 12);

    // Summary Section
    doc.setFontSize(14);
    doc.setTextColor(0);
    doc.text('Performance Summary', 14, currentY + 23);
    
    autoTable(doc, {
      startY: currentY + 27,
      head: [['Metric', 'Value']],
      body: [
        ['Total Revenue', formatCurrency(analysis.totalIncome, currentOrg?.currency)],
        ['Total Expenses', formatCurrency(analysis.totalExpense, currentOrg?.currency)],
        ['Net Profit', formatCurrency(analysis.totalIncome - analysis.totalExpense, currentOrg?.currency)],
        ['Peak Sales Hour', analysis.peakHour],
        ['Best Performing Day', analysis.bestDay]
      ],
      theme: 'striped',
      headStyles: { fillColor: [79, 70, 229] }
    });

    // Weekly Progress
    const finalY = (doc as any).lastAutoTable.finalY || 52;
    doc.setFontSize(14);
    doc.text('Weekly Progress (Last 7 Days)', 14, finalY + 15);

    autoTable(doc, {
      startY: finalY + 20,
      head: [['Day', 'Income', 'Expense', 'Net']],
      body: analysis.weeklyData.map(d => [
        d.day,
        formatCurrency(d.income, currentOrg?.currency),
        formatCurrency(d.expense, currentOrg?.currency),
        formatCurrency(d.income - d.expense, currentOrg?.currency)
      ]),
      theme: 'grid',
      headStyles: { fillColor: [79, 70, 229] }
    });

    doc.save(`financial-report-${new Date().toISOString().split('T')[0]}.pdf`);
  };

  return (
    <div className="space-y-8">
      {isManager ? (
        <>
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold text-zinc-100">Financial Reports</h2>
            <div className="flex gap-3">
              <button 
                onClick={downloadReportPDF}
                className="flex items-center gap-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-100 px-4 py-2 rounded-xl transition-colors border border-zinc-700"
              >
                <Download className="w-4 h-4" /> Export PDF
              </button>
              <select 
                value={period}
                onChange={(e) => setPeriod(e.target.value as any)}
                className="bg-zinc-900 border border-zinc-800 px-4 py-2 rounded-xl text-sm font-bold text-zinc-400 outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="7">Last 7 Days</option>
                <option value="30">Last 30 Days</option>
                <option value="90">Last 90 Days</option>
                <option value="all">All Time</option>
              </select>
            </div>
          </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-indigo-600/10 rounded-lg">
              <TrendingUp className="w-5 h-5 text-indigo-500" />
            </div>
            <div>
              <p className="text-xs font-bold text-zinc-500 uppercase">Peak Sales Hour</p>
              <h4 className="text-xl font-black text-zinc-100">{analysis.peakHour}</h4>
            </div>
          </div>
          <p className="text-xs text-zinc-500">Most active time for your business based on transaction volume.</p>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-emerald-600/10 rounded-lg">
              <Sparkles className="w-5 h-5 text-emerald-500" />
            </div>
            <div>
              <p className="text-xs font-bold text-zinc-500 uppercase">Best Performing Day</p>
              <h4 className="text-xl font-black text-zinc-100">{analysis.bestDay}</h4>
            </div>
          </div>
          <p className="text-xs text-zinc-500">The day of the week with the highest recorded revenue.</p>
        </div>
      </div>

      <div className="bg-zinc-900 border border-zinc-800 p-8 rounded-3xl">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h3 className="text-xl font-bold text-zinc-100">Weekly Progress</h3>
            <p className="text-sm text-zinc-500">Revenue and expenses trend over the last 7 days</p>
          </div>
          <div className="flex items-center gap-4 text-xs font-bold">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-indigo-500" />
              <span className="text-zinc-400">Income</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-rose-500" />
              <span className="text-zinc-400">Expense</span>
            </div>
          </div>
        </div>
        <div className="h-[350px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={analysis.weeklyData}>
              <defs>
                <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#f43f5e" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
              <XAxis dataKey="day" stroke="#71717a" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis stroke="#71717a" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `${getCurrencySymbol(currentOrg?.currency)}${value}`} />
              <Tooltip 
                contentStyle={{ backgroundColor: '#18181b', border: '1px solid #27272a', borderRadius: '12px' }}
                itemStyle={{ color: '#f4f4f5' }}
              />
              <Area type="monotone" dataKey="income" stroke="#6366f1" strokeWidth={3} fillOpacity={1} fill="url(#colorIncome)" />
              <Area type="monotone" dataKey="expense" stroke="#f43f5e" strokeWidth={3} fillOpacity={1} fill="url(#colorExpense)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-zinc-900 border border-zinc-800 p-8 rounded-3xl">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h3 className="text-xl font-bold text-zinc-100">Hourly Sales Analysis</h3>
            <p className="text-sm text-zinc-500">Distribution of sales volume throughout the day</p>
          </div>
        </div>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={analysis.hourlyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
              <XAxis dataKey="hour" stroke="#71717a" fontSize={10} tickLine={false} axisLine={false} />
              <YAxis stroke="#71717a" fontSize={12} tickLine={false} axisLine={false} />
              <Tooltip 
                contentStyle={{ backgroundColor: '#18181b', border: '1px solid #27272a', borderRadius: '12px' }}
                itemStyle={{ color: '#f4f4f5' }}
                cursor={{ fill: '#27272a' }}
              />
              <Bar dataKey="amount" fill="#4f46e5" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl">
          <h3 className="text-lg font-bold text-zinc-100 mb-6">Income by Category</h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={analysis.incomeData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {analysis.incomeData.map((entry, index) => (
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
          <div className="mt-4 space-y-2">
            {analysis.incomeData.map((item, i) => (
              <div key={item.name} className="flex justify-between items-center text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                  <span className="text-zinc-400">{item.name}</span>
                </div>
                <span className="font-bold text-zinc-100">{formatCurrency(item.value, currentOrg?.currency)}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl">
          <h3 className="text-lg font-bold text-zinc-100 mb-6">Expenses by Category</h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={analysis.expenseData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {analysis.expenseData.map((entry, index) => (
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
          <div className="mt-4 space-y-2">
            {analysis.expenseData.map((item, i) => (
              <div key={item.name} className="flex justify-between items-center text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                  <span className="text-zinc-400">{item.name}</span>
                </div>
                <span className="font-bold text-zinc-100">{formatCurrency(item.value, currentOrg?.currency)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-zinc-900 border border-zinc-800 p-8 rounded-3xl">
        <h3 className="text-xl font-bold text-zinc-100 mb-8">Profit & Loss Summary</h3>
        <div className="space-y-6">
          <div className="flex justify-between items-center pb-4 border-b border-zinc-800">
            <span className="text-zinc-400">Total Revenue</span>
            <span className="text-xl font-bold text-emerald-500">{formatCurrency(analysis.totalIncome, currentOrg?.currency)}</span>
          </div>
          <div className="flex justify-between items-center pb-4 border-b border-zinc-800">
            <span className="text-zinc-400">Total Operating Expenses</span>
            <span className="text-xl font-bold text-rose-500">({formatCurrency(analysis.totalExpense, currentOrg?.currency)})</span>
          </div>
          <div className="flex justify-between items-center pt-4">
            <span className="text-xl font-bold text-zinc-100">Net Profit</span>
            <span className={cn(
              "text-3xl font-black",
              analysis.totalIncome - analysis.totalExpense >= 0 ? "text-indigo-400" : "text-rose-500"
            )}>
              {formatCurrency(analysis.totalIncome - analysis.totalExpense, currentOrg?.currency)}
            </span>
          </div>
        </div>
      </div>

      <div className="bg-zinc-900 border border-zinc-800 p-8 rounded-3xl">
        <div className="flex justify-between items-center mb-8">
          <h3 className="text-xl font-bold text-zinc-100">Recent Receipts</h3>
          <Store className="w-5 h-5 text-zinc-500" />
        </div>
        <div className="space-y-4">
          {receipts.length === 0 ? (
            <p className="text-center text-zinc-500 py-8">No receipts found.</p>
          ) : (
            receipts.slice(0, 10).map((receipt) => (
              <div 
                key={receipt.id}
                onClick={() => setSelectedReceipt(receipt)}
                className="flex items-center justify-between p-4 bg-zinc-800/30 border border-zinc-800 hover:border-indigo-500/50 rounded-2xl cursor-pointer transition-all group"
              >
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-zinc-800 rounded-xl group-hover:bg-indigo-600 transition-colors">
                    <Receipt className="w-5 h-5 text-zinc-400 group-hover:text-white" />
                  </div>
                  <div>
                    <p className="font-bold text-zinc-100">Receipt #{receipt.id.slice(0, 8)}</p>
                    <p className="text-xs text-zinc-500">{formatDate(receipt.date)} • {receipt.items.length} items</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-black text-zinc-100">{formatCurrency(receipt.total, currentOrg?.currency)}</p>
                  <p className="text-[10px] text-zinc-500 uppercase font-bold tracking-widest">{receipt.paymentMethod}</p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <AnimatePresence>
        {selectedReceipt && (
          <ReceiptModal receipt={selectedReceipt} onClose={() => setSelectedReceipt(null)} />
        )}
      </AnimatePresence>
        </>
      ) : (
        <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-zinc-800 flex items-center justify-center">
            <Lock className="w-8 h-8 text-zinc-600" />
          </div>
          <h3 className="text-xl font-bold text-zinc-100">Restricted Access</h3>
          <p className="text-zinc-500 max-w-sm">You don't have permission to view business reports. Please contact your administrator.</p>
        </div>
      )}
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


function AdminPanel({ currentOrg, showNotification, setIsCreatingOrg, isSuperAdmin }: { currentOrg: any, showNotification: any, setIsCreatingOrg: (val: boolean) => void, isSuperAdmin: boolean }) {
  const { user, userProfile, organizations, setCurrentOrg } = useFirebase();
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [isAddingStaff, setIsAddingStaff] = useState(false);
  const [newStaffEmail, setNewStaffEmail] = useState('');
  const [newStaffRole, setNewStaffRole] = useState<'admin' | 'manager' | 'cashier'>('cashier');
  
  const [editingOrgId, setEditingOrgId] = useState<string | null>(null);
  const [editingOrgName, setEditingOrgName] = useState('');
  const [deletingOrgId, setDeletingOrgId] = useState<string | null>(null);
  const [adminTab, setAdminTab] = useState<'my-businesses' | 'staff'>('my-businesses');

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
    const success = await removeDocument('organizations', orgId);
    if (success) {
      showNotification('Business profile deleted');
      if (currentOrg?.id === orgId) {
        const remaining = organizations.filter(o => o.id !== orgId);
        setCurrentOrg(remaining.length > 0 ? remaining[0] : null);
      }
    } else {
      showNotification('Failed to delete business profile', 'error');
    }
    setDeletingOrgId(null);
  };

  return (
    <div className="space-y-8">
      {/* Tab Navigation */}
      <div className="flex items-center gap-2 border-b border-zinc-800 pb-4 overflow-x-auto custom-scrollbar">
        <button
          onClick={() => setAdminTab('my-businesses')}
          className={cn(
            "px-4 py-2 rounded-xl text-sm font-bold transition-all whitespace-nowrap",
            adminTab === 'my-businesses' ? "bg-indigo-600 text-white shadow-lg shadow-indigo-900/20" : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800"
          )}
        >
          My Businesses
        </button>
        <button
          onClick={() => setAdminTab('staff')}
          className={cn(
            "px-4 py-2 rounded-xl text-sm font-bold transition-all whitespace-nowrap",
            adminTab === 'staff' ? "bg-indigo-600 text-white shadow-lg shadow-indigo-900/20" : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800"
          )}
        >
          Staff Management
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
                            className="p-1 text-zinc-500 hover:text-indigo-400 opacity-0 group-hover:opacity-100 transition-opacity"
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
                      {org.expiresAt && (
                        <div className="mt-2 scale-75 origin-left">
                          <TrialTimer expiresAt={org.expiresAt} />
                        </div>
                      )}
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

        {adminTab === 'staff' && (
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

function Dashboard({ setActiveTab, isAdmin, isManager }: { setActiveTab: (t: any) => void, isAdmin: boolean, isManager: boolean }) {
  const { currentOrg } = useFirebase();
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
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
    return () => { unsubInv(); unsubTx(); };
  }, [currentOrg]);

  const stats = useMemo(() => {
    const totalSales = transactions
      .filter(t => t.type === 'income')
      .reduce((acc, t) => acc + t.amount, 0);
    const totalExpenses = transactions
      .filter(t => t.type === 'expense')
      .reduce((acc, t) => acc + t.amount, 0);
    const stockValue = inventory.reduce((acc, item) => acc + (item.quantity * item.cost), 0);
    const profit = totalSales - totalExpenses;

    return { totalSales, totalExpenses, stockValue, profit };
  }, [inventory, transactions]);

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
        return d.toISOString().split('T')[0];
      });
      format = (d) => d.toLocaleDateString('en-US', { weekday: 'short' });
    } else if (chartPeriod === 'month') {
      periods = Array.from({ length: 30 }, (_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - (29 - i));
        return d.toISOString().split('T')[0];
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

    const groupedTxs = transactions.reduce((acc, tx) => {
      let key = '';
      const txDate = new Date(tx.date);
      if (chartPeriod === 'day') key = `${txDate.getHours()}:00`;
      else if (chartPeriod === 'year') key = `${txDate.getFullYear()}-${String(txDate.getMonth() + 1).padStart(2, '0')}`;
      else key = tx.date;

      if (!acc[key]) acc[key] = { income: 0, expense: 0 };
      if (tx.type === 'income') acc[key].income += tx.amount;
      else acc[key].expense += tx.amount;
      return acc;
    }, {} as Record<string, { income: number; expense: number }>);

    return periods.map(p => {
      const stats = groupedTxs[p] || { income: 0, expense: 0 };
      let name = p;
      if (chartPeriod !== 'day') {
        const d = new Date(p + (chartPeriod === 'year' ? '-01' : ''));
        name = format(d);
      }
      
      return {
        name,
        income: stats.income,
        expense: stats.expense,
        fullDate: p
      };
    });
  }, [transactions, chartPeriod]);

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
                    onClick={() => setActiveTab('transactions')}
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

function Inventory({ showNotification, isAdmin, isManager, isCashier }: { showNotification: (m: string, t?: 'success' | 'error') => void, isAdmin: boolean, isManager: boolean, isCashier: boolean }) {
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

    setUploading(true);
    try {
      const storageRef = ref(storage, `organizations/${currentOrg.id}/inventory/${Date.now()}_${file.name}`);
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);
      if (isEdit && editingItem) {
        setEditingItem({ ...editingItem, imageUrl: url });
      } else {
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

  const filteredItems = useMemo(() => {
    return items.filter(item => {
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

      return matchesCategory && matchesSku && matchesMinPrice && matchesMaxPrice && matchesDate;
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
      setTimeout(() => setLastDeleted(null), 10000); // Clear undo after 10s
    } catch (error) {
      showNotification('Failed to delete item.', 'error');
    }
  };

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
        <div>
          <h2 className="text-2xl font-bold text-zinc-100">Inventory Management</h2>
          <p className="text-sm text-zinc-500">Manage your products and stock levels</p>
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
          {isManager && (
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
          {isManager && (
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
            <div className="bg-zinc-900/50 border border-zinc-800 p-6 rounded-2xl grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
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
              <div className="lg:col-span-3 xl:col-span-4 flex justify-end">
                <button 
                  onClick={() => setFilters({ category: '', sku: '', minPrice: '', maxPrice: '', startDate: '', endDate: '' })}
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
                <tr key={item.id} className="hover:bg-zinc-800/30 transition-colors group">
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
                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      {isCashier && (
                        <button 
                          onClick={() => {
                            setEditingItem(item);
                            setIsEditing(true);
                          }}
                          className="p-2 text-zinc-500 hover:text-zinc-200 transition-colors"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                      )}
                      {isManager && (
                        <button onClick={() => handleDelete(item)} className="p-2 text-zinc-500 hover:text-rose-500 transition-colors"><Trash2 className="w-4 h-4" /></button>
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

function Transactions({ showNotification, isAdmin }: { showNotification: (m: string, t?: 'success' | 'error') => void, isAdmin: boolean }) {
  const { currentOrg } = useFirebase();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [newTx, setNewTx] = useState({ type: 'income' as const, amount: 0, category: '', description: '', date: new Date().toISOString().slice(0, 16) });
  
  const [selectedReceipt, setSelectedReceipt] = useState<ReceiptData | null>(null);
  const [selectedInvoice, setSelectedInvoice] = useState<Transaction | null>(null);
  const [loadingDoc, setLoadingDoc] = useState<string | null>(null);

  useEffect(() => {
    if (!currentOrg) return;
    return subscribeToCollection<Transaction>(
      `organizations/${currentOrg.id}/transactions`,
      [],
      setTransactions
    );
  }, [currentOrg]);

  const handleViewDoc = async (tx: Transaction) => {
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
        <h2 className="text-2xl font-bold text-zinc-100">Transactions Ledger</h2>
        <button 
          onClick={() => setIsAdding(true)}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-xl transition-colors"
        >
          <Plus className="w-4 h-4" /> Record Transaction
        </button>
      </div>

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
            {transactions.map((tx) => (
              <tr key={tx.id} className="hover:bg-zinc-800/30 transition-colors">
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
const POSView = ({ currentOrg, showNotification, createNotification, userProfile }: { currentOrg: any, showNotification: (m: string, t?: 'success' | 'error') => void, createNotification: any, userProfile: any }) => {
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
          errorMessage = 'Permission denied. Please check your staff role.';
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
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 min-h-[calc(100vh-12rem)] lg:h-[calc(100vh-12rem)]">
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
            placeholder="Search products by name or SKU..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
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
      <div className="bg-zinc-900 border border-zinc-800 rounded-[32px] flex flex-col overflow-hidden shadow-2xl">
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

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          <AnimatePresence initial={false}>
            {cart.length === 0 ? (
              <motion.div 
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.3 }}
                exit={{ opacity: 0 }}
                className="h-full flex flex-col items-center justify-center text-center space-y-4"
              >
                <ShoppingCart className="w-12 h-12" />
                <p className="text-sm font-medium">Your cart is empty.<br/>Select products to start a sale.</p>
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

function Damages({ showNotification, isAdmin, isCashier }: { showNotification: (m: string, t?: 'success' | 'error') => void, isAdmin: boolean, isCashier: boolean }) {
  const { currentOrg } = useFirebase();
  const [damages, setDamages] = useState<DamageRecord[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [newDamage, setNewDamage] = useState({ itemId: '', quantity: 1, reason: '', imageUrl: '' });
  const [uploading, setUploading] = useState(false);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !currentOrg) return;

    setUploading(true);
    try {
      const storageRef = ref(storage, `organizations/${currentOrg.id}/damages/${Date.now()}_${file.name}`);
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);
      setNewDamage(prev => ({ ...prev, imageUrl: url }));
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
      await createDocument(`organizations/${currentOrg.id}/damages`, {
        ...newDamage,
        itemName: item.name,
        date: now,
        createdAt: now,
        updatedAt: now
      });

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

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-zinc-100">Damage Records</h2>
          <p className="text-sm text-zinc-500">Track and manage damaged stock</p>
        </div>
        <button 
          onClick={() => setIsRecording(true)}
          className="flex items-center gap-2 bg-rose-600 hover:bg-rose-500 text-white px-4 py-2 rounded-xl transition-colors shadow-lg shadow-rose-600/20"
        >
          <AlertTriangle className="w-4 h-4" /> Record Damage
        </button>
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-zinc-800/50 border-b border-zinc-800">
              <th className="px-6 py-4 text-xs font-bold text-zinc-400 uppercase tracking-wider">Item</th>
              <th className="px-6 py-4 text-xs font-bold text-zinc-400 uppercase tracking-wider">Quantity</th>
              <th className="px-6 py-4 text-xs font-bold text-zinc-400 uppercase tracking-wider">Reason</th>
              <th className="px-6 py-4 text-xs font-bold text-zinc-400 uppercase tracking-wider">Evidence</th>
              <th className="px-6 py-4 text-xs font-bold text-zinc-400 uppercase tracking-wider">Date</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800">
            {damages.map((damage) => (
              <tr key={damage.id} className="hover:bg-zinc-800/30 transition-colors">
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
              </tr>
            ))}
            {damages.length === 0 && (
              <tr>
                <td colSpan={4} className="px-6 py-12 text-center text-zinc-500">No damage records found.</td>
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
  return (
    <div className="max-w-4xl space-y-8">
      <div className="flex items-center gap-4 mb-8">
        <div className="p-3 bg-indigo-600/10 rounded-2xl">
          <HelpCircle className="w-8 h-8 text-indigo-500" />
        </div>
        <div>
          <h2 className="text-3xl font-bold text-zinc-100">Help Center</h2>
          <p className="text-zinc-400">Learn how to manage your business with JENA POS</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <HelpCard 
          title="Dashboard" 
          description="View your business performance at a glance. Track sales, expenses, and net profit in real-time."
          steps={[
            "Check 'Total Sales' for daily revenue",
            "Monitor 'Stock Value' to manage inventory investment",
            "View 'Revenue vs Expenses' chart for trends"
          ]}
        />
        <HelpCard 
          title="Point of Sale (POS)" 
          description="The core of your sales operations. Process customer orders quickly and efficiently."
          steps={[
            "Select items from the grid or search by name",
            "Adjust quantities in the cart",
            "Click 'Checkout' to process the sale and print/save receipt"
          ]}
        />
        <HelpCard 
          title="Inventory Management" 
          description="Keep track of your products, stock levels, and costs."
          steps={[
            "Add new items with 'Add Item' button",
            "Set 'Alert Level' to get notified when stock is low",
            "Update stock levels after receiving new shipments"
          ]}
        />
        <HelpCard 
          title="Reports & Analytics" 
          description="Deep dive into your financial data with detailed reports."
          steps={[
            "Filter reports by date range (7, 30, 90 days)",
            "Export financial summaries as PDF",
            "Analyze 'Best Performing Day' and 'Peak Sales Hour'"
          ]}
        />
      </div>

      <div className="bg-zinc-900 border border-zinc-800 p-8 rounded-3xl space-y-6">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-indigo-600/10 rounded-2xl">
            <Users className="w-8 h-8 text-indigo-500" />
          </div>
          <div>
            <h3 className="text-2xl font-bold text-zinc-100">About Developer</h3>
            <p className="text-zinc-400">Meet the mind behind JENA POS</p>
          </div>
        </div>
        
        <div className="flex flex-col md:flex-row gap-8 items-center md:items-start">
          <div className="w-32 h-32 rounded-full bg-zinc-800 border-4 border-zinc-700 flex items-center justify-center overflow-hidden shrink-0">
            <Sparkles className="w-16 h-16 text-indigo-500" />
          </div>
          <div className="space-y-4">
            <h4 className="text-xl font-bold text-zinc-100">Micheal Sakwa</h4>
            <p className="text-zinc-400 leading-relaxed">
              Micheal Sakwa is a passionate software developer dedicated to building innovative solutions that empower small businesses. 
              With a focus on user experience and robust functionality, he creates tools that simplify complex business processes. 
              JENA POS is a testament to his commitment to delivering high-quality, scalable software that addresses real-world challenges.
            </p>
            <div className="flex gap-4">
              <a href="https://github.com/MichealSakwa" target="_blank" rel="noopener noreferrer" className="text-indigo-400 hover:text-indigo-300 text-sm font-bold transition-colors">GitHub Profile</a>
              <span className="text-zinc-700">|</span>
              <span className="text-zinc-500 text-sm">Software Engineer & Product Designer</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const PLAN_LIMITS = {
  trial: { orgs: 1, inventory: 50, staff: Infinity },
  basic: { orgs: 1, inventory: 200, staff: Infinity },
  essentials: { orgs: 3, inventory: 1000, staff: Infinity },
  plus: { orgs: 10, inventory: 2000, staff: Infinity },
  advanced: { orgs: Infinity, inventory: 1000000, staff: Infinity }
};

const PLAN_DETAILS = {
  trial: { price: 0, limits: PLAN_LIMITS.trial, label: 'Trial' },
  basic: { price: 0, limits: PLAN_LIMITS.basic, label: 'Basic' },
  essentials: { price: 31500, limits: PLAN_LIMITS.essentials, label: 'Essentials' },
  plus: { price: 104500, limits: PLAN_LIMITS.plus, label: 'Plus' },
  advanced: { price: 250000, limits: PLAN_LIMITS.advanced, label: 'Advanced' }
};

function getPlanPrice(ugxPrice: number, currency?: string) {
  if (ugxPrice === 0) return 'Free';
  const effectiveCurrency = currency || 'USD';
  
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

  const rate = rates[effectiveCurrency] || (1 / 3800); // Default to USD rate if unknown
  const convertedAmount = ugxPrice * rate;
  
  return `${formatCurrency(convertedAmount, effectiveCurrency)}/mo`;
}

function TrialTimer({ expiresAt }: { expiresAt: string }) {
  const [timeLeft, setTimeLeft] = useState('');

  useEffect(() => {
    const updateTimer = () => {
      const now = new Date();
      const expiry = new Date(expiresAt);
      const diff = expiry.getTime() - now.getTime();

      if (diff <= 0) {
        setTimeLeft('Expired');
        return;
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

      setTimeLeft(`${days}d ${hours}h ${minutes}m`);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 60000); // Update every minute
    return () => clearInterval(interval);
  }, [expiresAt]);

  return (
    <div className="bg-amber-600/10 border border-amber-600/20 p-4 rounded-xl flex items-center justify-between">
      <div className="flex items-center gap-3">
        <History className="w-5 h-5 text-amber-500" />
        <div>
          <p className="text-sm font-bold text-amber-500 uppercase tracking-wider">Trial Period</p>
          <p className="text-xs text-zinc-400">Your free profile expires in:</p>
        </div>
      </div>
      <p className="text-lg font-black text-amber-500 font-mono">{timeLeft}</p>
    </div>
  );
}

interface Notification {
  id: string;
  type: 'sale' | 'login' | 'logout' | 'system';
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

function MainApp() {
  const { user, userProfile, organizations, currentOrg, setCurrentOrg } = useFirebase();
  const [activeTab, setActiveTab] = useState<'dashboard' | 'inventory' | 'transactions' | 'reports' | 'settings' | 'pos' | 'admin' | 'damages' | 'help' | 'sales-analytics' | 'expenses-analytics' | 'profit-analytics'>('dashboard');
  const [showHelpReminder, setShowHelpReminder] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isCreatingOrg, setIsCreatingOrg] = useState(false);
  const [newOrgName, setNewOrgName] = useState('');
  const [notification, setNotification] = useState<{ message: string, type: 'success' | 'error' } | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [staff, setStaff] = useState<StaffMember[]>([]);

  const currentStaffMember = staff.find(s => s.uid === user?.uid || s.email === user?.email);
  const isSuperAdmin = user?.email === 'sakwamikes@gmail.com';
  const isAdmin = currentOrg?.ownerUid === user?.uid || currentStaffMember?.role === 'admin' || isSuperAdmin;
  const isManager = isAdmin || currentStaffMember?.role === 'manager';
  const isCashier = isManager || currentStaffMember?.role === 'cashier';

  const isExpired = currentOrg?.expiresAt && new Date(currentOrg.expiresAt) < new Date() && !isSuperAdmin;

  const getPlanLimits = (plan: string | undefined) => {
    const p = (plan || 'trial').toLowerCase() as keyof typeof PLAN_LIMITS;
    return PLAN_LIMITS[p] || PLAN_LIMITS.trial;
  };

  const orgLimits = getPlanLimits(userProfile?.plan);
  const currentOrgLimits = getPlanLimits(currentOrg?.plan);

  const createNotification = async (type: 'sale' | 'login' | 'logout' | 'system', title: string, message: string, metadata: any = {}) => {
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

  const markNotificationAsRead = async (notificationId: string) => {
    if (!currentOrg) return;
    try {
      await updateDocument(`organizations/${currentOrg.id}/notifications`, notificationId, { read: true });
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
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

  const handleCreateOrg = async () => {
    if (!user || !userProfile || !newOrgName.trim()) return;
    
    // Check limits
    const ownedOrgs = organizations.filter(o => o.ownerUid === user.uid);
    const limit = PLAN_LIMITS[userProfile.plan || 'trial'].orgs;
    
    if (ownedOrgs.length >= limit) {
      showNotification(`You have reached the limit of ${limit} business profile(s) for your current plan. Please upgrade to create more.`, 'error');
      return;
    }

    const orgId = Math.random().toString(36).substring(7);
    try {
      const isFirstOrg = ownedOrgs.length === 0;
      const isPaidPlan = userProfile.plan !== 'trial' && userProfile.plan !== 'basic';
      
      // Set expiration: 14 days for trial/basic, 30 days for paid plans
      const trialDays = 14;
      const paidDays = 30;
      const expiresAt = new Date(Date.now() + (isPaidPlan ? paidDays : trialDays) * 24 * 60 * 60 * 1000).toISOString();

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
        createdAt: new Date().toISOString(),
        ...(expiresAt && { expiresAt })
      });
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
        "fixed lg:static inset-y-0 left-0 z-40 bg-zinc-900 border-r border-zinc-800 transition-all duration-300 overflow-y-auto lg:overflow-visible custom-scrollbar",
        isSidebarOpen ? "w-64 translate-x-0 pointer-events-auto" : "w-0 lg:w-20 -translate-x-full lg:translate-x-0 pointer-events-none lg:pointer-events-auto"
      )}>
        <div className="h-full flex flex-col p-4">
          <div className="flex items-center justify-between gap-3 px-2 mb-10">
            <div className="flex items-center gap-3">
              <div className="bg-indigo-600 p-2 rounded-xl">
                <Sparkles className="w-6 h-6 text-white" />
              </div>
              {isSidebarOpen && <span className="text-xl font-bold text-zinc-100 tracking-tight">JENA POS</span>}
            </div>
            {isSidebarOpen && (
              <button onClick={() => setIsSidebarOpen(false)} className="lg:hidden p-2 text-zinc-500 hover:bg-zinc-800 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            )}
          </div>

          <nav className="flex-1 space-y-2">
            <SidebarItem icon={LayoutDashboard} label={isSidebarOpen ? "Dashboard" : ""} active={activeTab === 'dashboard'} onClick={() => { setActiveTab('dashboard'); if(window.innerWidth < 1024) setIsSidebarOpen(false); }} />
            <SidebarItem icon={Store} label={isSidebarOpen ? "POS" : ""} active={activeTab === 'pos'} onClick={() => { setActiveTab('pos'); if(window.innerWidth < 1024) setIsSidebarOpen(false); }} />
            <SidebarItem icon={Package} label={isSidebarOpen ? "Inventory" : ""} active={activeTab === 'inventory'} onClick={() => { setActiveTab('inventory'); if(window.innerWidth < 1024) setIsSidebarOpen(false); }} />
            <SidebarItem icon={AlertTriangle} label={isSidebarOpen ? "Damages" : ""} active={activeTab === 'damages'} onClick={() => { setActiveTab('damages'); if(window.innerWidth < 1024) setIsSidebarOpen(false); }} />
            <SidebarItem icon={Receipt} label={isSidebarOpen ? "Transactions" : ""} active={activeTab === 'transactions'} onClick={() => { setActiveTab('transactions'); if(window.innerWidth < 1024) setIsSidebarOpen(false); }} />
            <SidebarItem icon={BarChart3} label={isSidebarOpen ? "Reports" : ""} active={activeTab === 'reports'} onClick={() => { setActiveTab('reports'); if(window.innerWidth < 1024) setIsSidebarOpen(false); }} />
            {isAdmin && (
              <SidebarItem icon={ShieldCheck} label={isSidebarOpen ? "Admin" : ""} active={activeTab === 'admin'} onClick={() => { setActiveTab('admin'); if(window.innerWidth < 1024) setIsSidebarOpen(false); }} />
            )}
            <SidebarItem icon={Settings} label={isSidebarOpen ? "Settings" : ""} active={activeTab === 'settings'} onClick={() => { setActiveTab('settings'); if(window.innerWidth < 1024) setIsSidebarOpen(false); }} />
            <SidebarItem icon={HelpCircle} label={isSidebarOpen ? "Help" : ""} active={activeTab === 'help'} onClick={() => { setActiveTab('help'); if(window.innerWidth < 1024) setIsSidebarOpen(false); }} />
            
            {isSidebarOpen && (
              <div 
                onClick={() => { setActiveTab('settings'); if(window.innerWidth < 1024) setIsSidebarOpen(false); }}
                className="mt-8 px-4 py-4 bg-zinc-800/50 rounded-2xl border border-zinc-700/50 space-y-3 cursor-pointer hover:bg-zinc-800 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Plan Usage</span>
                  <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider">{currentOrg?.plan || 'trial'}</span>
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between text-[10px] font-medium text-zinc-400">
                    <span>Organizations</span>
                    <span>{organizations.filter(o => o.ownerUid === user?.uid).length} / {orgLimits.orgs === Infinity ? 'Unlimited' : orgLimits.orgs}</span>
                  </div>
                  <div className="h-1 bg-zinc-700 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-indigo-500 rounded-full transition-all duration-500"
                      style={{ width: `${orgLimits.orgs === Infinity ? 0 : Math.min(100, (organizations.filter(o => o.ownerUid === user?.uid).length / orgLimits.orgs) * 100)}%` }}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-[10px] font-medium text-zinc-400">
                    <span>Inventory</span>
                    <span>{inventory.length} / {currentOrgLimits.inventory === Infinity ? 'Unlimited' : currentOrgLimits.inventory}</span>
                  </div>
                  <div className="h-1 bg-zinc-700 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-amber-500 rounded-full transition-all duration-500"
                      style={{ width: `${currentOrgLimits.inventory === Infinity ? 0 : Math.min(100, (inventory.length / currentOrgLimits.inventory) * 100)}%` }}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-[10px] font-medium text-zinc-400">
                    <span>Staff</span>
                    <span>{staff.length} / {currentOrgLimits.staff === Infinity ? 'Unlimited' : currentOrgLimits.staff}</span>
                  </div>
                  <div className="h-1 bg-zinc-700 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                      style={{ width: `${currentOrgLimits.staff === Infinity ? 0 : Math.min(100, (staff.length / currentOrgLimits.staff) * 100)}%` }}
                    />
                  </div>
                </div>
              </div>
            )}
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
        <header className="h-16 bg-zinc-950/50 backdrop-blur-md border-b border-zinc-800 px-6 flex items-center justify-between sticky top-0 z-30">
          <div className="flex items-center gap-4">
            <button onClick={() => setIsSidebarOpen(prev => !prev)} className="p-2 text-zinc-400 hover:bg-zinc-800 rounded-lg">
              <Menu className="w-6 h-6" />
            </button>
            <div className="flex items-center gap-2 bg-zinc-900 border border-zinc-800 px-3 py-1.5 rounded-xl">
              <Building2 className="w-4 h-4 text-indigo-500" />
              <select 
                value={currentOrg?.id}
                onChange={(e) => setCurrentOrg(organizations.find(o => o.id === e.target.value) || null)}
                className="bg-transparent text-sm font-bold text-zinc-200 outline-none cursor-pointer"
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
                className="w-10 h-10 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-400 hover:text-indigo-500 hover:border-indigo-500/50 transition-all relative"
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
                                onClick={() => markNotificationAsRead(n.id)}
                                className={cn(
                                  "p-4 hover:bg-zinc-800/50 transition-colors cursor-pointer group",
                                  !n.read && "bg-indigo-500/5"
                                )}
                              >
                                <div className="flex gap-3">
                                  <div className={cn(
                                    "mt-1 w-8 h-8 rounded-lg flex items-center justify-center shrink-0",
                                    n.type === 'sale' ? "bg-emerald-500/10 text-emerald-500" :
                                    n.type === 'login' ? "bg-indigo-500/10 text-indigo-500" :
                                    n.type === 'logout' ? "bg-amber-500/10 text-amber-500" :
                                    "bg-zinc-500/10 text-zinc-500"
                                  )}>
                                    {n.type === 'sale' ? <ShoppingCart className="w-4 h-4" /> :
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
              onClick={() => setActiveTab('settings')}
              className="hidden sm:flex items-center gap-2 bg-zinc-900 border border-zinc-800 px-3 py-1.5 rounded-xl hover:bg-zinc-800 transition-colors group"
            >
              <CreditCard className="w-4 h-4 text-amber-500 group-hover:scale-110 transition-transform" />
              <span className="text-xs font-bold text-zinc-300 uppercase tracking-wider">{currentOrg?.plan} Plan</span>
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
          {isExpired && activeTab !== 'settings' ? (
            <div className="flex flex-col items-center justify-center py-20 text-center space-y-6 max-w-2xl mx-auto">
              <div className="w-24 h-24 rounded-full bg-rose-500/10 flex items-center justify-center border border-rose-500/20">
                <History className="w-12 h-12 text-rose-500" />
              </div>
              <div className="space-y-2">
                <h2 className="text-3xl font-black text-zinc-100 uppercase tracking-tighter">Subscription Expired</h2>
                <p className="text-zinc-400 text-lg">Your trial or subscription period for <span className="text-zinc-100 font-bold">{currentOrg?.name}</span> has ended. Please renew your plan to continue using JENA POS.</p>
              </div>
              <div className="flex flex-col sm:flex-row gap-4 w-full max-w-md">
                <button 
                  onClick={() => setActiveTab('settings')}
                  className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white font-black py-4 rounded-2xl transition-all hover:scale-[1.02] active:scale-[0.98] uppercase tracking-widest shadow-xl shadow-indigo-600/20"
                >
                  Renew Subscription
                </button>
                <button 
                  onClick={handleSignOut}
                  className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold py-4 rounded-2xl transition-all uppercase tracking-widest"
                >
                  Sign Out
                </button>
              </div>
              <div className="p-6 bg-zinc-900 border border-zinc-800 rounded-2xl w-full text-left">
                <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-4">Why is my account locked?</p>
                <ul className="space-y-3">
                  <li className="flex items-start gap-3 text-sm text-zinc-400">
                    <div className="w-1.5 h-1.5 rounded-full bg-rose-500 mt-1.5 shrink-0" />
                    <span>Your 14-day trial period has concluded.</span>
                  </li>
                  <li className="flex items-start gap-3 text-sm text-zinc-400">
                    <div className="w-1.5 h-1.5 rounded-full bg-rose-500 mt-1.5 shrink-0" />
                    <span>Your monthly subscription payment is overdue.</span>
                  </li>
                  <li className="flex items-start gap-3 text-sm text-zinc-400">
                    <div className="w-1.5 h-1.5 rounded-full bg-rose-500 mt-1.5 shrink-0" />
                    <span>Access to inventory, sales, and reports is restricted until renewal.</span>
                  </li>
                </ul>
              </div>
            </div>
          ) : (
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
            >
              {activeTab === 'dashboard' && <Dashboard setActiveTab={setActiveTab} isAdmin={isAdmin} isManager={isManager} />}
              {activeTab === 'pos' && <POSView currentOrg={currentOrg} showNotification={showNotification} createNotification={createNotification} userProfile={userProfile} />}
              {activeTab === 'inventory' && <Inventory showNotification={showNotification} isAdmin={isAdmin} isManager={isManager} isCashier={isCashier} />}
              {activeTab === 'damages' && <Damages showNotification={showNotification} isAdmin={isAdmin} isCashier={isCashier} />}
              {activeTab === 'transactions' && <Transactions showNotification={showNotification} isAdmin={isAdmin} />}
              {activeTab === 'admin' && <AdminPanel currentOrg={currentOrg} showNotification={showNotification} setIsCreatingOrg={setIsCreatingOrg} isSuperAdmin={isSuperAdmin} />}
              {activeTab === 'reports' && <Reports isManager={isManager} />}
              {activeTab === 'help' && <HelpSection />}
              {activeTab === 'sales-analytics' && <SalesAnalytics />}
              {activeTab === 'expenses-analytics' && <ExpensesAnalytics />}
              {activeTab === 'profit-analytics' && <ProfitAnalytics />}
            {activeTab === 'settings' && (
              <div className="max-w-2xl space-y-8">
                <h2 className="text-2xl font-bold text-zinc-100">Organization Settings</h2>
                <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl space-y-6">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-zinc-500 uppercase">Business Name</label>
                    <input 
                      type="text" 
                      defaultValue={currentOrg?.name} 
                      onBlur={(e) => handleUpdateOrg({ name: e.target.value })}
                      className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2 text-zinc-100 focus:ring-2 focus:ring-indigo-500 outline-none" 
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-zinc-500 uppercase">Address / P.O. Box</label>
                    <input 
                      type="text" 
                      defaultValue={currentOrg?.address} 
                      onBlur={(e) => handleUpdateOrg({ address: e.target.value })}
                      placeholder="e.g. 123 Business St, Kampala"
                      className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2 text-zinc-100 focus:ring-2 focus:ring-indigo-500 outline-none" 
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-zinc-500 uppercase">UPRS Registration Number</label>
                    <input 
                      type="text" 
                      defaultValue={currentOrg?.uprsRegistrationNumber} 
                      onBlur={(e) => handleUpdateOrg({ uprsRegistrationNumber: e.target.value })}
                      placeholder="e.g. UPRS-2024-XXXX"
                      className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2 text-zinc-100 focus:ring-2 focus:ring-indigo-500 outline-none" 
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-zinc-500 uppercase">Country</label>
                      <select 
                        value={currentOrg?.country || 'US'}
                        onChange={(e) => handleUpdateOrg({ country: e.target.value })}
                        className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2 text-zinc-100 focus:ring-2 focus:ring-indigo-500 outline-none"
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
                      <label className="text-xs font-bold text-zinc-500 uppercase">Currency</label>
                      <select 
                        value={currentOrg?.currency || 'USD'}
                        onChange={(e) => handleUpdateOrg({ currency: e.target.value })}
                        className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2 text-zinc-100 focus:ring-2 focus:ring-indigo-500 outline-none"
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

                  <div className="space-y-4">
                    <div className="flex justify-between items-end">
                      <label className="text-xs font-bold text-zinc-500 uppercase">Account Subscription</label>
                      <span className="text-xs font-bold text-indigo-400">
                        {organizations.filter(o => o.ownerUid === user?.uid).length} / {PLAN_LIMITS[userProfile?.plan || 'trial'].orgs === Infinity ? 'Unlimited' : PLAN_LIMITS[userProfile?.plan || 'trial'].orgs} Businesses Used
                      </span>
                    </div>

                    {currentOrg?.expiresAt && (
                      <TrialTimer expiresAt={currentOrg.expiresAt} />
                    )}

                    <div className="grid grid-cols-2 gap-4">
                      {Object.entries(PLAN_DETAILS).filter(([k]) => k !== 'trial').map(([p, details]) => (
                        <div 
                          key={p} 
                          onClick={() => handleUpdatePlan(p)}
                          className={cn(
                            "p-4 rounded-xl border-2 transition-all cursor-pointer relative overflow-hidden flex flex-col justify-between min-h-[160px]",
                            userProfile?.plan === p ? "border-indigo-600 bg-indigo-600/5 shadow-lg shadow-indigo-500/10" : "border-zinc-800 bg-zinc-800/50 hover:border-zinc-700"
                          )}
                        >
                          <div>
                            <div className="flex justify-between items-start">
                              <p className="text-sm font-bold text-zinc-100 uppercase">{details.label}</p>
                              {userProfile?.plan === p && (
                                <div className="bg-indigo-600 text-[10px] font-black text-white px-2 py-0.5 rounded-full uppercase">
                                  Active
                                </div>
                              )}
                            </div>
                            <p className="text-xs text-zinc-500 mt-1">
                              {getPlanPrice(details.price as number, currentOrg?.currency)} • {details.limits.orgs === Infinity ? 'Unlimited' : details.limits.orgs} Businesses
                            </p>
                            <div className="mt-2 space-y-0.5 text-[10px] text-zinc-500 uppercase font-bold opacity-60">
                              <p>{details.limits.inventory === Infinity ? 'Unlimited' : details.limits.inventory.toLocaleString()} Products</p>
                              <p>{details.limits.staff === Infinity ? 'Unlimited' : details.limits.staff} Staff</p>
                            </div>
                          </div>

                          <button 
                            className={cn(
                              "mt-4 w-full py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all",
                              userProfile?.plan === p 
                                ? "bg-indigo-600 text-white cursor-default" 
                                : "bg-zinc-700 text-zinc-300 hover:bg-zinc-600"
                            )}
                          >
                            {userProfile?.plan === p ? "Selected Plan" : "Select Plan"}
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <h2 className="text-2xl font-bold text-zinc-100">User Profile Settings</h2>
                <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-zinc-500 uppercase">Display Name</label>
                      <input 
                        type="text" 
                        defaultValue={userProfile?.displayName || ''} 
                        onBlur={(e) => handleUpdateProfile({ displayName: e.target.value })}
                        placeholder="Your full name"
                        className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2 text-zinc-100 focus:ring-2 focus:ring-indigo-500 outline-none" 
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-zinc-500 uppercase">Contact Number</label>
                      <input 
                        type="text" 
                        defaultValue={userProfile?.phoneNumber || ''} 
                        onBlur={(e) => handleUpdateProfile({ phoneNumber: e.target.value })}
                        placeholder="e.g. +256 7XX XXX XXX"
                        className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2 text-zinc-100 focus:ring-2 focus:ring-indigo-500 outline-none" 
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-zinc-500 uppercase">Email Address</label>
                    <input 
                      type="text" 
                      value={userProfile?.email || ''} 
                      disabled
                      className="w-full bg-zinc-800/50 border border-zinc-800 rounded-xl px-4 py-2 text-zinc-500 cursor-not-allowed outline-none" 
                    />
                    <p className="text-[10px] text-zinc-600">Email cannot be changed as it is linked to your authentication account.</p>
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
              <button className="text-[10px] font-bold text-zinc-500 hover:text-zinc-300 uppercase tracking-widest transition-colors">Terms & Conditions</button>
              <button className="text-[10px] font-bold text-zinc-500 hover:text-zinc-300 uppercase tracking-widest transition-colors">Privacy Policy</button>
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

  const handleLogin = async () => {
    setIsLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error("Login failed:", error);
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
            <p className="text-sm text-zinc-500">Sign in with your Google account to access all your business organizations.</p>
          </div>
          
          <button 
            onClick={handleLogin}
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
  const { user, loading, isAuthReady } = useFirebase();

  if (!isAuthReady || loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <Loader2 className="w-10 h-10 animate-spin text-indigo-600" />
      </div>
    );
  }

  return user ? <MainApp /> : <AuthScreen />;
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
