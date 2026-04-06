import { useEffect, useState } from 'react'
import { apiClient } from '../../api/client'
import PageHero from '../../components/PageHero'

type StudentIdCardData = {
  id: number
  admission_number: string
  full_name: string
  photo_url?: string
  grade_level: string
  emergency_contact: string
}

export default function StudentIdCardsPage() {
  const [students, setStudents] = useState<StudentIdCardData[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Re-using students endpoint for ID card generation demo
    apiClient.get('/students/')
      .then(res => {
        const items = res.data.results || res.data
        setStudents(items.map((s: any) => ({
          id: s.id,
          admission_number: s.admission_number,
          full_name: `${s.first_name} ${s.last_name}`,
          photo_url: s.photo_url,
          grade_level: 'Grade 10', // Placeholder
          emergency_contact: '+254 700 000000' // Placeholder
        })))
      })
      .finally(() => setIsLoading(false))
  }, [])

  return (
    <div className="space-y-6 font-sans p-6 text-white">
      <PageHero
        badge="MODULE"
        badgeColor="emerald"
        title="Student ID Cards"
        subtitle="Preview and print student identification cards."
        icon="📋"
      />

      {isLoading ? (
        <div className="text-slate-300">Loading students...</div>
      ) : (
        <div className="grid gap-8 md:grid-cols-2 xl:grid-cols-3">
          {students.map((student) => (
            <div key={student.id} className="relative h-64 w-96 overflow-hidden rounded-2xl border border-white/[0.07] bg-[#0d1421] shadow-2xl transition hover:scale-[1.02] cursor-pointer">
              {/* Card Background Decoration */}
              <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-emerald-500/10 blur-3xl"></div>
              <div className="absolute -bottom-16 -left-16 h-48 w-48 rounded-full bg-blue-500/10 blur-3xl"></div>

              <div className="flex h-full flex-col p-6">
                <div className="flex items-start justify-between">
                  <div className="flex flex-col">
                    <span className="text-xs uppercase tracking-widest text-emerald-400 font-bold">Rynaty School</span>
                    <span className="text-[10px] text-slate-500 font-sans mt-0.5 uppercase tracking-tighter">Student Identification</span>
                  </div>
                  <div className="h-10 w-10 rounded-lg bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center">
                    <div className="h-6 w-6 rounded bg-emerald-400"></div>
                  </div>
                </div>

                <div className="mt-4 flex gap-4">
                  <div className="h-24 w-24 overflow-hidden rounded-xl border border-white/[0.09] bg-slate-950">
                    {student.photo_url ? (
                      <img src={student.photo_url} alt={student.full_name} className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full items-center justify-center text-slate-700">
                         <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                         </svg>
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col justify-center">
                    <h2 className="text-lg font-bold text-white font-sans">{student.full_name}</h2>
                    <p className="text-sm text-emerald-400 font-semibold font-sans mt-1">{student.grade_level}</p>
                    <p className="text-xs text-slate-400 font-sans mt-0.5">#{student.admission_number}</p>
                  </div>
                </div>

                <div className="mt-auto flex items-end justify-between">
                  <div>
                    <p className="text-[8px] uppercase tracking-wider text-slate-500 font-sans">Emergency Contact</p>
                    <p className="text-xs text-slate-300 font-sans mt-0.5">{student.emergency_contact}</p>
                  </div>
                  <div className="h-12 w-12 bg-white p-1 rounded">
                     {/* Placeholder for QR Code */}
                     <div className="h-full w-full border border-slate-300 grid grid-cols-3 grid-rows-3">
                        <div className="bg-black"></div><div></div><div className="bg-black"></div>
                        <div></div><div className="bg-black"></div><div></div>
                        <div className="bg-black"></div><div></div><div className="bg-black"></div>
                     </div>
                  </div>
                </div>
              </div>

              {/* Print Overlay */}
              <div className="absolute inset-0 flex items-center justify-center bg-slate-950/0 opacity-0 transition hover:bg-slate-950/60 hover:opacity-100">
                <button onClick={() => window.print()} className="rounded-xl bg-emerald-500 px-6 py-2 text-sm font-bold text-white shadow-lg">Print Card</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
