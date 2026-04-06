import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Search, Download, Play, Book, FileText, ExternalLink, Youtube,
  Loader2, Globe, BookOpen, Library, ArrowRight, CheckCircle, Clock,
  GraduationCap, Layers, Microscope, Palette,
  TreePine, Bookmark, LayoutGrid,
} from 'lucide-react'
import PageHero from '../../components/PageHero'
import { apiClient } from '../../api/client'
import { cachedGet } from '../../api/cache'
import { resolveFileUrl } from '../../api/baseUrl'

type TabId = 'all' | 'videos' | 'books' | 'activities' | 'platforms' | 'library'

interface Material {
  id: number
  title: string
  material_type: string
  content: string
  file_url: string
  link_url: string
  course_name: string
  sequence: number
  is_active: boolean
  created_at: string
  course: number
}

interface LibraryBook {
  id: number
  title: string
  subtitle: string
  authors: string
  publisher: string
  publication_year: number | null
  isbn: string
  resource_type: string
  subjects: string
  language: string
  category_name: string
  total_copies: number
  available_copies: number
  is_active: boolean
}

const SUBJECT_COLORS: Record<string, { from: string; to: string; icon: string }> = {
  'Mathematics':     { from: '#1d4ed8', to: '#3b82f6', icon: '📐' },
  'Biology':         { from: '#166534', to: '#22c55e', icon: '🧬' },
  'Chemistry':       { from: '#581c87', to: '#a855f7', icon: '⚗️' },
  'Physics':         { from: '#0c4a6e', to: '#0ea5e9', icon: '⚡' },
  'English':         { from: '#065f46', to: '#10b981', icon: '📖' },
  'Kiswahili':       { from: '#92400e', to: '#f59e0b', icon: '🗣️' },
  'History':         { from: '#7c2d12', to: '#f97316', icon: '🏛️' },
  'Geography':       { from: '#14532d', to: '#84cc16', icon: '🌍' },
  'Computer':        { from: '#1e1b4b', to: '#6366f1', icon: '💻' },
  'Business':        { from: '#1e3a5f', to: '#64748b', icon: '💼' },
  'Agriculture':     { from: '#052e16', to: '#16a34a', icon: '🌱' },
  'Literature':      { from: '#065f46', to: '#10b981', icon: '📚' },
  'Science':         { from: '#0c4a6e', to: '#22d3ee', icon: '🔬' },
  'Creative Arts':   { from: '#701a75', to: '#d946ef', icon: '🎨' },
  'Social Studies':  { from: '#78350f', to: '#d97706', icon: '🏫' },
}

function getBookColors(book: LibraryBook) {
  const text = `${book.subjects} ${book.resource_type} ${book.category_name}`.toLowerCase()
  for (const [key, v] of Object.entries(SUBJECT_COLORS)) {
    if (text.includes(key.toLowerCase())) return v
  }
  return { from: '#1e293b', to: '#475569', icon: '📖' }
}

const SUBJECTS = [
  'All Subjects', 'Mathematics', 'English', 'Kiswahili', 'Biology', 'Chemistry',
  'Physics', 'History', 'Geography', 'Computer Studies', 'Business Studies',
  'Agriculture', 'Creative Arts & Design', 'Social Studies', 'Pre-Primary',
]

const LEVEL_COLORS: Record<string, { bg: string; color: string }> = {
  'Pre-Primary':        { bg: 'rgba(217,70,239,0.15)', color: '#e879f9' },
  'Lower Primary':      { bg: 'rgba(20,184,166,0.15)', color: '#2dd4bf' },
  'Upper Primary':      { bg: 'rgba(59,130,246,0.15)', color: '#60a5fa' },
  'Junior Secondary':   { bg: 'rgba(16,185,129,0.15)', color: '#34d399' },
}

interface Video {
  id: number
  title: string
  subject: string
  level: string
  duration: string
  channel: string
  youtubeId: string
  searchQ: string
  from: string
  to: string
  source: 'YouTube' | 'KEC' | 'KICD'
}

