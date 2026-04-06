import { useState } from 'react'
import { ExternalLink, BookOpen, Search, ChevronRight, Download, Play, FileText, Globe } from 'lucide-react'
import PageHero from '../../components/PageHero'

interface CBCResource {
  type: 'video' | 'ebook' | 'assessment' | 'platform' | 'curriculum'
  title: string
  url: string
  alt?: string
  badge?: string
  note?: string
}

interface SubjectMaterials {
  subject: string
  grade: string
  icon: string
  from: string
  to: string
  strand: string
  resources: CBCResource[]
}

const CBC_SUBJECTS: SubjectMaterials[] = [
  {
    subject: 'Mathematics',
    grade: 'Grade 7–9',
    icon: '📐',
    from: '#1d4ed8',
    to: '#3b82f6',
    strand: 'Numbers, Algebra, Geometry & Statistics',
    resources: [
      { type: 'video',      title: 'CBC Grade 7 Algebra — Expressions & Equations',      url: 'https://www.youtube.com/results?search_query=CBC+Grade+7+Mathematics+Algebra+Kenya', badge: 'Video' },
      { type: 'video',      title: 'CBC Grade 9 Linear Relations & Graphs',               url: 'https://www.youtube.com/results?search_query=CBC+Grade+9+Mathematics+Linear+Relations+Graphs+Kenya', badge: 'Video' },
      { type: 'ebook',      title: 'KLB Mathematics — OpenStax College Algebra',          url: 'https://openstax.org/books/college-algebra-2e/pages/1-introduction', badge: 'Free PDF' },
      { type: 'assessment', title: 'CBC Grade 7–9 Formative Assessment Samples',          url: 'https://kicd.ac.ke/curriculum-designs/', badge: 'Assessment' },
      { type: 'platform',   title: 'Khan Academy — Maths Practice',                       url: 'https://www.khanacademy.org/math', badge: 'Free' },
      { type: 'curriculum', title: 'KICD CBC Mathematics Curriculum Designs',              url: 'https://kicd.ac.ke/curriculum-designs/', badge: 'Official' },
    ],
  },
  {
    subject: 'English',
    grade: 'Grade 7–9',
    icon: '📖',
    from: '#065f46',
    to: '#10b981',
    strand: 'Language, Communication & Literature',
    resources: [
      { type: 'video',      title: 'CBC Grade 8 English — Essay Writing Skills',           url: 'https://www.youtube.com/results?search_query=CBC+Grade+8+English+Essay+Writing+Kenya', badge: 'Video' },
      { type: 'video',      title: 'CBC Grade 9 Literature — Set Text Analysis',           url: 'https://www.youtube.com/results?search_query=CBC+Grade+9+English+Literature+Set+Text+Kenya', badge: 'Video' },
      { type: 'ebook',      title: 'Longman English — OpenStax Writing Guide',             url: 'https://openstax.org/books/writing-guide/pages/1-unit-introduction', badge: 'Free PDF' },
      { type: 'assessment', title: 'CBC English Portfolio & Assessment Tasks',             url: 'https://kicd.ac.ke/curriculum-designs/', badge: 'Assessment' },
      { type: 'platform',   title: 'British Council — Free English Resources',             url: 'https://learnenglish.britishcouncil.org/', badge: 'Free' },
      { type: 'curriculum', title: 'KICD CBC English Curriculum Designs',                  url: 'https://kicd.ac.ke/curriculum-designs/', badge: 'Official' },
    ],
  },
  {
    subject: 'Kiswahili',
    grade: 'Grade 7–9',
    icon: '🗣️',
    from: '#92400e',
    to: '#f59e0b',
    strand: 'Lugha, Fasihi & Mawasiliano',
    resources: [
      { type: 'video',      title: 'CBC Grade 7 Kiswahili — Fasihi na Lugha',              url: 'https://www.youtube.com/results?search_query=CBC+Grade+7+Kiswahili+Fasihi+Lugha+Kenya', badge: 'Video' },
      { type: 'video',      title: 'CBC Grade 9 Kiswahili — Insha na Uandishi Bora',      url: 'https://www.youtube.com/results?search_query=CBC+Grade+9+Kiswahili+Insha+Uandishi+Kenya', badge: 'Video' },
      { type: 'ebook',      title: 'Kiswahili Sanifu — Kenya Education Cloud',            url: 'https://kec.ac.ke/', badge: 'Free' },
      { type: 'assessment', title: 'CBC Kiswahili Portfolio & Summative Tasks',           url: 'https://kicd.ac.ke/curriculum-designs/', badge: 'Assessment' },
      { type: 'platform',   title: 'KICD OER — Kiswahili Resources',                     url: 'https://oer.kec.ac.ke/', badge: 'Official' },
      { type: 'curriculum', title: 'KICD CBC Kiswahili Curriculum Designs',               url: 'https://kicd.ac.ke/curriculum-designs/', badge: 'Official' },
    ],
  },
  {
    subject: 'Integrated Science',
    grade: 'Grade 7–9',
    icon: '🧬',
    from: '#166534',
    to: '#22c55e',
    strand: 'Life, Physical & Earth Sciences',
    resources: [
      { type: 'video',      title: 'CBC Grade 8 Science — Living Things & Cells',         url: 'https://www.youtube.com/results?search_query=CBC+Grade+8+Science+Technology+Living+Things+Kenya', badge: 'Video' },
      { type: 'video',      title: 'CBC Grade 9 Biology — Genetics & Heredity Basics',    url: 'https://www.youtube.com/results?search_query=CBC+Grade+9+Science+Genetics+Kenya+Junior+Secondary', badge: 'Video' },
      { type: 'ebook',      title: 'KLB Science — OpenStax Biology 2e',                   url: 'https://openstax.org/books/biology-2e/pages/1-introduction', badge: 'Free PDF' },
      { type: 'assessment', title: 'CBC Science & Technology Assessment Portfolio',       url: 'https://kicd.ac.ke/curriculum-designs/', badge: 'Assessment' },
      { type: 'platform',   title: 'Khan Academy — Biology',                               url: 'https://www.khanacademy.org/science/biology', badge: 'Free' },
      { type: 'curriculum', title: 'KICD CBC Science & Technology Curriculum',             url: 'https://kicd.ac.ke/curriculum-designs/', badge: 'Official' },
    ],
  },
  {
    subject: 'Chemistry',
    grade: 'Grade 7–9',
    icon: '⚗️',
    from: '#581c87',
    to: '#a855f7',
    strand: 'Matter, Reactions & Chemical Processes',
    resources: [
      { type: 'video',      title: 'CBC Grade 9 Chemistry — Acids, Bases & Salts',        url: 'https://www.youtube.com/results?search_query=CBC+Grade+9+Chemistry+Acids+Bases+Salts+Kenya', badge: 'Video' },
      { type: 'video',      title: 'CBC Grade 8 Science — States of Matter',              url: 'https://www.youtube.com/results?search_query=CBC+Grade+8+Science+States+Matter+Kenya', badge: 'Video' },
      { type: 'ebook',      title: 'KLB Chemistry — OpenStax Chemistry 2e',               url: 'https://openstax.org/books/chemistry-2e/pages/1-introduction', badge: 'Free PDF' },
      { type: 'assessment', title: 'CBC Chemistry Practical Assessment Tasks',            url: 'https://kicd.ac.ke/curriculum-designs/', badge: 'Assessment' },
      { type: 'platform',   title: 'Khan Academy — Chemistry',                            url: 'https://www.khanacademy.org/science/chemistry', badge: 'Free' },
      { type: 'curriculum', title: 'KICD CBC Science & Technology Curriculum',             url: 'https://kicd.ac.ke/curriculum-designs/', badge: 'Official' },
    ],
  },
  {
    subject: 'Physics',
    grade: 'Grade 7–9',
    icon: '⚡',
    from: '#0c4a6e',
    to: '#0ea5e9',
    strand: 'Motion, Forces, Energy & Waves',
    resources: [
      { type: 'video',      title: 'CBC Grade 9 Physics — Forces & Newton Laws',          url: 'https://www.youtube.com/results?search_query=CBC+Grade+9+Physics+Forces+Newton+Laws+Kenya', badge: 'Video' },
      { type: 'video',      title: 'CBC Grade 8 Science — Energy & its Transformation',   url: 'https://www.youtube.com/results?search_query=CBC+Grade+8+Science+Energy+Transformation+Kenya', badge: 'Video' },
      { type: 'ebook',      title: 'KLB Physics — OpenStax University Physics',           url: 'https://openstax.org/books/university-physics-volume-1/pages/1-introduction', badge: 'Free PDF' },
      { type: 'assessment', title: 'CBC Physics Practical & Project Assessment',          url: 'https://kicd.ac.ke/curriculum-designs/', badge: 'Assessment' },
      { type: 'platform',   title: 'Khan Academy — Physics',                              url: 'https://www.khanacademy.org/science/physics', badge: 'Free' },
      { type: 'curriculum', title: 'KICD CBC Science & Technology Curriculum',            url: 'https://kicd.ac.ke/curriculum-designs/', badge: 'Official' },
    ],
  },
  {
    subject: 'Social Studies',
    grade: 'Grade 7–9',
    icon: '🏛️',
    from: '#7c2d12',
    to: '#f97316',
    strand: 'History, Government, Geography & Civics',
    resources: [
      { type: 'video',      title: 'CBC Grade 7 Social Studies — Kenya Physical Features', url: 'https://www.youtube.com/results?search_query=CBC+Grade+7+Social+Studies+Kenya+Physical+Features', badge: 'Video' },
      { type: 'video',      title: 'CBC Grade 9 History — Pre-Colonial Kenya Communities', url: 'https://www.youtube.com/results?search_query=CBC+Grade+9+History+PreColonial+Kenya+Communities', badge: 'Video' },
      { type: 'ebook',      title: 'Longman History — CK-12 Social Studies',              url: 'https://www.ck12.org/browse/#c/social-studies', badge: 'Free' },
      { type: 'assessment', title: 'CBC Social Studies Project & Portfolio Tasks',        url: 'https://kicd.ac.ke/curriculum-designs/', badge: 'Assessment' },
      { type: 'curriculum', title: 'KICD CBC Social Studies Curriculum',                  url: 'https://kicd.ac.ke/curriculum-designs/', badge: 'Official' },
    ],
  },
  {
    subject: 'Computer Science',
    grade: 'Grade 7–9',
    icon: '💻',
    from: '#1e1b4b',
    to: '#6366f1',
    strand: 'Programming, Digital Literacy & ICT',
    resources: [
      { type: 'video',      title: 'CBC Grade 8 Computer Science — Introduction to Coding', url: 'https://www.youtube.com/results?search_query=CBC+Grade+8+Computer+Science+Coding+Kenya', badge: 'Video' },
      { type: 'video',      title: 'CBC Grade 9 ICT — Database Design & Digital Tools',     url: 'https://www.youtube.com/results?search_query=CBC+Grade+9+ICT+Database+Digital+Tools+Kenya', badge: 'Video' },
      { type: 'ebook',      title: 'CS50 Harvard — Free Full Course',                       url: 'https://cs50.harvard.edu/x/', badge: 'Free' },
      { type: 'assessment', title: 'CBC ICT & Computer Science Portfolio Tasks',            url: 'https://kicd.ac.ke/curriculum-designs/', badge: 'Assessment' },
      { type: 'platform',   title: 'freeCodeCamp — Web & Programming',                     url: 'https://www.freecodecamp.org/', badge: 'Free' },
      { type: 'curriculum', title: 'KICD CBC ICT Curriculum Designs',                       url: 'https://kicd.ac.ke/curriculum-designs/', badge: 'Official' },
    ],
  },
  {
    subject: 'Business Studies',
    grade: 'Grade 7–9',
    icon: '💼',
    from: '#1e3a5f',
    to: '#64748b',
    strand: 'Commerce, Finance, Entrepreneurship & Trade',
    resources: [
      { type: 'video',      title: 'CBC Grade 9 Business — Entrepreneurship & Enterprise', url: 'https://www.youtube.com/results?search_query=CBC+Grade+9+Business+Studies+Entrepreneurship+Kenya', badge: 'Video' },
      { type: 'video',      title: 'CBC Grade 8 Business — Trade & Commerce Basics',        url: 'https://www.youtube.com/results?search_query=CBC+Grade+8+Business+Studies+Trade+Commerce+Kenya', badge: 'Video' },
      { type: 'ebook',      title: 'Business Studies — OpenStax Economics',                 url: 'https://openstax.org/books/principles-of-economics-3e/pages/1-introduction', badge: 'Free PDF' },
      { type: 'assessment', title: 'CBC Business Studies Portfolio & Project Tasks',        url: 'https://kicd.ac.ke/curriculum-designs/', badge: 'Assessment' },
      { type: 'curriculum', title: 'KICD CBC Business Curriculum Designs',                  url: 'https://kicd.ac.ke/curriculum-designs/', badge: 'Official' },
    ],
  },
  {
    subject: 'Agriculture',
    grade: 'Grade 7–9',
    icon: '🌱',
    from: '#052e16',
    to: '#16a34a',
    strand: 'Crop Production, Animal Husbandry & Agribusiness',
    resources: [
      { type: 'video',      title: 'CBC Grade 7 Agriculture — Crop Production & Soils',   url: 'https://www.youtube.com/results?search_query=CBC+Grade+7+Agriculture+Crop+Production+Kenya', badge: 'Video' },
      { type: 'video',      title: 'CBC Grade 9 Agriculture — Animal Husbandry Basics',   url: 'https://www.youtube.com/results?search_query=CBC+Grade+9+Agriculture+Animal+Husbandry+Kenya', badge: 'Video' },
      { type: 'ebook',      title: 'Agriculture & Nutrition — Kenya Education Cloud',      url: 'https://kec.ac.ke/', badge: 'Free' },
      { type: 'assessment', title: 'CBC Agriculture Farm Project Portfolio',               url: 'https://kicd.ac.ke/curriculum-designs/', badge: 'Assessment' },
      { type: 'curriculum', title: 'KICD CBC Agriculture Curriculum Designs',              url: 'https://kicd.ac.ke/curriculum-designs/', badge: 'Official' },
    ],
  },
  {
    subject: 'Creative Arts & Sports',
    grade: 'Grade 7–9',
    icon: '🎨',
    from: '#4c1d95',
    to: '#c084fc',
    strand: 'Visual Art, Music, Drama & Physical Education',
    resources: [
      { type: 'video',      title: 'CBC Grade 8 Creative Arts — Drawing & Design',         url: 'https://www.youtube.com/results?search_query=CBC+Grade+8+Creative+Arts+Drawing+Design+Kenya', badge: 'Video' },
      { type: 'video',      title: 'CBC Grade 9 Music — Kenyan Music & Instruments',       url: 'https://www.youtube.com/results?search_query=CBC+Grade+9+Music+Kenya+Instruments', badge: 'Video' },
      { type: 'platform',   title: 'Kenya Education Cloud — Arts Resources',               url: 'https://kec.ac.ke/', badge: 'Official' },
      { type: 'assessment', title: 'CBC Creative Arts Portfolio Assessment Guide',         url: 'https://kicd.ac.ke/curriculum-designs/', badge: 'Assessment' },
      { type: 'curriculum', title: 'KICD CBC Creative Arts Curriculum Designs',            url: 'https://kicd.ac.ke/curriculum-designs/', badge: 'Official' },
    ],
  },
  {
    subject: 'CBC Pre-Primary (PP1–PP2)',
    grade: 'Pre-Primary',
    icon: '🎨',
    from: '#701a75',
    to: '#d946ef',
    strand: 'Language, Numeracy, Environmental, Psychomotor',
    resources: [
      { type: 'platform',   title: 'Kenya Education Cloud — Pre-Primary',     url: 'https://kec.ac.ke/', badge: 'Official' },
      { type: 'video',      title: 'Pre-Primary Numeracy Activities — CBC',    url: 'https://www.youtube.com/results?search_query=CBC+Pre+Primary+Numeracy+Activities+Kenya', badge: 'Video' },
      { type: 'ebook',      title: 'CBC Pre-Primary Curriculum Guide — KICD',  url: 'https://kicd.ac.ke/curriculum-designs/', badge: 'Official' },
      { type: 'curriculum', title: 'KICD CBC Pre-Primary Curriculum Designs',  url: 'https://kicd.ac.ke/curriculum-designs/', badge: 'Official' },
    ],
  },
  {
    subject: 'CBC Grade 1–6 (Lower Primary)',
    grade: 'Grade 1–6',
    icon: '🏫',
    from: '#164e63',
    to: '#22d3ee',
    strand: 'Literacy, Numeracy, Environmental Activities',
    resources: [
      { type: 'platform',   title: 'Kenya Education Cloud — Grade 1–6',        url: 'https://kec.ac.ke/', badge: 'Official' },
      { type: 'platform',   title: 'KICD OER — Lower Primary Resources',       url: 'https://oer.kec.ac.ke/', badge: 'Official' },
      { type: 'video',      title: 'CBC Grade 4 Mathematical Activities',       url: 'https://www.youtube.com/results?search_query=CBC+Grade+4+Mathematics+Activities+Kenya', badge: 'Video' },
      { type: 'ebook',      title: 'CBC Grade 6 Science & Technology Guide',    url: 'https://kicd.ac.ke/curriculum-designs/', badge: 'Official' },
      { type: 'curriculum', title: 'KICD CBC Lower Primary Curriculum Designs', url: 'https://kicd.ac.ke/curriculum-designs/', badge: 'Official' },
    ],
  },
]

