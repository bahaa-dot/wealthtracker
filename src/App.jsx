import React, { useState, useEffect } from 'react';
import { PlusCircle, TrendingUp, TrendingDown, DollarSign, Trash2, Download, BarChart3, Edit2, LogOut, User } from 'lucide-react';
import { PieChart as RePieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { db, auth } from './firebase';
import { collection, doc, setDoc, getDocs, deleteDoc, query } from 'firebase/firestore';
import { signInWithEmailAndPassword, signOut, onAuthStateChanged } from 'firebase/auth';

export default function WealthTracker() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [loginForm, setLoginForm] = useState({ username: '', password: '' });
  const [assets, setAssets] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [activeView, setActiveView] = useState('overview');
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    name: '',
    assetType: 'Stocks',
    currency: 'USD',
    units: '',
    buyingPrice: '',
    marketValue: '',
    source: ''
  });

  const FIXED_USERNAME = 'maryamk';
  const FIXED_PASSWORD = 'mk@wealth12345';
  const FIXED_EMAIL = 'maryamk@wealthtracker.com';
  
  const assetTypes = ['Stocks', 'Bonds', 'Mutual Funds', 'ETFs', 'Real Estate', 'Cryptocurrency', 'Commodities', 'Cash', 'Other'];
  const currencies = ['USD', 'EUR', 'GBP', 'AED', 'INR', 'JPY', 'CNY', 'AUD'];
  const COLORS = ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#06b6d4', '#f97316', '#84cc16', '#6366f1'];

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setIsAuthenticated(true);
        setCurrentUser(FIXED_USERNAME);
        await loadUserAssets(user.uid);
      } else {
        setIsAuthenticated(false);
        setCurrentUser(null);
        setAssets([]);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const loadUserAssets = async (userId) => {
    try {
      const assetsRef = collection(db, 'users', userId, 'assets');
      const q = query(assetsRef);
      const querySnapshot = await getDocs(q);
      
      const loadedAssets = [];
      querySnapshot.forEach((doc) => {
        loadedAssets.push({ id: doc.id, ...doc.data() });
      });
      
      setAssets(loadedAssets);
    } catch (error) {
      console.error('Error loading assets:', error);
    }
  };

  const saveAssetToFirebase = async (asset) => {
    try {
      const user = auth.currentUser;
      if (!user) return;
      const assetRef = doc(db, 'users', user.uid, 'assets', asset.id.toString());
      await setDoc(assetRef, asset);
    } catch (error) {
      console.error('Error saving asset:', error);
    }
  };

  const deleteAssetFromFirebase = async (assetId) => {
    try {
      const user = auth.currentUser;
      if (!user) return;
      const assetRef = doc(db, 'users', user.uid, 'assets', assetId.toString());
      await deleteDoc(assetRef);
    } catch (error) {
      console.error('Error deleting asset:', error);
    }
  };

  const handleLogin = async () => {
    if (!loginForm.username || !loginForm.password) {
      alert('Please enter both username and password');
      return;
    }
    if (loginForm.username !== FIXED_USERNAME || loginForm.password !== FIXED_PASSWORD) {
      alert('Invalid username or password');
      return;
    }
    try {
      await signInWithEmailAndPassword(auth, FIXED_EMAIL, FIXED_PASSWORD);
      setLoginForm({ username: '', password: '' });
    } catch (error) {
      alert('Login failed: ' + error.message);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const calculateGains = (units, buyingPrice, marketValue) => {
    const totalCost = parseFloat(units) * parseFloat(buyingPrice);
    const currentValue = parseFloat(marketValue);
    const gainAmount = currentValue - totalCost;
    const gainPercent = (gainAmount / totalCost) * 100;
    return { gainAmount, gainPercent };
  };

  const addAsset = async () => {
    if (!formData.name || !formData.units || !formData.buyingPrice || !formData.marketValue || !formData.source) {
      alert('Please fill in all required fields');
      return;
    }
    const { gainAmount, gainPercent } = calculateGains(formData.units, formData.buyingPrice, formData.marketValue);
    let updatedAssets;
    if (editingId) {
      const updatedAsset = {
        id: editingId,
        ...formData,
        units: parseFloat(formData.units),
        buyingPrice: parseFloat(formData.buyingPrice),
        marketValue: parseFloat(formData.marketValue),
        gainAmount,
        gainPercent
      };
      updatedAssets = assets.map(asset => asset.id === editingId ? updatedAsset : asset);
      await saveAssetToFirebase(updatedAsset);
      setEditingId(null);
    } else {
      const newAsset = {
        id: Date.now(),
        ...formData,
        units: parseFloat(formData.units),
        buyingPrice: parseFloat(formData.buyingPrice),
        marketValue: parseFloat(formData.marketValue),
        gainAmount,
        gainPercent,
        dateAdded: new Date().toISOString()
      };
      updatedAssets = [...assets, newAsset];
      await saveAssetToFirebase(newAsset);
    }
    setAssets(updatedAssets);
    setFormData({ name: '', assetType: 'Stocks', currency: 'USD', units: '', buyingPrice: '', marketValue: '', source: '' });
    setShowForm(false);
  };

  const editAsset = (asset) => {
    setFormData({
      name: asset.name,
      assetType: asset.assetType,
      currency: asset.currency,
      units: asset.units.toString(),
      buyingPrice: asset.buyingPrice.toString(),
      marketValue: asset.marketValue.toString(),
      source: asset.source
    });
    setEditingId(asset.id);
    setShowForm(true);
  };

  const cancelEdit = () => {
    setFormData({ name: '', assetType: 'Stocks', currency: 'USD', units: '', buyingPrice: '', marketValue: '', source: '' });
    setEditingId(null);
    setShowForm(false);
  };

  const deleteAsset = async (id) => {
    const updatedAssets = assets.filter(asset => asset.id !== id);
    setAssets(updatedAssets);
    await deleteAssetFromFirebase(id);
  };

  const getTotalsByType = () => {
    const totals = {};
    assets.forEach(asset => {
      if (!totals[asset.assetType]) {
        totals[asset.assetType] = { value: 0, gain: 0, cost: 0 };
      }
      totals[asset.assetType].value += asset.marketValue;
      totals[asset.assetType].gain += asset.gainAmount;
      totals[asset.assetType].cost += asset.units * asset.buyingPrice;
    });
    return totals;
  };

  const getAssetAllocationData = () => {
    const totals = getTotalsByType();
    return Object.entries(totals).map(([name, data]) => ({
      name,
      value: data.value,
      percentage: ((data.value / totalPortfolioValue) * 100).toFixed(1)
    }));
  };

  const getPerformanceData = () => {
    const totals = getTotalsByType();
    return Object.entries(totals).map(([name, data]) => ({
      name,
      cost: data.cost,
      currentValue: data.value,
      gain: data.gain
    }));
  };

  const getTopPerformers = () => {
    return [...assets].sort((a, b) => b.gainPercent - a.gainPercent).slice(0, 5);
  };

  const getWorstPerformers = () => {
    return [...assets].sort((a, b) => a.gainPercent - b.gainPercent).slice(0, 5);
  };

  const totalPortfolioValue = assets.reduce((sum, asset) => sum + asset.marketValue, 0);
  const totalGains = assets.reduce((sum, asset) => sum + asset.gainAmount, 0);
  const totalCost = assets.reduce((sum, asset) => sum + (asset.units * asset.buyingPrice), 0);
  const totalGainPercent = totalCost > 0 ? (totalGains / totalCost) * 100 : 0;

  const exportData = () => {
    const dataStr = JSON.stringify(assets, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `portfolio_${currentUser}_${new Date().toISOString().split('T')[0]}.json`;
    link.click();
  };

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-slate-800 border border-slate-600 rounded-lg p-3 shadow-lg">
          <p className="text-white font-medium">{payload[0].name}</p>
          <p className="text-slate-300 text-sm">${payload[0].value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
          {payload[0].payload.percentage && <p className="text-slate-400 text-sm">{payload[0].payload.percentage}%</p>}
        </div>
      );
    }
    return null;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-6">
        <div className="bg-slate-800 rounded-lg p-8 border border-slate-700 w-full max-w-md">
          <div className="flex items-center justify-center mb-6">
            <DollarSign className="w-12 h-12 text-blue-400" />
          </div>
          <h1 className="text-3xl font-bold text-white text-center mb-2">Welcome Back</h1>
          <p className="text-slate-400 text-center mb-6">Login to access your portfolio</p>
          <div className="space-y-4">
            <div>
              <label className="block text-slate-300 text-sm font-medium mb-2">Username</label>
              <input type="text" value={loginForm.username} onChange={(e) => setLoginForm(prev => ({ ...prev, username: e.target.value }))} className="w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-blue-500" placeholder="Enter your username" onKeyPress={(e) => e.key === 'Enter' && handleLogin()} />
            </div>
            <div>
              <label className="block text-slate-300 text-sm font-medium mb-2">Password</label>
              <input type="password" value={loginForm.password} onChange={(e) => setLoginForm(prev => ({ ...prev, password: e.target.value }))} className="w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-blue-500" placeholder="Enter your password" onKeyPress={(e) => e.key === 'Enter' && handleLogin()} />
            </div>
            <button onClick={handleLogin} className="w-full bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition">Login</button>
          </div>
        </div>
      </div>
    );
  }return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-white mb-2">Investment Portfolio Tracker</h1>
            <p className="text-slate-400">Monitor your wealth across all asset classes</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 bg-slate-800 px-4 py-2 rounded-lg border border-slate-700">
              <User className="w-5 h-5 text-blue-400" />
              <span className="text-white font-medium">{currentUser}</span>
            </div>
            <button onClick={handleLogout} className="flex items-center gap-2 bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded-lg font-medium transition">
              <LogOut className="w-5 h-5" />
              Logout
            </button>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
            <div className="flex items-center justify-between mb-2">
              <span className="text-slate-400 text-sm">Total Portfolio Value</span>
              <DollarSign className="w-5 h-5 text-blue-400" />
            </div>
            <p className="text-3xl font-bold text-white">${totalPortfolioValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
          </div>
          <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
            <div className="flex items-center justify-between mb-2">
              <span className="text-slate-400 text-sm">Total Gains/Loss</span>
              {totalGains >= 0 ? <TrendingUp className="w-5 h-5 text-green-400" /> : <TrendingDown className="w-5 h-5 text-red-400" />}
            </div>
            <p className={`text-3xl font-bold ${totalGains >= 0 ? 'text-green-400' : 'text-red-400'}`}>${Math.abs(totalGains).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
            <p className={`text-sm ${totalGains >= 0 ? 'text-green-400' : 'text-red-400'}`}>{totalGains >= 0 ? '+' : '-'}{Math.abs(totalGainPercent).toFixed(2)}%</p>
          </div>
          <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
            <div className="flex items-center justify-between mb-2">
              <span className="text-slate-400 text-sm">Total Assets</span>
            </div>
            <p className="text-3xl font-bold text-white">{assets.length}</p>
          </div>
        </div>
        <div className="flex gap-4 mb-6">
          <button onClick={() => setShowForm(!showForm)} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition">
            <PlusCircle className="w-5 h-5" />
            Add Asset
          </button>
          {assets.length > 0 && (
            <button onClick={exportData} className="flex items-center gap-2 bg-slate-700 hover:bg-slate-600 text-white px-6 py-3 rounded-lg font-medium transition">
              <Download className="w-5 h-5" />
              Export Data
            </button>
          )}
        </div>
        {showForm && (
          <div className="bg-slate-800 rounded-lg p-6 mb-8 border border-slate-700">
            <h2 className="text-xl font-bold text-white mb-4">{editingId ? 'Edit Asset' : 'Add New Asset'}</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-slate-300 text-sm font-medium mb-2">Asset Name</label>
                <input type="text" name="name" value={formData.name} onChange={handleInputChange} className="w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500" placeholder="e.g., Apple Inc." />
              </div>
              <div>
                <label className="block text-slate-300 text-sm font-medium mb-2">Asset Type</label>
                <select name="assetType" value={formData.assetType} onChange={handleInputChange} className="w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500">
                  {assetTypes.map(type => <option key={type} value={type}>{type}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-slate-300 text-sm font-medium mb-2">Currency</label>
                <select name="currency" value={formData.currency} onChange={handleInputChange} className="w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500">
                  {currencies.map(curr => <option key={curr} value={curr}>{curr}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-slate-300 text-sm font-medium mb-2">Units</label>
                <input type="number" name="units" value={formData.units} onChange={handleInputChange} step="0.000001" className="w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500" placeholder="Number of shares/units" />
              </div>
              <div>
                <label className="block text-slate-300 text-sm font-medium mb-2">Buying Price (per unit)</label>
                <input type="number" name="buyingPrice" value={formData.buyingPrice} onChange={handleInputChange} step="0.01" className="w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500" placeholder="Purchase price" />
              </div>
              <div>
                <label className="block text-slate-300 text-sm font-medium mb-2">Current Market Value (total)</label>
                <input type="number" name="marketValue" value={formData.marketValue} onChange={handleInputChange} step="0.01" className="w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500" placeholder="Current total value" />
              </div>
              <div className="md:col-span-2">
                <label className="block text-slate-300 text-sm font-medium mb-2">Source/Broker</label>
                <input type="text" name="source" value={formData.source} onChange={handleInputChange} className="w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500" placeholder="e.g., Fidelity, Interactive Brokers" />
              </div>
              <div className="md:col-span-2 flex gap-4">
                <button onClick={addAsset} className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium transition">{editingId ? 'Update Asset' : 'Add Asset'}</button>
                <button onClick={cancelEdit} className="bg-slate-700 hover:bg-slate-600 text-white px-6 py-2 rounded-lg font-medium transition">Cancel</button>
              </div>
            </div>
          </div>
        )}
        {assets.length > 0 && (
          <>
            <div className="flex gap-2 mb-6 border-b border-slate-700">
              <button onClick={() => setActiveView('overview')} className={`px-6 py-3 font-medium transition ${activeView === 'overview' ? 'text-blue-400 border-b-2 border-blue-400' : 'text-slate-400 hover:text-slate-300'}`}>Overview</button>
              <button onClick={() => setActiveView('charts')} className={`px-6 py-3 font-medium transition flex items-center gap-2 ${activeView === 'charts' ? 'text-blue-400 border-b-2 border-blue-400' : 'text-slate-400 hover:text-slate-300'}`}>
                <BarChart3 className="w-4 h-4" />
                Analytics
              </button>
              <button onClick={() => setActiveView('table')} className={`px-6 py-3 font-medium transition ${activeView === 'table' ? 'text-blue-400 border-b-2 border-blue-400' : 'text-slate-400 hover:text-slate-300'}`}>Details</button>
            </div>
            {activeView === 'overview' && (
              <div className="space-y-8">
                <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
                  <h2 className="text-xl font-bold text-white mb-4">Asset Breakdown</h2>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {Object.entries(getTotalsByType()).map(([type, data]) => (
                      <div key={type} className="bg-slate-900 rounded-lg p-4 border border-slate-600">
                        <p className="text-slate-400 text-sm mb-1">{type}</p>
                        <p className="text-xl font-bold text-white">${data.value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                        <p className={`text-sm ${data.gain >= 0 ? 'text-green-400' : 'text-red-400'}`}>{data.gain >= 0 ? '+' : ''}{data.gain.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
                    <h2 className="text-xl font-bold text-white mb-4">Top Performers</h2>
                    <div className="space-y-3">
                      {getTopPerformers().map((asset) => (
                        <div key={asset.id} className="flex items-center justify-between bg-slate-900 rounded-lg p-3 border border-slate-600">
                          <div>
                            <p className="text-white font-medium">{asset.name}</p>
                            <p className="text-slate-400 text-sm">{asset.assetType}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-green-400 font-medium">+{asset.gainPercent.toFixed(2)}%</p>
                            <p className="text-slate-400 text-sm">${asset.gainAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
                    <h2 className="text-xl font-bold text-white mb-4">Lowest Performers</h2>
                    <div className="space-y-3">
                      {getWorstPerformers().map((asset) => (
                        <div key={asset.id} className="flex items-center justify-between bg-slate-900 rounded-lg p-3 border border-slate-600">
                          <div>
                            <p className="text-white font-medium">{asset.name}</p>
                            <p className="text-slate-400 text-sm">{asset.assetType}</p>
                          </div>
                          <div className="text-right">
                            <p className={`font-medium ${asset.gainPercent >= 0 ? 'text-green-400' : 'text-red-400'}`}>{asset.gainPercent >= 0 ? '+' : ''}{asset.gainPercent.toFixed(2)}%</p>
                            <p className="text-slate-400 text-sm">${asset.gainAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
            {activeView === 'charts' && (
              <div className="space-y-8">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
                    <h2 className="text-xl font-bold text-white mb-6">Asset Allocation</h2>
                    <ResponsiveContainer width="100%" height={300}>
                      <RePieChart>
                        <Pie data={getAssetAllocationData()} cx="50%" cy="50%" labelLine={false} label={({ name, percentage }) => `${name}: ${percentage}%`} outerRadius={100} fill="#8884d8" dataKey="value">
                          {getAssetAllocationData().map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                        </Pie>
                        <Tooltip content={<CustomTooltip />} />
                      </RePieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
                    <h2 className="text-xl font-bold text-white mb-6">Performance by Asset Type</h2>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={getPerformanceData()}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                        <XAxis dataKey="name" stroke="#94a3b8" tick={{ fill: '#94a3b8' }} />
                        <YAxis stroke="#94a3b8" tick={{ fill: '#94a3b8' }} />
                        <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569', borderRadius: '0.5rem', color: '#fff' }} cursor={{ fill: 'rgba(59, 130, 246, 0.1)' }} />
                        <Legend wrapperStyle={{ color: '#94a3b8' }} />
                        <Bar dataKey="cost" fill="#6366f1" name="Cost Basis" />
                        <Bar dataKey="currentValue" fill="#10b981" name="Current Value" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
                <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
                  <h2 className="text-xl font-bold text-white mb-6">Gains by Asset Type</h2>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={getPerformanceData()}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                      <XAxis dataKey="name" stroke="#94a3b8" tick={{ fill: '#94a3b8' }} />
                      <YAxis stroke="#94a3b8" tick={{ fill: '#94a3b8' }} />
                      <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569', borderRadius: '0.5rem', color: '#fff' }} cursor={{ fill: 'rgba(59, 130, 246, 0.1)' }} />
                      <Bar dataKey="gain" fill="#3b82f6" name="Gain/Loss">
                        {getPerformanceData().map((entry, index) => <Cell key={`cell-${index}`} fill={entry.gain >= 0 ? '#10b981' : '#ef4444'} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}
            {activeView === 'table' && (
              <div className="bg-slate-800 rounded-lg overflow-hidden border border-slate-700">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-slate-900">
                      <tr>
                        <th className="text-left text-slate-300 font-medium px-6 py-4">Asset Name</th>
                        <th className="text-left text-slate-300 font-medium px-6 py-4">Type</th>
                        <th className="text-left text-slate-300 font-medium px-6 py-4">Currency</th>
                        <th className="text-right text-slate-300 font-medium px-6 py-4">Units</th>
                        <th className="text-right text-slate-300 font-medium px-6 py-4">Buy Price</th>
                        <th className="text-right text-slate-300 font-medium px-6 py-4">Market Value</th>
                        <th className="text-right text-slate-300 font-medium px-6 py-4">Gains/Loss</th>
                        <th className="text-left text-slate-300 font-medium px-6 py-4">Source</th>
                        <th className="text-center text-slate-300 font-medium px-6 py-4">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {assets.map((asset) => (
                        <tr key={asset.id} className="border-t border-slate-700 hover:bg-slate-750">
                          <td className="px-6 py-4 text-white font-medium">{asset.name}</td>
                          <td className="px-6 py-4 text-slate-300">{asset.assetType}</td>
                          <td className="px-6 py-4 text-slate-300">{asset.currency}</td>
                          <td className="px-6 py-4 text-slate-300 text-right">{asset.units.toLocaleString()}</td>
                          <td className="px-6 py-4 text-slate-300 text-right">{asset.buyingPrice.toFixed(2)}</td>
                          <td className="px-6 py-4 text-white text-right font-medium">{asset.marketValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                          <td className="px-6 py-4 text-right">
                            <div className={asset.gainAmount >= 0 ? 'text-green-400' : 'text-red-400'}>
                              <div className="font-medium">{asset.gainAmount >= 0 ? '+' : ''}{asset.gainAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                              <div className="text-sm">({asset.gainPercent >= 0 ? '+' : ''}{asset.gainPercent.toFixed(2)}%)</div>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-slate-300">{asset.source}</td>
                          <td className="px-6 py-4 text-center">
                            <div className="flex items-center justify-center gap-2">
                              <button onClick={() => editAsset(asset)} className="text-blue-400 hover:text-blue-300 transition" title="Edit asset">
                                <Edit2 className="w-5 h-5" />
                              </button>
                              <button onClick={() => { if (window.confirm(`Are you sure you want to delete ${asset.name}?`)) { deleteAsset(asset.id); }}} className="text-red-400 hover:text-red-300 transition" title="Delete asset">
                                <Trash2 className="w-5 h-5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}
        {assets.length === 0 && (
          <div className="bg-slate-800 rounded-lg p-12 border border-slate-700 text-center">
            <DollarSign className="w-16 h-16 text-slate-600 mx-auto mb-4" />
            <p className="text-slate-400 text-lg">No assets added yet. Click "Add Asset" to get started.</p>
          </div>
        )}
      </div>
    </div>
  );
}
