import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';

const ResultsView = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [resultsData, setResultsData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchResults = async () => {
      try {
        const res = await api.get(`/quiz/${id}/results`);
        setResultsData(res.data);
      } catch (err) {
        setError('Failed to load results. You may not have completed this quiz yet.');
      } finally {
        setLoading(false);
      }
    };
    fetchResults();
  }, [id]);

  if (loading) return <div className="loading" style={{ color: 'white', textAlign: 'center', marginTop: '50px' }}>Loading Results...</div>;
  if (error) return <div className="error-message" style={{ color: '#ff4a4a', textAlign: 'center', marginTop: '50px' }}>{error}</div>;

  const { score, totalQuestions, results, totalMarks } = resultsData;
  const percentage = totalMarks > 0 ? Math.round((score / totalMarks) * 100) : 0;

  return (
    <div className="dashboard" style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto' }}>
      <div className="glass-card" style={{ marginBottom: '2rem', textAlign: 'center' }}>
        <h2 style={{ fontSize: '2rem', marginBottom: '1rem' }}>Quiz Results 🎉</h2>
        <div style={{ fontSize: '4rem', fontWeight: 'bold', color: score >= (totalMarks * 0.5) ? '#4caf50' : '#ff4a4a', marginBottom: '1rem' }}>
          {score} / {totalMarks}
        </div>
        <div style={{ fontSize: '1.2rem', color: 'rgba(255,255,255,0.7)' }}>
          You scored {percentage}%
        </div>
        <button className="btn" onClick={() => navigate('/student-dashboard')} style={{ marginTop: '2rem', width: 'auto' }}>
          Back to Dashboard
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        {results.map((q, index) => {
          console.log(`[DEBUG] Question ${index + 1} Result:`, q);
          return (
            <div key={q._id} className="glass-card" style={{ borderLeft: q.isCorrect ? '5px solid #4caf50' : '5px solid #ff4a4a' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <h3 style={{ marginTop: 0, fontSize: '1.2rem' }}>{index + 1}. {q.text}</h3>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <span style={{ 
                    padding: '0.2rem 0.5rem', 
                    borderRadius: '4px', 
                    background: q.marksAwarded > 0 ? 'rgba(76, 175, 80, 0.2)' : (q.marksAwarded < 0 ? 'rgba(244, 67, 54, 0.2)' : 'rgba(255,255,255,0.05)'), 
                    color: q.marksAwarded > 0 ? '#4caf50' : (q.marksAwarded < 0 ? '#ff4a4a' : 'rgba(255,255,255,0.5)'), 
                    fontWeight: 'bold' 
                  }}>
                    {q.marksAwarded > 0 ? `+${q.marksAwarded}` : q.marksAwarded} / {q.questionMarks}
                  </span>
                  <span style={{ padding: '0.2rem 0.5rem', borderRadius: '4px', background: q.isCorrect ? 'rgba(76, 175, 80, 0.2)' : 'rgba(244, 67, 54, 0.2)', color: q.isCorrect ? '#4caf50' : '#ff4a4a', fontWeight: 'bold' }}>
                    {q.isCorrect ? 'Correct' : 'Incorrect'}
                  </span>
                </div>
              </div>

              <div style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {q.options.map((opt, oIndex) => {
                  let bgColor = 'rgba(0,0,0,0.2)';
                  let border = '1px solid rgba(255,255,255,0.1)';
                  
                  // HIGHLIGHT LOGIC
                  // 1. Correct Answer is always Green
                  if (oIndex === q.correctOptionIndex) {
                    bgColor = 'rgba(76, 175, 80, 0.2)';
                    border = '1px solid #4caf50';
                  } 
                  // 2. If user selected this and it's wrong, highlight Red
                  else if (oIndex === q.userSelectedOptionIndex && !q.isCorrect) {
                    bgColor = 'rgba(244, 67, 54, 0.2)';
                    border = '1px solid #ff4a4a';
                  }

                  return (
                    <div key={oIndex} style={{ padding: '0.8rem', background: bgColor, border, borderRadius: '4px', display: 'flex', justifyContent: 'space-between' }}>
                      <span>{opt}</span>
                      <div style={{ fontSize: '0.8rem', opacity: 0.8 }}>
                        {oIndex === q.userSelectedOptionIndex && <span style={{ marginRight: '0.5rem' }}>👤 Your Answer</span>}
                        {oIndex === q.correctOptionIndex && <span>✅ Correct</span>}
                      </div>
                    </div>
                  );
                })}
              </div>

              {q.explanation && (
                <div style={{ marginTop: '1rem', padding: '1rem', background: 'rgba(255,255,255,0.05)', borderRadius: '4px', borderLeft: '3px solid #646cff' }}>
                  <strong style={{ color: '#646cff' }}>Explanation: </strong>
                  {q.explanation}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ResultsView;
