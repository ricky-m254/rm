import { useState, useEffect, useCallback } from 'react'
import {
  CheckCircle, Clock, Target, Trophy, BookOpen, ChevronRight, AlertCircle,
  BarChart2, Loader2, X, ChevronDown, ChevronUp, Plus, Send, Trash2,
  Calendar, Zap, Edit3, GraduationCap, Sun,
} from 'lucide-react'
import PageHero from '../../components/PageHero'
import QuizNotifications from '../../components/QuizNotifications'
import { apiClient } from '../../api/client'
import { useAuthStore } from '../../store/auth'

interface Quiz {
  id: number
  title: string
  instructions: string
  time_limit_minutes: number
  max_attempts: number
  is_published: boolean
  due_date: string | null
  question_count: number
  attempt_count: number
  created_at: string
  course: number
  course_name?: string
  subject_name?: string
}

interface Question {
  id: number
  question_text: string
  question_type: string
  option_a: string
  option_b: string
  option_c: string
  option_d: string
  correct_answer: string
  marks: number
  sequence: number
}

interface QuizResult {
  earned: number
  total: number
  pct: number
  answers: Record<number, string>
}

interface DraftQuestion {
  question_text: string
  question_type: 'MCQ' | 'TF' | 'SHORT'
  option_a: string
  option_b: string
  option_c: string
  option_d: string
  correct_answer: string
  marks: number
}

const SUBJECT_COLORS: Record<string, { from: string; to: string }> = {
  'Mathematics':    { from: '#1d4ed8', to: '#3b82f6' },
  'Biology':        { from: '#166534', to: '#22c55e' },
  'Chemistry':      { from: '#581c87', to: '#a855f7' },
  'Physics':        { from: '#0c4a6e', to: '#0ea5e9' },
  'English':        { from: '#065f46', to: '#10b981' },
  'Kiswahili':      { from: '#92400e', to: '#f59e0b' },
  'History':        { from: '#7c2d12', to: '#f97316' },
  'Geography':      { from: '#14532d', to: '#84cc16' },
  'Computer Studies': { from: '#1e1b4b', to: '#6366f1' },
  'Business Studies': { from: '#1e3a5f', to: '#64748b' },
  'Agriculture':    { from: '#052e16', to: '#16a34a' },
}

function guessColors(name: string) {
  for (const [subj, colors] of Object.entries(SUBJECT_COLORS)) {
    if (name.toLowerCase().includes(subj.toLowerCase())) return colors
  }
  return { from: '#1e293b', to: '#475569' }
}

