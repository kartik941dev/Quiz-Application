import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { Search, Filter, BookOpen, Plus, Check, Trash2, X } from 'lucide-react';

const QuestionBankModal = ({ isOpen, onClose, onImportQuestions }) => {
  const [questions, setQuestions] = useState([]);
  const [topics, setTopics] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedIds, setSelectedIds] = useState(new Set());

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTopic, setSelectedTopic] = useState('all');
  const [selectedDifficulty, setSelectedDifficulty] = useState('all');
  const [selectedType, setSelectedType] = useState('all');

  useEffect(() => {
    if (isOpen) {
      fetchTopics();
      fetchQuestions();
      setSelectedIds(new Set());
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        fetchQuestions();
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [searchTerm, selectedTopic, selectedDifficulty, selectedType]);

  const fetchTopics = async () => {
    try {
      const res = await api.get('/question-bank/topics');
      setTopics(res.data.topics || []);
    } catch (err) {
      console.error('Failed to load topics', err);
    }
  };

  const fetchQuestions = async () => {
    try {
      setLoading(true);
      const params = {};
      if (searchTerm.trim()) params.search = searchTerm.trim();
      if (selectedTopic !== 'all') params.topic = selectedTopic;
      if (selectedDifficulty !== 'all') params.difficulty = selectedDifficulty;
      if (selectedType !== 'all') params.type = selectedType;

      const res = await api.get('/question-bank', { params });
      setQuestions(res.data.questions || []);
    } catch (err) {
      console.error('Failed to fetch question bank', err);
    } finally {
      setLoading(false);
    }
  };

  const toggleSelect = (id) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSelectAll = () => {
    if (selectedIds.size === questions.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(questions.map(q => q._id)));
    }
  };

  const handleImport = () => {
    const selectedQuestions = questions.filter(q => selectedIds.has(q._id));
    if (selectedQuestions.length > 0) {
      onImportQuestions(selectedQuestions);
      onClose();
    }
  };

  const handleDeleteFromBank = async (id, e) => {
    e.stopPropagation();
    if (!window.confirm('Delete this question from your Question Bank?')) return;
    try {
      await api.delete(`/question-bank/${id}`);
      setQuestions(prev => prev.filter(q => q._id !== id));
      setSelectedIds(prev => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      fetchTopics();
    } catch (err) {
      alert('Failed to delete question');
    }
  };

  if (!isOpen) return null;

  return (
    <div
      role="presentation"
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(15, 23, 42, 0.6)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10000,
        padding: '1.5rem'
      }}
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        className="glass-card"
        style={{
          maxWidth: '900px',
          width: '100%',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          padding: '2rem',
          background: '#ffffff',
          overflow: 'hidden'
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', paddingBottom: '1rem', borderBottom: '1px solid var(--border-subtle)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ padding: '0.5rem', borderRadius: '8px', background: 'var(--primary-subtle)', color: 'var(--primary)', display: 'flex' }}>
              <BookOpen size={20} />
            </div>
            <div>
              <h3 style={{ margin: 0, color: 'var(--text-main)', fontSize: '1.35rem' }}>Centralized Question Bank</h3>
              <p style={{ margin: '0.2rem 0 0 0', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                Browse, filter, and import reusable questions directly into your quiz
              </p>
            </div>
          </div>
          <button type="button" onClick={onClose} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex' }}>
            <X size={20} />
          </button>
        </div>

        {/* Filter Controls Bar */}
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', gap: '0.75rem', marginBottom: '1.25rem' }}>
          <div style={{ position: 'relative' }}>
            <Search size={16} style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              type="text"
              className="form-control"
              placeholder="Search questions or tags..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              style={{ paddingLeft: '2.5rem' }}
            />
          </div>

          <select className="form-control" value={selectedTopic} onChange={e => setSelectedTopic(e.target.value)}>
            <option value="all">All Topics</option>
            {topics.map((t, idx) => (
              <option key={idx} value={t.name}>{t.name} ({t.count})</option>
            ))}
          </select>

          <select className="form-control" value={selectedDifficulty} onChange={e => setSelectedDifficulty(e.target.value)}>
            <option value="all">All Difficulties</option>
            <option value="easy">Easy</option>
            <option value="medium">Medium</option>
            <option value="hard">Hard</option>
          </select>

          <select className="form-control" value={selectedType} onChange={e => setSelectedType(e.target.value)}>
            <option value="all">All Types</option>
            <option value="single_choice">Single Choice</option>
            <option value="multiple_choice">Multiple Choice</option>
            <option value="true_false">True / False</option>
            <option value="fill_in_the_blank">Fill in Blank</option>
            <option value="essay_code">Code / Essay</option>
          </select>
        </div>

        {/* Selection Bar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
          <div>
            Showing <strong>{questions.length}</strong> questions ({selectedIds.size} selected)
          </div>
          {questions.length > 0 && (
            <button
              type="button"
              onClick={handleSelectAll}
              style={{ background: 'transparent', border: 'none', color: 'var(--primary)', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem' }}
            >
              {selectedIds.size === questions.length ? 'Deselect All' : 'Select All'}
            </button>
          )}
        </div>

        {/* Question Cards List */}
        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.75rem', paddingRight: '0.25rem', marginBottom: '1.5rem' }}>
          {loading ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>Searching Question Bank...</div>
          ) : questions.length === 0 ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
              No questions found matching the selected filters.
            </div>
          ) : (
            questions.map(q => {
              const isSelected = selectedIds.has(q._id);
              const typeLabels = {
                single_choice: 'Single Choice',
                multiple_choice: 'Multiple Choice',
                true_false: 'True/False',
                fill_in_the_blank: 'Fill in Blank',
                essay_code: `Code (${q.codeLanguage || 'General'})`
              };

              return (
                <div
                  key={q._id}
                  onClick={() => toggleSelect(q._id)}
                  style={{
                    padding: '1rem 1.25rem',
                    borderRadius: 'var(--radius-md)',
                    border: isSelected ? '2px solid var(--primary)' : '1px solid var(--border-subtle)',
                    background: isSelected ? 'var(--primary-subtle)' : 'var(--bg-card-subtle)',
                    cursor: 'pointer',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    gap: '1rem',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start', flex: 1 }}>
                    <div style={{
                      width: '20px',
                      height: '20px',
                      borderRadius: '4px',
                      border: isSelected ? '1px solid var(--primary)' : '1px solid #cbd5e1',
                      background: isSelected ? 'var(--primary)' : '#ffffff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#ffffff',
                      marginTop: '2px'
                    }}>
                      {isSelected && <Check size={14} />}
                    </div>

                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap', marginBottom: '0.35rem' }}>
                        <span style={{ fontSize: '0.75rem', padding: '2px 6px', borderRadius: '4px', background: '#e0f2fe', color: '#0369a1', fontWeight: 600 }}>
                          {typeLabels[q.type] || 'Single Choice'}
                        </span>
                        <span style={{ fontSize: '0.75rem', padding: '2px 6px', borderRadius: '4px', background: '#f1f5f9', color: 'var(--text-muted)', fontWeight: 600 }}>
                          {q.topic || 'General'}
                        </span>
                        <span style={{ fontSize: '0.75rem', padding: '2px 6px', borderRadius: '4px', background: q.difficulty === 'hard' ? '#fee2e2' : (q.difficulty === 'easy' ? '#dcfce7' : '#fef3c7'), color: q.difficulty === 'hard' ? '#dc2626' : (q.difficulty === 'easy' ? '#16a34a' : '#d97706'), fontWeight: 600, textTransform: 'capitalize' }}>
                          {q.difficulty || 'medium'}
                        </span>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          {q.marks || 1} M • {q.timeLimit || 30}s
                        </span>
                      </div>

                      <p style={{ margin: 0, color: 'var(--text-main)', fontSize: '0.95rem', fontWeight: 500, lineHeight: 1.4 }}>
                        {q.text}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={(e) => handleDeleteFromBank(q._id, e)}
                    style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '4px' }}
                    title="Delete from Bank"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              );
            })
          )}
        </div>

        {/* Modal Actions Footer */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', borderTop: '1px solid var(--border-subtle)', paddingTop: '1rem' }}>
          <button type="button" className="btn btn-neutral" onClick={onClose} style={{ width: 'auto' }}>
            Cancel
          </button>
          <button
            type="button"
            className="btn"
            onClick={handleImport}
            disabled={selectedIds.size === 0}
            style={{ width: 'auto', padding: '0.65rem 1.5rem', fontWeight: 600 }}
          >
            <Plus size={16} /> Import ({selectedIds.size}) Questions
          </button>
        </div>
      </div>
    </div>
  );
};

export default QuestionBankModal;
