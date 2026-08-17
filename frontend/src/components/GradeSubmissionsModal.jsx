import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { Code2, Check, X, Award, MessageSquare, AlertCircle } from 'lucide-react';

const GradeSubmissionsModal = ({ quizId, quizTitle, onClose, onGraded }) => {
  const [evaluations, setEvaluations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [gradingState, setGradingState] = useState({}); // key: `${attemptId}_${questionId}` -> { marks, feedback, saving, saved }

  useEffect(() => {
    const fetchEvaluations = async () => {
      try {
        setLoading(true);
        const res = await api.get(`/quiz/${quizId}/evaluations`);
        if (res.data.success) {
          setEvaluations(res.data.evaluations);
          
          // Pre-populate grading state
          const initial = {};
          res.data.evaluations.forEach(ev => {
            const key = `${ev.attemptId}_${ev.questionId}`;
            initial[key] = {
              marks: ev.marksAwarded !== undefined ? ev.marksAwarded : 0,
              feedback: ev.teacherFeedback || '',
              saving: false,
              saved: false
            };
          });
          setGradingState(initial);
        }
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to load submissions for evaluation');
      } finally {
        setLoading(false);
      }
    };

    fetchEvaluations();
  }, [quizId]);

  const handleMarksChange = (attemptId, questionId, val, maxMarks) => {
    const key = `${attemptId}_${questionId}`;
    const num = Math.min(Math.max(0, Number(val) || 0), maxMarks);
    setGradingState(prev => ({
      ...prev,
      [key]: { ...prev[key], marks: num, saved: false }
    }));
  };

  const handleFeedbackChange = (attemptId, questionId, val) => {
    const key = `${attemptId}_${questionId}`;
    setGradingState(prev => ({
      ...prev,
      [key]: { ...prev[key], feedback: val, saved: false }
    }));
  };

  const handleSaveGrade = async (attemptId, questionId) => {
    const key = `${attemptId}_${questionId}`;
    const state = gradingState[key] || {};

    setGradingState(prev => ({
      ...prev,
      [key]: { ...prev[key], saving: true }
    }));

    try {
      const res = await api.put(`/quiz/attempt/${attemptId}/grade`, {
        questionId,
        marksAwarded: state.marks,
        teacherFeedback: state.feedback
      });

      if (res.data.success) {
        setGradingState(prev => ({
          ...prev,
          [key]: { ...prev[key], saving: false, saved: true }
        }));

        setEvaluations(prev => prev.map(ev => {
          if (ev.attemptId === attemptId && ev.questionId === questionId) {
            return {
              ...ev,
              marksAwarded: state.marks,
              teacherFeedback: state.feedback,
              evaluationStatus: 'graded'
            };
          }
          return ev;
        }));

        if (onGraded) onGraded();
      }
    } catch (err) {
      alert(`Failed to save grade: ${err.response?.data?.message || err.message}`);
      setGradingState(prev => ({
        ...prev,
        [key]: { ...prev[key], saving: false }
      }));
    }
  };

  const pendingCount = evaluations.filter(ev => ev.evaluationStatus === 'pending_review').length;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(15, 23, 42, 0.65)',
      backdropFilter: 'blur(6px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999,
      padding: '1.5rem'
    }}>
      <div style={{
        background: '#ffffff',
        borderRadius: '12px',
        maxWidth: '900px',
        width: '100%',
        maxHeight: '90vh',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
        border: '1px solid #e2e8f0',
        overflow: 'hidden'
      }}>
        {/* Header */}
        <div style={{
          padding: '1.25rem 1.5rem',
          borderBottom: '1px solid #e2e8f0',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: '#f8fafc'
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <h3 style={{ margin: 0, fontSize: '1.25rem', color: '#0f172a', fontWeight: 800 }}>
                Evaluate Code & Essay Submissions
              </h3>
              <span style={{
                fontSize: '0.75rem',
                padding: '2px 8px',
                borderRadius: '12px',
                background: pendingCount > 0 ? '#fef3c7' : '#ecfdf5',
                color: pendingCount > 0 ? '#b45309' : '#047857',
                fontWeight: 700,
                border: `1px solid ${pendingCount > 0 ? '#fde68a' : '#a7f3d0'}`
              }}>
                {pendingCount > 0 ? `⏳ ${pendingCount} Pending Review` : '✅ All Evaluated'}
              </span>
            </div>
            <p style={{ margin: '0.2rem 0 0 0', color: '#64748b', fontSize: '0.85rem' }}>
              Quiz: <strong>{quizTitle}</strong> — Review student responses, assign marks, and leave feedback.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: '#64748b',
              padding: '6px',
              borderRadius: '6px'
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Content Body */}
        <div style={{ padding: '1.5rem', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {loading && (
            <div style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>
              Loading student submissions...
            </div>
          )}

          {error && (
            <div style={{ padding: '1rem', background: '#fef2f2', color: '#b91c1c', borderRadius: '8px', border: '1px solid #fecaca' }}>
              {error}
            </div>
          )}

          {!loading && !error && evaluations.length === 0 && (
            <div style={{ textAlign: 'center', padding: '3rem 1rem', color: '#64748b' }}>
              <Code2 size={40} style={{ color: '#94a3b8', marginBottom: '0.75rem' }} />
              <h4 style={{ margin: '0 0 0.5rem 0', color: '#0f172a' }}>No Code or Essay Questions Found</h4>
              <p style={{ margin: 0, fontSize: '0.88rem' }}>
                This quiz does not contain any code or essay questions, or no students have submitted responses yet.
              </p>
            </div>
          )}

          {!loading && evaluations.map(ev => {
            const key = `${ev.attemptId}_${ev.questionId}`;
            const state = gradingState[key] || { marks: ev.marksAwarded, feedback: ev.teacherFeedback, saving: false, saved: false };
            const isPending = ev.evaluationStatus === 'pending_review';

            return (
              <div key={key} style={{
                background: isPending ? '#fffdfa' : '#ffffff',
                border: `1.5px solid ${isPending ? '#fed7aa' : '#e2e8f0'}`,
                borderRadius: '8px',
                padding: '1.25rem',
                boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
              }}>
                {/* Student info & status */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <strong style={{ fontSize: '1rem', color: '#0f172a' }}>{ev.studentName}</strong>
                    <span style={{ fontSize: '0.8rem', color: '#64748b' }}>({ev.studentEmail})</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{
                      fontSize: '0.72rem',
                      padding: '2px 8px',
                      borderRadius: '4px',
                      background: isPending ? '#fef3c7' : '#ecfdf5',
                      color: isPending ? '#92400e' : '#065f46',
                      fontWeight: 700,
                      border: `1px solid ${isPending ? '#fde68a' : '#a7f3d0'}`
                    }}>
                      {isPending ? '⏳ Awaiting Review' : '✓ Graded'}
                    </span>
                    <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                      Submitted: {new Date(ev.submittedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>

                {/* Question Prompt */}
                <div style={{ marginBottom: '0.75rem', fontSize: '0.92rem', color: '#334155', fontWeight: 600 }}>
                  Q: {ev.questionText}
                </div>

                {/* Student Code / Text Submission */}
                <div style={{
                  background: '#0f172a',
                  color: '#f8fafc',
                  borderRadius: '6px',
                  border: '1px solid #334155',
                  overflow: 'hidden',
                  marginBottom: '1rem',
                  fontFamily: 'monospace',
                  fontSize: '0.88rem'
                }}>
                  <div style={{
                    padding: '0.4rem 0.8rem',
                    background: '#1e293b',
                    color: '#94a3b8',
                    fontSize: '0.75rem',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}>
                    <span>Language: {ev.codeLanguage || 'General / Markdown'}</span>
                    <span>Student Submission</span>
                  </div>
                  <pre style={{
                    margin: 0,
                    padding: '0.85rem',
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                    maxHeight: '220px',
                    overflowY: 'auto'
                  }}>
                    {ev.textResponse ? ev.textResponse : <span style={{ color: '#64748b', fontStyle: 'italic' }}>[No code or text response provided]</span>}
                  </pre>
                </div>

                {/* Grading Controls */}
                <div style={{
                  display: 'flex',
                  gap: '1rem',
                  alignItems: 'flex-start',
                  background: '#f8fafc',
                  padding: '0.85rem',
                  borderRadius: '6px',
                  border: '1px solid #e2e8f0',
                  flexWrap: 'wrap'
                }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                    <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#475569' }}>
                      Marks (Max: {ev.maxMarks}):
                    </label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <input
                        type="number"
                        min="0"
                        max={ev.maxMarks}
                        step="0.5"
                        value={state.marks}
                        onChange={e => handleMarksChange(ev.attemptId, ev.questionId, e.target.value, ev.maxMarks)}
                        style={{
                          width: '70px',
                          padding: '0.4rem',
                          borderRadius: '4px',
                          border: '1.5px solid #cbd5e1',
                          fontWeight: 800,
                          textAlign: 'center',
                          fontSize: '1rem',
                          color: '#0f172a'
                        }}
                      />
                      <span style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 600 }}>/ {ev.maxMarks}</span>
                    </div>
                  </div>

                  <div style={{ flex: 1, minWidth: '220px', display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                    <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#475569' }}>
                      Teacher Feedback / Comments (Optional):
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Clean logic! Great use of recursion."
                      value={state.feedback}
                      onChange={e => handleFeedbackChange(ev.attemptId, ev.questionId, e.target.value)}
                      style={{
                        padding: '0.4rem 0.75rem',
                        borderRadius: '4px',
                        border: '1px solid #cbd5e1',
                        fontSize: '0.85rem'
                      }}
                    />
                  </div>

                  <div style={{ display: 'flex', alignItems: 'flex-end', paddingTop: '1.25rem' }}>
                    <button
                      type="button"
                      onClick={() => handleSaveGrade(ev.attemptId, ev.questionId)}
                      disabled={state.saving}
                      style={{
                        background: state.saved ? '#059669' : 'var(--primary)',
                        color: '#ffffff',
                        border: 'none',
                        padding: '0.45rem 1.1rem',
                        borderRadius: '4px',
                        fontWeight: 700,
                        fontSize: '0.85rem',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.35rem',
                        transition: 'all 0.2s ease'
                      }}
                    >
                      {state.saving ? 'Saving...' : state.saved ? '✓ Saved' : 'Save Grade'}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div style={{
          padding: '1rem 1.5rem',
          borderTop: '1px solid #e2e8f0',
          display: 'flex',
          justifyContent: 'flex-end',
          background: '#f8fafc'
        }}>
          <button
            type="button"
            className="btn btn-neutral"
            onClick={onClose}
            style={{ width: 'auto', fontSize: '0.88rem', margin: 0 }}
          >
            Close Evaluation
          </button>
        </div>
      </div>
    </div>
  );
};

export default GradeSubmissionsModal;
