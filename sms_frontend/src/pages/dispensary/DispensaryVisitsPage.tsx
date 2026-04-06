import { useEffect, useState } from 'react';
import { Plus, Search, ChevronDown, ChevronUp, Pill } from 'lucide-react';
import { apiClient } from '../../api/client';
import PageHero from '../../components/PageHero'

interface Student { id: number; first_name: string; last_name: string; admission_number: string; }
interface Prescription {
  id?: number; medication_name: string; dosage: string; frequency: string;
  quantity_dispensed: number; unit: string; notes: string;
}
interface Visit {
  id: number; student: number; student_name: string; student_admission_number: string;
  visit_date: string; visit_time: string | null; complaint: string; diagnosis: string;
  treatment: string; attended_by_name: string; severity: string;
  parent_notified: boolean; referred: boolean; referred_to: string;
  follow_up_date: string | null; notes: string; created_at: string;
  prescriptions: Prescription[];
}
interface VisitForm {
  student: string; visit_date: string; visit_time: string; complaint: string;
  diagnosis: string; treatment: string; severity: string;
  parent_notified: boolean; referred: boolean; referred_to: string;
  follow_up_date: string; notes: string;
  prescriptions: Prescription[];
}

const BLANK_FORM: VisitForm = {
  student: '', visit_date: new Date().toISOString().slice(0, 10), visit_time: '', complaint: '',
  diagnosis: '', treatment: '', severity: 'MINOR', parent_notified: false,
  referred: false, referred_to: '', follow_up_date: '', notes: '',
  prescriptions: []
};

const SEV_COLOR: Record<string, string> = {
  MINOR: 'bg-sky-500/20 text-sky-300',
  MODERATE: 'bg-amber-500/20 text-amber-300',
  SERIOUS: 'bg-rose-500/20 text-rose-300',
};