const VIDEOS: Video[] = [
  { id: 1,  title: 'CBC Grade 7 Mathematics — Introduction to Algebra', subject: 'Mathematics', level: 'Junior Secondary', duration: '38 min', channel: 'Elimu Channel Kenya', youtubeId: 'xGXLkSCDZLg', searchQ: 'CBC Grade 7 Mathematics Algebra Kenya Junior Secondary', from: '#1d4ed8', to: '#3b82f6', source: 'YouTube' },
  { id: 2,  title: 'CBC Grade 4 English — Comprehension & Vocabulary', subject: 'English', level: 'Upper Primary', duration: '24 min', channel: 'KEC Kenya Official', youtubeId: 'jNJyXj8KpyA', searchQ: 'CBC Grade 4 English Comprehension Vocabulary Kenya Upper Primary', from: '#065f46', to: '#10b981', source: 'YouTube' },
  { id: 3,  title: 'CBC Grade 1 Literacy — Letter Sounds & Phonics', subject: 'English', level: 'Lower Primary', duration: '18 min', channel: 'CBC Kenya Lessons', youtubeId: 'BWIiSr_Cang', searchQ: 'CBC Grade 1 Literacy Letter Sounds Phonics Kenya', from: '#064e3b', to: '#059669', source: 'YouTube' },
  { id: 4,  title: 'CBC Pre-Primary — Counting Numbers 1–20', subject: 'Mathematics', level: 'Pre-Primary', duration: '12 min', channel: 'Elimu Kwa Watoto', youtubeId: 'O0cFnZVkpQY', searchQ: 'CBC Pre-Primary Counting Numbers 1 to 20 Kenya PP2', from: '#701a75', to: '#d946ef', source: 'YouTube' },
  { id: 5,  title: 'CBC Grade 8 Science & Technology — Living Things', subject: 'Biology', level: 'Junior Secondary', duration: '42 min', channel: 'Science Hub Kenya', youtubeId: '2Lsg5iLM5fk', searchQ: 'CBC Grade 8 Science Technology Living Things Kenya Junior Secondary', from: '#166534', to: '#22c55e', source: 'YouTube' },
  { id: 6,  title: 'CBC Grade 5 Social Studies — Kenya\'s Physical Features', subject: 'Social Studies', level: 'Upper Primary', duration: '30 min', channel: 'Geo Kenya', youtubeId: 'mXaad0rsV38', searchQ: 'CBC Grade 5 Social Studies Kenya Physical Features Geography', from: '#78350f', to: '#d97706', source: 'YouTube' },
  { id: 7,  title: 'CBC Grade 7 Kiswahili — Sarufi na Msamiati', subject: 'Kiswahili', level: 'Junior Secondary', duration: '32 min', channel: 'Kiswahili Mastery', youtubeId: 'FXe7ZeIg9sg', searchQ: 'CBC Grade 7 Kiswahili Sarufi Msamiati Junior Secondary Kenya', from: '#92400e', to: '#f59e0b', source: 'YouTube' },
  { id: 8,  title: 'CBC Grade 6 Integrated Science — Matter & Materials', subject: 'Science', level: 'Upper Primary', duration: '28 min', channel: 'Science Hub Kenya', youtubeId: 'hFAOXdXZ5TM', searchQ: 'CBC Grade 6 Integrated Science Matter Materials Kenya', from: '#0c4a6e', to: '#0ea5e9', source: 'YouTube' },
  { id: 9,  title: 'CBC Grade 9 Mathematics — Linear Equations & Graphs', subject: 'Mathematics', level: 'Junior Secondary', duration: '45 min', channel: 'Elimu Channel Kenya', youtubeId: 'rowWM-MijXU', searchQ: 'CBC Grade 9 Mathematics Linear Equations Graphs Junior Secondary Kenya', from: '#1d4ed8', to: '#818cf8', source: 'YouTube' },
  { id: 10, title: 'CBC Grade 3 Environmental Activities — Plants & Animals', subject: 'Science', level: 'Lower Primary', duration: '20 min', channel: 'CBC Kenya Lessons', youtubeId: 'rfscVS0vtbw', searchQ: 'CBC Grade 3 Environmental Activities Plants Animals Kenya Lower Primary', from: '#052e16', to: '#16a34a', source: 'YouTube' },
  { id: 11, title: 'CBC Grade 8 Computer Science — Introduction to Programming', subject: 'Computer Studies', level: 'Junior Secondary', duration: '50 min', channel: 'CodeKenya', youtubeId: 'rfscVS0vtbw', searchQ: 'CBC Grade 8 Computer Science Programming Kenya Junior Secondary', from: '#1e1b4b', to: '#6366f1', source: 'YouTube' },
  { id: 12, title: 'CBC Grade 4 Creative Arts — Drawing & Patterns', subject: 'Creative Arts', level: 'Upper Primary', duration: '22 min', channel: 'Art for Kids Kenya', youtubeId: '8cCn2TNQZM0', searchQ: 'CBC Grade 4 Creative Arts Drawing Patterns Kenya Upper Primary', from: '#701a75', to: '#e879f9', source: 'YouTube' },
  { id: 13, title: 'CBC Pre-Primary — Shapes, Colours & Sorting', subject: 'Mathematics', level: 'Pre-Primary', duration: '15 min', channel: 'Elimu Kwa Watoto', youtubeId: 'v1fVGaqTFgM', searchQ: 'CBC Pre-Primary Shapes Colours Sorting Kenya PP1 PP2', from: '#701a75', to: '#a855f7', source: 'YouTube' },
  { id: 14, title: 'CBC Grade 7 Agriculture — Crop Production Basics', subject: 'Agriculture', level: 'Junior Secondary', duration: '35 min', channel: 'Agri Kenya', youtubeId: '8YVS_6sDCCE', searchQ: 'CBC Grade 7 Agriculture Crop Production Kenya Junior Secondary', from: '#052e16', to: '#86efac', source: 'YouTube' },
  { id: 15, title: 'CBC Grade 2 Mathematics — Addition & Subtraction Stories', subject: 'Mathematics', level: 'Lower Primary', duration: '17 min', channel: 'CBC Kenya Lessons', youtubeId: 'O0cFnZVkpQY', searchQ: 'CBC Grade 2 Mathematics Addition Subtraction Stories Kenya Lower Primary', from: '#1d4ed8', to: '#93c5fd', source: 'YouTube' },
  { id: 16, title: 'CBC Grade 9 Business Studies — Entrepreneurship & Trade', subject: 'Business Studies', level: 'Junior Secondary', duration: '40 min', channel: 'Business Hub Kenya', youtubeId: '8cCn2TNQZM0', searchQ: 'CBC Grade 9 Business Studies Entrepreneurship Trade Kenya Junior Secondary', from: '#1e3a5f', to: '#64748b', source: 'YouTube' },
]

interface CBCBook {
  id: number
  title: string
  subject: string
  level: 'Pre-Primary' | 'Lower Primary' | 'Upper Primary' | 'Junior Secondary'
  grade: string
  publisher: string
  icon: string
  from: string
  to: string
  url: string
  source: string
  badge: string
  pages?: number
  year?: number
}

