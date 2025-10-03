<div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
                    <h2 className="text-xl font-bold text-white mb-6">Performance by Asset Type</h2>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={getPerformanceData()}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                        <XAxis dataKey="name" stroke="#94a3b8" tick={{ fill: '#94a3b8' }} />
                        <YAxis stroke="#94a3b8" tick={{ fill: '#94a3b8' }} />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: '#1e293b',
                            border: '1px solid #475569',
                            borderRadius: '0.5rem',
                            color: '#fff'
                          }}
                          cursor={{ fill: 'rgba(59, 130, 246, 0.1)' }}
                        />
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
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#1e293b',
                          border: '1px solid #475569',
                          borderRadius: '0.5rem',
                          color: '#fff'
                        }}
                        cursor={{ fill: 'rgba(59, 130, 246, 0.1)' }}
                      />
                      <Bar dataKey="gain" fill="#3b82f6" name="Gain/Loss">
                        {getPerformanceData().map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.gain >= 0 ? '#10b981' : '#ef4444'} />
                        ))}
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
                          <td className="px-6 py-4 text-white text-right font-medium">
                            {asset.marketValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className={asset.gainAmount >= 0 ? 'text-green-400' : 'text-red-400'}>
                              <div className="font-medium">
                                {asset.gainAmount >= 0 ? '+' : ''}{asset.gainAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </div>
                              <div className="text-sm">
                                ({asset.gainPercent >= 0 ? '+' : ''}{asset.gainPercent.toFixed(2)}%)
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-slate-300">{asset.source}</td>
                          <td className="px-6 py-4 text-center">
                            <div className="flex items-center justify-center gap-2">
                              <button
                                onClick={() => editAsset(asset)}
                                className="text-blue-400 hover:text-blue-300 transition"
                                title="Edit asset"
                              >
                                <Edit2 className="w-5 h-5" />
                              </button>
                              <button
                                onClick={() => {
                                  if (window.confirm(`Are you sure you want to delete ${asset.name}?`)) {
                                    deleteAsset(asset.id);
                                  }
                                }}
                                className="text-red-400 hover:text-red-300 transition"
                                title="Delete asset"
                              >
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