function GlassCard({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-2xl border ${className}`}
      style={{ background: 'rgba(255,255,255,0.025)', borderColor: 'rgba(255,255,255,0.07)' }}>
      {children}
    </div>
  )
}

function ScoreRing({ score, max, color }: { score: number; max: number; color: string }) {
  const pct = Math.round((score / max) * 100)
  const r = 22, circ = 2 * Math.PI * r
  const offset = circ - (pct / 100) * circ
  return (
    <svg width={56} height={56} viewBox="0 0 56 56">
      <circle cx={28} cy={28} r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={5} />
      <circle cx={28} cy={28} r={r} fill="none" stroke={color} strokeWidth={5} strokeLinecap="round"
        strokeDasharray={circ} strokeDashoffset={offset} transform="rotate(-90 28 28)" />
      <text x="50%" y="50%" dominantBaseline="middle" textAnchor="middle" fontSize="11" fontWeight="700" fill={color}>{pct}%</text>
    </svg>
  )
}

function QuizTaker({ quiz, onClose }: { quiz: Quiz; onClose: () => void }) {
  const [questions, setQuestions] = useState<Question[]>([])
  const [loading, setLoading] = useState(true)
  const [answers, setAnswers] = useState<Record<number, string>>({})
  const [result, setResult] = useState<QuizResult | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [timeLeft, setTimeLeft] = useState<number | null>(null)

  useEffect(() => {
    apiClient.get(`/elearning/questions/?quiz=${quiz.id}`)
      .then(r => { const d = r.data; setQuestions(Array.isArray(d) ? d : d.results ?? []) })
      .catch(() => setQuestions([]))
      .finally(() => setLoading(false))
    if (quiz.time_limit_minutes) setTimeLeft(quiz.time_limit_minutes * 60)
  }, [quiz.id, quiz.time_limit_minutes])

  useEffect(() => {
    if (!timeLeft) return
    const t = setInterval(() => {
      setTimeLeft(prev => {
        if (prev === null || prev <= 1) { clearInterval(t); return 0 }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(t)
  }, [timeLeft !== null])

  const handleSubmit = useCallback(() => {
    setSubmitting(true)
    let earned = 0, total = 0
    questions.forEach(q => {
      total += q.marks
      const given = (answers[q.id] ?? '').trim().toUpperCase()
      const correct = (q.correct_answer ?? '').trim().toUpperCase()
      if ((q.question_type === 'MCQ' || q.question_type === 'TF') && given === correct) earned += q.marks
    })
    const pct = total > 0 ? Math.round((earned / total) * 100) : 0
    setTimeout(() => { setResult({ earned, total, pct, answers }); setSubmitting(false) }, 600)
  }, [questions, answers])

  const { from, to } = guessColors(quiz.subject_name || quiz.title)
  const answered = Object.keys(answers).length
  const isHoliday = quiz.title.toLowerCase().includes('holiday') || quiz.title.toLowerCase().includes('vacation')

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto py-8 px-4"
      style={{ background: 'rgba(0,0,0,0.88)', backdropFilter: 'blur(8px)' }}>
      <div className="w-full max-w-2xl">
        <GlassCard className="overflow-hidden">
          <div className="p-5 flex items-start justify-between" style={{ background: `linear-gradient(135deg, ${from}99, ${to}99)` }}>
            <div>
              {isHoliday && (
                <div className="flex items-center gap-1.5 mb-1 px-2 py-0.5 rounded-full w-fit text-[10px] font-bold"
                  style={{ background: 'rgba(16,185,129,0.25)', color: '#34d399' }}>
                  <Sun size={10} /> Holiday Assessment
                </div>
              )}
              <p className="text-xs font-bold text-white/70 uppercase tracking-wider">{quiz.course_name}</p>
              <h2 className="text-lg font-display font-bold text-white mt-0.5">{quiz.title}</h2>
              <div className="flex items-center gap-3 mt-2 text-xs text-white/70">
                <span className="flex items-center gap-1"><Target size={11} /> {quiz.question_count} Questions</span>
                {quiz.time_limit_minutes && <span className="flex items-center gap-1"><Clock size={11} /> {quiz.time_limit_minutes} min</span>}
              </div>
            </div>
            <div className="flex items-center gap-2">
              {timeLeft !== null && !result && (
                <div className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-sm font-bold ${timeLeft < 120 ? 'text-rose-300' : 'text-white'}`}
                  style={{ background: timeLeft < 120 ? 'rgba(239,68,68,0.2)' : 'rgba(0,0,0,0.3)' }}>
                  <Clock size={13} />
                  {Math.floor(timeLeft / 60)}:{String(timeLeft % 60).padStart(2, '0')}
                </div>
              )}
              <button onClick={onClose}
                className="w-8 h-8 rounded-xl flex items-center justify-center hover:bg-white/20 transition-all"
                style={{ background: 'rgba(255,255,255,0.1)' }}>
                <X size={16} className="text-white" />
              </button>
            </div>
          </div>

          <div className="p-5 space-y-5">
            {result ? (
              <div className="text-center py-6 space-y-4">
                <div className="flex justify-center">
                  <ScoreRing score={result.earned} max={result.total} color={result.pct >= 70 ? '#10b981' : result.pct >= 50 ? '#f59e0b' : '#ef4444'} />
                </div>
                <div>
                  <p className="text-3xl font-display font-bold text-white">{result.pct}%</p>
                  <p className="text-slate-400 text-sm mt-1">{result.earned} / {result.total} marks</p>
                </div>
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold"
                  style={result.pct >= 70 ? { background: 'rgba(16,185,129,0.15)', color: '#34d399' }
                    : result.pct >= 50 ? { background: 'rgba(245,158,11,0.15)', color: '#fcd34d' }
                    : { background: 'rgba(239,68,68,0.15)', color: '#fca5a5' }}>
                  {result.pct >= 70 ? <><Trophy size={15} /> Excellent! Well done</> : result.pct >= 50 ? <><CheckCircle size={15} /> Good effort, keep practicing</> : <><AlertCircle size={15} /> Review and try again</>}
                </div>
                <div className="mt-4 space-y-3 text-left">
                  {questions.map((q, i) => {
                    const given = (result.answers[q.id] ?? '').trim().toUpperCase()
                    const correct = (q.correct_answer ?? '').trim().toUpperCase()
                    const isCorrect = given === correct
                    return (
                      <div key={q.id} className="rounded-xl border p-3"
                        style={{ borderColor: isCorrect ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)', background: isCorrect ? 'rgba(16,185,129,0.05)' : 'rgba(239,68,68,0.05)' }}>
                        <p className="text-xs font-semibold text-white">Q{i + 1}. {q.question_text}</p>
                        <p className="text-xs mt-1" style={{ color: isCorrect ? '#34d399' : '#fca5a5' }}>
                          Your answer: {given || '(none)'} {isCorrect ? '✓' : `✗ — Correct: ${correct}`}
                        </p>
                      </div>
                    )
                  })}
                </div>
                <button onClick={onClose} className="mt-4 px-6 py-2.5 rounded-xl text-sm font-bold" style={{ background: '#10b981', color: '#fff' }}>Done</button>
              </div>
            ) : loading ? (
              <div className="flex items-center justify-center py-12"><Loader2 size={28} className="text-emerald-500 animate-spin" /></div>
            ) : questions.length === 0 ? (
              <div className="text-center py-10">
                <BookOpen size={36} className="mx-auto text-slate-600 mb-3" />
                <p className="text-slate-400 text-sm">No questions available for this quiz yet.</p>
                <button onClick={onClose} className="mt-4 px-4 py-2 rounded-xl text-sm font-semibold" style={{ background: 'rgba(255,255,255,0.07)', color: '#94a3b8' }}>Close</button>
              </div>
            ) : (
              <>
                {quiz.instructions && (
                  <div className="rounded-xl border p-3 text-xs text-slate-300" style={{ background: 'rgba(99,102,241,0.08)', borderColor: 'rgba(99,102,241,0.2)' }}>
                    <strong className="text-indigo-300">Instructions:</strong> {quiz.instructions}
                  </div>
                )}
                <div className="space-y-4">
                  {questions.map((q, i) => {
                    const opts: Array<{ key: string; label: string }> = []
                    if (q.question_type === 'TF') { opts.push({ key: 'True', label: 'True' }, { key: 'False', label: 'False' }) }
                    else {
                      if (q.option_a) opts.push({ key: 'A', label: `A. ${q.option_a}` })
                      if (q.option_b) opts.push({ key: 'B', label: `B. ${q.option_b}` })
                      if (q.option_c) opts.push({ key: 'C', label: `C. ${q.option_c}` })
                      if (q.option_d) opts.push({ key: 'D', label: `D. ${q.option_d}` })
                    }
                    const sel = answers[q.id]
                    return (
                      <div key={q.id} className="rounded-xl border p-4" style={{ background: 'rgba(255,255,255,0.02)', borderColor: 'rgba(255,255,255,0.08)' }}>
                        <p className="text-sm font-semibold text-white mb-3">
                          <span className="text-slate-500 mr-2">Q{i + 1}.</span>{q.question_text}
                          <span className="ml-2 text-xs text-slate-500">({q.marks} mark{q.marks !== 1 ? 's' : ''})</span>
                        </p>
                        {opts.length > 0 ? (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {opts.map(opt => (
                              <button key={opt.key}
                                onClick={() => setAnswers(prev => ({ ...prev, [q.id]: opt.key }))}
                                className="text-left px-3 py-2 rounded-lg text-sm transition-all"
                                style={sel === opt.key
                                  ? { background: 'rgba(16,185,129,0.2)', border: '1px solid #10b981', color: '#34d399' }
                                  : { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: '#cbd5e1' }}>
                                {opt.label}
                              </button>
                            ))}
                          </div>
                        ) : (
                          <input value={answers[q.id] ?? ''} onChange={e => setAnswers(prev => ({ ...prev, [q.id]: e.target.value }))}
                            placeholder="Type your answer…"
                            className="w-full px-3 py-2 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }} />
                        )}
                      </div>
                    )
                  })}
                </div>
                <div className="flex items-center justify-between pt-2">
                  <p className="text-xs text-slate-500">{answered} / {questions.length} answered</p>
                  <button onClick={handleSubmit} disabled={submitting || answered === 0}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all disabled:opacity-50"
                    style={{ background: '#10b981', color: '#fff' }}>
                    {submitting ? <><Loader2 size={15} className="animate-spin" /> Grading…</> : <><Trophy size={15} /> Submit Quiz</>}
                  </button>
                </div>
              </>
            )}
          </div>
        </GlassCard>
      </div>
    </div>
  )
}