const CBC_BOOKS: CBCBook[] = [
  { id: 1,  title: 'CBC PP1 Activity Book — Language & Literacy', subject: 'English', level: 'Pre-Primary', grade: 'PP1', publisher: 'KICD Kenya', icon: '🎨', from: '#701a75', to: '#d946ef', url: 'https://kicd.ac.ke/curriculum-designs/', source: 'KICD OER', badge: 'Official Free', year: 2022 },
  { id: 2,  title: 'CBC PP2 Mathematical Activities Book', subject: 'Mathematics', level: 'Pre-Primary', grade: 'PP2', publisher: 'Kenya Edu Cloud', icon: '🔢', from: '#701a75', to: '#c026d3', url: 'https://kec.ac.ke/', source: 'KEC Portal', badge: 'Free Access', year: 2022 },
  { id: 3,  title: 'CBC PP1 Environmental Activities Book', subject: 'Science', level: 'Pre-Primary', grade: 'PP1', publisher: 'KICD Kenya', icon: '🌸', from: '#4c1d95', to: '#8b5cf6', url: 'https://kicd.ac.ke/curriculum-designs/', source: 'KICD OER', badge: 'Official Free', year: 2023 },
  { id: 4,  title: 'CBC PP2 Psychomotor & Creative Activities', subject: 'Creative Arts', level: 'Pre-Primary', grade: 'PP2', publisher: 'Kenya Edu Cloud', icon: '🎭', from: '#701a75', to: '#e879f9', url: 'https://kec.ac.ke/', source: 'KEC Portal', badge: 'Free Access', year: 2023 },

  { id: 5,  title: 'CBC Grade 1 Literacy & Language Activities', subject: 'English', level: 'Lower Primary', grade: 'Grade 1', publisher: 'Kenya Edu Cloud', icon: '📖', from: '#065f46', to: '#10b981', url: 'https://oer.kec.ac.ke/', source: 'OER Kenya', badge: 'Free Download', year: 2022, pages: 120 },
  { id: 6,  title: 'CBC Grade 2 Mathematical Activities', subject: 'Mathematics', level: 'Lower Primary', grade: 'Grade 2', publisher: 'Kenya Edu Cloud', icon: '🔢', from: '#1d4ed8', to: '#60a5fa', url: 'https://oer.kec.ac.ke/', source: 'OER Kenya', badge: 'Free Download', year: 2022, pages: 132 },
  { id: 7,  title: 'CBC Grade 3 Environmental Activities', subject: 'Science', level: 'Lower Primary', grade: 'Grade 3', publisher: 'Kenya Edu Cloud', icon: '🌿', from: '#052e16', to: '#16a34a', url: 'https://oer.kec.ac.ke/', source: 'OER Kenya', badge: 'Free Download', year: 2023, pages: 110 },
  { id: 8,  title: 'CBC Grade 2 Kiswahili — Lugha na Mawasiliano', subject: 'Kiswahili', level: 'Lower Primary', grade: 'Grade 2', publisher: 'Kenya Edu Cloud', icon: '🗣️', from: '#92400e', to: '#f59e0b', url: 'https://oer.kec.ac.ke/', source: 'OER Kenya', badge: 'Free Download', year: 2022, pages: 115 },
  { id: 9,  title: 'CBC Grade 1 Creative Arts & Crafts', subject: 'Creative Arts', level: 'Lower Primary', grade: 'Grade 1', publisher: 'KICD Kenya', icon: '🎨', from: '#701a75', to: '#e879f9', url: 'https://kicd.ac.ke/curriculum-designs/', source: 'KICD OER', badge: 'Official Free', year: 2022, pages: 96 },
  { id: 10, title: 'CBC Grade 3 Religious Education (CRE)', subject: 'Social Studies', level: 'Lower Primary', grade: 'Grade 3', publisher: 'KICD Kenya', icon: '📿', from: '#78350f', to: '#d97706', url: 'https://kicd.ac.ke/curriculum-designs/', source: 'KICD OER', badge: 'Official Free', year: 2023, pages: 88 },

  { id: 11, title: 'CBC Grade 4 English — Language Activities', subject: 'English', level: 'Upper Primary', grade: 'Grade 4', publisher: 'Kenya Edu Cloud', icon: '📖', from: '#065f46', to: '#059669', url: 'https://oer.kec.ac.ke/', source: 'OER Kenya', badge: 'Free Download', year: 2023, pages: 180 },
  { id: 12, title: 'CBC Grade 5 Mathematics', subject: 'Mathematics', level: 'Upper Primary', grade: 'Grade 5', publisher: 'Kenya Edu Cloud', icon: '📐', from: '#1d4ed8', to: '#3b82f6', url: 'https://oer.kec.ac.ke/', source: 'OER Kenya', badge: 'Free Download', year: 2023, pages: 210 },
  { id: 13, title: 'CBC Grade 6 Integrated Science', subject: 'Science', level: 'Upper Primary', grade: 'Grade 6', publisher: 'Kenya Edu Cloud', icon: '🔬', from: '#0c4a6e', to: '#22d3ee', url: 'https://oer.kec.ac.ke/', source: 'OER Kenya', badge: 'Free Download', year: 2023, pages: 198 },
  { id: 14, title: 'CBC Grade 4 Social Studies — Kenya & East Africa', subject: 'Social Studies', level: 'Upper Primary', grade: 'Grade 4', publisher: 'KICD Kenya', icon: '🌍', from: '#78350f', to: '#f59e0b', url: 'https://kicd.ac.ke/curriculum-designs/', source: 'KICD OER', badge: 'Official Free', year: 2022, pages: 165 },
  { id: 15, title: 'CBC Grade 5 Kiswahili — Ufahamu na Uandishi', subject: 'Kiswahili', level: 'Upper Primary', grade: 'Grade 5', publisher: 'Kenya Edu Cloud', icon: '🗣️', from: '#92400e', to: '#f59e0b', url: 'https://oer.kec.ac.ke/', source: 'OER Kenya', badge: 'Free Download', year: 2023, pages: 155 },
  { id: 16, title: 'CBC Grade 6 Agriculture — Farming Activities', subject: 'Agriculture', level: 'Upper Primary', grade: 'Grade 6', publisher: 'Kenya Edu Cloud', icon: '🌱', from: '#052e16', to: '#16a34a', url: 'https://oer.kec.ac.ke/', source: 'OER Kenya', badge: 'Free Download', year: 2023, pages: 140 },
  { id: 17, title: 'CBC Grade 5 Creative Arts & Design', subject: 'Creative Arts', level: 'Upper Primary', grade: 'Grade 5', publisher: 'KICD Kenya', icon: '🖌️', from: '#701a75', to: '#d946ef', url: 'https://kicd.ac.ke/curriculum-designs/', source: 'KICD OER', badge: 'Official Free', year: 2022, pages: 130 },
  { id: 18, title: 'CBC Grade 6 Pre-Technical Studies', subject: 'Computer Studies', level: 'Upper Primary', grade: 'Grade 6', publisher: 'Kenya Edu Cloud', icon: '🛠️', from: '#1e1b4b', to: '#6366f1', url: 'https://oer.kec.ac.ke/', source: 'OER Kenya', badge: 'Free Download', year: 2023, pages: 120 },

  { id: 19, title: 'CBC Grade 7 Mathematics — Junior Secondary', subject: 'Mathematics', level: 'Junior Secondary', grade: 'Grade 7', publisher: 'Kenya Edu Cloud', icon: '📐', from: '#1d4ed8', to: '#3b82f6', url: 'https://oer.kec.ac.ke/', source: 'OER Kenya', badge: 'Free Download', year: 2024, pages: 260 },
  { id: 20, title: 'CBC Grade 8 English — Language & Communication', subject: 'English', level: 'Junior Secondary', grade: 'Grade 8', publisher: 'Kenya Edu Cloud', icon: '📖', from: '#065f46', to: '#10b981', url: 'https://oer.kec.ac.ke/', source: 'OER Kenya', badge: 'Free Download', year: 2024, pages: 248 },
  { id: 21, title: 'CBC Grade 7 Integrated Science', subject: 'Science', level: 'Junior Secondary', grade: 'Grade 7', publisher: 'Kenya Edu Cloud', icon: '🔬', from: '#0c4a6e', to: '#22d3ee', url: 'https://oer.kec.ac.ke/', source: 'OER Kenya', badge: 'Free Download', year: 2024, pages: 280 },
  { id: 22, title: 'CBC Grade 9 Kiswahili — Fasihi na Lugha', subject: 'Kiswahili', level: 'Junior Secondary', grade: 'Grade 9', publisher: 'Kenya Edu Cloud', icon: '🗣️', from: '#92400e', to: '#f59e0b', url: 'https://oer.kec.ac.ke/', source: 'OER Kenya', badge: 'Free Download', year: 2024, pages: 220 },
  { id: 23, title: 'CBC Grade 8 Business Studies & Entrepreneurship', subject: 'Business Studies', level: 'Junior Secondary', grade: 'Grade 8', publisher: 'KICD Kenya', icon: '💼', from: '#1e3a5f', to: '#475569', url: 'https://kicd.ac.ke/curriculum-designs/', source: 'KICD OER', badge: 'Official Free', year: 2024, pages: 200 },
  { id: 24, title: 'CBC Grade 9 Computer Science & Digital Literacy', subject: 'Computer Studies', level: 'Junior Secondary', grade: 'Grade 9', publisher: 'KICD Kenya', icon: '💻', from: '#1e1b4b', to: '#6366f1', url: 'https://kicd.ac.ke/curriculum-designs/', source: 'KICD OER', badge: 'Official Free', year: 2024, pages: 210 },
  { id: 25, title: 'CBC Grade 7 Creative Arts & Sports', subject: 'Creative Arts', level: 'Junior Secondary', grade: 'Grade 7', publisher: 'Kenya Edu Cloud', icon: '⚽', from: '#701a75', to: '#d946ef', url: 'https://oer.kec.ac.ke/', source: 'OER Kenya', badge: 'Free Download', year: 2024, pages: 160 },
  { id: 26, title: 'CBC Grade 8 Agriculture & Nutrition', subject: 'Agriculture', level: 'Junior Secondary', grade: 'Grade 8', publisher: 'Kenya Edu Cloud', icon: '🌱', from: '#052e16', to: '#16a34a', url: 'https://oer.kec.ac.ke/', source: 'OER Kenya', badge: 'Free Download', year: 2024, pages: 190 },
]

