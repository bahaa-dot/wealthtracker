import { useState, useEffect } from 'react';
import { db } from './firebase';
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
  Timestamp
} from 'firebase/firestore';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import './App.css';

function App() {
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

  // Form state
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

  // Load data on component mount
  useEffect(() => {
    loadPositions();
    loadLastUpdate();
    loadPortfolioHistory();
  }, []);

  // Calculate asset summary when positions change
  useEffect(() => {
    calculateAssetSummary();
  }, [positions]);

  // Load positions from Firestore
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

  // Load last update timestamp
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

  // Load portfolio history
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

  // Calculate asset class summary
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

  // Add or update position
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
        // Update existing position
        await setDoc(doc(db, 'positions', editingPosition.id), {
          ...positionData,
          updatedAt: Timestamp.now()
        }, { merge: true });
      } else {
        // Add new position
        await addDoc(collection(db, 'positions'), {
          ...positionData,
          createdAt: Timestamp.now()
        });
      }

      // Update last update timestamp
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

  // Open edit modal
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

  // Delete position
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

  // Reset form
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

  // Handle form input changes
  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  // Get total portfolio value
  const getTotalValue = () => {
    return assetSummary.cash + assetSummary.bonds + assetSummary.equities + assetSummary.alternatives;
  };

  // Get percentage for asset class
  const getPercentage = (value) => {
    const total = getTotalValue();
    return total > 0 ? ((value / total) * 100).toFixed(2) : 0;
  };

  // Filter history by period
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

  // Prepare chart data
  const getChartData = () => {
    const filtered = getFilteredHistory();
    return filtered.map(item => ({
      date: item.date?.toDate().toLocaleDateString(),
      total: item.totalValue,
      cash: item.cashValue,
      bonds: item.bondsValue,
      equities: item.equitiesValue,
      alternatives: item.alternativesValue
    }));
  };

  return (
    <div className="app-container">
      <div className="header-info">
        <div>
          <h1>Wealth Tracker</h1>
          <div className="last-update">
            Last updated: {lastUpdate ? lastUpdate.toLocaleString() : 'Never'}
          </div>
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          Add Position
        </button>
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

      {/* Charts Tab */}
      {activeTab === 'charts' && (
        <div className="tab-content">
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
                    <Line type="monotone" dataKey="cash" stroke="#667eea" name="Cash" />
                    <Line type="monotone" dataKey="bonds" stroke="#f5576c" name="Bonds" />
                    <Line type="monotone" dataKey="equities" stroke="#4facfe" name="Equities" />
                    <Line type="monotone" dataKey="alternatives" stroke="#43e97b" name="Alternatives" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </>
          ) : (
            <div style={{textAlign: 'center', padding: '60px', color: '#999'}}>
              No historical data yet. Add monthly snapshots to see charts.
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