const EMPTY_QUESTION: DraftQuestion = { question_text: '', question_type: 'MCQ', option_a: '', option_b: '', option_c: '', option_d: '', correct_answer: '', marks: 1 }

function TeacherCreateQuizPanel({ onCreated }: { onCreated: () => void }) {
  const [step, setStep] = useState<'details' | 'questions' | 'review'>('details')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [flash, setFlash] = useState<string | null>(null)
  const [courses, setCourses] = useState<{ id: number; name: string }[]>([])

  const [form, setForm] = useState({
    title: '', instructions: '', course: '', time_limit_minutes: 30,
    max_attempts: 1, is_holiday_assessment: false,
    due_date: '', publish_immediately: false,
  })
  const [questions, setQuestions] = useState<DraftQuestion[]>([{ ...EMPTY_QUESTION }])

  useEffect(() => {
    apiClient.get('/elearning/courses/').then(r => {
      const d = r.data
      setCourses(Array.isArray(d) ? d : d.results ?? [])
    }).catch(() => setCourses([]))
  }, [])

  const updateQ = (i: number, patch: Partial<DraftQuestion>) =>
    setQuestions(prev => prev.map((q, idx) => idx === i ? { ...q, ...patch } : q))

  const addQuestion = () => setQuestions(prev => [...prev, { ...EMPTY_QUESTION }])
  const removeQuestion = (i: number) => setQuestions(prev => prev.filter((_, idx) => idx !== i))

  const handleSubmit = async () => {
    setError(null)
    setSubmitting(true)
    try {
      const title = form.is_holiday_assessment && !form.title.toLowerCase().includes('holiday')
        ? `[Holiday Assessment] ${form.title}`
        : form.title

      const quizRes = await apiClient.post('/elearning/quizzes/', {
        title,
        instructions: form.instructions || undefined,
        course: Number(form.course) || undefined,
        time_limit_minutes: form.time_limit_minutes,
        max_attempts: form.max_attempts,
        due_date: form.due_date || null,
        is_published: form.publish_immediately,
      })
      const quizId = (quizRes.data as { id: number }).id

      for (let i = 0; i < questions.length; i++) {
        const q = questions[i]
        if (!q.question_text.trim()) continue
        await apiClient.post('/elearning/questions/', {
          quiz: quizId, question_text: q.question_text, question_type: q.question_type,
          option_a: q.option_a || undefined, option_b: q.option_b || undefined,
          option_c: q.option_c || undefined, option_d: q.option_d || undefined,
          correct_answer: q.correct_answer, marks: q.marks, sequence: i + 1,
        })
      }

      if (!form.publish_immediately) {
        await apiClient.patch(`/elearning/quizzes/${quizId}/`, { is_published: true })
      }

      setFlash(`Quiz "${title}" created and published to students!`)
      setTimeout(() => { setFlash(null); onCreated() }, 2500)
    } catch {
      setError('Failed to create quiz. Please check all fields and try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)' }}>
      <div className="px-5 py-4 flex items-center gap-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.07)', background: 'rgba(16,185,129,0.05)' }}>
        <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: 'rgba(16,185,129,0.15)' }}>
          <Edit3 size={14} className="text-emerald-400" />
        </div>
        <div>
          <p className="text-sm font-bold text-white">Create & Submit Quiz</p>
          <p className="text-xs text-slate-500">Set questions, publish to students — including holiday assessments</p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          {(['details', 'questions', 'review'] as const).map((s, i) => (
            <button key={s} onClick={() => setStep(s)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all"
              style={step === s
                ? { background: 'rgba(16,185,129,0.2)', color: '#34d399', border: '1px solid rgba(16,185,129,0.3)' }
                : { background: 'rgba(255,255,255,0.04)', color: '#475569', border: '1px solid rgba(255,255,255,0.05)' }}>
              {i + 1}. {s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {flash && (
        <div className="mx-5 mt-4 rounded-xl p-3 flex items-center gap-2 text-sm text-emerald-200"
          style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)' }}>
          <CheckCircle size={14} className="text-emerald-400" />{flash}
        </div>
      )}
      {error && (
        <div className="mx-5 mt-4 rounded-xl p-3 flex items-center gap-2 text-sm text-rose-200"
          style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
          <AlertCircle size={14} className="text-rose-400" />{error}
        </div>
      )}

      <div className="p-5">
        {step === 'details' && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-3 rounded-xl cursor-pointer select-none"
              style={form.is_holiday_assessment
                ? { background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.25)' }
                : { background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}
              onClick={() => setForm(f => ({ ...f, is_holiday_assessment: !f.is_holiday_assessment }))}>
              <Sun size={16} className={form.is_holiday_assessment ? 'text-emerald-400' : 'text-slate-600'} />
              <div>
                <p className={`text-sm font-bold ${form.is_holiday_assessment ? 'text-emerald-300' : 'text-slate-300'}`}>
                  Holiday Assessment
                </p>
                <p className="text-xs text-slate-500">Students can take this quiz during school holidays / vacation</p>
              </div>
              <div className="ml-auto w-10 h-5 rounded-full transition-all relative"
                style={{ background: form.is_holiday_assessment ? '#10b981' : 'rgba(255,255,255,0.08)' }}>
                <div className="absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all"
                  style={{ left: form.is_holiday_assessment ? '22px' : '2px' }} />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="sm:col-span-2">
                <label className="text-xs text-slate-400 mb-1.5 block">Quiz Title *</label>
                <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  placeholder={form.is_holiday_assessment ? 'e.g. Term 2 Holiday Maths Revision Quiz' : 'e.g. Form 3 Chemistry — Organic Chemistry Test'}
                  className="w-full px-3 py-2.5 rounded-xl text-sm text-white placeholder-slate-600 outline-none focus:ring-1 focus:ring-emerald-500/40"
                  style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }} />
              </div>
              <div>
                <label className="text-xs text-slate-400 mb-1.5 block">Course / Subject</label>
                <select value={form.course} onChange={e => setForm(f => ({ ...f, course: e.target.value }))}
                  className="w-full px-3 py-2.5 rounded-xl text-sm text-slate-200 outline-none"
                  style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
                  <option value="">Select course…</option>
                  {courses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-slate-400 mb-1.5 block">Due Date (optional)</label>
                <input type="datetime-local" value={form.due_date} onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))}
                  className="w-full px-3 py-2.5 rounded-xl text-sm text-slate-200 outline-none"
                  style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }} />
              </div>
              <div>
                <label className="text-xs text-slate-400 mb-1.5 block">Time Limit (minutes)</label>
                <input type="number" min={0} max={180} value={form.time_limit_minutes}
                  onChange={e => setForm(f => ({ ...f, time_limit_minutes: Number(e.target.value) }))}
                  className="w-full px-3 py-2.5 rounded-xl text-sm text-white outline-none"
                  style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }} />
              </div>
              <div>
                <label className="text-xs text-slate-400 mb-1.5 block">Max Attempts</label>
                <input type="number" min={1} max={10} value={form.max_attempts}
                  onChange={e => setForm(f => ({ ...f, max_attempts: Number(e.target.value) }))}
                  className="w-full px-3 py-2.5 rounded-xl text-sm text-white outline-none"
                  style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }} />
              </div>
              <div className="sm:col-span-2">
                <label className="text-xs text-slate-400 mb-1.5 block">Instructions for Students (optional)</label>
                <textarea value={form.instructions} onChange={e => setForm(f => ({ ...f, instructions: e.target.value }))}
                  rows={2} placeholder="e.g. Attempt all questions. Use textbooks if needed."
                  className="w-full px-3 py-2.5 rounded-xl text-sm text-white placeholder-slate-600 outline-none resize-none"
                  style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }} />
              </div>
            </div>
            <button onClick={() => setStep('questions')}
              className="w-full py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all hover:opacity-90"
              style={{ background: 'rgba(16,185,129,0.2)', color: '#10b981', border: '1px solid rgba(16,185,129,0.3)' }}>
              Next: Add Questions <ChevronRight size={15} />
            </button>
          </div>
        )}

        {step === 'questions' && (
          <div className="space-y-4">
            {questions.map((q, i) => (
              <div key={i} className="rounded-xl p-4 space-y-3" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold text-slate-400">Question {i + 1}</p>
                  {questions.length > 1 && (
                    <button onClick={() => removeQuestion(i)} className="text-slate-600 hover:text-rose-400 transition-colors">
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>
                <input value={q.question_text} onChange={e => updateQ(i, { question_text: e.target.value })}
                  placeholder="Question text *"
                  className="w-full px-3 py-2 rounded-lg text-sm text-white placeholder-slate-600 outline-none"
                  style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }} />
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {(['MCQ', 'TF', 'SHORT'] as const).map(t => (
                    <button key={t} onClick={() => updateQ(i, { question_type: t })}
                      className="py-1.5 rounded-lg text-[10px] font-bold transition-all"
                      style={q.question_type === t
                        ? { background: 'rgba(16,185,129,0.2)', color: '#34d399', border: '1px solid rgba(16,185,129,0.3)' }
                        : { background: 'rgba(255,255,255,0.04)', color: '#64748b', border: '1px solid rgba(255,255,255,0.05)' }}>
                      {t === 'MCQ' ? 'Multiple Choice' : t === 'TF' ? 'True / False' : 'Short Answer'}
                    </button>
                  ))}
                  <input type="number" min={1} max={10} value={q.marks}
                    onChange={e => updateQ(i, { marks: Number(e.target.value) })}
                    className="px-2 py-1.5 rounded-lg text-xs text-white text-center outline-none"
                    style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
                    title="Marks for this question" />
                </div>
                {q.question_type === 'MCQ' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {(['a', 'b', 'c', 'd'] as const).map(opt => (
                      <input key={opt} value={q[`option_${opt}` as keyof DraftQuestion] as string}
                        onChange={e => updateQ(i, { [`option_${opt}`]: e.target.value })}
                        placeholder={`Option ${opt.toUpperCase()}`}
                        className="px-3 py-2 rounded-lg text-xs text-white placeholder-slate-600 outline-none"
                        style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }} />
                    ))}
                  </div>
                )}
                <div>
                  <label className="text-[10px] text-slate-500 mb-1 block">Correct Answer *</label>
                  {q.question_type === 'TF' ? (
                    <div className="flex gap-2">
                      {['True', 'False'].map(v => (
                        <button key={v} onClick={() => updateQ(i, { correct_answer: v })}
                          className="flex-1 py-1.5 rounded-lg text-xs font-bold transition-all"
                          style={q.correct_answer === v
                            ? { background: 'rgba(16,185,129,0.2)', color: '#34d399', border: '1px solid rgba(16,185,129,0.3)' }
                            : { background: 'rgba(255,255,255,0.04)', color: '#64748b', border: '1px solid rgba(255,255,255,0.05)' }}>
                          {v}
                        </button>
                      ))}
                    </div>
                  ) : q.question_type === 'MCQ' ? (
                    <div className="flex gap-2">
                      {['A', 'B', 'C', 'D'].map(v => (
                        <button key={v} onClick={() => updateQ(i, { correct_answer: v })}
                          className="flex-1 py-1.5 rounded-lg text-xs font-bold transition-all"
                          style={q.correct_answer === v
                            ? { background: 'rgba(16,185,129,0.2)', color: '#34d399', border: '1px solid rgba(16,185,129,0.3)' }
                            : { background: 'rgba(255,255,255,0.04)', color: '#64748b', border: '1px solid rgba(255,255,255,0.05)' }}>
                          {v}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <input value={q.correct_answer} onChange={e => updateQ(i, { correct_answer: e.target.value })}
                      placeholder="Type the correct answer"
                      className="w-full px-3 py-2 rounded-lg text-xs text-white placeholder-slate-600 outline-none"
                      style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }} />
                  )}
                </div>
              </div>
            ))}
            <button onClick={addQuestion}
              className="w-full py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all"
              style={{ background: 'rgba(255,255,255,0.04)', color: '#64748b', border: '1px dashed rgba(255,255,255,0.1)' }}>
              <Plus size={15} /> Add Another Question
            </button>
            <div className="flex gap-3">
              <button onClick={() => setStep('details')} className="flex-1 py-2.5 rounded-xl text-sm font-bold transition-all"
                style={{ background: 'rgba(255,255,255,0.05)', color: '#64748b', border: '1px solid rgba(255,255,255,0.08)' }}>
                Back
              </button>
              <button onClick={() => setStep('review')}
                className="flex-1 py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all hover:opacity-90"
                style={{ background: 'rgba(16,185,129,0.2)', color: '#10b981', border: '1px solid rgba(16,185,129,0.3)' }}>
                Review & Submit <ChevronRight size={15} />
              </button>
            </div>
          </div>
        )}

        {step === 'review' && (
          <div className="space-y-4">
            <div className="rounded-xl p-4 space-y-2" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Quiz Summary</p>
              {form.is_holiday_assessment && (
                <div className="flex items-center gap-2 px-3 py-2 rounded-xl mb-2"
                  style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)' }}>
                  <Sun size={13} className="text-emerald-400" />
                  <span className="text-xs font-bold text-emerald-300">Holiday Assessment — visible to students during vacation</span>
                </div>
              )}
              {[
                { label: 'Title', value: form.title || '(not set)' },
                { label: 'Questions', value: `${questions.filter(q => q.question_text.trim()).length} questions` },
                { label: 'Time Limit', value: `${form.time_limit_minutes} minutes` },
                { label: 'Max Attempts', value: String(form.max_attempts) },
                { label: 'Due Date', value: form.due_date ? new Date(form.due_date).toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'No deadline' },
              ].map(r => (
                <div key={r.label} className="flex justify-between text-xs">
                  <span className="text-slate-500">{r.label}</span>
                  <span className="text-slate-200 font-semibold">{r.value}</span>
                </div>
              ))}
            </div>
            <div className="rounded-xl p-3 text-xs text-amber-200 flex items-start gap-2"
              style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)' }}>
              <Zap size={12} className="text-amber-400 mt-0.5 flex-shrink-0" />
              Submitting will publish this quiz immediately. Students will receive an alert notification.
            </div>
            <div className="flex gap-3">
              <button onClick={() => setStep('questions')} className="flex-1 py-2.5 rounded-xl text-sm font-bold transition-all"
                style={{ background: 'rgba(255,255,255,0.05)', color: '#64748b', border: '1px solid rgba(255,255,255,0.08)' }}>
                Back
              </button>
              <button onClick={handleSubmit} disabled={submitting || !form.title.trim()}
                className="flex-1 py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all hover:opacity-90 disabled:opacity-40"
                style={{ background: '#10b981', color: '#fff' }}>
                {submitting ? <><Loader2 size={15} className="animate-spin" /> Publishing…</> : <><Send size={15} /> Publish Quiz to Students</>}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

