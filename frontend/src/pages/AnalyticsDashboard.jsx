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
  const [emailStatus, setEmailStatus] = useState({ loading: false, msg: '', type: '' });

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

  const handleSendBulkEmails = async () => {
    setEmailStatus({ loading: true, msg: '✉️ Dispatching bulk performance email reports to participants...', type: 'info' });
    try {
      const res = await api.post(`/export/${id}/email-all`);
      setEmailStatus({ loading: false, msg: `✅ Success! ${res.data.message}`, type: 'success' });
      setTimeout(() => setEmailStatus({ loading: false, msg: '', type: '' }), 5000);
    } catch (err) {
      setEmailStatus({ loading: false, msg: `❌ Failed to dispatch bulk emails: ${err.response?.data?.message || err.message}`, type: 'error' });
    }
  };

  const handleSendSingleEmail = async (attemptId, studentName) => {
    setEmailStatus({ loading: true, msg: `✉️ Sending performance report email to ${studentName}...`, type: 'info' });
    try {
      const res = await api.post(`/export/${id}/email-single/${attemptId}`);
      setEmailStatus({ loading: false, msg: `✅ Email report successfully sent to ${studentName}!`, type: 'success' });
      setTimeout(() => setEmailStatus({ loading: false, msg: '', type: '' }), 5000);
    } catch (err) {
      setEmailStatus({ loading: false, msg: `❌ Failed to send email to ${studentName}: ${err.response?.data?.message || err.message}`, type: 'error' });
    }
  };

  if (loading) return <div className="loading" style={{ color: 'white', textAlign: 'center', marginTop: '50px' }}>Analyzing Data...</div>;
  if (error) return <div className="error-message" style={{ color: '#ff4a4a', textAlign: 'center', padding: '2rem' }}>{error}</div>;
  if (!data) return null;

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

  return (
    <div className="dashboard" style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
      
      {emailStatus.msg && (
        <div style={{
          padding: '1rem',
          marginBottom: '1.5rem',
          borderRadius: '8px',
          background: emailStatus.type === 'success' ? 'rgba(76, 175, 80, 0.2)' : (emailStatus.type === 'info' ? 'rgba(100, 108, 255, 0.2)' : 'rgba(244, 67, 54, 0.2)'),
          color: emailStatus.type === 'success' ? '#4caf50' : (emailStatus.type === 'info' ? '#9499ff' : '#ff4a4a'),
          border: `1px solid ${emailStatus.type === 'success' ? 'rgba(76, 175, 80, 0.3)' : (emailStatus.type === 'info' ? 'rgba(100, 108, 255, 0.3)' : 'rgba(244, 67, 54, 0.3)')}`,
          fontWeight: 'bold',
          textAlign: 'center'
        }}>
          {emailStatus.msg}
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <h2 style={{ fontSize: '1.85rem', color: 'var(--text-main)', margin: 0 }}>Performance Insights</h2>
        <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
          <button type="button" className="btn btn-neutral" onClick={handleDownloadCSV} disabled={emailStatus.loading} style={{ width: 'auto', fontSize: '0.88rem' }}>Download CSV</button>
          <button type="button" className="btn btn-neutral" onClick={handleDownloadPDF} disabled={emailStatus.loading} style={{ width: 'auto', fontSize: '0.88rem' }}>Download PDF</button>
          <button type="button" className="btn" onClick={handleSendBulkEmails} disabled={emailStatus.loading} style={{ width: 'auto', fontSize: '0.88rem' }}>Email All Reports</button>
          <button type="button" className="btn btn-neutral" onClick={() => navigate('/teacher-dashboard')} style={{ width: 'auto', fontSize: '0.88rem' }}>Back</button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem', marginBottom: '2rem' }}>
        <div className="glass-card" style={{ textAlign: 'center', padding: '1.5rem' }}>
          <h4 style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.88rem', fontWeight: 500 }}>Avg. Accuracy</h4>
          <div style={{ fontSize: '2.25rem', fontWeight: '800', color: (data.overallAvgAccuracy || 0) >= 60 ? '#059669' : '#d97706', marginTop: '0.35rem' }}>
            {data.overallAvgAccuracy || 0}%
          </div>
        </div>

        <div className="glass-card" style={{ textAlign: 'center', padding: '1.5rem' }}>
          <h4 style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.88rem', fontWeight: 500 }}>Best Score</h4>
          <div style={{ fontSize: '2.25rem', fontWeight: '800', color: 'var(--primary)', marginTop: '0.35rem' }}>
            {data.bestScorePercentage || 0}%
          </div>
        </div>

        <div className="glass-card" style={{ textAlign: 'center', padding: '1.5rem' }}>
          <h4 style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.88rem', fontWeight: 500 }}>Total Submissions</h4>
          <div style={{ fontSize: '2.25rem', fontWeight: '800', color: 'var(--text-main)', marginTop: '0.35rem' }}>
            {data.totalParticipants || data.topPerformers?.length || 0}
          </div>
        </div>

        <div className="glass-card" style={{ textAlign: 'center', padding: '1.5rem' }}>
          <h4 style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.88rem', fontWeight: 500 }}>Avg. Completion Time</h4>
          <div style={{ fontSize: '2.25rem', fontWeight: '800', color: '#0284c7', marginTop: '0.35rem' }}>
            {data.avgQuizTime}s
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '2rem', marginBottom: '2rem' }}>
        {/* Accuracy Chart */}
        <div className="glass-card">
          <h3 style={{ marginBottom: '1.25rem', color: 'var(--text-main)', fontSize: '1.15rem' }}>Accuracy per Question (%)</h3>
          <div style={{ height: '300px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.accuracyPerQuestion}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="questionIndex" stroke="#64748b" tick={{ fontSize: 12 }} />
                <YAxis stroke="#64748b" domain={[0, 100]} unit="%" />
                <Tooltip 
                  formatter={(val) => [`${val}%`, 'Accuracy']}
                  labelFormatter={(label, payload) => {
                    const item = payload && payload[0]?.payload;
                    return item ? `${item.questionIndex}: ${item.questionText?.substring(0, 40)}...` : label;
                  }}
                  contentStyle={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', color: '#0f172a', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}
                  itemStyle={{ color: '#0284c7', fontWeight: 700 }}
                />
                <Bar dataKey="accuracy" fill="#0284c7" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Time Chart */}
        <div className="glass-card">
          <h3 style={{ marginBottom: '1.5rem', color: 'var(--text-main)' }}>Avg. Response Time (s)</h3>
          <div style={{ height: '300px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data.avgTimePerQuestion}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="questionIndex" stroke="#64748b" />
                <YAxis stroke="#64748b" />
                <Tooltip 
                  contentStyle={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', color: '#0f172a', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}
                  itemStyle={{ color: '#059669' }}
                />
                <Line type="monotone" dataKey="avgTime" stroke="#059669" strokeWidth={3} dot={{ fill: '#059669' }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '2rem', marginBottom: '2rem' }}>
        {/* Score Distribution */}
        <div className="glass-card">
          <h3 style={{ marginBottom: '1.5rem', color: 'var(--text-main)' }}>Score Range Distribution</h3>
          <div style={{ height: '300px', display: 'flex', alignItems: 'center' }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data.scoreDistribution}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  fill="#0284c7"
                  paddingAngle={5}
                  dataKey="count"
                  nameKey="range"
                  label
                >
                  {data.scoreDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', color: '#0f172a', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Top Performers */}
      <div className="glass-card">
        <h3 style={{ marginBottom: '1.5rem', color: 'var(--text-main)' }}>Top Performers</h3>
        <div className="table-container" style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--border-subtle)' }}>
                <th style={{ padding: '1rem', color: 'var(--text-muted)' }}>Rank</th>
                <th style={{ padding: '1rem', color: 'var(--text-muted)' }}>Student Name</th>
                <th style={{ padding: '1rem', color: 'var(--text-muted)' }}>Score</th>
                <th style={{ padding: '1rem', color: 'var(--text-muted)' }}>Percentage</th>
                <th style={{ padding: '1rem', color: 'var(--text-muted)' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {data.topPerformers.map((student, index) => (
                <tr key={index} style={{ borderBottom: '1px solid var(--border-subtle)', background: index === 0 ? 'var(--primary-subtle)' : 'transparent' }}>
                  <td style={{ padding: '1rem' }}>
                    {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : index + 1}
                  </td>
                  <td style={{ padding: '1rem', fontWeight: 'bold', color: 'var(--text-main)' }}>{student.name}</td>
                  <td style={{ padding: '1rem', color: 'var(--text-main)' }}>{student.score}</td>
                  <td style={{ padding: '1rem', color: '#059669', fontWeight: 600 }}>{student.percentage}%</td>
                  <td style={{ padding: '1rem' }}>
                    <button 
                      type="button"
                      className="btn btn-neutral" 
                      onClick={() => handleSendSingleEmail(student.attemptId, student.name)} 
                      disabled={emailStatus.loading || !student.attemptId}
                      style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem', width: 'auto', marginTop: 0 }}
                    >
                      Email Report
                    </button>
                  </td>
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
