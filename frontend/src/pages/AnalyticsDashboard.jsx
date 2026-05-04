import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell 
} from 'recharts';

const AnalyticsDashboard = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const res = await api.get(`/analytics/${id}`);
        setData(res.data);
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to load analytics');
      } finally {
        setLoading(false);
      }
    };
    fetchAnalytics();
  }, [id]);

  const handleDownloadCSV = async () => {
    try {
      const response = await api.get(`/export/${id}/csv`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Quiz_Results_${id}.csv`);
      document.body.appendChild(link);
      link.click();
    } catch (err) {
      alert('Failed to download CSV');
    }
  };

  const handleDownloadPDF = async () => {
    try {
      const response = await api.get(`/export/${id}/pdf`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Quiz_Report_${id}.pdf`);
      document.body.appendChild(link);
      link.click();
    } catch (err) {
      alert('Failed to download PDF');
    }
  };

  if (loading) return <div className="loading" style={{ color: 'white', textAlign: 'center', marginTop: '50px' }}>Analyzing Data...</div>;
  if (error) return <div className="error-message" style={{ color: '#ff4a4a', textAlign: 'center', padding: '2rem' }}>{error}</div>;
  if (!data) return null;

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

  return (
    <div className="dashboard" style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '2rem', color: '#646cff' }}>Quiz Performance Insights</h2>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button className="btn" onClick={handleDownloadCSV} style={{ width: 'auto', background: '#4caf50' }}>Download CSV</button>
          <button className="btn" onClick={handleDownloadPDF} style={{ width: 'auto', background: '#e91e63' }}>Download PDF</button>
          <button className="btn" onClick={() => navigate('/teacher-dashboard')} style={{ width: 'auto', background: 'rgba(255,255,255,0.1)' }}>Back</button>
        </div>
      </div>

      {/* Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
        <div className="glass-card" style={{ textAlign: 'center' }}>
          <h4 style={{ color: 'rgba(255,255,255,0.6)', marginBottom: '0.5rem' }}>Avg. Completion Time</h4>
          <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: '#4caf50' }}>
            {data.avgQuizTime}s
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', marginBottom: '2rem' }}>
        {/* Accuracy Chart */}
        <div className="glass-card">
          <h3 style={{ marginBottom: '1.5rem' }}>Accuracy per Question (%)</h3>
          <div style={{ height: '300px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.accuracyPerQuestion}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                <XAxis dataKey="questionIndex" stroke="rgba(255,255,255,0.5)" />
                <YAxis stroke="rgba(255,255,255,0.5)" domain={[0, 100]} />
                <Tooltip 
                  contentStyle={{ background: '#1a1a1a', border: '1px solid #333' }}
                  itemStyle={{ color: '#646cff' }}
                />
                <Bar dataKey="accuracy" fill="#646cff" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Time Chart */}
        <div className="glass-card">
          <h3 style={{ marginBottom: '1.5rem' }}>Avg. Response Time (s)</h3>
          <div style={{ height: '300px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data.avgTimePerQuestion}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                <XAxis dataKey="questionIndex" stroke="rgba(255,255,255,0.5)" />
                <YAxis stroke="rgba(255,255,255,0.5)" />
                <Tooltip 
                  contentStyle={{ background: '#1a1a1a', border: '1px solid #333' }}
                  itemStyle={{ color: '#4caf50' }}
                />
                <Line type="monotone" dataKey="avgTime" stroke="#4caf50" strokeWidth={3} dot={{ fill: '#4caf50' }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '2rem', marginBottom: '2rem' }}>
        {/* Score Distribution */}
        <div className="glass-card">
          <h3 style={{ marginBottom: '1.5rem' }}>Score Range Distribution</h3>
          <div style={{ height: '300px', display: 'flex', alignItems: 'center' }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data.scoreDistribution}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  fill="#8884d8"
                  paddingAngle={5}
                  dataKey="count"
                  nameKey="range"
                  label
                >
                  {data.scoreDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ background: '#1a1a1a', border: '1px solid #333' }} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Top Performers */}
      <div className="glass-card">
        <h3 style={{ marginBottom: '1.5rem' }}>Top Performers</h3>
        <div className="table-container" style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid rgba(255,255,255,0.1)' }}>
                <th style={{ padding: '1rem' }}>Rank</th>
                <th style={{ padding: '1rem' }}>Student Name</th>
                <th style={{ padding: '1rem' }}>Score</th>
                <th style={{ padding: '1rem' }}>Percentage</th>
              </tr>
            </thead>
            <tbody>
              {data.topPerformers.map((student, index) => (
                <tr key={index} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', background: index === 0 ? 'rgba(100, 108, 255, 0.05)' : 'transparent' }}>
                  <td style={{ padding: '1rem' }}>
                    {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : index + 1}
                  </td>
                  <td style={{ padding: '1rem', fontWeight: 'bold' }}>{student.name}</td>
                  <td style={{ padding: '1rem' }}>{student.score}</td>
                  <td style={{ padding: '1rem', color: '#4caf50' }}>{student.percentage}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AnalyticsDashboard;
