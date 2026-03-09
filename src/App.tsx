import { useState, useEffect, useMemo } from 'react';
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
  Store
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
  Cell 
} from 'recharts';
import { auth } from './firebase';
import { FirebaseProvider, useFirebase } from './components/FirebaseProvider';
import ErrorBoundary from './components/ErrorBoundary';
import { cn, formatCurrency, formatDate } from './lib/utils';
import { 
  createDocument, 
  subscribeToCollection, 
  removeDocument, 
  updateDocument,
  setDocument
} from './lib/firestore';
import { where } from 'firebase/firestore';

// --- Types ---
interface InventoryItem {
  id: string;
  name: string;
  sku: string;
  quantity: number;
  price: number;
  cost: number;
  category: string;
}

interface Transaction {
  id: string;
  type: 'income' | 'expense';
  amount: number;
  category: string;
  description: string;
  date: string;
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

const StatCard = ({ title, value, icon: Icon, trend, color }: any) => (
  <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl space-y-4">
    <div className="flex justify-between items-start">
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
      <p className="text-zinc-400 text-sm font-medium">{title}</p>
      <h3 className="text-2xl font-bold text-zinc-100 mt-1">{value}</h3>
    </div>
  </div>
);

// --- Main App Logic ---

function Dashboard() {
  const { currentOrg } = useFirebase();
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);

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
    // Group by month (simplified for demo)
    return [
      { name: 'Jan', income: 4000, expense: 2400 },
      { name: 'Feb', income: 3000, expense: 1398 },
      { name: 'Mar', income: 2000, expense: 9800 },
      { name: 'Apr', income: 2780, expense: 3908 },
      { name: 'May', income: 1890, expense: 4800 },
      { name: 'Jun', income: 2390, expense: 3800 },
    ];
  }, []);

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="Total Sales" value={formatCurrency(stats.totalSales)} icon={TrendingUp} color="bg-indigo-600" trend={12} />
        <StatCard title="Total Expenses" value={formatCurrency(stats.totalExpenses)} icon={TrendingDown} color="bg-rose-600" trend={-5} />
        <StatCard title="Stock Value" value={formatCurrency(stats.stockValue)} icon={Box} color="bg-amber-600" />
        <StatCard title="Net Profit" value={formatCurrency(stats.profit)} icon={DollarSign} color="bg-emerald-600" trend={8} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-zinc-900 border border-zinc-800 p-6 rounded-2xl">
          <h3 className="text-lg font-bold text-zinc-100 mb-6">Revenue vs Expenses</h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                <XAxis dataKey="name" stroke="#71717a" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#71717a" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(v) => `$${v}`} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#18181b', border: '1px solid #27272a', borderRadius: '8px' }}
                  itemStyle={{ color: '#f4f4f5' }}
                />
                <Bar dataKey="income" fill="#4f46e5" radius={[4, 4, 0, 0]} />
                <Bar dataKey="expense" fill="#e11d48" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl">
          <h3 className="text-lg font-bold text-zinc-100 mb-6">Recent Transactions</h3>
          <div className="space-y-4">
            {transactions.slice(0, 5).map((tx) => (
              <div key={tx.id} className="flex items-center justify-between p-3 hover:bg-zinc-800/50 rounded-xl transition-colors">
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
                  {tx.type === 'income' ? '+' : '-'}{formatCurrency(tx.amount)}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function Inventory({ showNotification }: { showNotification: (m: string, t?: 'success' | 'error') => void }) {
  const { currentOrg } = useFirebase();
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [newItem, setNewItem] = useState({ name: '', sku: '', quantity: 0, price: 0, cost: 0, category: '' });

  useEffect(() => {
    if (!currentOrg) return;
    return subscribeToCollection<InventoryItem>(
      `organizations/${currentOrg.id}/inventory`,
      [],
      setItems
    );
  }, [currentOrg]);

  const handleAddItem = async () => {
    if (!currentOrg) return;
    try {
      const id = await createDocument(`organizations/${currentOrg.id}/inventory`, newItem);
      if (id) {
        setIsAdding(false);
        setNewItem({ name: '', sku: '', quantity: 0, price: 0, cost: 0, category: '' });
        showNotification('Product saved successfully!');
      } else {
        showNotification('Failed to save product. Please check your permissions.', 'error');
      }
    } catch (error) {
      console.error('Error adding item:', error);
      showNotification('An error occurred while saving the product.', 'error');
    }
  };

  const handleDelete = async (id: string) => {
    if (!currentOrg) return;
    await removeDocument(`organizations/${currentOrg.id}/inventory`, id);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-zinc-100">Inventory Management</h2>
        <button 
          onClick={() => setIsAdding(true)}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-xl transition-colors"
        >
          <Plus className="w-4 h-4" /> Add Item
        </button>
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-zinc-800/50 border-b border-zinc-800">
              <th className="px-6 py-4 text-xs font-bold text-zinc-400 uppercase tracking-wider">Product</th>
              <th className="px-6 py-4 text-xs font-bold text-zinc-400 uppercase tracking-wider">SKU</th>
              <th className="px-6 py-4 text-xs font-bold text-zinc-400 uppercase tracking-wider">Stock</th>
              <th className="px-6 py-4 text-xs font-bold text-zinc-400 uppercase tracking-wider">Price</th>
              <th className="px-6 py-4 text-xs font-bold text-zinc-400 uppercase tracking-wider">Cost</th>
              <th className="px-6 py-4 text-xs font-bold text-zinc-400 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800">
            {items.map((item) => (
              <tr key={item.id} className="hover:bg-zinc-800/30 transition-colors">
                <td className="px-6 py-4">
                  <p className="text-sm font-medium text-zinc-100">{item.name}</p>
                  <p className="text-xs text-zinc-500">{item.category}</p>
                </td>
                <td className="px-6 py-4 text-sm text-zinc-400">{item.sku}</td>
                <td className="px-6 py-4">
                  <span className={cn(
                    "px-2 py-1 rounded-full text-[10px] font-bold uppercase",
                    item.quantity > 10 ? "bg-emerald-500/10 text-emerald-500" : "bg-rose-500/10 text-rose-500"
                  )}>
                    {item.quantity} in stock
                  </span>
                </td>
                <td className="px-6 py-4 text-sm font-medium text-zinc-100">{formatCurrency(item.price)}</td>
                <td className="px-6 py-4 text-sm text-zinc-400">{formatCurrency(item.cost)}</td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <button className="p-2 text-zinc-500 hover:text-zinc-200 transition-colors"><Edit2 className="w-4 h-4" /></button>
                    <button onClick={() => handleDelete(item.id)} className="p-2 text-zinc-500 hover:text-rose-500 transition-colors"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </td>
              </tr>
            ))}
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
              className="bg-zinc-900 border border-zinc-800 p-8 rounded-3xl max-w-lg w-full space-y-6"
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
      </AnimatePresence>
    </div>
  );
}

function Transactions({ showNotification }: { showNotification: (m: string, t?: 'success' | 'error') => void }) {
  const { currentOrg } = useFirebase();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [newTx, setNewTx] = useState({ type: 'income' as const, amount: 0, category: '', description: '', date: new Date().toISOString().split('T')[0] });

  useEffect(() => {
    if (!currentOrg) return;
    return subscribeToCollection<Transaction>(
      `organizations/${currentOrg.id}/transactions`,
      [],
      setTransactions
    );
  }, [currentOrg]);

  const handleAddTx = async () => {
    if (!currentOrg) return;
    try {
      const id = await createDocument(`organizations/${currentOrg.id}/transactions`, newTx);
      if (id) {
        setIsAdding(false);
        setNewTx({ type: 'income', amount: 0, category: '', description: '', date: new Date().toISOString().split('T')[0] });
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

      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-zinc-800/50 border-b border-zinc-800">
              <th className="px-6 py-4 text-xs font-bold text-zinc-400 uppercase tracking-wider">Date</th>
              <th className="px-6 py-4 text-xs font-bold text-zinc-400 uppercase tracking-wider">Description</th>
              <th className="px-6 py-4 text-xs font-bold text-zinc-400 uppercase tracking-wider">Category</th>
              <th className="px-6 py-4 text-xs font-bold text-zinc-400 uppercase tracking-wider">Type</th>
              <th className="px-6 py-4 text-xs font-bold text-zinc-400 uppercase tracking-wider">Amount</th>
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
                  {tx.type === 'income' ? '+' : '-'}{formatCurrency(tx.amount)}
                </td>
              </tr>
            ))}
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
                  <label className="text-xs font-bold text-zinc-500 uppercase">Date</label>
                  <input 
                    type="date" 
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
const POSView = ({ currentOrg, showNotification }: { currentOrg: any, showNotification: (m: string, t?: 'success' | 'error') => void }) => {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [cart, setCart] = useState<{item: InventoryItem, quantity: number}[]>([]);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (!currentOrg) return;
    return subscribeToCollection<InventoryItem>(
      `organizations/${currentOrg.id}/inventory`,
      [],
      setInventory
    );
  }, [currentOrg]);

  const filteredInventory = inventory.filter(item => 
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

  const handleCheckout = async () => {
    if (!currentOrg || cart.length === 0) return;

    try {
      // 1. Create transaction
      await createDocument(`organizations/${currentOrg.id}/transactions`, {
        type: 'income',
        amount: total,
        category: 'Sales',
        description: `POS Sale: ${cart.map(i => `${i.quantity}x ${i.item.name}`).join(', ')}`,
        date: new Date().toISOString().split('T')[0]
      });

      // 2. Update inventory
      for (const cartItem of cart) {
        await updateDocument(
          `organizations/${currentOrg.id}/inventory`,
          cartItem.item.id,
          { quantity: cartItem.item.quantity - cartItem.quantity }
        );
      }

      setCart([]);
      showNotification('Sale processed successfully!');
    } catch (error) {
      console.error('Checkout failed:', error);
      showNotification('Failed to process sale.', 'error');
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-12rem)]">
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

        <div className="flex-1 overflow-y-auto pr-2 grid grid-cols-2 sm:grid-cols-3 gap-4">
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
              <p className="text-lg font-black text-indigo-400">{formatCurrency(item.price)}</p>
              <div className="absolute inset-0 bg-indigo-600/0 group-hover:bg-indigo-600/5 transition-colors" />
            </motion.button>
          ))}
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
                    <p className="text-xs text-zinc-500">{formatCurrency(item.item.price)} each</p>
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
            <span>{formatCurrency(total)}</span>
          </div>
          <div className="flex justify-between items-center text-zinc-100 text-xl font-black">
            <span>Total</span>
            <motion.span 
              key={total}
              initial={{ scale: 1.1, color: '#818cf8' }}
              animate={{ scale: 1, color: '#818cf8' }}
              className="text-indigo-400"
            >
              {formatCurrency(total)}
            </motion.span>
          </div>
          <motion.button 
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleCheckout}
            disabled={cart.length === 0}
            className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:grayscale text-white font-bold py-4 rounded-2xl transition-all shadow-xl shadow-indigo-900/20 flex items-center justify-center gap-2"
          >
            <CreditCard className="w-5 h-5" />
            Checkout & Process Sale
          </motion.button>
        </div>
      </div>
    </div>
  );
};

