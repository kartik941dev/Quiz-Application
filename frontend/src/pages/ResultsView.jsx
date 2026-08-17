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

  const { score, results, totalMarks, allowReattempt, hasPendingReview } = resultsData;
  const percentage = totalMarks > 0 ? Math.round((score / totalMarks) * 100) : 0;

  return (
    <div className="dashboard" style={{ padding: '2rem', maxWidth: '850px', margin: '0 auto' }}>
      
      {/* Pending Evaluation Banner */}
      {hasPendingReview && (
        <div style={{
          padding: '1rem 1.25rem',
          borderRadius: '8px',
          background: '#fffbeb',
          border: '1.5px solid #fde68a',
          color: '#92400e',
          marginBottom: '1.5rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          fontSize: '0.92rem'
        }}>
          <span style={{ fontSize: '1.4rem' }}>⏳</span>
          <div>
            <strong>Teacher Evaluation in Progress:</strong> Your quiz contains code or essay questions that are being evaluated manually by your teacher. Your final marks will update once graded.
          </div>
        </div>
      )}

      {/* Score Summary Card */}
      <div className="glass-card" style={{ marginBottom: '2rem', textAlign: 'center', padding: '2.5rem' }}>
        <h2 style={{ fontSize: '1.75rem', marginBottom: '0.75rem', color: 'var(--text-main)' }}>Quiz Results</h2>
        <div style={{ fontSize: '3.75rem', fontWeight: 800, color: score >= (totalMarks * 0.5) ? '#059669' : '#dc2626', marginBottom: '0.5rem', letterSpacing: '-0.02em' }}>
          {score} <span style={{ fontSize: '1.75rem', fontWeight: 500, color: 'var(--text-muted)' }}>/ {totalMarks}</span>
        </div>
        <p style={{ fontSize: '1.15rem', color: 'var(--text-body)', margin: '0 0 1.5rem 0', fontWeight: 500 }}>
          Accuracy: <strong style={{ color: 'var(--text-main)' }}>{percentage}%</strong>
        </p>

        {/* Buttons */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          {allowReattempt && (
            <button 
              type="button"
              className="btn"
              onClick={handleReattempt}
              style={{ width: 'auto', padding: '0.65rem 1.75rem', fontSize: '0.92rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
            >
              🔄 Reattempt Quiz
            </button>
          )}

          <button 
            type="button"
            className="btn btn-neutral"
            onClick={() => navigate('/student-dashboard')}
            style={{ width: 'auto', padding: '0.65rem 1.5rem', fontSize: '0.92rem' }}
          >
            Dashboard
          </button>
        </div>
      </div>

      {/* Question Breakdown */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        <h3 style={{ margin: '0 0 0.5rem 0', color: 'var(--text-main)', fontSize: '1.35rem', fontWeight: 700 }}>Review Answers</h3>

        {results.map((q, index) => {
          const qType = q.type || 'single_choice';
          const isDoubtOpen = activeDoubtIndex === index;
          const userDoubt = submittedDoubts[index];
          const isPending = q.evaluationStatus === 'pending_review';

          return (
            <div 
              key={index} 
              className="glass-card"
              style={{ 
                borderLeft: `4px solid ${isPending ? '#f59e0b' : (q.isCorrect ? '#10b981' : '#ef4444')}`,
                padding: '1.75rem'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <span style={{ 
                    fontSize: '0.82rem', 
                    padding: '2px 8px', 
                    borderRadius: '4px', 
                    background: 'var(--primary-subtle)', 
                    color: 'var(--primary)', 
                    fontWeight: 700 
                  }}>
                    Q{index + 1}
                  </span>
                  <span style={{ fontSize: '0.78rem', padding: '2px 6px', borderRadius: '4px', background: '#f1f5f9', color: '#475569', fontWeight: 600 }}>
                    {qType === 'multiple_choice' ? 'Multiple Choice' : (qType === 'true_false' ? 'True / False' : (qType === 'fill_in_the_blank' ? 'Fill Blank' : (qType === 'essay_code' ? `Code (${q.codeLanguage || 'General'})` : 'Single Choice')))}
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ 
                    fontSize: '0.85rem', 
                    fontWeight: 700, 
                    color: isPending ? '#d97706' : (q.isCorrect ? '#059669' : '#dc2626') 
                  }}>
                    {isPending ? '⏳ Awaiting Teacher Evaluation' : (q.isCorrect ? `+${q.marksAwarded || q.marks || 1} Marks (Correct)` : `0 Marks`)}
                  </span>
                </div>
              </div>

              <h4 style={{ margin: '0 0 1rem 0', color: 'var(--text-main)', fontSize: '1.1rem', lineHeight: '1.4' }}>
                {q.text}
              </h4>

              {/* 1. Multiple Choice / Single Choice Options List */}
              {(qType === 'single_choice' || qType === 'multiple_choice' || qType === 'true_false') && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '1rem' }}>
                  {q.options.map((opt, optIndex) => {
                    const isSelected = qType === 'multiple_choice'
                      ? Array.isArray(q.selectedOptionIndices) && q.selectedOptionIndices.includes(optIndex)
                      : q.selectedOptionIndex === optIndex;

                    const isCorrect = qType === 'multiple_choice'
                      ? Array.isArray(q.correctOptionIndices) && q.correctOptionIndices.includes(optIndex)
                      : q.correctOptionIndex === optIndex;

                    let bg = '#ffffff';
                    let border = '1px solid var(--border-subtle)';
                    let color = 'var(--text-main)';

                    if (isSelected && isCorrect) {
                      bg = 'var(--status-success-bg)';
                      border = '1.5px solid #10b981';
                      color = '#065f46';
                    } else if (isSelected && !isCorrect) {
                      bg = 'var(--status-error-bg)';
                      border = '1.5px solid #ef4444';
                      color = '#991b1b';
                    } else if (!isSelected && isCorrect) {
                      bg = 'var(--status-success-bg)';
                      border = '1px dashed #10b981';
                      color = '#065f46';
                    }

                    return (
                      <div 
                        key={optIndex}
                        style={{
                          padding: '0.75rem 1rem',
                          borderRadius: 'var(--radius-md)',
                          background: bg,
                          border: border,
                          color: color,
                          fontSize: '0.95rem',
                          fontWeight: isSelected || isCorrect ? 600 : 400,
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center'
                        }}
                      >
                        <span>{opt}</span>
                        <div style={{ display: 'flex', gap: '0.4rem', fontSize: '0.8rem', fontWeight: 700 }}>
                          {isSelected && <span style={{ color: isCorrect ? '#059669' : '#dc2626' }}>[Your Choice]</span>}
                          {isCorrect && <span style={{ color: '#059669' }}>✓ Correct</span>}
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
                      Your Submitted Answer:
                    </div>
                    <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-main)' }}>
                      {q.textResponse || q.userTextResponse || '(No response provided)'}
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
                <div style={{ marginTop: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  <div style={{ borderRadius: '8px', border: '1px solid #cbd5e1', overflow: 'hidden', background: '#0f172a' }}>
                    <div style={{ padding: '0.4rem 0.85rem', background: '#1e293b', display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#94a3b8', fontSize: '0.8rem', fontFamily: 'monospace' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <Code2 size={14} /> Your Submitted Code / Response:
                      </div>
                      <span style={{
                        padding: '1px 6px',
                        borderRadius: '4px',
                        fontSize: '0.72rem',
                        background: isPending ? '#fef3c7' : '#ecfdf5',
                        color: isPending ? '#b45309' : '#047857',
                        fontWeight: 700
                      }}>
                        {isPending ? '⏳ Evaluation Pending' : `Marks: ${q.marksAwarded || 0}/${q.marks}`}
                      </span>
                    </div>
                    <pre style={{ margin: 0, padding: '1rem', color: '#f8fafc', fontFamily: 'monospace', fontSize: '0.9rem', whiteSpace: 'pre-wrap' }}>
                      {q.textResponse || q.userTextResponse || '(Empty submission)'}
                    </pre>
                  </div>

                  {q.teacherFeedback && (
                    <div style={{
                      padding: '0.85rem 1rem',
                      background: '#ecfdf5',
                      border: '1px solid #a7f3d0',
                      borderRadius: '6px',
                      color: '#065f46',
                      fontSize: '0.88rem'
                    }}>
                      <strong>👨‍🏫 Teacher Feedback: </strong> {q.teacherFeedback}
                    </div>
                  )}
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
