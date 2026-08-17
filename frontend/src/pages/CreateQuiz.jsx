import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import api from '../services/api';
import QuestionBankModal from '../components/QuestionBankModal';
import { BookOpen, Plus, Trash2, Shuffle, CheckSquare, AlignLeft, ToggleLeft, Code, Radio } from 'lucide-react';

const CreateQuiz = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams();
  const isEditMode = Boolean(id);

  const [title, setTitle] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [progressionMode, setProgressionMode] = useState('auto_timer');
  const [allowReattempt, setAllowReattempt] = useState(false);
  const [showLeaderboard, setShowLeaderboard] = useState(true);
  const [leaderboardInterval, setLeaderboardInterval] = useState(1);
  const [shuffleQuestions, setShuffleQuestions] = useState(true);
  const [shuffleOptions, setShuffleOptions] = useState(true);
  const [negativeEnabled, setNegativeEnabled] = useState(false);
  const [saveToQuestionBank, setSaveToQuestionBank] = useState(false);

  const [questions, setQuestions] = useState([
    {
      text: '',
      type: 'single_choice',
      options: ['', '', '', ''],
      correctOptionIndex: 0,
      correctOptionIndices: [0],
      acceptedAnswers: [''],
      codeLanguage: 'javascript',
      topic: 'General',
      difficulty: 'medium',
      timeLimit: 30,
      explanation: '',
      marks: 1,
      negativeMarks: 0
    }
  ]);

  const [statusMsg, setStatusMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isBankModalOpen, setIsBankModalOpen] = useState(false);
  const formRef = useRef(null);

  // Load Quiz Data for Edit Mode or Duplicate Mode
  useEffect(() => {
    if (isEditMode) {
      const fetchQuizForEdit = async () => {
        setIsLoading(true);
        try {
          const res = await api.get(`/quiz/${id}/full`);
          const fullQuiz = res.data.quiz;
          setTitle(fullQuiz.title);
          setJoinCode(fullQuiz.joinCode);
          setProgressionMode(fullQuiz.progressionMode || 'auto_timer');
          setAllowReattempt(Boolean(fullQuiz.allowReattempt));
          setShowLeaderboard(fullQuiz.showLeaderboard !== false);
          setLeaderboardInterval(fullQuiz.leaderboardInterval || 1);
          setShuffleQuestions(fullQuiz.shuffleQuestions !== false);
          setShuffleOptions(fullQuiz.shuffleOptions !== false);
          setNegativeEnabled(Boolean(fullQuiz.negativeMarkingEnabled));
          if (fullQuiz.questions && fullQuiz.questions.length > 0) {
            setQuestions(fullQuiz.questions.map(q => ({
              text: q.text,
              type: q.type || 'single_choice',
              options: q.options || (q.type === 'true_false' ? ['True', 'False'] : ['', '', '', '']),
              correctOptionIndex: q.correctOptionIndex || 0,
              correctOptionIndices: q.correctOptionIndices && q.correctOptionIndices.length > 0 ? q.correctOptionIndices : [0],
              acceptedAnswers: q.acceptedAnswers && q.acceptedAnswers.length > 0 ? q.acceptedAnswers : [''],
              codeLanguage: q.codeLanguage || 'javascript',
              topic: q.topic || 'General',
              difficulty: q.difficulty || 'medium',
              timeLimit: q.timeLimit || 30,
              explanation: q.explanation || '',
              marks: q.marks || 1,
              negativeMarks: q.negativeMarks || 0
            })));
          }
        } catch (err) {
          setStatusMsg(`❌ Error loading quiz for edit: ${err.response?.data?.message || err.message}`);
        } finally {
          setIsLoading(false);
        }
      };
      fetchQuizForEdit();
    } else if (location.state?.duplicateQuiz) {
      const fullQuiz = location.state.duplicateQuiz;
      setTitle(`${fullQuiz.title} (Copy)`);
      setProgressionMode(fullQuiz.progressionMode || 'auto_timer');
      setAllowReattempt(Boolean(fullQuiz.allowReattempt));
      setShowLeaderboard(fullQuiz.showLeaderboard !== false);
      setLeaderboardInterval(fullQuiz.leaderboardInterval || 1);
      setShuffleQuestions(fullQuiz.shuffleQuestions !== false);
      setShuffleOptions(fullQuiz.shuffleOptions !== false);
      setNegativeEnabled(Boolean(fullQuiz.negativeMarkingEnabled));
      setQuestions(fullQuiz.questions.map(q => ({
        text: q.text,
        type: q.type || 'single_choice',
        options: q.options || (q.type === 'true_false' ? ['True', 'False'] : ['', '', '', '']),
        correctOptionIndex: q.correctOptionIndex || 0,
        correctOptionIndices: q.correctOptionIndices || [0],
        acceptedAnswers: q.acceptedAnswers || [''],
        codeLanguage: q.codeLanguage || 'javascript',
        topic: q.topic || 'General',
        difficulty: q.difficulty || 'medium',
        timeLimit: q.timeLimit || 30,
        explanation: q.explanation || '',
        marks: q.marks || 1,
        negativeMarks: q.negativeMarks || 0
      })));
      setStatusMsg('📋 Quiz data loaded from copy. You can make adjustments and save.');
    }
  }, [id, isEditMode, location.state]);

  const handleQuestionChange = (index, field, value) => {
    const newQuestions = [...questions];
    newQuestions[index][field] = value;
    setQuestions(newQuestions);
  };

  const handleTypeChange = (index, newType) => {
    const newQuestions = [...questions];
    newQuestions[index].type = newType;
    if (newType === 'true_false') {
      newQuestions[index].options = ['True', 'False'];
      newQuestions[index].correctOptionIndex = 0;
    } else if (newType === 'fill_in_the_blank') {
      if (!newQuestions[index].acceptedAnswers || newQuestions[index].acceptedAnswers.length === 0) {
        newQuestions[index].acceptedAnswers = [''];
      }
    } else if (newType === 'multiple_choice') {
      if (!newQuestions[index].options || newQuestions[index].options.length < 2) {
        newQuestions[index].options = ['', '', '', ''];
      }
      if (!newQuestions[index].correctOptionIndices || newQuestions[index].correctOptionIndices.length === 0) {
        newQuestions[index].correctOptionIndices = [0];
      }
    } else if (newType === 'single_choice') {
      if (!newQuestions[index].options || newQuestions[index].options.length < 2) {
        newQuestions[index].options = ['', '', '', ''];
      }
    }
    setQuestions(newQuestions);
  };

  const handleOptionChange = (qIndex, optIndex, value) => {
    const newQuestions = [...questions];
    newQuestions[qIndex].options[optIndex] = value;
    setQuestions(newQuestions);
  };

  const addOption = (qIndex) => {
    const newQuestions = [...questions];
    if (newQuestions[qIndex].options.length < 6) {
      newQuestions[qIndex].options.push('');
      setQuestions(newQuestions);
    }
  };

  const removeOption = (qIndex, optIndex) => {
    const newQuestions = [...questions];
    if (newQuestions[qIndex].options.length > 2) {
      newQuestions[qIndex].options.splice(optIndex, 1);
      // Remap correct option index if out of bounds
      if (newQuestions[qIndex].correctOptionIndex >= newQuestions[qIndex].options.length) {
        newQuestions[qIndex].correctOptionIndex = 0;
      }
      newQuestions[qIndex].correctOptionIndices = newQuestions[qIndex].correctOptionIndices
        .filter(i => i !== optIndex)
        .map(i => (i > optIndex ? i - 1 : i));
      setQuestions(newQuestions);
    }
  };

  const toggleMultiCorrect = (qIndex, optIndex) => {
    const newQuestions = [...questions];
    const indices = new Set(newQuestions[qIndex].correctOptionIndices || []);
    if (indices.has(optIndex)) {
      if (indices.size > 1) indices.delete(optIndex);
    } else {
      indices.add(optIndex);
    }
    newQuestions[qIndex].correctOptionIndices = Array.from(indices);
    setQuestions(newQuestions);
  };

  const handleAcceptedAnswerChange = (qIndex, aIndex, value) => {
    const newQuestions = [...questions];
    newQuestions[qIndex].acceptedAnswers[aIndex] = value;
    setQuestions(newQuestions);
  };

  const addAcceptedAnswer = (qIndex) => {
    const newQuestions = [...questions];
    newQuestions[qIndex].acceptedAnswers.push('');
    setQuestions(newQuestions);
  };

  const removeAcceptedAnswer = (qIndex, aIndex) => {
    const newQuestions = [...questions];
    if (newQuestions[qIndex].acceptedAnswers.length > 1) {
      newQuestions[qIndex].acceptedAnswers.splice(aIndex, 1);
      setQuestions(newQuestions);
    }
  };

  const addQuestion = (customData = null) => {
    const newQ = customData ? {
      text: customData.text || '',
      type: customData.type || 'single_choice',
      options: customData.options || ['', '', '', ''],
      correctOptionIndex: customData.correctOptionIndex || 0,
      correctOptionIndices: customData.correctOptionIndices || [0],
      acceptedAnswers: customData.acceptedAnswers || [''],
      codeLanguage: customData.codeLanguage || 'javascript',
      topic: customData.topic || 'General',
      difficulty: customData.difficulty || 'medium',
      timeLimit: customData.timeLimit || 30,
      explanation: customData.explanation || '',
      marks: customData.marks || 1,
      negativeMarks: customData.negativeMarks || 0
    } : {
      text: '',
      type: 'single_choice',
      options: ['', '', '', ''],
      correctOptionIndex: 0,
      correctOptionIndices: [0],
      acceptedAnswers: [''],
      codeLanguage: 'javascript',
      topic: 'General',
      difficulty: 'medium',
      timeLimit: 30,
      explanation: '',
      marks: 1,
      negativeMarks: 0
    };

    setQuestions(prev => [...prev, newQ]);
  };

  const removeQuestion = (index) => {
    setQuestions(prev => prev.filter((_, i) => i !== index));
  };

  const handleImportFromBank = (imported) => {
    const formatted = imported.map(q => ({
      text: q.text,
      type: q.type || 'single_choice',
      options: q.options || (q.type === 'true_false' ? ['True', 'False'] : ['', '', '', '']),
      correctOptionIndex: q.correctOptionIndex || 0,
      correctOptionIndices: q.correctOptionIndices || [0],
      acceptedAnswers: q.acceptedAnswers || [''],
      codeLanguage: q.codeLanguage || 'javascript',
      topic: q.topic || 'General',
      difficulty: q.difficulty || 'medium',
      timeLimit: q.timeLimit || 30,
      explanation: q.explanation || '',
      marks: q.marks || 1,
      negativeMarks: q.negativeMarks || 0
    }));

    // If only one empty question, replace it
    if (questions.length === 1 && !questions[0].text.trim()) {
      setQuestions(formatted);
    } else {
      setQuestions(prev => [...prev, ...formatted]);
    }

    setStatusMsg(`✓ Imported ${imported.length} questions from Question Bank.`);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setStatusMsg('');

    try {
      const payload = {
        title,
        progressionMode,
        allowReattempt,
        showLeaderboard,
        leaderboardInterval: Number(leaderboardInterval),
        shuffleQuestions,
        shuffleOptions,
        negativeMarkingEnabled: negativeEnabled,
        saveToQuestionBank,
        questions: questions.map(q => ({
          ...q,
          type: q.type || 'single_choice',
          correctOptionIndex: Number(q.correctOptionIndex),
          correctOptionIndices: Array.isArray(q.correctOptionIndices) ? q.correctOptionIndices.map(Number) : [],
          acceptedAnswers: Array.isArray(q.acceptedAnswers) ? q.acceptedAnswers.filter(a => a.trim()) : [],
          timeLimit: Number(q.timeLimit),
          marks: Number(q.marks),
          negativeMarks: Number(q.negativeMarks)
        }))
      };

      if (isEditMode) {
        await api.put(`/quiz/${id}`, payload);
        setStatusMsg(`✅ Success! Quiz "${title}" updated successfully.`);
      } else {
        const res = await api.post('/quiz', payload);
        setStatusMsg(`✅ Success! Quiz "${res.data.quiz.title}" created. Join Code: ${res.data.quiz.joinCode}`);
      }
      
      window.scrollTo({ top: 0, behavior: 'smooth' });
      setTimeout(() => {
        navigate('/teacher-dashboard');
      }, 1400);
    } catch (err) {
      const errorMsg = err.response?.data?.message || err.message || (isEditMode ? 'Failed to update quiz.' : 'Failed to create quiz.');
      setStatusMsg(`❌ Error: ${errorMsg}`);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="dashboard" style={{ padding: '2rem' }}>
      
      {/* Top Header */}
      <div style={{ maxWidth: '920px', margin: '0 auto 1.5rem auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <h2 style={{ margin: 0, color: 'var(--text-main)', fontSize: '1.75rem' }}>
              {isEditMode ? 'Edit Quiz' : 'Create Quiz'}
            </h2>
            {isEditMode && joinCode && (
              <span style={{
                fontSize: '0.85rem',
                color: 'var(--primary)',
                background: 'var(--primary-subtle)',
                padding: '2px 8px',
                borderRadius: '4px',
                border: '1px solid var(--primary-border)',
                fontFamily: 'monospace',
                letterSpacing: '1.5px',
                fontWeight: 700
              }}>
                Code: {joinCode}
              </span>
            )}
          </div>
          <p style={{ margin: '0.25rem 0 0 0', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            {isEditMode 
              ? 'Modify questions, time limits, scoring, and student reattempt settings' 
              : 'Advanced Question Engineering • Multiple question formats & reusable bank'}
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button
            type="button"
            className="btn btn-neutral"
            onClick={() => setIsBankModalOpen(true)}
            style={{ width: 'auto', padding: '0.6rem 1.1rem', fontSize: '0.88rem', fontWeight: 600 }}
          >
            <BookOpen size={16} /> Question Bank
          </button>

          <button 
            type="button" 
            className="btn btn-neutral" 
            onClick={() => navigate('/teacher-dashboard')}
            style={{ width: 'auto', padding: '0.6rem 1.1rem', fontSize: '0.88rem' }}
          >
            ← Back
          </button>
        </div>
      </div>

      <div className="glass-card" ref={formRef} style={{ maxWidth: '920px', margin: '0 auto', width: '100%' }}>
        {statusMsg && (
          <div style={{ 
            padding: '1rem', 
            marginBottom: '1.5rem', 
            borderRadius: 'var(--radius-md)', 
            background: statusMsg.startsWith('✅') || statusMsg.startsWith('📋') || statusMsg.startsWith('✓') ? 'var(--status-success-bg)' : 'var(--status-error-bg)', 
            color: statusMsg.startsWith('✅') || statusMsg.startsWith('📋') || statusMsg.startsWith('✓') ? 'var(--status-success-text)' : 'var(--status-error-text)', 
            border: `1px solid ${statusMsg.startsWith('✅') || statusMsg.startsWith('📋') || statusMsg.startsWith('✓') ? 'var(--status-success-border)' : 'var(--status-error-border)'}` 
          }}>
            {statusMsg}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          
          {/* Main Quiz Settings */}
          <div style={{ display: 'grid', gridTemplateColumns: '1.7fr 1.3fr 1fr', gap: '1.25rem', marginBottom: '1.5rem' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '0.4rem', fontWeight: 600, fontSize: '0.88rem', color: 'var(--text-main)' }}>Quiz Title</label>
              <input
                type="text"
                className="form-control"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                placeholder="e.g. Comprehensive Physics & Algorithms"
              />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '0.4rem', fontWeight: 600, fontSize: '0.88rem', color: 'var(--text-main)' }}>
                Progression Mode
              </label>
              <select
                className="form-control"
                value={progressionMode}
                onChange={e => setProgressionMode(e.target.value)}
                style={{ fontWeight: 600 }}
              >
                <option value="auto_timer">⏱️ Auto on Time-Up</option>
                <option value="manual">👨‍🏫 Teacher-Led Manual</option>
                <option value="self_paced">🏃 Student Self-Paced</option>
              </select>
              <small style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                {progressionMode === 'auto_timer' ? 'Advances when timer reaches 0' : (progressionMode === 'manual' ? 'Teacher clicks Next manually' : 'Student navigates freely')}
              </small>
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '0.4rem', fontWeight: 600, fontSize: '0.88rem', color: showLeaderboard ? 'var(--text-main)' : 'var(--text-muted)' }}>
                Leaderboard Interval {showLeaderboard ? '' : '(Off)'}
              </label>
              <input
                type="number"
                min="1"
                className="form-control"
                value={leaderboardInterval}
                onChange={(e) => setLeaderboardInterval(e.target.value)}
                disabled={!showLeaderboard}
                required={showLeaderboard}
                style={{ opacity: showLeaderboard ? 1 : 0.6 }}
              />
              <small style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                {showLeaderboard ? 'Every N questions' : 'Leaderboard OFF'}
              </small>
            </div>
          </div>

          {/* Exam Configurations & Options */}
          <div style={{ background: 'var(--bg-card-subtle)', padding: '1.25rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)', marginBottom: '1.75rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
            
            {/* Live Leaderboard ON/OFF */}
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', cursor: 'pointer', margin: 0 }}>
              <input
                type="checkbox"
                checked={showLeaderboard}
                onChange={e => setShowLeaderboard(e.target.checked)}
                style={{ width: '18px', height: '18px', accentColor: 'var(--primary)', cursor: 'pointer' }}
              />
              <span style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-main)' }}>
                🏆 Live Leaderboard: {showLeaderboard ? 'ON' : 'OFF'}
              </span>
            </label>

            {/* Allow Reattempts Toggle */}
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', cursor: 'pointer', margin: 0 }}>
              <input
                type="checkbox"
                checked={allowReattempt}
                onChange={e => setAllowReattempt(e.target.checked)}
                style={{ width: '18px', height: '18px', accentColor: 'var(--primary)', cursor: 'pointer' }}
              />
              <span style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-main)' }}>
                🔄 Allow Student Reattempts
              </span>
            </label>

            {/* Shuffling Options */}
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', cursor: 'pointer', margin: 0 }}>
              <input
                type="checkbox"
                checked={shuffleQuestions}
                onChange={e => setShuffleQuestions(e.target.checked)}
                style={{ width: '18px', height: '18px', accentColor: 'var(--primary)', cursor: 'pointer' }}
              />
              <span style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-main)' }}>
                🔀 Shuffle Questions
              </span>
            </label>

            <label style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', cursor: 'pointer', margin: 0 }}>
              <input
                type="checkbox"
                checked={shuffleOptions}
                onChange={e => setShuffleOptions(e.target.checked)}
                style={{ width: '18px', height: '18px', accentColor: 'var(--primary)', cursor: 'pointer' }}
              />
              <span style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-main)' }}>
                🔀 Shuffle Option Choices
              </span>
            </label>

            <label style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', cursor: 'pointer', margin: 0 }}>
              <input
                type="checkbox"
                checked={negativeEnabled}
                onChange={e => setNegativeEnabled(e.target.checked)}
                style={{ width: '18px', height: '18px', accentColor: '#dc2626', cursor: 'pointer' }}
              />
              <span style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-main)' }}>
                ⚠️ Negative Marking
              </span>
            </label>

            <label style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', cursor: 'pointer', margin: 0 }}>
              <input
                type="checkbox"
                checked={saveToQuestionBank}
                onChange={e => setSaveToQuestionBank(e.target.checked)}
                style={{ width: '18px', height: '18px', accentColor: 'var(--primary)', cursor: 'pointer' }}
              />
              <span style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-main)' }}>
                📚 Save to Question Bank
              </span>
            </label>
          </div>

          {/* Questions Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.75rem', marginBottom: '1.5rem' }}>
            <h3 style={{ margin: 0, color: 'var(--text-main)', fontSize: '1.25rem' }}>
              Questions ({questions.length})
            </h3>
            <button
              type="button"
              className="btn btn-neutral"
              onClick={() => setIsBankModalOpen(true)}
              style={{ width: 'auto', padding: '0.4rem 0.85rem', fontSize: '0.82rem', fontWeight: 600 }}
            >
              <BookOpen size={14} /> Import from Bank
            </button>
          </div>
          
          {/* Questions List */}
          {questions.map((q, qIndex) => (
            <div key={qIndex} style={{ background: 'var(--bg-card-subtle)', padding: '1.5rem', borderRadius: 'var(--radius-md)', marginBottom: '1.5rem', border: '1px solid var(--border-subtle)' }}>
              
              {/* Question Header & Format Selector */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <strong style={{ color: 'var(--primary)', fontSize: '1.1rem' }}>
                    Q{qIndex + 1}
                  </strong>
                  
                  {/* Format Selector */}
                  <select
                    className="form-control"
                    value={q.type || 'single_choice'}
                    onChange={e => handleTypeChange(qIndex, e.target.value)}
                    style={{ width: 'auto', padding: '0.4rem 2rem 0.4rem 0.75rem', fontSize: '0.85rem', fontWeight: 600 }}
                  >
                    <option value="single_choice">Radio (Single Choice)</option>
                    <option value="multiple_choice">Checkboxes (Multiple Choice)</option>
                    <option value="true_false">True / False</option>
                    <option value="fill_in_the_blank">Fill in the Blank</option>
                    <option value="essay_code">Code / Essay</option>
                  </select>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  {/* Topic & Difficulty */}
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Topic (e.g. Physics)"
                    value={q.topic || ''}
                    onChange={e => handleQuestionChange(qIndex, 'topic', e.target.value)}
                    style={{ width: '130px', padding: '0.35rem 0.65rem', fontSize: '0.8rem' }}
                  />

                  <select
                    className="form-control"
                    value={q.difficulty || 'medium'}
                    onChange={e => handleQuestionChange(qIndex, 'difficulty', e.target.value)}
                    style={{ width: '100px', padding: '0.35rem 1.8rem 0.35rem 0.5rem', fontSize: '0.8rem' }}
                  >
                    <option value="easy">Easy</option>
                    <option value="medium">Medium</option>
                    <option value="hard">Hard</option>
                  </select>

                  {questions.length > 1 && (
                    <button 
                      type="button" 
                      onClick={() => removeQuestion(qIndex)} 
                      style={{ background: 'transparent', border: 'none', color: '#dc2626', cursor: 'pointer', padding: '4px', display: 'flex' }}
                      title="Remove Question"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              </div>

              {/* Question Text */}
              <div className="form-group" style={{ marginBottom: '1rem' }}>
                <input
                  type="text"
                  className="form-control"
                  value={q.text}
                  onChange={(e) => handleQuestionChange(qIndex, 'text', e.target.value)}
                  required
                  placeholder="Enter question prompt..."
                  style={{ fontSize: '0.98rem', fontWeight: 500 }}
                />
              </div>

              {/* Dynamic Type-Specific Inputs */}
              
              {/* 1. Single Choice (Radio) */}
              {q.type === 'single_choice' && (
                <div style={{ marginBottom: '1rem' }}>
                  <label style={{ display: 'block', fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
                    Select the radio button next to the single correct answer:
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                    {q.options.map((opt, oIndex) => (
                      <div key={oIndex} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <input
                          type="radio"
                          name={`correct-${qIndex}`}
                          checked={q.correctOptionIndex === oIndex}
                          onChange={() => handleQuestionChange(qIndex, 'correctOptionIndex', oIndex)}
                          required
                          style={{ cursor: 'pointer', width: '18px', height: '18px', accentColor: 'var(--primary)' }}
                        />
                        <input
                          type="text"
                          className="form-control"
                          value={opt}
                          onChange={(e) => handleOptionChange(qIndex, oIndex, e.target.value)}
                          required
                          placeholder={`Option ${oIndex + 1}`}
                          style={{ padding: '0.5rem 0.75rem', fontSize: '0.9rem' }}
                        />
                        {q.options.length > 2 && (
                          <button type="button" onClick={() => removeOption(qIndex, oIndex)} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>×</button>
                        )}
                      </div>
                    ))}
                  </div>
                  {q.options.length < 6 && (
                    <button type="button" onClick={() => addOption(qIndex)} style={{ marginTop: '0.5rem', background: 'transparent', border: 'none', color: 'var(--primary)', cursor: 'pointer', fontSize: '0.82rem', fontWeight: 600 }}>
                      + Add Option Choice
                    </button>
                  )}
                </div>
              )}

              {/* 2. Multiple Choice (Checkboxes) */}
              {q.type === 'multiple_choice' && (
                <div style={{ marginBottom: '1rem' }}>
                  <label style={{ display: 'block', fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
                    Check all boxes that are correct answers:
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                    {q.options.map((opt, oIndex) => {
                      const isChecked = (q.correctOptionIndices || []).includes(oIndex);
                      return (
                        <div key={oIndex} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => toggleMultiCorrect(qIndex, oIndex)}
                            style={{ cursor: 'pointer', width: '18px', height: '18px', accentColor: 'var(--primary)' }}
                          />
                          <input
                            type="text"
                            className="form-control"
                            value={opt}
                            onChange={(e) => handleOptionChange(qIndex, oIndex, e.target.value)}
                            required
                            placeholder={`Option ${oIndex + 1}`}
                            style={{ padding: '0.5rem 0.75rem', fontSize: '0.9rem' }}
                          />
                          {q.options.length > 2 && (
                            <button type="button" onClick={() => removeOption(qIndex, oIndex)} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>×</button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  {q.options.length < 6 && (
                    <button type="button" onClick={() => addOption(qIndex)} style={{ marginTop: '0.5rem', background: 'transparent', border: 'none', color: 'var(--primary)', cursor: 'pointer', fontSize: '0.82rem', fontWeight: 600 }}>
                      + Add Option Choice
                    </button>
                  )}
                </div>
              )}

              {/* 3. True / False */}
              {q.type === 'true_false' && (
                <div style={{ marginBottom: '1rem' }}>
                  <label style={{ display: 'block', fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
                    Select the correct answer:
                  </label>
                  <div style={{ display: 'flex', gap: '1rem' }}>
                    <button
                      type="button"
                      onClick={() => handleQuestionChange(qIndex, 'correctOptionIndex', 0)}
                      style={{
                        padding: '0.65rem 1.5rem',
                        borderRadius: 'var(--radius-md)',
                        border: q.correctOptionIndex === 0 ? '2px solid var(--primary)' : '1px solid var(--border-subtle)',
                        background: q.correctOptionIndex === 0 ? 'var(--primary-subtle)' : '#ffffff',
                        color: q.correctOptionIndex === 0 ? 'var(--primary)' : 'var(--text-main)',
                        fontWeight: 700,
                        cursor: 'pointer'
                      }}
                    >
                      True
                    </button>
                    <button
                      type="button"
                      onClick={() => handleQuestionChange(qIndex, 'correctOptionIndex', 1)}
                      style={{
                        padding: '0.65rem 1.5rem',
                        borderRadius: 'var(--radius-md)',
                        border: q.correctOptionIndex === 1 ? '2px solid var(--primary)' : '1px solid var(--border-subtle)',
                        background: q.correctOptionIndex === 1 ? 'var(--primary-subtle)' : '#ffffff',
                        color: q.correctOptionIndex === 1 ? 'var(--primary)' : 'var(--text-main)',
                        fontWeight: 700,
                        cursor: 'pointer'
                      }}
                    >
                      False
                    </button>
                  </div>
                </div>
              )}

              {/* 4. Fill in the Blank */}
              {q.type === 'fill_in_the_blank' && (
                <div style={{ marginBottom: '1rem' }}>
                  <label style={{ display: 'block', fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
                    Accepted Answers (Graded case-insensitively):
                  </label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {(q.acceptedAnswers || ['']).map((ans, aIndex) => (
                      <div key={aIndex} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                        <input
                          type="text"
                          className="form-control"
                          value={ans}
                          onChange={e => handleAcceptedAnswerChange(qIndex, aIndex, e.target.value)}
                          placeholder={`Accepted variation ${aIndex + 1} (e.g. "Paris", "paris")`}
                          required
                          style={{ maxWidth: '400px' }}
                        />
                        {q.acceptedAnswers.length > 1 && (
                          <button type="button" onClick={() => removeAcceptedAnswer(qIndex, aIndex)} style={{ background: 'transparent', border: 'none', color: '#dc2626', cursor: 'pointer' }}>×</button>
                        )}
                      </div>
                    ))}
                  </div>
                  <button type="button" onClick={() => addAcceptedAnswer(qIndex)} style={{ marginTop: '0.5rem', background: 'transparent', border: 'none', color: 'var(--primary)', cursor: 'pointer', fontSize: '0.82rem', fontWeight: 600 }}>
                    + Add Alternate Spelling / Variation
                  </button>
                </div>
              )}

              {/* 5. Code / Short Essay */}
              {q.type === 'essay_code' && (
                <div style={{ marginBottom: '1rem' }}>
                  <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginBottom: '0.5rem' }}>
                    <label style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: 0 }}>
                      Code / Essay Language:
                    </label>
                    <select
                      className="form-control"
                      value={q.codeLanguage || 'javascript'}
                      onChange={e => handleQuestionChange(qIndex, 'codeLanguage', e.target.value)}
                      style={{ width: 'auto', padding: '0.25rem 1.8rem 0.25rem 0.5rem', fontSize: '0.8rem' }}
                    >
                      <option value="javascript">JavaScript / TypeScript</option>
                      <option value="python">Python</option>
                      <option value="cpp">C / C++</option>
                      <option value="java">Java</option>
                      <option value="sql">SQL Database</option>
                      <option value="general">General Essay / Text</option>
                    </select>
                  </div>
                </div>
              )}

              {/* Marks & Time Limit Row */}
              <div style={{ display: 'flex', gap: '1.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
                <div style={{ width: '130px' }}>
                  <label style={{ display: 'block', fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '0.3rem' }}>Marks (+)</label>
                  <input
                    type="number"
                    min="1"
                    className="form-control"
                    value={q.marks}
                    onChange={(e) => handleQuestionChange(qIndex, 'marks', e.target.value)}
                    required
                  />
                </div>

                {negativeEnabled && (
                  <div style={{ width: '130px' }}>
                    <label style={{ display: 'block', fontSize: '0.82rem', color: '#dc2626', marginBottom: '0.3rem' }}>Negative (-)</label>
                    <input
                      type="number"
                      min="0"
                      step="0.25"
                      className="form-control"
                      value={q.negativeMarks}
                      onChange={(e) => handleQuestionChange(qIndex, 'negativeMarks', e.target.value)}
                      required
                      style={{ color: '#dc2626' }}
                    />
                  </div>
                )}

                <div style={{ width: '160px' }}>
                  <label style={{ display: 'block', fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '0.3rem' }}>Time Limit (Seconds)</label>
                  <input
                    type="number"
                    min="5"
                    className="form-control"
                    value={q.timeLimit}
                    onChange={(e) => handleQuestionChange(qIndex, 'timeLimit', e.target.value)}
                    required
                  />
                </div>
              </div>

              {/* Explanation */}
              <div style={{ marginBottom: 0 }}>
                <label style={{ display: 'block', fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '0.3rem' }}>Explanation (Optional, shown in results)</label>
                <textarea
                  className="form-control"
                  value={q.explanation || ''}
                  onChange={(e) => handleQuestionChange(qIndex, 'explanation', e.target.value)}
                  placeholder="Explain why the answer is correct..."
                  rows="2"
                  style={{ resize: 'vertical' }}
                />
              </div>
            </div>
          ))}

          {/* Add Question Button */}
          <div style={{ marginBottom: '2rem', marginTop: '1rem' }}>
            <button 
              type="button" 
              onClick={() => addQuestion()} 
              className="btn btn-neutral" 
              style={{ 
                width: '100%', 
                padding: '1rem', 
                border: '2px dashed var(--primary)', 
                color: 'var(--primary)', 
                background: 'var(--primary-subtle)',
                fontWeight: 700,
                fontSize: '1rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                cursor: 'pointer'
              }}
            >
              <Plus size={18} /> Add Another Question
            </button>
          </div>

          <button type="submit" className="btn" disabled={isLoading} style={{ padding: '0.9rem', fontSize: '1.05rem', fontWeight: 700 }}>
            {isLoading ? 'Saving...' : (isEditMode ? 'Save & Update Quiz' : 'Save & Publish Quiz')}
          </button>
        </form>
      </div>

      {/* Question Bank Modal */}
      <QuestionBankModal
        isOpen={isBankModalOpen}
        onClose={() => setIsBankModalOpen(false)}
        onImportQuestions={handleImportFromBank}
      />
    </div>
  );
};

export default CreateQuiz;