function MainApp() {
  const { user, organizations, currentOrg, setCurrentOrg } = useFirebase();
  const [activeTab, setActiveTab] = useState<'dashboard' | 'inventory' | 'transactions' | 'reports' | 'settings' | 'pos'>('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isCreatingOrg, setIsCreatingOrg] = useState(false);
  const [newOrgName, setNewOrgName] = useState('');
  const [notification, setNotification] = useState<{ message: string, type: 'success' | 'error' } | null>(null);

  const showNotification = (message: string, type: 'success' | 'error' = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 5000);
  };

  const handleCreateOrg = async () => {
    if (!user || !newOrgName.trim()) return;
    const orgId = Math.random().toString(36).substring(7);
    console.log('Creating organization:', { orgId, name: newOrgName, uid: user.uid });
    try {
      const success = await setDocument('organizations', orgId, {
        id: orgId,
        name: newOrgName,
        ownerUid: user.uid,
        plan: 'basic',
        subscriptionStatus: 'active',
        createdAt: new Date().toISOString()
      });
      
      if (success) {
        console.log('Organization created successfully');
        setIsCreatingOrg(false);
        setNewOrgName('');
      } else {
        console.error('Failed to create organization: setDocument returned false');
      }
    } catch (error) {
      console.error('Error in handleCreateOrg:', error);
    }
  };

  if (organizations.length === 0 && !isCreatingOrg) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-950 p-4">
        <div className="text-center space-y-6 max-w-md">
          <div className="bg-indigo-600/20 w-20 h-20 rounded-3xl flex items-center justify-center mx-auto">
            <Building2 className="w-10 h-10 text-indigo-500" />
          </div>
          <h2 className="text-3xl font-bold text-zinc-100">Welcome to JENA POS</h2>
          <p className="text-zinc-400">To get started, create your first business organization profile.</p>
          <div className="space-y-3">
            <button 
              onClick={() => setIsCreatingOrg(true)}
              className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-4 rounded-2xl transition-all shadow-xl shadow-indigo-900/20"
            >
              Create Organization
            </button>
            <button 
              onClick={() => signOut(auth)}
              className="w-full bg-zinc-800 hover:bg-zinc-700 text-zinc-400 font-bold py-3 rounded-2xl transition-all"
            >
              Sign Out
            </button>
          </div>
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
        "fixed lg:static inset-y-0 left-0 z-40 bg-zinc-900 border-r border-zinc-800 transition-all duration-300 overflow-hidden lg:overflow-visible",
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
            <SidebarItem icon={Receipt} label={isSidebarOpen ? "Transactions" : ""} active={activeTab === 'transactions'} onClick={() => { setActiveTab('transactions'); if(window.innerWidth < 1024) setIsSidebarOpen(false); }} />
            <SidebarItem icon={BarChart3} label={isSidebarOpen ? "Reports" : ""} active={activeTab === 'reports'} onClick={() => { setActiveTab('reports'); if(window.innerWidth < 1024) setIsSidebarOpen(false); }} />
            <SidebarItem icon={Settings} label={isSidebarOpen ? "Settings" : ""} active={activeTab === 'settings'} onClick={() => { setActiveTab('settings'); if(window.innerWidth < 1024) setIsSidebarOpen(false); }} />
          </nav>

          <div className="pt-4 border-t border-zinc-800 space-y-2">
            <button 
              onClick={() => signOut(auth)}
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
            <div className="hidden sm:flex items-center gap-2 bg-zinc-900 border border-zinc-800 px-3 py-1.5 rounded-xl">
              <CreditCard className="w-4 h-4 text-amber-500" />
              <span className="text-xs font-bold text-zinc-300 uppercase tracking-wider">{currentOrg?.plan} Plan</span>
            </div>
            <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-xs font-bold">
              {user?.email?.[0].toUpperCase()}
            </div>
          </div>
        </header>

        <main className="flex-1 p-6 lg:p-10 overflow-y-auto">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
          >
            {activeTab === 'dashboard' && <Dashboard />}
            {activeTab === 'pos' && <POSView currentOrg={currentOrg} showNotification={showNotification} />}
            {activeTab === 'inventory' && <Inventory showNotification={showNotification} />}
            {activeTab === 'transactions' && <Transactions showNotification={showNotification} />}
            {activeTab === 'reports' && (
              <div className="flex flex-col items-center justify-center h-[60vh] text-center space-y-4">
                <BarChart3 className="w-16 h-16 text-zinc-700" />
                <h2 className="text-2xl font-bold text-zinc-100">Reports Module</h2>
                <p className="text-zinc-500 max-w-md">Advanced financial reporting including Profit & Loss and Balance Sheets are available in the Essentials plan and above.</p>
              </div>
            )}
            {activeTab === 'settings' && (
              <div className="max-w-2xl space-y-8">
                <h2 className="text-2xl font-bold text-zinc-100">Organization Settings</h2>
                <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl space-y-6">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-zinc-500 uppercase">Business Name</label>
                    <input type="text" defaultValue={currentOrg?.name} className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2 text-zinc-100" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-zinc-500 uppercase">Subscription Plan</label>
                    <div className="grid grid-cols-2 gap-4">
                      {['basic', 'essentials', 'plus', 'advanced'].map((p) => (
                        <div key={p} className={cn(
                          "p-4 rounded-xl border-2 transition-all cursor-pointer",
                          currentOrg?.plan === p ? "border-indigo-600 bg-indigo-600/5" : "border-zinc-800 bg-zinc-800/50 hover:border-zinc-700"
                        )}>
                          <p className="text-sm font-bold text-zinc-100 uppercase">{p}</p>
                          <p className="text-xs text-zinc-500 mt-1">
                            {p === 'basic' && '$38/mo'}
                            {p === 'essentials' && '$75/mo'}
                            {p === 'plus' && '$115/mo'}
                            {p === 'advanced' && '$275/mo'}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                  <button className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 px-6 rounded-xl transition-colors">Save Changes</button>
                </div>
              </div>
            )}
          </motion.div>
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
            <p className="text-sm text-zinc-500">Sign in with your Google account to manage your organizations.</p>
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

        <p className="text-xs text-zinc-600">
          By continuing, you agree to our Terms of Service and Privacy Policy.
        </p>
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