type ViewTab = 'student' | 'teacher'

export default function ELearningQuizzesPage() {
  const username = useAuthStore(s => s.username)
  const isTeacher = username ? !['student', 'pupil', 'learner'].some(r => username.toLowerCase().includes(r)) : true

  const [quizzes, setQuizzes] = useState<Quiz[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'pending' | 'published' | 'holiday'>('all')
  const [activeQuiz, setActiveQuiz] = useState<Quiz | null>(null)
  const [expandedId, setExpandedId] = useState<number | null>(null)
  const [viewTab, setViewTab] = useState<ViewTab>('student')

  const fetchQuizzes = useCallback(() => {
    setLoading(true)
    apiClient.get('/elearning/quizzes/')
      .then(r => { const d = r.data; setQuizzes(Array.isArray(d) ? d : d.results ?? []) })
      .catch(() => setQuizzes([]))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { fetchQuizzes() }, [fetchQuizzes])

  const published = quizzes.filter(q => q.is_published)
  const pending = quizzes.filter(q => !q.is_published)
  const holiday = quizzes.filter(q => q.title.toLowerCase().includes('holiday') || q.title.toLowerCase().includes('vacation'))
  const withAttempts = quizzes.filter(q => q.attempt_count > 0)

  const shown =
    filter === 'published' ? published :
    filter === 'pending' ? pending :
    filter === 'holiday' ? holiday :
    quizzes

  return (
    <div className="space-y-6">
      {activeQuiz && <QuizTaker quiz={activeQuiz} onClose={() => setActiveQuiz(null)} />}

      <PageHero
        badge="E-LEARNING"
        badgeColor="violet"
        title="Quizzes & Assessments"
        subtitle="CBC-aligned quizzes, holiday assessments and online tests"
        icon="🎓"
      />

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-white">Quiz Portal</h1>
          <p className="text-slate-400 text-sm mt-1">
            {isTeacher ? 'Create, publish and manage quizzes for students' : 'Online assessments set by your teachers — take anytime, anywhere'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <QuizNotifications onNavigateToQuiz={id => { const q = quizzes.find(x => x.id === id); if (q) setActiveQuiz(q) }} />
          {isTeacher && (
            <div className="flex gap-1 rounded-xl p-1" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
              <button onClick={() => setViewTab('student')}
                className="px-3 py-1.5 rounded-lg text-xs font-bold transition-all"
                style={viewTab === 'student' ? { background: 'rgba(16,185,129,0.2)', color: '#34d399' } : { color: '#64748b' }}>
                <GraduationCap size={11} className="inline mr-1" />Student View
              </button>
              <button onClick={() => setViewTab('teacher')}
                className="px-3 py-1.5 rounded-lg text-xs font-bold transition-all"
                style={viewTab === 'teacher' ? { background: 'rgba(16,185,129,0.2)', color: '#34d399' } : { color: '#64748b' }}>
                <Edit3 size={11} className="inline mr-1" />Teacher View
              </button>
            </div>
          )}
        </div>
      </div>

      {isTeacher && viewTab === 'teacher' && (
        <TeacherCreateQuizPanel onCreated={fetchQuizzes} />
      )}

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 size={32} className="text-emerald-500 animate-spin" />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: 'Total Quizzes',      value: quizzes.length,       icon: BookOpen,  color: '#6366f1' },
              { label: 'Published',          value: published.length,     icon: CheckCircle, color: '#10b981' },
              { label: 'Holiday Assessments',value: holiday.length,       icon: Sun,       color: '#f59e0b' },
              { label: 'With Attempts',      value: withAttempts.length,  icon: Trophy,    color: '#3b82f6' },
            ].map(s => {
              const Icon = s.icon
              return (
                <GlassCard key={s.label} className="p-5 flex items-center gap-4">
                  <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `${s.color}20` }}>
                    <Icon size={20} style={{ color: s.color }} />
                  </div>
                  <div>
                    <p className="text-2xl font-display font-bold text-white">{s.value}</p>
                    <p className="text-xs text-slate-400">{s.label}</p>
                  </div>
                </GlassCard>
              )
            })}
          </div>

          {holiday.length > 0 && (
            <div className="rounded-2xl p-4 flex items-center gap-3"
              style={{ background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.2)' }}>
              <Sun size={18} className="text-emerald-400 flex-shrink-0" />
              <div>
                <p className="text-sm font-bold text-emerald-300">Holiday Assessments Available</p>
                <p className="text-xs text-slate-400 mt-0.5">
                  {holiday.length} assessment{holiday.length !== 1 ? 's' : ''} available for you to complete during the school holiday.
                  Take your time and do your best!
                </p>
              </div>
              <button onClick={() => setFilter('holiday')}
                className="ml-auto px-3 py-1.5 rounded-xl text-xs font-bold flex-shrink-0 transition-all hover:opacity-90"
                style={{ background: 'rgba(16,185,129,0.2)', color: '#34d399', border: '1px solid rgba(16,185,129,0.3)' }}>
                View All <ChevronRight size={12} className="inline" />
              </button>
            </div>
          )}

          <div className="flex gap-2 flex-wrap">
            {([
              ['all',      'All Quizzes'],
              ['published',`Published (${published.length})`],
              ['holiday',  `Holiday (${holiday.length})`],
              ['pending',  `Drafts (${pending.length})`],
            ] as const).map(([f, label]) => (
              <button key={f} onClick={() => setFilter(f)}
                className="px-4 py-2 rounded-xl text-sm font-semibold transition-all"
                style={filter === f
                  ? { background: f === 'holiday' ? '#f59e0b' : '#10b981', color: '#fff' }
                  : { background: 'rgba(255,255,255,0.05)', color: '#94a3b8', border: '1px solid rgba(255,255,255,0.08)' }}>
                {label}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {shown.length === 0 ? (
              <GlassCard className="col-span-full p-10 text-center">
                <BookOpen size={40} className="mx-auto text-slate-600 mb-3" />
                <p className="text-slate-400">No quizzes found</p>
              </GlassCard>
            ) : shown.map(q => {
              const { from, to } = guessColors(q.subject_name || q.title)
              const subjectLabel = q.subject_name || q.title.split('—')[0]?.trim() || 'General'
              const isExpanded = expandedId === q.id
              const isHoliday = q.title.toLowerCase().includes('holiday') || q.title.toLowerCase().includes('vacation')
              const hasDue = q.due_date && new Date(q.due_date) > new Date()
              const hoursUntilDue = q.due_date ? (new Date(q.due_date).getTime() - Date.now()) / 3600000 : null

              return (
                <GlassCard key={q.id} className="p-5 hover:border-slate-600 transition-all">
                  {isHoliday && (
                    <div className="flex items-center gap-1.5 mb-3 px-2.5 py-1 rounded-xl w-fit text-[10px] font-bold"
                      style={{ background: 'rgba(16,185,129,0.12)', color: '#34d399', border: '1px solid rgba(16,185,129,0.2)' }}>
                      <Sun size={9} /> Holiday Assessment
                    </div>
                  )}
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center font-bold text-xl flex-shrink-0"
                      style={{ background: `linear-gradient(135deg, ${from}, ${to})` }}>
                      {subjectLabel.slice(0, 1)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-xs font-semibold" style={{ color: to }}>{subjectLabel}</p>
                          <p className="text-sm font-bold text-white leading-snug mt-0.5">{q.title}</p>
                          {q.course_name && <p className="text-xs text-slate-500 mt-0.5">{q.course_name}</p>}
                        </div>
                        {q.attempt_count > 0 && <ScoreRing score={q.attempt_count} max={q.max_attempts} color="#10b981" />}
                      </div>
                      <div className="flex items-center gap-4 mt-2 flex-wrap">
                        <span className="flex items-center gap-1 text-xs text-slate-400"><Target size={12} /> {q.question_count} Qs</span>
                        {q.time_limit_minutes > 0 && <span className="flex items-center gap-1 text-xs text-slate-400"><Clock size={12} /> {q.time_limit_minutes} min</span>}
                        <span className="flex items-center gap-1 text-xs text-slate-400"><BarChart2 size={12} /> {q.attempt_count} attempts</span>
                        {hasDue && hoursUntilDue !== null && hoursUntilDue < 48 && (
                          <span className="flex items-center gap-1 text-xs font-bold text-amber-400"><AlertCircle size={11} /> Due in {Math.ceil(hoursUntilDue)}h</span>
                        )}
                      </div>
                      <div className="flex items-center justify-between mt-3">
                        <div>
                          {q.is_published
                            ? <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold" style={{ background: 'rgba(16,185,129,0.15)', color: '#34d399' }}><CheckCircle size={11} /> Published</span>
                            : <span className="flex items-center gap-1 text-xs text-amber-400"><Clock size={11} /> Draft</span>}
                        </div>
                        <div className="flex items-center gap-2">
                          <button onClick={() => setExpandedId(isExpanded ? null : q.id)}
                            className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all"
                            style={{ background: 'rgba(255,255,255,0.05)', color: '#94a3b8', border: '1px solid rgba(255,255,255,0.08)' }}>
                            {isExpanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />} Details
                          </button>
                          {q.is_published && q.question_count > 0 && (
                            <button onClick={() => setActiveQuiz(q)}
                              className="flex items-center gap-1 px-4 py-1.5 rounded-xl text-xs font-bold transition-all hover:opacity-90"
                              style={isHoliday ? { background: '#10b981', color: '#fff' } : { background: '#10b981', color: '#fff' }}>
                              {isHoliday ? <><Sun size={11} /> Start</> : <>Start Quiz</>} <ChevronRight size={13} />
                            </button>
                          )}
                          {!q.is_published && (
                            <button onClick={() => setActiveQuiz(q)}
                              className="flex items-center gap-1 px-4 py-1.5 rounded-xl text-xs font-semibold transition-all hover:opacity-80"
                              style={{ background: 'rgba(255,255,255,0.05)', color: '#64748b' }}>
                              Preview <ChevronRight size={13} />
                            </button>
                          )}
                        </div>
                      </div>
                      {isExpanded && (
                        <div className="mt-3 pt-3 border-t border-white/[0.06] space-y-1 text-xs text-slate-400">
                          {q.instructions && <p><span className="text-slate-500">Instructions:</span> {q.instructions}</p>}
                          <p><span className="text-slate-500">Max Attempts:</span> {q.max_attempts}</p>
                          {q.due_date && <p><span className="text-slate-500">Due:</span> {new Date(q.due_date).toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' })}</p>}
                          {isHoliday && <p className="text-emerald-500">Available during school holidays — complete at your own pace</p>}
                        </div>
                      )}
                    </div>
                  </div>
                </GlassCard>
              )
            })}
          </div>
        </>
      )}

      {!loading && quizzes.length === 0 && isTeacher && viewTab === 'student' && (
        <div className="rounded-2xl p-8 text-center" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
          <BookOpen size={36} className="mx-auto text-slate-700 mb-3" />
          <p className="text-slate-400 text-sm">No quizzes yet.</p>
          <button onClick={() => setViewTab('teacher')}
            className="mt-4 px-5 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 mx-auto transition-all hover:opacity-90"
            style={{ background: 'rgba(16,185,129,0.2)', color: '#10b981', border: '1px solid rgba(16,185,129,0.3)' }}>
            <Plus size={14} /> Create First Quiz
          </button>
        </div>
      )}

      <div className="rounded-xl px-4 py-3 text-xs text-slate-400 flex items-center gap-2"
        style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
        <Calendar size={12} className="text-emerald-400 flex-shrink-0" />
        <span>
          <strong className="text-slate-300">Holiday Assessments</strong> are accessible to students anytime during school breaks.
          The notification bell alerts students when new quizzes are published or deadlines are approaching.
        </span>
      </div>
    </div>
  )
}
