'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format, subDays } from 'date-fns';
import { Download, Filter, FileBarChart2 } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '@/utils/api';

export default function AdminReportsPage() {
  const today   = format(new Date(), 'yyyy-MM-dd');
  const monthStart = format(new Date(new Date().getFullYear(), new Date().getMonth(), 1), 'yyyy-MM-dd');

  const [filters, setFilters] = useState({ from: monthStart, to: today, department: '', employee_id: '' });
  const [applied, setApplied] = useState({ from: monthStart, to: today, department: '', employee_id: '' });

  const { data: records = [], isLoading, isFetching } = useQuery({
    queryKey: ['att-report', applied],
    queryFn:  async () => {
      const params = new URLSearchParams({ from: applied.from, to: applied.to });
      if (applied.department)  params.set('department',  applied.department);
      if (applied.employee_id) params.set('employee_id', applied.employee_id);
      const { data } = await api.get(`/admin/reports?${params}`);
      return data.data;
    },
  });

  function applyFilters() { setApplied({ ...filters }); }

  async function exportReport(fmt) {
    try {
      const params = new URLSearchParams({ from: applied.from, to: applied.to, format: fmt });
      const res = await api.get(`/admin/reports/export?${params}`, { responseType: 'blob' });
      const url  = URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href  = url;
      link.download = `attendance-report.${fmt === 'csv' ? 'csv' : 'xlsx'}`;
      link.click();
      URL.revokeObjectURL(url);
    } catch { toast.error('Export failed.'); }
  }

  // Summary stats from records
  const present = records.filter(r => r.status === 'present').length;
  const absent  = records.filter(r => r.status === 'absent').length;
  const late    = records.filter(r => r.is_late).length;
  const totalWM = records.reduce((s, r) => s + (parseInt(r.working_minutes) || 0), 0);
  const avgHours= records.length ? ((totalWM / records.length) / 60).toFixed(1) : '0';

  return (
    <div className="space-y-6 animate-fade-in">

      <div>
        <h1 className="text-2xl font-extrabold text-gray-900">Attendance Reports</h1>
        <p className="text-sm text-gray-400 mt-0.5">Filter, analyze, and export attendance data</p>
      </div>

      {/* Filters */}
      <div className="card">
        <div className="flex flex-wrap gap-4 items-end">
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">From Date</label>
            <input type="date" className="input text-sm py-2"
              value={filters.from} onChange={e => setFilters(f => ({ ...f, from: e.target.value }))} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">To Date</label>
            <input type="date" className="input text-sm py-2"
              value={filters.to} onChange={e => setFilters(f => ({ ...f, to: e.target.value }))} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">Department</label>
            <input className="input text-sm py-2 w-40" placeholder="All departments"
              value={filters.department} onChange={e => setFilters(f => ({ ...f, department: e.target.value }))} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">Employee ID</label>
            <input className="input text-sm py-2 w-32" placeholder="e.g. MKA-001"
              value={filters.employee_id} onChange={e => setFilters(f => ({ ...f, employee_id: e.target.value }))} />
          </div>
          <button onClick={applyFilters} className="btn-primary flex items-center gap-2 text-sm py-2.5">
            <Filter className="w-3.5 h-3.5" /> Apply
          </button>
          {/* Quick presets */}
          {[
            { label: 'Today',     from: today,              to: today },
            { label: 'Last 7d',   from: format(subDays(new Date(), 7), 'yyyy-MM-dd'), to: today },
            { label: 'This Month',from: monthStart,         to: today },
          ].map(p => (
            <button key={p.label}
              onClick={() => { setFilters(f => ({ ...f, from: p.from, to: p.to })); setApplied(a => ({ ...a, from: p.from, to: p.to })); }}
              className="text-xs text-brand-primary hover:underline font-medium"
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Stats row */}
      {!isLoading && records.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: 'Records',    val: records.length, color: 'bg-blue-50 text-blue-700'   },
            { label: 'Present',    val: present,        color: 'bg-green-50 text-green-700' },
            { label: 'Absent',     val: absent,         color: 'bg-red-50 text-red-700'     },
            { label: 'Late',       val: late,           color: 'bg-amber-50 text-amber-700' },
          ].map(s => (
            <div key={s.label} className={`${s.color} rounded-2xl p-4`}>
              <p className="text-2xl font-extrabold">{s.val}</p>
              <p className="text-xs font-semibold mt-0.5 opacity-75">{s.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Export buttons */}
      {records.length > 0 && (
        <div className="flex gap-2">
          <button onClick={() => exportReport('excel')} className="btn-primary text-sm flex items-center gap-2">
            <Download className="w-3.5 h-3.5" /> Excel
          </button>
          <button onClick={() => exportReport('csv')} className="btn-secondary text-sm flex items-center gap-2">
            <Download className="w-3.5 h-3.5" /> CSV
          </button>
        </div>
      )}

      {/* Records table */}
      <div className="card p-0 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="font-bold text-gray-800">
            Results
            {!isLoading && (
              <span className="ml-2 text-sm font-normal text-gray-400">
                {records.length} record{records.length !== 1 ? 's' : ''}
              </span>
            )}
          </h2>
        </div>

        {(isLoading || isFetching) ? (
          <div className="p-6 space-y-3">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-10 bg-gray-50 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : !records.length ? (
          <div className="text-center py-12">
            <FileBarChart2 className="w-12 h-12 text-gray-200 mx-auto mb-3" />
            <p className="font-semibold text-gray-500">No records for selected period</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-50">
                  {['Employee', 'Department', 'Date', 'Check-In', 'Check-Out', 'Hours', 'Method', 'Status'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {records.map((r, i) => (
                  <tr key={i} className="border-b border-gray-50 hover:bg-gray-50/50">
                    <td className="px-4 py-3">
                      <p className="font-semibold text-gray-800">{r.full_name}</p>
                      <p className="text-xs text-gray-400">{r.employee_id}</p>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{r.department || '—'}</td>
                    <td className="px-4 py-3 text-gray-700 whitespace-nowrap">
                      {r.date ? format(new Date(r.date), 'dd MMM yyyy') : '—'}
                    </td>
                    <td className="px-4 py-3 text-gray-700">
                      {r.check_in_time ? format(new Date(r.check_in_time), 'hh:mm a') : '—'}
                    </td>
                    <td className="px-4 py-3 text-gray-700">
                      {r.check_out_time ? format(new Date(r.check_out_time), 'hh:mm a') : '—'}
                    </td>
                    <td className="px-4 py-3 text-gray-700">
                      {r.working_minutes
                        ? `${Math.floor(r.working_minutes/60)}h ${r.working_minutes%60}m`
                        : '—'}
                    </td>
                    <td className="px-4 py-3 text-gray-500 capitalize">{r.method || '—'}</td>
                    <td className="px-4 py-3">
                      {r.status === 'present' && !r.is_late && <span className="badge-present">Present</span>}
                      {r.status === 'present' && r.is_late  && <span className="badge-late">Late</span>}
                      {r.status === 'leave'                  && <span className="badge-leave">Leave</span>}
                      {r.status === 'absent'                 && <span className="badge-absent">Absent</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