interface CBCActivity {
  id: number
  title: string
  subject: string
  level: string
  type: 'Formative Assessment' | 'Summative Assessment' | 'Portfolio Task' | 'Project Work' | 'CBA'
  grade: string
  from: string
  to: string
  icon: string
  url: string
  description: string
}

const CBC_ACTIVITIES: CBCActivity[] = [
  { id: 1,  title: 'Grade 7 Mathematics — CBA Formative Tasks', subject: 'Mathematics', level: 'Junior Secondary', type: 'CBA', grade: 'Grade 7', from: '#1d4ed8', to: '#3b82f6', icon: '📐', url: 'https://kicd.ac.ke/curriculum-designs/', description: 'Competency-based assessments designed for Junior Secondary — algebra, statistics and geometry tasks.' },
  { id: 2,  title: 'Grade 5 Integrated Science — Project Work Guide', subject: 'Science', level: 'Upper Primary', type: 'Project Work', grade: 'Grade 5', from: '#0c4a6e', to: '#22d3ee', icon: '🔬', url: 'https://oer.kec.ac.ke/', description: 'Practical science project activities aligned with CBC strands — investigations, observation and report writing.' },
  { id: 3,  title: 'Grade 3 Literacy Portfolio Tasks', subject: 'English', level: 'Lower Primary', type: 'Portfolio Task', grade: 'Grade 3', from: '#065f46', to: '#10b981', icon: '📖', url: 'https://kec.ac.ke/', description: 'Reading, writing and speaking portfolio templates for lower primary learners.' },
  { id: 4,  title: 'Grade 8 Social Studies — Summative Assessment', subject: 'Social Studies', level: 'Junior Secondary', type: 'Summative Assessment', grade: 'Grade 8', from: '#78350f', to: '#d97706', icon: '🌍', url: 'https://kicd.ac.ke/curriculum-designs/', description: 'End-of-term summative tasks for Social Studies: history of Kenya, East Africa and civic education.' },
  { id: 5,  title: 'Grade 6 Creative Arts — Performance Task', subject: 'Creative Arts', level: 'Upper Primary', type: 'Formative Assessment', grade: 'Grade 6', from: '#701a75', to: '#d946ef', icon: '🎨', url: 'https://oer.kec.ac.ke/', description: 'Creativity-based formative tasks: drawing, crafts, music and movement assessed against CBC criteria.' },
  { id: 6,  title: 'Grade 9 Business Studies — Entrepreneurship Project', subject: 'Business Studies', level: 'Junior Secondary', type: 'Project Work', grade: 'Grade 9', from: '#1e3a5f', to: '#475569', icon: '💼', url: 'https://kicd.ac.ke/curriculum-designs/', description: 'Business plan project — learners identify a need, develop a product idea and present a mini business case.' },
  { id: 7,  title: 'Grade 4 Agriculture — Farm Visit Report', subject: 'Agriculture', level: 'Upper Primary', type: 'Portfolio Task', grade: 'Grade 4', from: '#052e16', to: '#16a34a', icon: '🌱', url: 'https://oer.kec.ac.ke/', description: 'Observation task — learners visit a local farm, record findings and present an environmental report.' },
  { id: 8,  title: 'Grade 7 ICT — Digital Literacy CBA Tasks', subject: 'Computer Studies', level: 'Junior Secondary', type: 'CBA', grade: 'Grade 7', from: '#1e1b4b', to: '#6366f1', icon: '💻', url: 'https://kicd.ac.ke/curriculum-designs/', description: 'Computer competency tasks: word processing, spreadsheets, internet safety and basic programming activities.' },
]

const FREE_PLATFORMS = [
  { name: 'Kenya Education Cloud', short: 'KEC', desc: 'Official KICD/KEC CBC platform — free curriculum, radio lessons, e-books and OER for all levels from PP1 to Grade 9.', url: 'https://kec.ac.ke/', icon: '🇰🇪', color: '#10b981', tag: 'Official · Free', cbcBadge: true },
  { name: 'KICD OER Portal', short: 'OER', desc: 'Openly licensed CBC textbooks, activity books and teaching guides — freely usable by all schools.', url: 'https://oer.kec.ac.ke/', icon: '📂', color: '#6366f1', tag: 'Open License', cbcBadge: true },
  { name: 'Khan Academy', short: 'KA', desc: 'World-class free math, science and computing — aligns strongly with CBC Junior Secondary strands.', url: 'https://www.khanacademy.org/', icon: '🌐', color: '#14b8a6', tag: 'Free Forever', cbcBadge: false },
  { name: 'CK-12 Foundation', short: 'CK12', desc: 'Free digital textbooks, simulations and practice problems for Science, Mathematics and Social Studies.', url: 'https://www.ck12.org/', icon: '📗', color: '#f59e0b', tag: 'Free Textbooks', cbcBadge: false },
  { name: 'Elimuspace Kenya', short: 'ES', desc: 'Kenyan CBC revision materials, notes and videos curated for all grades — built for local learners.', url: 'https://elimuspace.co.ke/', icon: '🎓', color: '#0ea5e9', tag: 'Kenya Focused', cbcBadge: true },
  { name: 'OpenStax Free Books', short: 'OS', desc: 'Peer-reviewed, freely downloadable university-level textbooks — useful for Grade 9 and teacher references.', url: 'https://openstax.org/', icon: '🔓', color: '#ef4444', tag: 'Free PDF Download', cbcBadge: false },
  { name: 'BBC Learning English', short: 'BBC', desc: 'Trusted English lessons — vocabulary, grammar, pronunciation — aligns with CBC English communication strand.', url: 'https://www.bbc.co.uk/learningenglish/', icon: '🇬🇧', color: '#dc2626', tag: 'Free · Audio & Video', cbcBadge: false },
  { name: 'CS50 Harvard (Free)', short: 'CS50', desc: 'Harvard\'s free Computer Science certificate course — ideal for CBC Grade 9 Digital Literacy & ICT.', url: 'https://cs50.harvard.edu/x/', icon: '💻', color: '#64748b', tag: 'Free Certificate', cbcBadge: false },
]