const TYPE_ICON: Record<CBCResource['type'], React.ReactNode> = {
  'video':      <Play size={11} className="text-rose-400" />,
  'ebook':      <BookOpen size={11} className="text-blue-400" />,
  'assessment': <FileText size={11} className="text-amber-400" />,
  'platform':   <Globe size={11} className="text-emerald-400" />,
  'curriculum': <FileText size={11} className="text-violet-400" />,
}
const TYPE_BADGE_STYLE: Record<CBCResource['type'], { bg: string; color: string }> = {
  'video':      { bg: 'rgba(239,68,68,0.12)',  color: '#fca5a5' },
  'ebook':      { bg: 'rgba(59,130,246,0.12)', color: '#93c5fd' },
  'assessment': { bg: 'rgba(245,158,11,0.12)', color: '#fcd34d' },
  'platform':   { bg: 'rgba(16,185,129,0.12)', color: '#34d399' },
  'curriculum': { bg: 'rgba(167,139,250,0.12)',color: '#c4b5fd' },
}

const ALL_SUBJECTS = ['All Subjects', ...CBC_SUBJECTS.map(s => s.subject)]

export default function ELearningCBCMaterialsPage() {
  const [selSubject, setSelSubject] = useState('All Subjects')
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState<CBCResource['type'] | 'all'>('all')
  const [expandedSubject, setExpandedSubject] = useState<string | null>(null)

  const filtered = CBC_SUBJECTS.filter(s => {
    const matchSubject = selSubject === 'All Subjects' || s.subject === selSubject
    const matchSearch = search === '' ||
      s.subject.toLowerCase().includes(search.toLowerCase()) ||
      s.strand.toLowerCase().includes(search.toLowerCase()) ||
      s.resources.some(r => r.title.toLowerCase().includes(search.toLowerCase()))
    return matchSubject && matchSearch
  })

  const types: Array<{ key: CBCResource['type'] | 'all'; label: string }> = [
    { key: 'all',         label: 'All Types' },
    { key: 'video',       label: 'Videos' },
    { key: 'ebook',       label: 'E-Books' },
    { key: 'assessment',  label: 'Assessments' },
    { key: 'platform',    label: 'Platforms' },
    { key: 'curriculum',  label: 'Curriculum' },
  ]

  const totalResources = filtered.reduce((n, s) => n + s.resources.filter(r => typeFilter === 'all' || r.type === typeFilter).length, 0)

  return (
    <div className="space-y-6">
      <PageHero
        badge="CBC KENYA"
        badgeColor="emerald"
        title="CBC Subject Materials"
        subtitle="Curated resources per subject — videos, e-books, past papers, platforms and KICD curriculum guides"
        icon="📚"
      />

      <div className="rounded-2xl p-4 flex flex-col sm:flex-row gap-3"
        style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)' }}>
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search subjects, topics or resource titles…"
            className="w-full pl-9 pr-4 py-2.5 rounded-xl text-sm text-white placeholder-slate-500 outline-none focus:ring-1 focus:ring-emerald-500/40"
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
          />
        </div>
        <select
          value={selSubject}
          onChange={e => setSelSubject(e.target.value)}
          className="rounded-xl px-3 py-2.5 text-sm text-slate-200 outline-none"
          style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
        >
          {ALL_SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <div className="flex items-center gap-1 flex-wrap">
          {types.map(t => (
            <button key={t.key} onClick={() => setTypeFilter(t.key)}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
              style={typeFilter === t.key
                ? { background: 'rgba(16,185,129,0.2)', color: '#34d399', border: '1px solid rgba(16,185,129,0.3)' }
                : { background: 'rgba(255,255,255,0.04)', color: '#64748b', border: '1px solid rgba(255,255,255,0.05)' }}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-2 text-xs text-slate-500">
        <BookOpen size={12} className="text-emerald-400" />
        <span>{filtered.length} subjects · {totalResources} resources shown</span>
      </div>

      <div className="space-y-4">
        {filtered.map(subject => {
          const isExpanded = expandedSubject === subject.subject || selSubject === subject.subject || search !== ''
          const visibleResources = subject.resources.filter(r => typeFilter === 'all' || r.type === typeFilter)

          return (
            <div key={subject.subject} className="rounded-2xl overflow-hidden transition-all"
              style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)' }}>

              <button
                className="w-full flex items-center gap-4 px-5 py-4 hover:bg-white/[0.02] transition-all"
                onClick={() => setExpandedSubject(isExpanded && selSubject === 'All Subjects' && search === '' ? null : subject.subject)}
              >
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0"
                  style={{ background: `linear-gradient(135deg, ${subject.from}, ${subject.to})` }}>
                  {subject.icon}
                </div>
                <div className="flex-1 text-left">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-sm font-bold text-white">{subject.subject}</h3>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold"
                      style={{ background: `${subject.from}25`, color: subject.to }}>
                      {subject.grade}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">{subject.strand}</p>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <span className="text-xs text-slate-600">{visibleResources.length} resource{visibleResources.length !== 1 ? 's' : ''}</span>
                  <ChevronRight size={14} className={`text-slate-600 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                </div>
              </button>

              {isExpanded && visibleResources.length > 0 && (
                <div className="px-5 pb-5 border-t" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mt-4">
                    {visibleResources.map((r, i) => {
                      const badgeStyle = TYPE_BADGE_STYLE[r.type]
                      return (
                        <div key={i} className="rounded-xl p-3 flex flex-col gap-2 group hover:border-slate-500 transition-all"
                          style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
                          <div className="flex items-start gap-2">
                            <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
                              style={{ background: badgeStyle.bg }}>
                              {TYPE_ICON[r.type]}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-semibold text-white leading-snug group-hover:text-emerald-300 transition-colors line-clamp-2">{r.title}</p>
                              <span className="mt-1 inline-block px-1.5 py-0.5 rounded text-[9px] font-bold"
                                style={{ background: badgeStyle.bg, color: badgeStyle.color }}>
                                {r.badge ?? r.type}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5 mt-auto">
                            <a href={r.url} target="_blank" rel="noopener noreferrer"
                              className="flex-1 py-1.5 rounded-lg text-center text-[10px] font-bold flex items-center justify-center gap-1 transition-all hover:opacity-90"
                              style={{ background: `${subject.from}25`, color: subject.to, border: `1px solid ${subject.from}40` }}>
                              <ExternalLink size={9} />
                              {r.type === 'video' ? 'Watch' : r.type === 'ebook' ? 'Read Free' : r.type === 'assessment' ? 'View Guide' : 'Open'}
                            </a>
                            {r.alt && (
                              <a href={r.alt} target="_blank" rel="noopener noreferrer"
                                className="py-1.5 px-2.5 rounded-lg text-[10px] font-bold flex items-center gap-1 transition-all hover:opacity-90"
                                style={{ background: 'rgba(16,185,129,0.1)', color: '#34d399', border: '1px solid rgba(16,185,129,0.2)' }}
                                title="Download free PDF">
                                <Download size={9} /> PDF
                              </a>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {isExpanded && visibleResources.length === 0 && (
                <div className="px-5 pb-5 pt-4 text-center text-xs text-slate-600 border-t" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
                  No resources match the current filter
                </div>
              )}
            </div>
          )
        })}
      </div>

      <div className="rounded-xl px-4 py-3 text-xs text-slate-400 flex items-center gap-2"
        style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
        <Globe size={12} className="text-emerald-400 flex-shrink-0" />
        <span>
          All resources are <strong className="text-slate-300">100% free</strong> and aligned with the{' '}
          <strong className="text-slate-300">Competency Based Curriculum (CBC)</strong> as designed by KICD.
          Official curriculum guides link to <strong className="text-slate-300">KICD</strong> — Kenya Institute of Curriculum Development.
          Content covers PP1 through Grade 9. No KCSE or KCPE content is included.
        </span>
      </div>
    </div>
  )
}
