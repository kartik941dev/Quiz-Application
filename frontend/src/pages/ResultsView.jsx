import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { HelpCircle, CheckCircle2, MessageSquare, Send, Code2 } from 'lucide-react';

const ResultsView = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [resultsData, setResultsData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Active doubt form state: { [questionIndex]: boolean }
  const [activeDoubtIndex, setActiveDoubtIndex] = useState(null);
  const [doubtTextMap, setDoubtTextMap] = useState({});
  const [submittingDoubt, setSubmittingDoubt] = useState(false);
  const [submittedDoubts, setSubmittedDoubts] = useState({}); // { [questionIndex]: string (success msg) }
  const [doubtError, setDoubtError] = useState({});

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

  const handleToggleDoubtForm = (index) => {
    if (activeDoubtIndex === index) {
      setActiveDoubtIndex(null);
    } else {
      setActiveDoubtIndex(index);
      setDoubtError(prev => ({ ...prev, [index]: '' }));
    }
  };

  const handleDoubtSubmit = async (e, index) => {
    e.preventDefault();
    const text = (doubtTextMap[index] || '').trim();
    if (!text) {
      setDoubtError(prev => ({ ...prev, [index]: 'Please write your doubt before submitting.' }));
      return;
    }

    setSubmittingDoubt(true);
    setDoubtError(prev => ({ ...prev, [index]: '' }));

    try {
      await api.post('/doubts', {
        quizId: id,
        questionIndex: index,
        doubtText: text
      });

      setSubmittedDoubts(prev => ({
        ...prev,
        [index]: text
      }));
      setDoubtTextMap(prev => ({ ...prev, [index]: '' }));
      setActiveDoubtIndex(null);
    } catch (err) {
      setDoubtError(prev => ({
        ...prev,
        [index]: err.response?.data?.message || 'Failed to submit doubt. Please try again.'
      }));
    } finally {
      setSubmittingDoubt(false);
    }
  };

  const handleReattempt = async () => {
    try {
      if (resultsData?.joinCode) {
        await api.post('/quiz/join', { joinCode: resultsData.joinCode });
      }
      navigate(`/quiz/${id}`);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to start reattempt.');
    }
  };

  if (loading) return <div className="loading" style={{ color: 'var(--text-main)', textAlign: 'center', marginTop: '50px' }}>Loading Results...</div>;
  if (error) return <div className="error-message" style={{ textAlign: 'center', margin: '3rem auto', maxWidth: '600px' }}>{error}</div>;

  const { score, results, totalMarks, allowReattempt } = resultsData;
  const percentage = totalMarks > 0 ? Math.round((score / totalMarks) * 100) : 0;

  return (
    <div className="dashboard" style={{ padding: '2rem', maxWidth: '850px', margin: '0 auto' }}>
      
      {/* Score Summary Card */}
      <div className="glass-card" style={{ marginBottom: '2rem', textAlign: 'center', padding: '2.5rem' }}>
        <h2 style={{ fontSize: '1.75rem', marginBottom: '0.75rem', color: 'var(--text-main)' }}>Quiz Results</h2>
        <div style={{ fontSize: '3.75rem', fontWeight: 800, color: score >= (totalMarks * 0.5) ? '#059669' : '#dc2626', marginBottom: '0.5rem', letterSpacing: '-0.02em' }}>
          {score} / {totalMarks}
        </div>
        <div style={{ fontSize: '1.15rem', color: 'var(--text-muted)', fontWeight: 500 }}>
          You scored {percentage}%
        </div>
        <div style={{ display: 'flex', justifyContent: 'center', gap: '0.75rem', marginTop: '1.75rem', flexWrap: 'wrap' }}>
          {allowReattempt && (
            <button 
              type="button" 
              className="btn" 
              onClick={handleReattempt} 
              style={{ width: 'auto', padding: '0.65rem 1.75rem', fontWeight: 700 }}
            >
              🔄 Reattempt Quiz
            </button>
          )}
          <button 
            type="button" 
            className="btn btn-neutral" 
            onClick={() => navigate('/student-dashboard')} 
            style={{ width: 'auto', padding: '0.65rem 1.5rem', fontWeight: 600 }}
          >
            Back to Dashboard
          </button>
        </div>
      </div>

      {/* Questions Breakdown List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        {results.map((q, index) => {
          const isDoubtOpen = activeDoubtIndex === index;
          const userDoubt = submittedDoubts[index];
          const qType = q.type || 'single_choice';

          return (
            <div 
              key={q._id || index} 
              className="glass-card" 
              style={{ 
                borderLeft: q.isCorrect ? '5px solid #10b981' : '5px solid #ef4444',
                padding: '1.75rem'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.75rem' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
                    <span style={{ fontSize: '0.75rem', padding: '2px 6px', borderRadius: '4px', background: '#e0f2fe', color: '#0369a1', fontWeight: 600 }}>
                      {qType === 'multiple_choice' ? 'Multiple Choice' : (qType === 'true_false' ? 'True / False' : (qType === 'fill_in_the_blank' ? 'Fill in Blank' : (qType === 'essay_code' ? `Code (${q.codeLanguage || 'General'})` : 'Single Choice')))}
                    </span>
                  </div>
                  <h3 style={{ marginTop: 0, fontSize: '1.2rem', color: 'var(--text-main)' }}>
                    {index + 1}. {q.text}
                  </h3>
                </div>
                
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <span style={{ 
                    padding: '0.25rem 0.65rem', 
                    borderRadius: 'var(--radius-sm)', 
                    background: q.marksAwarded > 0 ? 'var(--status-success-bg)' : (q.marksAwarded < 0 ? 'var(--status-error-bg)' : '#f1f5f9'), 
                    color: q.marksAwarded > 0 ? 'var(--status-success-text)' : (q.marksAwarded < 0 ? 'var(--status-error-text)' : 'var(--text-muted)'), 
                    fontWeight: 700,
                    fontSize: '0.85rem'
                  }}>
                    {q.marksAwarded > 0 ? `+${q.marksAwarded}` : q.marksAwarded} / {q.questionMarks}
                  </span>
                  
                  <span style={{ 
                    padding: '0.25rem 0.65rem', 
                    borderRadius: 'var(--radius-sm)', 
                    background: q.isCorrect ? 'var(--status-success-bg)' : 'var(--status-error-bg)', 
                    color: q.isCorrect ? 'var(--status-success-text)' : 'var(--status-error-text)', 
                    fontWeight: 700,
                    fontSize: '0.85rem'
                  }}>
                    {q.isCorrect ? 'Correct' : 'Incorrect'}
                  </span>
                </div>
              </div>

              {/* 1. Options Review (Single Choice, Multiple Choice, True/False) */}
              {(qType === 'single_choice' || qType === 'true_false' || qType === 'multiple_choice') && (
                <div style={{ marginTop: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                  {q.options.map((opt, oIndex) => {
                    let bgColor = '#ffffff';
                    let border = '1px solid #e2e8f0';
                    let textColor = 'var(--text-body)';

                    const isSingleCorrect = oIndex === q.correctOptionIndex;
                    const isMultiCorrect = Array.isArray(q.correctOptionIndices) && q.correctOptionIndices.includes(oIndex);
                    const isCorrectAnswer = qType === 'multiple_choice' ? isMultiCorrect : isSingleCorrect;

                    const isSingleSelected = oIndex === q.userSelectedOptionIndex;
                    const isMultiSelected = Array.isArray(q.userSelectedOptionIndices) && q.userSelectedOptionIndices.includes(oIndex);
                    const isUserSelected = qType === 'multiple_choice' ? isMultiSelected : isSingleSelected;

                    if (isCorrectAnswer) {
                      bgColor = 'var(--status-success-bg)';
                      border = '1.5px solid #10b981';
                      textColor = '#065f46';
                    } else if (isUserSelected && !isCorrectAnswer) {
                      bgColor = 'var(--status-error-bg)';
                      border = '1.5px solid #ef4444';
                      textColor = '#991b1b';
                    }

                    return (
                      <div 
                        key={oIndex} 
                        style={{ 
                          padding: '0.85rem 1rem', 
                          background: bgColor, 
                          border, 
                          borderRadius: 'var(--radius-md)', 
                          display: 'flex', 
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          color: textColor
                        }}
                      >
                        <span style={{ fontSize: '0.95rem', fontWeight: isCorrectAnswer ? 600 : 400 }}>
                          {opt}
                        </span>
                        <div style={{ fontSize: '0.82rem', fontWeight: 600 }}>
                          {isUserSelected && <span style={{ marginRight: '0.5rem' }}>👤 Your Choice</span>}
                          {isCorrectAnswer && <span>✅ Correct</span>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* 2. Fill in the Blank Review */}
              {qType === 'fill_in_the_blank' && (
                <div style={{ marginTop: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                  <div style={{ padding: '0.85rem 1rem', background: q.isCorrect ? 'var(--status-success-bg)' : 'var(--status-error-bg)', border: `1.5px solid ${q.isCorrect ? '#10b981' : '#ef4444'}`, borderRadius: 'var(--radius-md)' }}>
                    <div style={{ fontSize: '0.82rem', fontWeight: 600, color: q.isCorrect ? '#065f46' : '#991b1b', marginBottom: '0.2rem' }}>
                      Your Answer:
                    </div>
                    <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-main)' }}>
                      {q.userTextResponse || '(No response provided)'}
                    </div>
                  </div>

                  {!q.isCorrect && q.acceptedAnswers && q.acceptedAnswers.length > 0 && (
                    <div style={{ padding: '0.85rem 1rem', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 'var(--radius-md)' }}>
                      <div style={{ fontSize: '0.82rem', fontWeight: 600, color: '#059669', marginBottom: '0.2rem' }}>
                        Accepted Answers:
                      </div>
                      <div style={{ fontSize: '0.92rem', color: 'var(--text-main)' }}>
                        {q.acceptedAnswers.join(', ')}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* 3. Code / Essay Review */}
              {qType === 'essay_code' && (
                <div style={{ marginTop: '1.25rem' }}>
                  <div style={{ borderRadius: '8px', border: '1px solid #cbd5e1', overflow: 'hidden', background: '#0f172a' }}>
                    <div style={{ padding: '0.4rem 0.85rem', background: '#1e293b', display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#94a3b8', fontSize: '0.8rem', fontFamily: 'monospace' }}>
                      <Code2 size={14} /> Your Submitted Code / Response:
                    </div>
                    <pre style={{ margin: 0, padding: '1rem', color: '#f8fafc', fontFamily: 'monospace', fontSize: '0.9rem', whiteSpace: 'pre-wrap' }}>
                      {q.userTextResponse || '(Empty submission)'}
                    </pre>
                  </div>
                </div>
              )}

              {/* Explanation */}
              {q.explanation && (
                <div style={{ 
                  marginTop: '1.25rem', 
                  padding: '1rem', 
                  background: 'var(--primary-subtle)', 
                  borderRadius: 'var(--radius-md)', 
                  borderLeft: '4px solid var(--primary)',
                  fontSize: '0.92rem',
                  color: 'var(--text-main)'
                }}>
                  <strong style={{ color: 'var(--primary)' }}>Explanation: </strong>
                  {q.explanation}
                </div>
              )}

              {/* Doubt Section */}
              <div style={{ marginTop: '1.25rem', paddingTop: '1rem', borderTop: '1px solid var(--border-subtle)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.88rem', color: 'var(--text-muted)' }}>
                    <HelpCircle size={16} /> Have a question or doubt about this question?
                  </div>

                  <button
                    type="button"
                    onClick={() => handleToggleDoubtForm(index)}
                    className="btn btn-neutral"
                    style={{ 
                      width: 'auto', 
                      padding: '0.4rem 0.9rem', 
                      fontSize: '0.85rem',
                      fontWeight: 600,
                      color: isDoubtOpen ? 'var(--primary)' : 'var(--text-main)',
                      borderColor: isDoubtOpen ? 'var(--primary)' : 'var(--border-subtle)'
                    }}
                  >
                    <MessageSquare size={14} />
                    {isDoubtOpen ? 'Close Doubt Box' : (userDoubt ? 'Ask Another Doubt' : 'Ask Doubt to Teacher')}
                  </button>
                </div>

                {/* Submitted Doubt Confirmation */}
                {userDoubt && (
                  <div style={{ 
                    marginTop: '0.75rem', 
                    padding: '0.75rem 1rem', 
                    background: 'var(--status-success-bg)', 
                    border: '1px solid var(--status-success-border)',
                    borderRadius: 'var(--radius-md)',
                    fontSize: '0.88rem',
                    color: 'var(--status-success-text)',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '0.6rem'
                  }}>
                    <CheckCircle2 size={18} style={{ minWidth: '18px', marginTop: '2px' }} />
                    <div>
                      <strong>Your doubt was sent to your teacher:</strong>
                      <p style={{ margin: '0.25rem 0 0 0', color: 'var(--text-main)' }}>"{userDoubt}"</p>
                    </div>
                  </div>
                )}

                {/* Interactive Doubt Writing Form */}
                {isDoubtOpen && (
                  <form onSubmit={(e) => handleDoubtSubmit(e, index)} style={{ marginTop: '1rem' }}>
                    <div className="form-group" style={{ marginBottom: '0.75rem' }}>
                      <textarea
                        className="form-control"
                        placeholder="Write your doubt or what was confusing about this question for your teacher..."
                        rows={3}
                        value={doubtTextMap[index] || ''}
                        onChange={(e) => setDoubtTextMap({ ...doubtTextMap, [index]: e.target.value })}
                        disabled={submittingDoubt}
                        style={{ resize: 'vertical' }}
                        required
                      />
                    </div>

                    {doubtError[index] && (
                      <div className="error-message" style={{ marginBottom: '0.75rem' }}>
                        {doubtError[index]}
                      </div>
                    )}

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                      <button
                        type="button"
                        className="btn btn-neutral"
                        onClick={() => setActiveDoubtIndex(null)}
                        disabled={submittingDoubt}
                        style={{ width: 'auto', fontSize: '0.85rem', padding: '0.45rem 1rem' }}
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="btn"
                        disabled={submittingDoubt}
                        style={{ width: 'auto', fontSize: '0.85rem', padding: '0.45rem 1.25rem', fontWeight: 600 }}
                      >
                        <Send size={14} />
                        {submittingDoubt ? 'Submitting...' : 'Send Doubt'}
                      </button>
                    </div>
                  </form>
                )}
              </div>

            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ResultsView;
