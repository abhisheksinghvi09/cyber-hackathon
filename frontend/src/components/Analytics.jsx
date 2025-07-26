import React, { useEffect, useState } from 'react';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, BarChart, Bar } from 'recharts';
import { useAuth } from './AuthContext';

const COLORS = ['#ef4444', '#f59e42', '#22c55e', '#6366f1', '#fbbf24', '#3b82f6'];

const Analytics = () => {
  const { token } = useAuth();
  const [summary, setSummary] = useState(null);
  const [timeline, setTimeline] = useState([]);
  const [topServices, setTopServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    setLoading(true);
    Promise.all([
      fetch('/api/stats/summary', { headers: { 'Authorization': `Bearer ${token}` } }).then(r => r.ok ? r.json() : Promise.reject('Summary error')),
      fetch('/api/stats/timeline', { headers: { 'Authorization': `Bearer ${token}` } }).then(r => r.ok ? r.json() : Promise.reject('Timeline error')),
      fetch('/api/stats/top-services', { headers: { 'Authorization': `Bearer ${token}` } }).then(r => r.ok ? r.json() : Promise.reject('Top services error')),
    ])
      .then(([summaryData, timelineData, topServicesData]) => {
        setSummary(summaryData);
        setTimeline(timelineData.timeline || []);
        setTopServices(topServicesData.top_services || []);
        setLoading(false);
      })
      .catch(() => {
        setError('Failed to load analytics data.');
        setLoading(false);
      });
  }, [token]);

  if (loading) return <div className="text-center py-12 text-lg">Loading analytics...</div>;
  if (error) return <div className="text-center py-12 text-danger-600">{error}</div>;

  // Prepare data for charts
  const riskData = summary && Object.entries(summary.risk_breakdown).map(([k, v], i) => ({ name: k, value: v, color: COLORS[i % COLORS.length] }));
  const timelineData = timeline.map(t => ({
    ...t,
    date: new Date(t.timestamp).toLocaleDateString(),
  }));
  const topServicesData = topServices.map((s, i) => ({ ...s, color: COLORS[i % COLORS.length] }));

  return (
    <div className="max-w-5xl mx-auto py-8">
      <h1 className="text-3xl font-bold text-primary-700 mb-8 text-center">Analytics & Trends</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
        {/* Risk Breakdown Pie Chart */}
        <div className="bg-white bg-opacity-90 rounded-xl shadow-lg p-6 flex flex-col items-center">
          <h2 className="text-xl font-semibold mb-4 text-primary-700">Risk Breakdown</h2>
          {riskData && riskData.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie data={riskData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                  {riskData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          ) : <div className="text-gray-500">No data</div>}
        </div>
        {/* Top Services Bar Chart */}
        <div className="bg-white bg-opacity-90 rounded-xl shadow-lg p-6 flex flex-col items-center">
          <h2 className="text-xl font-semibold mb-4 text-primary-700">Top Vulnerable Services</h2>
          {topServicesData && topServicesData.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={topServicesData} layout="vertical" margin={{ left: 20 }}>
                <XAxis type="number" allowDecimals={false} />
                <YAxis dataKey="service" type="category" width={120} />
                <Tooltip />
                <Bar dataKey="count">
                  {topServicesData.map((entry, index) => (
                    <Cell key={`bar-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : <div className="text-gray-500">No data</div>}
        </div>
      </div>
      {/* Timeline Line Chart */}
      <div className="bg-white bg-opacity-90 rounded-xl shadow-lg p-6 flex flex-col items-center mb-8">
        <h2 className="text-xl font-semibold mb-4 text-primary-700">Vulnerabilities Over Time</h2>
        {timelineData && timelineData.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={timelineData} margin={{ left: 10, right: 10, top: 10, bottom: 10 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="high" stroke="#ef4444" name="High" />
              <Line type="monotone" dataKey="medium" stroke="#f59e42" name="Medium" />
              <Line type="monotone" dataKey="low" stroke="#22c55e" name="Low" />
            </LineChart>
          </ResponsiveContainer>
        ) : <div className="text-gray-500">No data</div>}
      </div>
      <div className="text-center text-gray-500 text-sm mt-4">
        Showing analytics for your uploaded scans only.
      </div>
    </div>
  );
};

export default Analytics; 