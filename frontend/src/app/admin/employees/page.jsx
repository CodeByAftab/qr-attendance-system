'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { UserPlus, Search, UserX, Eye } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '@/utils/api';

export default function AdminEmployeesPage() {
  const qc = useQueryClient();
  const [search,  setSearch]  = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [form,    setForm]    = useState({
    employee_id: '', full_name: '', email: '', phone: '',
    department_id: '', designation: '', date_of_joining: '', base_salary: '', password: '',
  });

  const { data: employees = [], isLoading } = useQuery({
    queryKey: ['employees', search],
    queryFn:  async () => {
      const { data } = await api.get(`/admin/employees?search=${encodeURIComponent(search)}`);
      return data.data;
    },
  });

  const { data: depts = [] } = useQuery({
    queryKey: ['departments'],
    queryFn:  async () => {
      const { data } = await api.get('/admin/employees');   // departments come from this
      return [];
    },
  });

  const addMutation = useMutation({
    mutationFn: (payload) => api.post('/admin/employee/add', payload),
    onSuccess: () => {
      toast.success('Employee added successfully!');
      setShowAdd(false);
      setForm({ employee_id: '', full_name: '', email: '', phone: '',
                department_id: '', designation: '', date_of_joining: '', base_salary: '', password: '' });
      qc.invalidateQueries(['employees']);
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed to add employee.'),
  });

  const deactivateMutation = useMutation({
    mutationFn: (id) => api.patch(`/admin/employee/${id}/deactivate`),
    onSuccess: () => { toast.success('Employee deactivated.'); qc.invalidateQueries(['employees']); },
    onError:   (err) => toast.error(err.response?.data?.message || 'Failed.'),
  });

  function handleAdd(e) {
    e.preventDefault();
    const required = ['employee_id','full_name','email','phone','date_of_joining','password'];
    if (required.some(k => !form[k]?.trim())) return toast.error('Please fill all required fields.');
    addMutation.mutate(form);
  }

  return (
    <div className="space-y-6 animate-fade-in">

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900">Employees</h1>
          <p className="text-sm text-gray-400 mt-0.5">{employees.length} active employees</p>
        </div>
        <button onClick={() => setShowAdd(!showAdd)} className="btn-primary flex items-center gap-2">
          <UserPlus className="w-4 h-4" />
          Add Employee
        </button>
      </div>

      {/* Add employee form */}
      {showAdd && (
        <div className="card animate-fade-in">
          <h2 className="font-bold text-gray-800 mb-4">New Employee</h2>
          <form onSubmit={handleAdd} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              { key: 'employee_id',     label: 'Employee ID *',      placeholder: 'MKA-001'                },
              { key: 'full_name',       label: 'Full Name *',        placeholder: 'Riya Sharma'            },
              { key: 'email',           label: 'Email *',            placeholder: 'riya@manikstuagro.com'  },
              { key: 'phone',           label: 'Phone *',            placeholder: '+91 98765 43210'        },
              { key: 'designation',     label: 'Designation',        placeholder: 'Field Officer'          },
              { key: 'date_of_joining', label: 'Date of Joining *',  type: 'date'                          },
              { key: 'base_salary',     label: 'Base Salary (₹)',    type: 'number', placeholder: '25000' },
              { key: 'password',        label: 'Initial Password *', type: 'password'                      },
            ].map(f => (
              <div key={f.key}>
                <label className="block text-xs font-semibold text-gray-600 mb-1">{f.label}</label>
                <input
                  type={f.type || 'text'}
                  className="input text-sm"
                  placeholder={f.placeholder}
                  value={form[f.key]}
                  onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                />
              </div>
            ))}
            <div className="sm:col-span-2 flex gap-3 pt-1">
              <button type="submit" disabled={addMutation.isPending} className="btn-primary">
                {addMutation.isPending ? 'Adding...' : 'Add Employee'}
              </button>
              <button type="button" onClick={() => setShowAdd(false)} className="btn-secondary">
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Search + table */}
      <div className="card p-0 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-3">
          <Search className="w-4 h-4 text-gray-400 flex-shrink-0" />
          <input
            className="flex-1 outline-none text-sm text-gray-700 placeholder-gray-400 bg-transparent"
            placeholder="Search by name, ID, email..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-50 text-left">
                {['Employee', 'Contact', 'Department', 'Joined', 'Salary', 'Leave Balance', 'Status', ''].map(h => (
                  <th key={h} className="px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading && [...Array(5)].map((_, i) => (
                <tr key={i}>
                  {[...Array(8)].map((_, j) => (
                    <td key={j} className="px-5 py-3"><div className="h-4 bg-gray-50 rounded animate-pulse" /></td>
                  ))}
                </tr>
              ))}
              {!isLoading && !employees.length && (
                <tr><td colSpan={8} className="px-5 py-10 text-center text-gray-400">No employees found.</td></tr>
              )}
              {employees.map(emp => (
                <tr key={emp.employee_id} className="border-b border-gray-50 hover:bg-gray-50/50 transition">
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full gradient-brand flex items-center justify-center
                                      text-white text-xs font-bold flex-shrink-0">
                        {emp.full_name?.charAt(0)}
                      </div>
                      <div>
                        <p className="font-semibold text-gray-800">{emp.full_name}</p>
                        <p className="text-xs text-gray-400">{emp.employee_id}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3.5">
                    <p className="text-gray-700">{emp.email}</p>
                    <p className="text-xs text-gray-400">{emp.phone}</p>
                  </td>
                  <td className="px-5 py-3.5 text-gray-600">{emp.department || '—'}</td>
                  <td className="px-5 py-3.5 text-gray-600 whitespace-nowrap">
                    {emp.date_of_joining ? new Date(emp.date_of_joining).toLocaleDateString('en-IN') : '—'}
                  </td>
                  <td className="px-5 py-3.5 text-gray-700 whitespace-nowrap">
                    ₹{parseFloat(emp.base_salary || 0).toLocaleString('en-IN')}
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex gap-1.5 flex-wrap">
                      <span className="text-xs bg-sky-50 text-sky-700 px-2 py-0.5 rounded-full font-medium">
                        C:{emp.casual_leave_balance}
                      </span>
                      <span className="text-xs bg-rose-50 text-rose-700 px-2 py-0.5 rounded-full font-medium">
                        S:{emp.sick_leave_balance}
                      </span>
                      <span className="text-xs bg-violet-50 text-violet-700 px-2 py-0.5 rounded-full font-medium">
                        P:{emp.paid_leave_balance}
                      </span>
                    </div>
                  </td>
                  <td className="px-5 py-3.5">
                    <span className={emp.is_active ? 'badge-present' : 'badge-absent'}>
                      {emp.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-5 py-3.5">
                    {emp.is_active && (
                      <button
                        onClick={() => {
                          if (confirm(`Deactivate ${emp.full_name}?`))
                            deactivateMutation.mutate(emp.employee_id);
                        }}
                        className="text-red-400 hover:text-red-600 transition"
                        title="Deactivate"
                      >
                        <UserX className="w-4 h-4" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
