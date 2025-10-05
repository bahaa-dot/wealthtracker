import { useState, useEffect } from 'react';
import { db, auth } from './firebase';
import { 
  collection, 
  addDoc, 
  getDocs, 
  deleteDoc, 
  doc, 
  query, 
  orderBy,
  setDoc,
  getDoc,
  Timestamp,
  updateDoc
} from 'firebase/firestore';
import { signInWithEmailAndPassword, signOut, onAuthStateChanged } from 'firebase/auth';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import './App.css';

const SESSION_TIMEOUT = 15 * 60 * 1000;

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  
  const [activeTab, setActiveTab] = useState('dashboard');
  const [positions, setPositions] = useState([]);
  const [portfolioHistory, setPortfolioHistory] = useState([]);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [editingPosition, setEditingPosition] = useState(null);
  const [selectedPeriod, setSelectedPeriod] = useState('1m');
  const [assetSummary, setAssetSummary] = useState({
    cash: 0,
    bonds: 0,
    equities: 0,
    alternatives: 0
  });

  // Monthly update state
  const [updateDate, setUpdateDate] = useState(new Date().toISOString().split('T')[0]);
  const [bulkUpdates, setBulkUpdates] = useState({});

  // Chart filters
  const [chartFilters, setChartFilters] = useState({
    cash: true,
    bonds: true,
    equities: true,
    alternatives: true
  });

  const [lastActivity, setLastActivity] = useState(Date.now());

  const [formData, setFormData] = useState({
    name: '',
    assetClass: '',
    isin: '',
    ticker: '',
    currency: 'USD',
    quantity: '',
    purchaseDate: '',
    purchasePrice: '',
    currentPrice: '',
    currentValue: '',
    accruedInterest: '0',
    maturityDate: '',
    couponRate: '',
    ytm: ''
  });

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
      if (currentUser) {
        setLastActivity(Date.now());
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;

    const activityEvents = ['mousedown', 'keydown', 'scroll', 'touchstart'];
    
    const resetTimer = () => {
      setLastActivity(Date.now());
    };

    activityEvents.forEach(event => {
      window.addEventListener(event, resetTimer);
    });

    return () => {
      activityEvents.forEach(event => {
        window.removeEventListener(event, resetTimer);
      });
    };
  }, [user]);

  useEffect(() => {
    if (!user) return;

    const interval = setInterval(() => {
      const now = Date.now();
      if (now - lastActivity > SESSION_TIMEOUT) {
        handleLogout();
        alert('Session expired due to inactivity. Please log in again.');
      }
    }, 60000);

    return () => clearInterval(interval);
  }, [user, lastActivity]);

  useEffect(() => {
    if (user) {
      loadPositions();
      loadLastUpdate();
      loadPortfolioHistory();
    }
  }, [user]);

  useEffect(() => {
    calculateAssetSummary();
  }, [positions]);

  // Initialize bulk updates when positions load
  useEffect(() => {
    const updates = {};
    positions.forEach(pos => {
      updates[pos.id] = {
        currentPrice: pos.currentPrice || '',
        currentValue: pos.currentValue || '',
        accruedInterest: pos.accruedInterest || 0
      };
    });
    setBulkUpdates(updates);
  }, [positions]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginError('');
    
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (error) {
      setLoginError('Invalid email or password');
      console.error('Login error:', error);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setPositions([]);
      setPortfolioHistory([]);
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const loadPositions = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, 'positions'));
      const positionsData = [];
      querySnapshot.forEach((doc) => {
        positionsData.push({ id: doc.id, ...doc.data() });
      });
      setPositions(positionsData);
    } catch (error) {
      console.error('Error loading positions:', error);
    }
  };

  const loadLastUpdate = async () => {
    try {
      const docRef = doc(db, 'metadata', 'lastUpdate');
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        setLastUpdate(docSnap.data().timestamp?.toDate());
      }
    } catch (error) {
      console.error('Error loading last update:', error);
    }
  };

  const loadPortfolioHistory = async () => {
    try {
      const q = query(collection(db, 'portfolioHistory'), orderBy('date', 'asc'));
      const querySnapshot = await getDocs(q);
      const historyData = [];
      querySnapshot.forEach((doc) => {
        historyData.push({ id: doc.id, ...doc.data() });
      });
      setPortfolioHistory(historyData);
    } catch (error) {
      console.error('Error loading portfolio history:', error);
    }
  };

  const calculateAssetSummary = () => {
    const summary = {
      cash: 0,
      bonds: 0,
      equities: 0,
      alternatives: 0,
      totalAccruedInterest: 0
    };

    positions.forEach(position => {
      const value = parseFloat(position.currentValue) || 0;
      const accrued = parseFloat(position.accruedInterest) || 0;
      
      if (position.assetClass === 'cash') summary.cash += value;
      else if (position.assetClass === 'bonds') {
        summary.bonds += value;
        summary.totalAccruedInterest += accrued;
      }
      else if (position.assetClass === 'equities') summary.equities += value;
      else if (position.assetClass === 'alternatives') summary.alternatives += value;
    });

    setAssetSummary(summary);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      const positionData = {
        ...formData,
        quantity: parseFloat(formData.quantity),
        purchasePrice: parseFloat(formData.purchasePrice) || null,
        currentPrice: parseFloat(formData.currentPrice),
        currentValue: parseFloat(formData.currentValue),
        accruedInterest: parseFloat(formData.accruedInterest) || 0,
        couponRate: parseFloat(formData.couponRate) || null,
        ytm: parseFloat(formData.ytm) || null,
      };

      if (editingPosition) {
        await setDoc(doc(db, 'positions', editingPosition.id), {
          ...positionData,
          updatedAt: Timestamp.now()
        }, { merge: true });
      } else {
        await addDoc(collection(db, 'positions'), {
          ...positionData,
          createdAt: Timestamp.now()
        });
      }

      await setDoc(doc(db, 'metadata', 'lastUpdate'), {
        timestamp: Timestamp.now()
      });

      setShowModal(false);
      setEditingPosition(null);
      resetForm();
      loadPositions();
      loadLastUpdate();
      alert(editingPosition ? 'Position updated successfully!' : 'Position added successfully!');
    } catch (error) {
      console.error('Error saving position:', error);
      alert('Failed to save position');
    }
  };

  // Handle bulk update changes
  const handleBulkUpdateChange = (positionId, field, value) => {
    setBulkUpdates(prev => ({
      ...prev,
      [positionId]: {
        ...prev[positionId],
        [field]: value
      }
    }));
  };

  // Save monthly update
  const saveMonthlyUpdate = async () => {
    if (!confirm('Save monthly update for all positions and create portfolio snapshot?')) return;

    try {
      const updatePromises = [];
      
      // Update all positions
      for (const [positionId, updates] of Object.entries(bulkUpdates)) {
        const positionRef = doc(db, 'positions', positionId);
        updatePromises.push(
          updateDoc(positionRef, {
            currentPrice: parseFloat(updates.currentPrice),
            currentValue: parseFloat(updates.currentValue),
            accruedInterest: parseFloat(updates.accruedInterest) || 0,
            updatedAt: Timestamp.now()
          })
        );
      }

      await Promise.all(updatePromises);

      // Calculate totals for snapshot
      let cashTotal = 0, bondsTotal = 0, equitiesTotal = 0, alternativesTotal = 0, totalValue = 0;

      positions.forEach(position => {
        const value = parseFloat(bulkUpdates[position.id]?.currentValue || position.currentValue) || 0;
        totalValue += value;

        if (position.assetClass === 'cash') cashTotal += value;
        else if (position.assetClass === 'bonds') bondsTotal += value;
        else if (position.assetClass === 'equities') equitiesTotal += value;
        else if (position.assetClass === 'alternatives') alternativesTotal += value;
      });

      // Save portfolio snapshot
      await addDoc(collection(db, 'portfolioHistory'), {
        date: Timestamp.fromDate(new Date(updateDate)),
        totalValue: totalValue,
        cashValue: cashTotal,
        bondsValue: bondsTotal,
        equitiesValue: equitiesTotal,
        alternativesValue: alternativesTotal,
        createdAt: Timestamp.now()
      });

      // Update last update timestamp
      await setDoc(doc(db, 'metadata', 'lastUpdate'), {
        timestamp: Timestamp.now()
      });

      alert('Monthly update saved successfully!');
      loadPositions();
      loadPortfolioHistory();
      loadLastUpdate();
    } catch (error) {
      console.error('Error saving monthly update:', error);
      alert('Failed to save monthly update');
    }
  };

  const handleEdit = (position) => {
    setEditingPosition(position);
    setFormData({
      name: position.name || '',
      assetClass: position.assetClass || '',
      isin: position.isin || '',
      ticker: position.ticker || '',
      currency: position.currency || 'USD',
      quantity: position.quantity || '',
      purchaseDate: position.purchaseDate || '',
      purchasePrice: position.purchasePrice || '',
      currentPrice: position.currentPrice || '',
      currentValue: position.currentValue || '',
      accruedInterest: position.accruedInterest || '0',
      maturityDate: position.maturityDate || '',
      couponRate: position.couponRate || '',
      ytm: position.ytm || ''
    });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this position?')) return;

    try {
      await deleteDoc(doc(db, 'positions', id));
      loadPositions();
      alert('Position deleted successfully!');
    } catch (error) {
      console.error('Error deleting position:', error);
      alert('Failed to delete position');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      assetClass: '',
      isin: '',
      ticker: '',
      currency: 'USD',
      quantity: '',
      purchaseDate: '',
      purchasePrice: '',
      currentPrice: '',
      currentValue: '',
      accruedInterest: '0',
      maturityDate: '',
      couponRate: '',
      ytm: ''
    });
    setEditingPosition(null);
  };

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const getTotalValue = () => {
    return assetSummary.cash + assetSummary.bonds + assetSummary.equities + assetSummary.alternatives;
  };

  const getPercentage = (value) => {
    const total = getTotalValue();
    return total > 0 ? ((value / total) * 100).toFixed(2) : 0;
  };

  const getFilteredHistory = () => {
    if (portfolioHistory.length === 0) return [];
    
    const now = new Date();
    const periodMap = {
      '1m': 30,
      '2m': 60,
      '3m': 90,
      '6m': 180,
      '1y': 365,
      '2y': 730,
      'all': 10000
    };
    
    const days = periodMap[selectedPeriod];
    const cutoffDate = new Date(now.setDate(now.getDate() - days));
    
    return portfolioHistory.filter(item => {
      const itemDate = item.date?.toDate();
      return itemDate >= cutoffDate;
    });
  };

  const getChartData = () => {
    const filtered = getFilteredHistory();
    return filtered.map((item, index) => {
      const prevItem = index > 0 ? filtered[index - 1] : null;
      
      const calculateChange = (current, previous) => {
        if (!previous || previous === 0) return 0;
        return (((current - previous) / previous) * 100).toFixed(2);
      };

      return {
        date: item.date?.toDate().toLocaleDateString(),
        total: item.totalValue,
        totalChange: prevItem ? calculateChange(item.totalValue, prevItem.totalValue) : 0,
        cash: chartFilters.cash ? item.cashValue : null,
        cashChange: prevItem && chartFilters.cash ? calculateChange(item.cashValue, prevItem.cashValue) : null,
        bonds: chartFilters.bonds ? item.bondsValue : null,
        bondsChange: prevItem && chartFilters.bonds ? calculateChange(item.bondsValue, prevItem.bondsValue) : null,
        equities: chartFilters.equities ? item.equitiesValue : null,
        equitiesChange: prevItem && chartFilters.equities ? calculateChange(item.equitiesValue, prevItem.equitiesValue) : null,
        alternatives: chartFilters.alternatives ? item.alternativesValue : null,
        alternativesChange: prevItem && chartFilters.alternatives ? calculateChange(item.alternativesValue, prevItem.alternativesValue) : null
      };
    });
  };

  const toggleChartFilter = (assetClass) => {
    setChartFilters(prev => ({
      ...prev,
      [assetClass]: !prev[assetClass]
    }));
  };

  if (loading) {
    return (
      <div style={{display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh'}}>
        <div>Loading...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="login-container">
        <div className="login-box">
          <h1>Wealth Tracker</h1>
          <p>Please log in to continue</p>
          <form onSubmit={handleLogin}>
            <div className="form-group">
              <label>Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>
            <div className="form-group">
              <label>Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
            </div>
            {loginError && <div className="error-message">{loginError}</div>}
            <button type="submit" className="btn btn-primary" style={{width: '100%', marginTop: '20px'}}>
              Log In
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="app-container">
      <div className="header-info">
        <div>
          <h1>Wealth Tracker</h1>
          <div className="last-update">
            Last updated: {lastUpdate ? lastUpdate.toLocaleString() : 'Never'}
          </div>
        </div>
        <div style={{display: 'flex', gap: '10px'}}>
          <button className="btn btn-primary" onClick={() => setShowModal(true)}>
            Add Position
          </button>
          <button className="btn btn-danger" onClick={handleLogout}>
            Logout
          </button>
        </div>
      </div>

      <div className="tabs">
        <button 
          className={`tab ${activeTab === 'dashboard' ? 'active' : ''}`}
          onClick={() => setActiveTab('dashboard')}
        >
          Dashboard
        </button>
        <button 
          className={`tab ${activeTab === 'positions' ? 'active' : ''}`}
          onClick={() => setActiveTab('positions')}
        >
          Positions
        </button>
        <button 
          className={`tab ${activeTab === 'monthly-update' ? 'active' : ''}`}
          onClick={() => setActiveTab('monthly-update')}
        >
          Monthly Update
        </button>
        <button 
          className={`tab ${activeTab === 'charts' ? 'active' : ''}`}
          onClick={() => setActiveTab('charts')}
        >
          Charts
        </button>
      </div>

      {/* Dashboard Tab */}
      {activeTab === 'dashboard' && (
        <div className="tab-content">
          <div className="summary-cards">
            <div className="card cash">
              <h3>CASH</h3>
              <div className="value">${assetSummary.cash.toLocaleString('en-US', {minimumFractionDigits: 2})}</div>
              <div className="percentage">{getPercentage(assetSummary.cash)}%</div>
            </div>
            <div className="card bonds">
              <h3>BONDS</h3>
              <div className="value">${assetSummary.bonds.toLocaleString('en-US', {minimumFractionDigits: 2})}</div>
              <div className="percentage">{getPercentage(assetSummary.bonds)}%</div>
              {assetSummary.totalAccruedInterest > 0 && (
                <div className="accrued">Accrued: ${assetSummary.totalAccruedInterest.toFixed(2)}</div>
              )}
            </div>
            <div className="card equities">
              <h3>EQUITIES</h3>
              <div className="value">${assetSummary.equities.toLocaleString('en-US', {minimumFractionDigits: 2})}</div>
              <div className="percentage">{getPercentage(assetSummary.equities)}%</div>
            </div>
            <div className="card alternatives">
              <h3>ALTERNATIVES</h3>
              <div className="value">${assetSummary.alternatives.toLocaleString('en-US', {minimumFractionDigits: 2})}</div>
              <div className="percentage">{getPercentage(assetSummary.alternatives)}%</div>
            </div>
          </div>

          {portfolioHistory.length > 1 && (
            <div className="performance-summary">
              <h3>Performance Overview</h3>
              {(() => {
                const latest = portfolioHistory[portfolioHistory.length - 1];
                const previous = portfolioHistory[portfolioHistory.length - 2];
                const change = ((latest.totalValue - previous.totalValue) / previous.totalValue * 100).toFixed(2);
                
                return (
                  <div className="performance-card">
                    <div className={`performance-value ${change >= 0 ? 'positive' : 'negative'}`}>
                      {change >= 0 ? '+' : ''}{change}%
                    </div>
                    <div className="performance-label">vs Previous Period</div>
                    <div className="performance-detail">
                      ${latest.totalValue.toLocaleString()} → ${previous.totalValue.toLocaleString()}
                    </div>
                  </div>
                );
              })()}
            </div>
          )}
        </div>
      )}

      {/* Positions Tab */}
      {activeTab === 'positions' && (
        <div className="tab-content">
          <table className="positions-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Class</th>
                <th>ISIN</th>
                <th>Quantity</th>
                <th>Purchase Price</th>
                <th>Current Price</th>
                <th>Current Value</th>
                <th>Accrued Interest</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {positions.length === 0 ? (
                <tr>
                  <td colSpan="9" style={{textAlign: 'center', padding: '40px', color: '#999'}}>
                    No positions yet. Click "Add Position" to get started.
                  </td>
                </tr>
              ) : (
                positions.map(position => (
                  <tr key={position.id}>
                    <td>{position.name}</td>
                    <td>
                      <span className={`asset-class-badge badge-${position.assetClass}`}>
                        {position.assetClass}
                      </span>
                    </td>
                    <td>{position.isin || '-'}</td>
                    <td>{position.quantity}</td>
                    <td>{position.currency} {position.purchasePrice ? position.purchasePrice.toFixed(2) : '-'}</td>
                    <td>{position.currency} {position.currentPrice.toFixed(2)}</td>
                    <td>{position.currency} {position.currentValue.toLocaleString('en-US', {minimumFractionDigits: 2})}</td>
                    <td>{position.accruedInterest > 0 ? `$${position.accruedInterest.toFixed(2)}` : '-'}</td>
                    <td>
                      <button 
                        className="btn btn-primary btn-small"
                        onClick={() => handleEdit(position)}
                        style={{marginRight: '5px'}}
                      >
                        Edit
                      </button>
                      <button 
                        className="btn btn-danger btn-small"
                        onClick={() => handleDelete(position.id)}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Monthly Update Tab */}
      {activeTab === 'monthly-update' && (
        <div className="tab-content">
          <div className="monthly-update-header">
            <h2>Monthly Portfolio Update</h2>
            <div className="update-date-selector">
              <label>Update Date:</label>
              <input 
                type="date" 
                value={updateDate}
                onChange={(e) => setUpdateDate(e.target.value)}
              />
            </div>
          </div>

          <table className="bulk-update-table">
            <thead>
              <tr>
                <th>Position</th>
                <th>Asset Class</th>
                <th>Current Price</th>
                <th>Current Value (USD)</th>
                <th>Accrued Interest</th>
              </tr>
            </thead>
            <tbody>
              {positions.map(position => (
                <tr key={position.id}>
                  <td>{position.name}</td>
                  <td>
                    <span className={`asset-class-badge badge-${position.assetClass}`}>
                      {position.assetClass}
                    </span>
                  </td>
                  <td>
                    <input
                      type="number"
                      step="0.01"
                      value={bulkUpdates[position.id]?.currentPrice || ''}
                      onChange={(e) => handleBulkUpdateChange(position.id, 'currentPrice', e.target.value)}
                      className="bulk-input"
                    />
                  </td>
                  <td>
                    <input
                      type="number"
                      step="0.01"
                      value={bulkUpdates[position.id]?.currentValue || ''}
                      onChange={(e) => handleBulkUpdateChange(position.id, 'currentValue', e.target.value)}
                      className="bulk-input"
                    />
                  </td>
                  <td>
                    <input
                      type="number"
                      step="0.01"
                      value={bulkUpdates[position.id]?.accruedInterest || ''}
                      onChange={(e) => handleBulkUpdateChange(position.id, 'accruedInterest', e.target.value)}
                      className="bulk-input"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="monthly-update-actions">
            <button className="btn btn-success btn-large" onClick={saveMonthlyUpdate}>
              Save Monthly Update & Create Snapshot
            </button>
          </div>
        </div>
      )}

      {/* Charts Tab */}
      {activeTab === 'charts' && (
        <div className="tab-content">
          <div className="chart-controls">
            <div className="period-selector">
              {['1m', '2m', '3m', '6m', '1y', '2y', 'all'].map(period => (
                <button
                  key={period}
                  className={`period-btn ${selectedPeriod === period ? 'active' : ''}`}
                  onClick={() => setSelectedPeriod(period)}
                >
                  {period.toUpperCase()}
                </button>
              ))}
            </div>

            <div className="asset-filters">
              <label>Show Asset Classes:</label>
              {Object.keys(chartFilters).map(assetClass => (
                <label key={assetClass} className="filter-checkbox">
                  <input
                    type="checkbox"
                    checked={chartFilters[assetClass]}
                    onChange={() => toggleChartFilter(assetClass)}
                  />
                  <span className={`filter-label ${assetClass}`}>{assetClass.toUpperCase()}</span>
                </label>
              ))}
            </div>
          </div>

          {getChartData().length > 0 ? (
            <>
              <div className="chart-container">
                <h3>Portfolio Value Over Time</h3>
                <ResponsiveContainer width="100%" height={400}>
                  <LineChart data={getChartData()}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="total" stroke="#667eea" strokeWidth={2} name="Total Value" />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              <div className="chart-container">
                <h3>Asset Allocation Trends</h3>
                <ResponsiveContainer width="100%" height={400}>
                  <LineChart data={getChartData()}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    {chartFilters.cash && <Line type="monotone" dataKey="cash" stroke="#667eea" name="Cash" />}
                    {chartFilters.bonds && <Line type="monotone" dataKey="bonds" stroke="#f5576c" name="Bonds" />}
                    {chartFilters.equities && <Line type="monotone" dataKey="equities" stroke="#4facfe" name="Equities" />}
                    {chartFilters.alternatives && <Line type="monotone" dataKey="alternatives" stroke="#43e97b" name="Alternatives" />}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </>
          ) : (
            <div style={{textAlign: 'center', padding: '60px', color: '#999'}}>
              No historical data yet. Use the Monthly Update tab to save snapshots.
            </div>
          )}
        </div>
      )}

      {/* Add/Edit Position Modal */}
      {showModal && (
        <div className="modal active">
          <div className="modal-content">
            <h2>{editingPosition ? 'Edit Position' : 'Add New Position'}</h2>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Name *</label>
                <input 
                  type="text" 
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  required 
                />
              </div>

              <div className="form-group">
                <label>Asset Class *</label>
                <select 
                  name="assetClass"
                  value={formData.assetClass}
                  onChange={handleInputChange}
                  required
                >
                  <option value="">Select...</option>
                  <option value="cash">Cash</option>
                  <option value="bonds">Bonds</option>
                  <option value="equities">Equities</option>
                  <option value="alternatives">Alternatives</option>
                </select>
              </div>

              <div className="form-group">
                <label>ISIN</label>
                <input 
                  type="text" 
                  name="isin"
                  value={formData.isin}
                  onChange={handleInputChange}
                />
              </div>

              <div className="form-group">
                <label>Ticker</label>
                <input 
                  type="text" 
                  name="ticker"
                  value={formData.ticker}
                  onChange={handleInputChange}
                />
              </div>

              <div className="form-group">
                <label>Currency *</label>
                <select 
                  name="currency"
                  value={formData.currency}
                  onChange={handleInputChange}
                  required
                >
                  <option value="USD">USD</option>
                  <option value="EUR">EUR</option>
                  <option value="GBP">GBP</option>
                  <option value="SGD">SGD</option>
                  <option value="AED">AED</option>
                  <option value="JPY">JPY</option>
                  <option value="CHF">CHF</option>
                  <option value="CAD">CAD</option>
                  <option value="AUD">AUD</option>
                  <option value="HKD">HKD</option>
                </select>
              </div>

              <div className="form-group">
                <label>Quantity *</label>
                <input 
                  type="number" 
                  step="0.001" 
                  name="quantity"
                  value={formData.quantity}
                  onChange={handleInputChange}
                  required 
                />
              </div>

              <div className="form-group">
                <label>Purchase Date</label>
                <input 
                  type="date" 
                  name="purchaseDate"
                  value={formData.purchaseDate}
                  onChange={handleInputChange}
                />
              </div>

              <div className="form-group">
                <label>Purchase Price</label>
                <input 
                  type="number" 
                  step="0.01" 
                  name="purchasePrice"
                  value={formData.purchasePrice}
                  onChange={handleInputChange}
                />
              </div>

              <div className="form-group">
                <label>Current Price *</label>
                <input 
                  type="number" 
                  step="0.01" 
                  name="currentPrice"
                  value={formData.currentPrice}
                  onChange={handleInputChange}
                  required 
                />
              </div>

              <div className="form-group">
                <label>Current Value *</label>
                <input 
                  type="number" 
                  step="0.01" 
                  name="currentValue"
                  value={formData.currentValue}
                  onChange={handleInputChange}
                  required 
                />
              </div>

              <div className="form-group">
                <label>Accrued Interest</label>
                <input 
                  type="number" 
                  step="0.01" 
                  name="accruedInterest"
                  value={formData.accruedInterest}
                  onChange={handleInputChange}
                />
              </div>

              <div className="form-group">
                <label>Maturity Date (Bonds only)</label>
                <input 
                  type="date" 
                  name="maturityDate"
                  value={formData.maturityDate}
                  onChange={handleInputChange}
                />
              </div>

              <div className="form-group">
                <label>Coupon Rate % (Bonds only)</label>
                <input 
                  type="number" 
                  step="0.01" 
                  name="couponRate"
                  value={formData.couponRate}
                  onChange={handleInputChange}
                />
              </div>

              <div className="form-group">
                <label>YTM % (Bonds only)</label>
                <input 
                  type="number" 
                  step="0.01" 
                  name="ytm"
                  value={formData.ytm}
                  onChange={handleInputChange}
                />
              </div>

              <div style={{display: 'flex', gap: '10px', marginTop: '20px'}}>
                <button type="submit" className="btn btn-success">
                  {editingPosition ? 'Update' : 'Save'}
                </button>
                <button 
                  type="button" 
                  className="btn btn-danger"
                  onClick={() => {
                    setShowModal(false);
                    resetForm();
                  }}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