const LEVEL_BAND_ICONS: Record<string, React.ElementType> = {
  'Pre-Primary':      Palette,
  'Lower Primary':    GraduationCap,
  'Upper Primary':    Layers,
  'Junior Secondary': Microscope,
}

function GlassCard({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-2xl border transition-all ${className}`}
      style={{ background: 'rgba(255,255,255,0.025)', borderColor: 'rgba(255,255,255,0.07)' }}>
      {children}
    </div>
  )
}

function LevelBadge({ level }: { level: string }) {
  const s = LEVEL_COLORS[level] ?? { bg: 'rgba(100,116,139,0.15)', color: '#94a3b8' }
  return (
    <span className="inline-block px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wide"
      style={{ background: s.bg, color: s.color }}>{level}</span>
  )
}

function VideoCard({ v }: { v: Video }) {
  const [thumbError, setThumbError] = useState(false)
  const thumbUrl = `https://img.youtube.com/vi/${v.youtubeId}/hqdefault.jpg`
  const ytSearchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(v.searchQ)}`
  const href = ytSearchUrl

  return (
    <GlassCard className="overflow-hidden hover:border-rose-500/30 cursor-pointer group">
      <a href={href} target="_blank" rel="noopener noreferrer">
        <div className="h-36 relative flex items-center justify-center overflow-hidden">
          {!thumbError ? (
            <img src={thumbUrl} alt={v.title}
              className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              onError={() => setThumbError(true)} />
          ) : (
            <div className="absolute inset-0" style={{ background: `linear-gradient(135deg, ${v.from}, ${v.to})` }} />
          )}
          <div className="relative z-10 w-14 h-14 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center group-hover:scale-110 transition-transform shadow-xl">
            <Play size={22} className="text-white ml-0.5" fill="white" />
          </div>
          <div className="absolute bottom-2 right-2 px-2 py-0.5 rounded-md text-xs font-bold bg-black/70 text-white">{v.duration}</div>
          <div className="absolute top-2 left-2">
            <LevelBadge level={v.level} />
          </div>
          <div className="absolute top-2 right-2 flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-red-600/90 text-white">
            <Youtube size={9} /> YouTube
          </div>
        </div>
        <div className="p-4">
          <p className="text-sm font-bold text-white leading-snug group-hover:text-rose-300 transition-colors line-clamp-2">{v.title}</p>
          <div className="flex items-center justify-between mt-2">
            <span className="text-xs text-slate-400">{v.channel}</span>
          </div>
          <span className="mt-2 inline-block px-2 py-0.5 rounded-md text-[10px] font-semibold" style={{ background: 'rgba(239,68,68,0.15)', color: '#fca5a5' }}>{v.subject}</span>
        </div>
      </a>
    </GlassCard>
  )
}

const LEVEL_BANDS = ['Pre-Primary', 'Lower Primary', 'Upper Primary', 'Junior Secondary'] as const
type LevelBand = typeof LEVEL_BANDS[number]

export default function ELearningMaterialsPage() {
  const navigate = useNavigate()
  const [materials, setMaterials] = useState<Material[]>([])
  const [loadingMaterials, setLoadingMaterials] = useState(true)
  const [libraryBooks, setLibraryBooks] = useState<LibraryBook[]>([])
  const [loadingLibrary, setLoadingLibrary] = useState(true)
  const [tab, setTab] = useState<TabId>('all')
  const [subject, setSubject] = useState('All Subjects')
  const [search, setSearch] = useState('')
  const [libSearch, setLibSearch] = useState('')
  const [libFilter, setLibFilter] = useState<'all' | 'available'>('all')
  const [bookLevel, setBookLevel] = useState<LevelBand | 'All'>('All')

  useEffect(() => {
    cachedGet<Material[] | { results?: Material[] }>('elearning/materials', () =>
      apiClient.get('/elearning/materials/').then(r => r.data as Material[] | { results?: Material[] }), 2 * 60_000)
      .then(data => setMaterials(Array.isArray(data) ? data : data.results ?? []))
      .catch(() => setMaterials([]))
      .finally(() => setLoadingMaterials(false))

    cachedGet<LibraryBook[] | { results?: LibraryBook[] }>('library/resources/300', () =>
      apiClient.get('/library/resources/?limit=300').then(r => r.data as LibraryBook[] | { results?: LibraryBook[] }), 3 * 60_000)
      .then(data => setLibraryBooks(Array.isArray(data) ? data : data.results ?? []))
      .catch(() => setLibraryBooks([]))
      .finally(() => setLoadingLibrary(false))
  }, [])

  const matchesSearch = (title: string, subj: string) =>
    (subject === 'All Subjects' || subj === subject) &&
    (search === '' || title.toLowerCase().includes(search.toLowerCase()))

  const showVideos     = tab === 'all' || tab === 'videos'
  const showBooks      = tab === 'all' || tab === 'books'
  const showActivities = tab === 'all' || tab === 'activities'
  const showPlatforms  = tab === 'all' || tab === 'platforms'
  const showSchoolDocs = tab === 'all'
  const showLibrary    = tab === 'all' || tab === 'library'

  const filteredVideos     = VIDEOS.filter(v => matchesSearch(v.title, v.subject))
  const filteredBooks      = CBC_BOOKS.filter(b =>
    matchesSearch(b.title, b.subject) && (bookLevel === 'All' || b.level === bookLevel))
  const filteredActivities = CBC_ACTIVITIES.filter(a => matchesSearch(a.title, a.subject))
  const filteredMaterials  = materials.filter(m =>
    m.is_active &&
    (search === '' || m.title.toLowerCase().includes(search.toLowerCase()) || m.course_name.toLowerCase().includes(search.toLowerCase()))
  )
  const filteredLibrary = libraryBooks.filter(b =>
    b.is_active &&
    (libFilter === 'all' || b.available_copies > 0) &&
    (libSearch === '' ||
      b.title.toLowerCase().includes(libSearch.toLowerCase()) ||
      (b.authors || '').toLowerCase().includes(libSearch.toLowerCase()) ||
      (b.subjects || '').toLowerCase().includes(libSearch.toLowerCase()) ||
      (b.category_name || '').toLowerCase().includes(libSearch.toLowerCase()))
  )

  const openMaterial = (m: Material) => {
    const raw = m.link_url || m.file_url || m.content
    if (!raw) return
    const url = resolveFileUrl(raw)
    window.open(url, '_blank', 'noopener,noreferrer')
  }

  const totalCount = filteredVideos.length + filteredBooks.length + filteredMaterials.length + filteredActivities.length + FREE_PLATFORMS.length + libraryBooks.length

  const TABS = [
    { id: 'all' as TabId,        label: 'All',             count: totalCount, icon: LayoutGrid },
    { id: 'videos' as TabId,     label: 'CBC Videos',      count: VIDEOS.length, icon: Play },
    { id: 'books' as TabId,      label: 'CBC Books',       count: CBC_BOOKS.length, icon: Book },
    { id: 'activities' as TabId, label: 'CBC Activities',  count: CBC_ACTIVITIES.length, icon: FileText },
    { id: 'platforms' as TabId,  label: 'Platforms',       count: FREE_PLATFORMS.length, icon: Globe },
    { id: 'library' as TabId,    label: 'Library Books',   count: libraryBooks.length, icon: Library },
  ]

  const booksByLevel = LEVEL_BANDS.map(band => ({
    band,
    books: filteredBooks.filter(b => b.level === band),
  })).filter(g => g.books.length > 0)

  return (
    <div className="space-y-6">
      <PageHero
        badge="CBC LEARNING HUB"
        badgeColor="violet"
        title="All CBC Materials"
        subtitle="Videos, free textbooks, CBC assessment activities and learning platforms — organized by grade level"
        icon="🌍"
      />

      <div className="rounded-3xl px-6 py-5 flex flex-wrap gap-4 items-center justify-between"
        style={{ background: 'linear-gradient(135deg,rgba(16,185,129,0.12) 0%,rgba(99,102,241,0.08) 100%)', border: '1px solid rgba(16,185,129,0.2)' }}>
        <div>
          <p className="text-sm font-bold text-emerald-300">CBC Kenya — Universal Free Access</p>
          <p className="text-xs text-slate-400 mt-0.5">All {VIDEOS.length} videos · {CBC_BOOKS.length} CBC books · {CBC_ACTIVITIES.length} assessment activities · {FREE_PLATFORMS.length} learning platforms · PP1 through Grade 9</p>
        </div>
        <div className="flex gap-3 text-center flex-wrap">
          {[
            ['📹', VIDEOS.length, 'Videos'],
            ['📚', CBC_BOOKS.length, 'Books'],
            ['📝', CBC_ACTIVITIES.length, 'Activities'],
            ['🌐', FREE_PLATFORMS.length, 'Platforms'],
          ].map(([icon, count, label]) => (
            <div key={label as string} className="rounded-xl px-3 py-2" style={{ background: 'rgba(255,255,255,0.06)' }}>
              <p className="text-lg font-bold text-white">{icon} {count}</p>
              <p className="text-[10px] text-slate-400 mt-0.5">{label}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex flex-wrap gap-2 flex-1">
          {TABS.map(t => {
            const Icon = t.icon
            return (
              <button key={t.id} onClick={() => setTab(t.id)}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all"
                style={tab === t.id
                  ? { background: '#10b981', color: '#fff' }
                  : { background: 'rgba(255,255,255,0.05)', color: '#94a3b8', border: '1px solid rgba(255,255,255,0.08)' }}>
                <Icon size={13} />
                {t.label}
                <span className="px-1.5 py-0.5 rounded-md text-xs" style={{ background: tab === t.id ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.1)' }}>
                  {t.count}
                </span>
              </button>
            )
          })}
        </div>
        <div className="flex gap-2">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search…"
              className="pl-9 pr-4 py-2.5 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 w-44"
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }} />
          </div>
          <select value={subject} onChange={e => setSubject(e.target.value)}
            className="px-3 py-2.5 rounded-xl text-sm focus:outline-none"
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#e2e8f0' }}>
            {SUBJECTS.map(s => <option key={s} value={s} style={{ background: '#1e293b' }}>{s}</option>)}
          </select>
        </div>
      </div>

      {showVideos && filteredVideos.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Youtube size={16} className="text-red-400" /> CBC Video Lessons
              <span className="text-xs text-slate-500">({filteredVideos.length}) — Opens on YouTube</span>
            </h2>
            <a href="https://www.youtube.com/results?search_query=CBC+Kenya+lessons+Grade" target="_blank" rel="noopener noreferrer"
              className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1 transition-colors">
              More CBC Videos <ExternalLink size={11} />
            </a>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredVideos.map(v => <VideoCard key={v.id} v={v} />)}
          </div>
        </section>
      )}

      {showBooks && filteredBooks.length > 0 && (
        <section>
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-4">
            <div className="flex items-center gap-2 flex-1">
              <Book size={16} className="text-emerald-400" />
              <h2 className="text-base font-bold text-white">CBC Free Textbooks & Activity Books</h2>
              <span className="text-xs text-slate-500">({filteredBooks.length}) — PP1 → Grade 9</span>
            </div>
            <div className="flex gap-1 flex-wrap">
              <button onClick={() => setBookLevel('All')}
                className="px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all"
                style={bookLevel === 'All' ? { background: '#10b981', color: '#fff' } : { background: 'rgba(255,255,255,0.05)', color: '#64748b', border: '1px solid rgba(255,255,255,0.07)' }}>
                All Levels
              </button>
              {LEVEL_BANDS.map(band => {
                const Icon = LEVEL_BAND_ICONS[band]
                const s = LEVEL_COLORS[band]
                return (
                  <button key={band} onClick={() => setBookLevel(band)}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all"
                    style={bookLevel === band ? { background: s.color, color: '#fff' } : { background: 'rgba(255,255,255,0.05)', color: '#64748b', border: '1px solid rgba(255,255,255,0.07)' }}>
                    <Icon size={10} /> {band}
                  </button>
                )
              })}
            </div>
          </div>
          {(bookLevel === 'All' ? booksByLevel : booksByLevel.filter(g => g.band === bookLevel)).map(group => (
            <div key={group.band} className="mb-6">
              <div className="flex items-center gap-2 mb-3">
                {(() => { const Icon = LEVEL_BAND_ICONS[group.band]; const s = LEVEL_COLORS[group.band]; return <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ background: s.bg }}><Icon size={12} style={{ color: s.color }} /></div> })()}
                <h3 className="text-sm font-bold text-slate-300">{group.band}</h3>
                <span className="text-xs text-slate-600">({group.books.length} books)</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                {group.books.map(b => (
                  <a key={b.id} href={b.url} target="_blank" rel="noopener noreferrer"
                    className="rounded-2xl border overflow-hidden hover:border-emerald-500/40 cursor-pointer group block transition-all"
                    style={{ background: 'rgba(255,255,255,0.025)', borderColor: 'rgba(255,255,255,0.07)' }}>
                    <div className="h-32 flex flex-col items-center justify-center p-4 relative" style={{ background: `linear-gradient(160deg, ${b.from}, ${b.to})` }}>
                      <span className="text-4xl">{b.icon}</span>
                      <div className="absolute top-2 right-2 px-1.5 py-0.5 rounded-md text-[9px] bg-black/60 text-emerald-300 font-bold">{b.badge}</div>
                      <div className="absolute bottom-2 left-2 px-1.5 py-0.5 rounded-md text-[9px] bg-black/60 text-white font-bold">{b.grade}</div>
                    </div>
                    <div className="p-3">
                      <p className="text-xs font-bold text-white leading-snug group-hover:text-emerald-300 transition-colors line-clamp-2">{b.title}</p>
                      <p className="text-[10px] text-slate-500 mt-1">{b.source}{b.pages ? ` · ${b.pages} pg` : ''}</p>
                      <div className="mt-2 w-full py-1.5 rounded-lg text-xs font-semibold text-center" style={{ background: 'rgba(16,185,129,0.15)', color: '#34d399' }}>
                        Open Free
                      </div>
                    </div>
                  </a>
                ))}
              </div>
            </div>
          ))}
          <div className="mt-2 rounded-xl px-4 py-3 text-xs text-slate-400 flex items-center gap-2"
            style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <BookOpen size={12} className="text-emerald-400 flex-shrink-0" />
            <span>All books link to <strong className="text-slate-300">Kenya Education Cloud (kec.ac.ke)</strong> and <strong className="text-slate-300">KICD OER Portal (oer.kec.ac.ke)</strong> — official free CBC textbook repositories. No login required.</span>
          </div>
        </section>
      )}

      {showActivities && filteredActivities.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Bookmark size={16} className="text-violet-400" /> CBC Assessments & Activities
              <span className="text-xs text-slate-500">({filteredActivities.length}) — Formative, Summative & CBA</span>
            </h2>
            <a href="https://kicd.ac.ke/curriculum-designs/" target="_blank" rel="noopener noreferrer"
              className="text-xs text-violet-400 hover:text-violet-300 flex items-center gap-1 transition-colors">
              KICD Official <ExternalLink size={11} />
            </a>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredActivities.map(a => (
              <a key={a.id} href={a.url} target="_blank" rel="noopener noreferrer"
                className="rounded-2xl border p-4 flex items-start gap-4 hover:border-violet-500/30 transition-all group"
                style={{ background: 'rgba(255,255,255,0.025)', borderColor: 'rgba(255,255,255,0.07)' }}>
                <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl flex-shrink-0"
                  style={{ background: `linear-gradient(135deg, ${a.from}, ${a.to})` }}>
                  {a.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-bold text-white leading-snug group-hover:text-violet-300 transition-colors">{a.title}</p>
                      <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold" style={{ background: 'rgba(139,92,246,0.15)', color: '#a78bfa' }}>{a.type}</span>
                        <LevelBadge level={a.level} />
                        <span className="text-[10px] text-slate-500">{a.grade}</span>
                      </div>
                    </div>
                    <ExternalLink size={13} className="text-slate-600 group-hover:text-violet-400 transition-colors flex-shrink-0 mt-0.5" />
                  </div>
                  <p className="text-xs text-slate-400 mt-2 leading-relaxed">{a.description}</p>
                </div>
              </a>
            ))}
          </div>
        </section>
      )}

      {showSchoolDocs && (loadingMaterials || filteredMaterials.length > 0) && (
        <section>
          <h2 className="text-base font-bold text-white mb-3 flex items-center gap-2">
            <FileText size={16} className="text-blue-400" /> School Study Notes & Documents
            <span className="text-xs text-slate-500">({filteredMaterials.length}) — School specific</span>
          </h2>
          {loadingMaterials ? (
            <div className="flex items-center justify-center py-8"><Loader2 size={24} className="text-blue-400 animate-spin" /></div>
          ) : filteredMaterials.length === 0 ? (
            <GlassCard className="p-6 text-center text-slate-500 text-sm">No school documents uploaded yet</GlassCard>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {filteredMaterials.map(m => (
                <GlassCard key={m.id} className="p-4 hover:border-slate-600 cursor-pointer">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(59,130,246,0.15)' }}>
                      <FileText size={22} className="text-blue-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-white truncate">{m.title}</p>
                      <p className="text-xs text-slate-400">{m.course_name}</p>
                      <p className="text-xs text-slate-500 mt-0.5">{m.material_type}</p>
                    </div>
                    <button onClick={() => openMaterial(m)} title={m.link_url || m.file_url ? 'Open resource' : 'No URL'}
                      className="flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center transition-all hover:bg-blue-500/20"
                      style={{ background: 'rgba(59,130,246,0.1)', opacity: m.link_url || m.file_url ? 1 : 0.4 }}>
                      <Download size={15} className="text-blue-400" />
                    </button>
                  </div>
                </GlassCard>
              ))}
            </div>
          )}
        </section>
      )}

      {showPlatforms && (
        <section>
          <h2 className="text-base font-bold text-white mb-3 flex items-center gap-2">
            <Globe size={16} className="text-indigo-400" /> Free Learning Platforms
            <span className="text-xs text-slate-500">({FREE_PLATFORMS.length}) — No login required for most</span>
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {FREE_PLATFORMS.map(p => (
              <a key={p.name} href={p.url} target="_blank" rel="noopener noreferrer"
                className="rounded-2xl border p-5 flex flex-col gap-3 hover:border-slate-500 transition-all group"
                style={{ background: 'rgba(255,255,255,0.025)', borderColor: 'rgba(255,255,255,0.07)' }}>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0" style={{ background: `${p.color}20` }}>
                    {p.icon}
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <p className="text-sm font-bold text-white group-hover:text-emerald-300 transition-colors">{p.name}</p>
                      {p.cbcBadge && (
                        <span className="px-1 py-0.5 rounded text-[8px] font-bold" style={{ background: 'rgba(16,185,129,0.2)', color: '#34d399' }}>CBC</span>
                      )}
                    </div>
                    <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-md" style={{ background: `${p.color}20`, color: p.color }}>{p.tag}</span>
                  </div>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed flex-1">{p.desc}</p>
                <div className="flex items-center gap-1 text-xs font-semibold" style={{ color: p.color }}>
                  <BookOpen size={12} /> Open Platform <ExternalLink size={10} className="ml-auto" />
                </div>
              </a>
            ))}
          </div>
        </section>
      )}

      {showLibrary && (
        <section>
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-4">
            <div className="flex items-center gap-2 flex-1">
              <Library size={16} className="text-emerald-400" />
              <h2 className="text-base font-bold text-white">Library Books</h2>
              <span className="text-xs text-slate-500">
                {loadingLibrary ? 'Loading...' : `(${filteredLibrary.length} of ${libraryBooks.length} books)`}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => setLibFilter('all')}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
                style={libFilter === 'all' ? { background: 'rgba(16,185,129,0.2)', color: '#34d399', border: '1px solid rgba(16,185,129,0.3)' } : { background: 'rgba(255,255,255,0.04)', color: '#94a3b8', border: '1px solid rgba(255,255,255,0.06)' }}>
                All Books
              </button>
              <button onClick={() => setLibFilter('available')}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
                style={libFilter === 'available' ? { background: 'rgba(16,185,129,0.2)', color: '#34d399', border: '1px solid rgba(16,185,129,0.3)' } : { background: 'rgba(255,255,255,0.04)', color: '#94a3b8', border: '1px solid rgba(255,255,255,0.06)' }}>
                <CheckCircle size={11} className="inline mr-1" />Available Now
              </button>
              <button onClick={() => navigate('/modules/library/catalog')}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all hover:bg-emerald-500/20"
                style={{ background: 'rgba(255,255,255,0.04)', color: '#10b981', border: '1px solid rgba(16,185,129,0.2)' }}>
                Full Catalog <ArrowRight size={11} />
              </button>
            </div>
          </div>

          {tab === 'library' && (
            <div className="mb-4 relative">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input value={libSearch} onChange={e => setLibSearch(e.target.value)}
                placeholder="Search by title, author, subject or category…"
                className="w-full pl-9 pr-4 py-2.5 rounded-xl text-sm text-white placeholder-slate-500 outline-none focus:ring-1 focus:ring-emerald-500/40"
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }} />
            </div>
          )}

          {loadingLibrary ? (
            <div className="flex items-center justify-center py-16 gap-3">
              <Loader2 className="animate-spin text-emerald-400" size={22} />
              <span className="text-sm text-slate-400">Fetching library catalog…</span>
            </div>
          ) : filteredLibrary.length === 0 ? (
            <div className="rounded-2xl flex flex-col items-center justify-center py-14 gap-3"
              style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
              <Library size={36} className="text-slate-600" />
              <p className="text-sm text-slate-400">
                {libraryBooks.length === 0 ? 'No library books found in the catalog' : 'No books match your search'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredLibrary.map(book => {
                const colors = getBookColors(book)
                const isAvailable = book.available_copies > 0
                return (
                  <div key={book.id} className="rounded-2xl flex flex-col overflow-hidden group transition-all hover:scale-[1.02]"
                    style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)' }}>
                    <div className="h-28 flex items-center justify-center text-4xl relative"
                      style={{ background: `linear-gradient(135deg, ${colors.from}, ${colors.to})` }}>
                      <span className="drop-shadow-lg">{colors.icon}</span>
                      <div className="absolute top-2 right-2">
                        {isAvailable ? (
                          <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold" style={{ background: 'rgba(0,0,0,0.45)', color: '#34d399' }}>
                            <CheckCircle size={9} /> {book.available_copies} avail.
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold" style={{ background: 'rgba(0,0,0,0.45)', color: '#fb923c' }}>
                            <Clock size={9} /> Out
                          </span>
                        )}
                      </div>
                      {book.resource_type && book.resource_type !== 'Book' && (
                        <div className="absolute bottom-2 left-2">
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold" style={{ background: 'rgba(0,0,0,0.45)', color: '#e2e8f0' }}>{book.resource_type}</span>
                        </div>
                      )}
                    </div>
                    <div className="p-3 flex flex-col gap-1.5 flex-1">
                      <p className="text-sm font-bold text-white leading-snug line-clamp-2 group-hover:text-emerald-300 transition-colors">{book.title}</p>
                      {book.authors && <p className="text-xs text-slate-400 truncate">{book.authors}</p>}
                      <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                        {book.category_name && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold" style={{ background: `${colors.from}30`, color: colors.to }}>{book.category_name}</span>
                        )}
                        {book.publication_year && <span className="text-[10px] text-slate-500">{book.publication_year}</span>}
                      </div>
                      {book.subjects && <p className="text-[10px] text-slate-500 truncate">{book.subjects}</p>}
                      <div className="mt-auto pt-2">
                        <button onClick={() => navigate('/modules/library/catalog')}
                          className="w-full py-1.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all hover:opacity-90"
                          style={isAvailable ? { background: 'rgba(16,185,129,0.15)', color: '#34d399', border: '1px solid rgba(16,185,129,0.25)' } : { background: 'rgba(255,255,255,0.04)', color: '#94a3b8', border: '1px solid rgba(255,255,255,0.08)' }}>
                          <Library size={11} />
                          {isAvailable ? 'Borrow Book' : 'Reserve Book'}
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          <div className="mt-4 rounded-xl px-4 py-3 text-xs text-slate-400 flex items-center gap-2"
            style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <Library size={12} className="text-emerald-400 flex-shrink-0" />
            <span>
              Showing live data from the <strong className="text-slate-300">school library catalog</strong>.
              Click <strong className="text-slate-300">Borrow Book</strong> or{' '}
              <button onClick={() => navigate('/modules/library/catalog')}
                className="text-emerald-400 underline hover:text-emerald-300 transition-colors">Full Catalog</button>{' '}
              to issue or reserve a copy.
            </span>
          </div>
        </section>
      )}

      <div className="rounded-xl px-4 py-3 text-xs text-slate-400 flex items-start gap-2"
        style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
        <TreePine size={12} className="text-emerald-400 flex-shrink-0 mt-0.5" />
        <span>
          All materials align with the <strong className="text-slate-300">Competency Based Curriculum (CBC)</strong> as designed by KICD.
          Videos link to YouTube searches for CBC Kenya content. Books link to <strong className="text-slate-300">kec.ac.ke</strong> and <strong className="text-slate-300">oer.kec.ac.ke</strong> — official free textbook portals covering PP1 through Grade 9.
          No KCSE or KCPE content is included in this system.
        </span>
      </div>
    </div>
  )
}