export default function DispensaryVisitsPage() {
  const [visits, setVisits] = useState<Visit[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [sevFilter, setSevFilter] = useState('');
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<VisitForm>({ ...BLANK_FORM });
  const [studentSearch, setStudentSearch] = useState('');
  const [studentResults, setStudentResults] = useState<Student[]>([]);
  const [saving, setSaving] = useState(false);
  const [addPrescriptionVisit, setAddPrescriptionVisit] = useState<number | null>(null);
  const [rxForm, setRxForm] = useState<Prescription>({ medication_name: '', dosage: '', frequency: '', quantity_dispensed: 0, unit: 'tablets', notes: '' });
  const [savingRx, setSavingRx] = useState(false);

  const load = async () => {
    const params: Record<string, string> = {};
    if (sevFilter) params.severity = sevFilter;
    if (search) params.search = search;
    const r = await apiClient.get('/dispensary/visits/', { params });
    setVisits(r.data.results ?? r.data);
    setLoading(false);
  };

  const searchStudents = async (q: string) => {
    if (!q || q.length < 2) { setStudentResults([]); return; }
    const r = await apiClient.get('/finance/ref/students/', { params: { search: q } });
    setStudentResults((r.data.results ?? r.data).slice(0, 10));
  };

  useEffect(() => { load(); }, [search, sevFilter]);
  useEffect(() => { const t = setTimeout(() => searchStudents(studentSearch), 300); return () => clearTimeout(t); }, [studentSearch]);

  const toggle = (id: number) => setExpanded(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const f = (k: keyof VisitForm, v: unknown) => setForm(fm => ({ ...fm, [k]: v }));

  const addRxRow = () => setForm(fm => ({ ...fm, prescriptions: [...fm.prescriptions, { medication_name: '', dosage: '', frequency: '', quantity_dispensed: 0, unit: 'tablets', notes: '' }] }));
  const removeRx = (i: number) => setForm(fm => ({ ...fm, prescriptions: fm.prescriptions.filter((_, idx) => idx !== i) }));
  const setRxField = (i: number, k: keyof Prescription, v: unknown) => setForm(fm => ({ ...fm, prescriptions: fm.prescriptions.map((rx, idx) => idx === i ? { ...rx, [k]: v } : rx) }));

  const submit = async () => {
    if (!form.student || !form.complaint) return;
    setSaving(true);
    try {
      await apiClient.post('/dispensary/visits/', {
        student: Number(form.student),
        visit_date: form.visit_date,
        visit_time: form.visit_time || null,
        complaint: form.complaint,
        diagnosis: form.diagnosis,
        treatment: form.treatment,
        severity: form.severity,
        parent_notified: form.parent_notified,
        referred: form.referred,
        referred_to: form.referred_to,
        follow_up_date: form.follow_up_date || null,
        notes: form.notes,
        prescriptions: form.prescriptions,
      });
      setShowForm(false);
      setForm({ ...BLANK_FORM });
      setStudentSearch('');
      load();
    } finally { setSaving(false); }
  };

  const submitRx = async () => {
    if (!addPrescriptionVisit || !rxForm.medication_name) return;
    setSavingRx(true);
    try {
      await apiClient.post('/dispensary/prescriptions/', { ...rxForm, visit: addPrescriptionVisit, quantity_dispensed: Number(rxForm.quantity_dispensed) });
      setAddPrescriptionVisit(null);
      setRxForm({ medication_name: '', dosage: '', frequency: '', quantity_dispensed: 0, unit: 'tablets', notes: '' });
      load();
    } finally { setSavingRx(false); }
  };

  return (
    <div className="space-y-5">
      <PageHero
        badge="DISPENSARY"
        badgeColor="rose"
        title="Sick Bay Visits"
        subtitle="Student and staff medical visit records"
        icon="💊"
      />
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-100">Patient Visits</h1>
        <button onClick={() => setShowForm(true)} className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
          <Plus size={16} /> New Visit
        </button>
      </div>

      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by student name or admission no…"
            className="w-full bg-slate-950 border border-white/[0.07] rounded-lg pl-9 pr-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-emerald-400" />
        </div>
        <select value={sevFilter} onChange={e => setSevFilter(e.target.value)}
          className="bg-slate-950 border border-white/[0.07] rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-emerald-400">
          <option value="">All Severities</option>
          <option value="MINOR">Minor</option>
          <option value="MODERATE">Moderate</option>
          <option value="SERIOUS">Serious</option>
        </select>
      </div>

      <div className="space-y-2">
        {loading ? (
          <div className="p-8 text-center text-slate-400">Loading…</div>
        ) : !visits.length ? (
          <div className="glass-panel rounded-2xl p-8 text-center text-slate-500">No visits found.</div>
        ) : visits.map(visit => (
          <div key={visit.id} className="glass-panel rounded-2xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 cursor-pointer" onClick={() => toggle(visit.id)}>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 flex-wrap">
                  <span className="text-slate-200 font-medium">{visit.student_name}</span>
                  <span className="text-xs text-slate-500">{visit.student_admission_number}</span>
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${SEV_COLOR[visit.severity] || ''}`}>{visit.severity}</span>
                  {visit.referred && <span className="px-2 py-0.5 rounded text-xs bg-amber-500/20 text-amber-300">Referred</span>}
                  {visit.parent_notified && <span className="px-2 py-0.5 rounded text-xs bg-slate-500/20 text-slate-400">Parent Notified</span>}
                </div>
                <p className="text-xs text-slate-500 mt-0.5">{visit.visit_date} · <span className="text-slate-400">{visit.complaint}</span></p>
              </div>
              <div className="flex items-center gap-2 ml-4">
                <button onClick={e => { e.stopPropagation(); setAddPrescriptionVisit(visit.id); }}
                  className="flex items-center gap-1 px-2 py-1 rounded text-xs bg-slate-700 text-slate-300 hover:bg-slate-600">
                  <Pill size={12} /> Rx
                </button>
                {expanded.has(visit.id) ? <ChevronUp size={16} className="text-slate-500" /> : <ChevronDown size={16} className="text-slate-500" />}
              </div>
            </div>
            {expanded.has(visit.id) && (
              <div className="px-5 pb-4 border-t border-white/[0.05] pt-3 space-y-3">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  {visit.diagnosis && <div><span className="text-slate-500 text-xs">Diagnosis:</span><p className="text-slate-300">{visit.diagnosis}</p></div>}
                  {visit.treatment && <div><span className="text-slate-500 text-xs">Treatment:</span><p className="text-slate-300">{visit.treatment}</p></div>}
                  {visit.referred_to && <div><span className="text-slate-500 text-xs">Referred To:</span><p className="text-slate-300">{visit.referred_to}</p></div>}
                  {visit.follow_up_date && <div><span className="text-slate-500 text-xs">Follow-up:</span><p className="text-slate-300">{visit.follow_up_date}</p></div>}
                  {visit.attended_by_name && <div><span className="text-slate-500 text-xs">Attended By:</span><p className="text-slate-300">{visit.attended_by_name}</p></div>}
                  {visit.notes && <div className="col-span-2"><span className="text-slate-500 text-xs">Notes:</span><p className="text-slate-400 italic">{visit.notes}</p></div>}
                </div>
                {visit.prescriptions.length > 0 && (
                  <div>
                    <p className="text-xs text-slate-500 mb-2 font-medium uppercase tracking-wide">Prescriptions</p>
                    <table className="w-full text-xs">
                      <thead><tr className="text-slate-500 border-b border-white/[0.07]">
                        <th className="text-left py-1 pr-3">Medication</th>
                        <th className="text-left py-1 pr-3">Dosage</th>
                        <th className="text-left py-1 pr-3">Frequency</th>
                        <th className="text-right py-1">Qty</th>
                      </tr></thead>
                      <tbody>
                        {visit.prescriptions.map((rx, i) => (
                          <tr key={i} className="border-b border-slate-800/30">
                            <td className="py-1.5 pr-3 text-slate-300">{rx.medication_name}</td>
                            <td className="py-1.5 pr-3 text-slate-400">{rx.dosage || '—'}</td>
                            <td className="py-1.5 pr-3 text-slate-400">{rx.frequency || '—'}</td>
                            <td className="py-1.5 text-right text-slate-400">{rx.quantity_dispensed} {rx.unit}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-[#0d1421] border border-white/[0.07] rounded-2xl w-full max-w-2xl p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-semibold text-slate-100">New Visit Record</h2>

            <div>
              <label className="text-xs text-slate-400 mb-1 block">Student *</label>
              <input value={studentSearch} onChange={e => { setStudentSearch(e.target.value); f('student', ''); }}
                placeholder="Search student by name or admission no…"
                className="w-full bg-slate-950 border border-white/[0.07] rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-emerald-400" />
              {studentResults.length > 0 && !form.student && (
                <div className="bg-slate-800 border border-white/[0.09] rounded-lg mt-1 max-h-40 overflow-y-auto">
                  {studentResults.map(s => (
                    <button key={s.id} onClick={() => { f('student', String(s.id)); setStudentSearch(`${s.first_name} ${s.last_name} (${s.admission_number})`); setStudentResults([]); }}
                      className="w-full text-left px-3 py-2 text-sm text-slate-200 hover:bg-slate-700">
                      {s.first_name} {s.last_name} — {s.admission_number}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Visit Date *</label>
                <input type="date" value={form.visit_date} onChange={e => f('visit_date', e.target.value)}
                  className="w-full bg-slate-950 border border-white/[0.07] rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-emerald-400" />
              </div>
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Time</label>
                <input type="time" value={form.visit_time} onChange={e => f('visit_time', e.target.value)}
                  className="w-full bg-slate-950 border border-white/[0.07] rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-emerald-400" />
              </div>
              <div className="col-span-2">
                <label className="text-xs text-slate-400 mb-1 block">Complaint *</label>
                <textarea rows={2} value={form.complaint} onChange={e => f('complaint', e.target.value)}
                  className="w-full bg-slate-950 border border-white/[0.07] rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-emerald-400" />
              </div>
              <div className="col-span-2">
                <label className="text-xs text-slate-400 mb-1 block">Diagnosis</label>
                <textarea rows={2} value={form.diagnosis} onChange={e => f('diagnosis', e.target.value)}
                  className="w-full bg-slate-950 border border-white/[0.07] rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-emerald-400" />
              </div>
              <div className="col-span-2">
                <label className="text-xs text-slate-400 mb-1 block">Treatment</label>
                <textarea rows={2} value={form.treatment} onChange={e => f('treatment', e.target.value)}
                  className="w-full bg-slate-950 border border-white/[0.07] rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-emerald-400" />
              </div>
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Severity</label>
                <select value={form.severity} onChange={e => f('severity', e.target.value)}
                  className="w-full bg-slate-950 border border-white/[0.07] rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-emerald-400">
                  <option value="MINOR">Minor</option>
                  <option value="MODERATE">Moderate</option>
                  <option value="SERIOUS">Serious</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Follow-up Date</label>
                <input type="date" value={form.follow_up_date} onChange={e => f('follow_up_date', e.target.value)}
                  className="w-full bg-slate-950 border border-white/[0.07] rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-emerald-400" />
              </div>
              <div className="flex items-center gap-4 col-span-2">
                <label className="flex items-center gap-2 text-sm text-slate-400 cursor-pointer">
                  <input type="checkbox" checked={form.parent_notified} onChange={e => f('parent_notified', e.target.checked)} className="accent-emerald-500" />
                  Parent Notified
                </label>
                <label className="flex items-center gap-2 text-sm text-slate-400 cursor-pointer">
                  <input type="checkbox" checked={form.referred} onChange={e => f('referred', e.target.checked)} className="accent-emerald-500" />
                  Referred
                </label>
              </div>
              {form.referred && (
                <div className="col-span-2">
                  <label className="text-xs text-slate-400 mb-1 block">Referred To</label>
                  <input value={form.referred_to} onChange={e => f('referred_to', e.target.value)}
                    className="w-full bg-slate-950 border border-white/[0.07] rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-emerald-400" />
                </div>
              )}
              <div className="col-span-2">
                <label className="text-xs text-slate-400 mb-1 block">Notes</label>
                <textarea rows={2} value={form.notes} onChange={e => f('notes', e.target.value)}
                  className="w-full bg-slate-950 border border-white/[0.07] rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-emerald-400" />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs text-slate-400 font-medium uppercase tracking-wide">Prescriptions</label>
                <button onClick={addRxRow} className="text-xs text-emerald-400 hover:text-emerald-300">+ Add</button>
              </div>
              {form.prescriptions.map((rx, i) => (
                <div key={i} className="grid grid-cols-12 gap-2 mb-2 items-center">
                  <div className="col-span-3">
                    <input placeholder="Medication" value={rx.medication_name} onChange={e => setRxField(i, 'medication_name', e.target.value)}
                      className="w-full bg-slate-950 border border-white/[0.07] rounded-lg px-2 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-emerald-400" />
                  </div>
                  <div className="col-span-2">
                    <input placeholder="Dosage" value={rx.dosage} onChange={e => setRxField(i, 'dosage', e.target.value)}
                      className="w-full bg-slate-950 border border-white/[0.07] rounded-lg px-2 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-emerald-400" />
                  </div>
                  <div className="col-span-2">
                    <input placeholder="Frequency" value={rx.frequency} onChange={e => setRxField(i, 'frequency', e.target.value)}
                      className="w-full bg-slate-950 border border-white/[0.07] rounded-lg px-2 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-emerald-400" />
                  </div>
                  <div className="col-span-2">
                    <input type="number" placeholder="Qty" value={rx.quantity_dispensed} onChange={e => setRxField(i, 'quantity_dispensed', e.target.value)}
                      className="w-full bg-slate-950 border border-white/[0.07] rounded-lg px-2 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-emerald-400" />
                  </div>
                  <div className="col-span-2">
                    <input placeholder="Unit" value={rx.unit} onChange={e => setRxField(i, 'unit', e.target.value)}
                      className="w-full bg-slate-950 border border-white/[0.07] rounded-lg px-2 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-emerald-400" />
                  </div>
                  <div className="col-span-1 flex justify-center">
                    <button onClick={() => removeRx(i)} className="text-rose-400 hover:text-rose-300"><ChevronUp size={14} /></button>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button onClick={() => { setShowForm(false); setStudentSearch(''); setForm({ ...BLANK_FORM }); }}
                className="px-4 py-2 rounded-lg text-sm text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors">Cancel</button>
              <button onClick={submit} disabled={saving} className="px-4 py-2 rounded-lg text-sm bg-emerald-500 hover:bg-emerald-400 text-white font-medium transition-colors disabled:opacity-50">
                {saving ? 'Saving…' : 'Record Visit'}
              </button>
            </div>
          </div>
        </div>
      )}

      {addPrescriptionVisit !== null && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-[#0d1421] border border-white/[0.07] rounded-2xl w-full max-w-md p-6 space-y-4">
            <h2 className="text-lg font-semibold text-slate-100">Add Prescription</h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="text-xs text-slate-400 mb-1 block">Medication *</label>
                <input value={rxForm.medication_name} onChange={e => setRxForm(r => ({ ...r, medication_name: e.target.value }))}
                  className="w-full bg-slate-950 border border-white/[0.07] rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-emerald-400" />
              </div>
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Dosage</label>
                <input value={rxForm.dosage} onChange={e => setRxForm(r => ({ ...r, dosage: e.target.value }))}
                  className="w-full bg-slate-950 border border-white/[0.07] rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-emerald-400" />
              </div>
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Frequency</label>
                <input value={rxForm.frequency} onChange={e => setRxForm(r => ({ ...r, frequency: e.target.value }))}
                  className="w-full bg-slate-950 border border-white/[0.07] rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-emerald-400" />
              </div>
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Quantity Dispensed</label>
                <input type="number" value={rxForm.quantity_dispensed} onChange={e => setRxForm(r => ({ ...r, quantity_dispensed: Number(e.target.value) }))}
                  className="w-full bg-slate-950 border border-white/[0.07] rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-emerald-400" />
              </div>
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Unit</label>
                <input value={rxForm.unit} onChange={e => setRxForm(r => ({ ...r, unit: e.target.value }))}
                  className="w-full bg-slate-950 border border-white/[0.07] rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-emerald-400" />
              </div>
              <div className="col-span-2">
                <label className="text-xs text-slate-400 mb-1 block">Notes</label>
                <input value={rxForm.notes} onChange={e => setRxForm(r => ({ ...r, notes: e.target.value }))}
                  className="w-full bg-slate-950 border border-white/[0.07] rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-emerald-400" />
              </div>
            </div>
            <div className="flex justify-end gap-3">
              <button onClick={() => setAddPrescriptionVisit(null)} className="px-4 py-2 rounded-lg text-sm text-slate-400 hover:bg-slate-800">Cancel</button>
              <button onClick={submitRx} disabled={savingRx} className="px-4 py-2 rounded-lg text-sm bg-emerald-500 hover:bg-emerald-400 text-white font-medium disabled:opacity-50">
                {savingRx ? 'Saving…' : 'Add'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
