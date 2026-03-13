'use client';

import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { FileSpreadsheet, FileText, Download, Play, IndianRupee } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '@/utils/api';

export default function AdminPayrollPage() {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year,  setYear]  = useState(now.getFullYear());

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['payroll-report', month, year],
    queryFn:  async () => {
      const { data } = await api.get(`/payroll/report?month=${month}&year=${year}`);
      return data.data;
    },
  });

  const generateMutation = useMutation({
    mutationFn: () => api.post('/payroll/generate', { month, year }),
    onSuccess: (res) => {
      toast.success(`Payroll generated for ${res.data.data?.records?.length || 0} employees.`);
      refetch();
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Generation failed.'),
  });

  async function exportPayroll(format) {
    try {
      const res = await api.get(`/payroll/export?month=${month}&year=${year}&format=${format}`, {
        responseType: 'blob',
      });
      const url  = URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href  = url;
      link.download = `payroll-${month}-${year}.${format === 'csv' ? 'csv' : format === 'pdf' ? 'pdf' : 'xlsx'}`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      toast.error('Export failed.');
    }
  }

  const records   = data || [];
  const totalNet  = records.reduce((s, r) => s + parseFloat(r.net_salary  || 0), 0);
  const totalGross= records.reduce((s, r) => s + parseFloat(r.gross_salary|| 0), 0);
  const monthName = new Date(year, month - 1).toLocaleString('default', { month: 'long' });

  return (
    <div className="space-y-6 animate-fade-in">

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900">Payroll</h1>
          <p className="text-sm text-gray-400 mt-0.5">Generate and export monthly payroll sheets</p>
        </div>

        {/* Month/year selectors */}
        <div className="flex items-center gap-2 flex-wrap">
          <select
            className="input text-sm py-2 w-36"
            value={month}
            onChange={e => setMonth(Number(e.target.value))}
          >
            {Array.from({ length: 12 }, (_, i) => (
              <option key={i+1} value={i+1}>
                {new Date(2000, i).toLocaleString('default', { month: 'long' })}
              </option>
            ))}
          </select>
          <select
            className="input text-sm py-2 w-24"
            value={year}
            onChange={e => setYear(Number(e.target.value))}
          >
            {[now.getFullYear() - 1, now.getFullYear()].map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
          <button
            onClick={() => generateMutation.mutate()}
            disabled={generateMutation.isPending}
            className="btn-primary flex items-center gap-2"
          >
            <Play className="w-4 h-4" />
            {generateMutation.isPending ? 'Generating...' : 'Generate'}
          </button>
        </div>
      </div>

      {/* Summary cards */}
      {records.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { label: 'Total Employees',  val: records.length,                    icon: '👥', color: 'bg-blue-50 text-blue-700'  },
            { label: 'Total Gross',      val: `₹${totalGross.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`,
              icon: '💰', color: 'bg-green-50 text-green-700' },
            { label: 'Total Net Payout', val: `₹${totalNet.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`,
              icon: '🏦', color: 'bg-violet-50 text-violet-700' },
          ].map(s => (
            <div key={s.label} className={`${s.color} rounded-2xl p-5`}>
              <p className="text-2xl mb-1">{s.icon}</p>
              <p className="text-2xl font-extrabold">{s.val}</p>
              <p className="text-xs font-semibold opacity-75 mt-0.5">{s.label} — {monthName} {year}</p>
            </div>
          ))}
        </div>
      )}

      {/* Export buttons */}
      {records.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {[
            { fmt: 'excel', label: 'Export Excel', icon: FileSpreadsheet, color: 'btn-primary' },
            { fmt: 'csv',   label: 'Export CSV',   icon: FileText,        color: 'btn-secondary' },
            { fmt: 'pdf',   label: 'Export PDF',   icon: Download,        color: 'btn-secondary' },
          ].map(({ fmt, label, icon: Icon, color }) => (
            <button key={fmt} onClick={() => exportPayroll(fmt)} className={`${color} flex items-center gap-2 text-sm`}>
              <Icon className="w-4 h-4" /> {label}
            </button>
          ))}
        </div>
      )}

      {/* Payroll table */}
      <div className="card p-0 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="font-bold text-gray-800">
            {monthName} {year} Payroll
            {records.length > 0 && (
              <span className="ml-2 text-sm font-normal text-gray-400">
                ({records.length} records)
              </span>
            )}
          </h2>
        </div>

        {isLoading || isFetching ? (
          <div className="p-6 space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-12 bg-gray-50 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : !records.length ? (
          <div className="text-center py-12">
            <IndianRupee className="w-12 h-12 text-gray-200 mx-auto mb-3" />
            <p className="font-semibold text-gray-500">No payroll generated for {monthName} {year}</p>
            <p className="text-sm text-gray-400 mt-1">Click "Generate" to calculate payroll</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-50">
                  {['Employee', 'Department', 'Days', 'Present', 'Absent', 'Late Ded.', 'OT Bonus', 'Gross', 'Net', 'Status'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {records.map(r => (
                  <tr key={r.employee_id} className="border-b border-gray-50 hover:bg-gray-50/50">
                    <td className="px-4 py-3">
                      <p className="font-semibold text-gray-800">{r.full_name}</p>
                      <p className="text-xs text-gray-400">{r.employee_id}</p>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{r.department || '—'}</td>
                    <td className="px-4 py-3 text-gray-700">{r.working_days}</td>
                    <td className="px-4 py-3 text-green-700 font-medium">{r.present_days}</td>
                    <td className="px-4 py-3 text-red-600 font-medium">{r.absent_days}</td>
                    <td className="px-4 py-3 text-red-500">
                      ₹{parseFloat(r.late_deduction).toFixed(0)}
                    </td>
                    <td className="px-4 py-3 text-green-600">
                      ₹{parseFloat(r.overtime_bonus).toFixed(0)}
                    </td>
                    <td className="px-4 py-3 text-gray-700 font-medium">
                      ₹{parseFloat(r.gross_salary).toLocaleString('en-IN')}
                    </td>
                    <td className="px-4 py-3 font-bold text-brand-primary">
                      ₹{parseFloat(r.net_salary).toLocaleString('en-IN')}
                    </td>
                    <td className="px-4 py-3">
                      <span className={
                        r.status === 'paid' ? 'badge-present' :
                        r.status === 'finalized' ? 'badge-leave' : 'badge-pending'
                      }>
                        {r.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
              {/* Totals */}
              <tfoot className="bg-brand-light">
                <tr>
                  <td colSpan={7} className="px-4 py-3 font-bold text-brand-primary text-right">Total:</td>
                  <td className="px-4 py-3 font-bold text-brand-primary">
                    ₹{totalGross.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                  </td>
                  <td className="px-4 py-3 font-extrabold text-brand-primary">
                    ₹{totalNet.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                  </td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
