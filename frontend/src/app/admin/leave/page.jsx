'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { CheckCircle, XCircle, Clock } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '@/utils/api';

const TABS = ['pending', 'approved', 'rejected'];
const LABELS = { casual: 'Casual', sick: 'Sick', paid: 'Paid', other: 'Other' };

export default function AdminLeavePage() {
  const qc = useQueryClient();
  const [tab, setTab] = useState('pending');
  const [rejectNote, setRejectNote] = useState({});
  const [showReject, setShowReject] = useState(null);

  const { data = [], isLoading } = useQuery({
    queryKey: ['admin-leaves', tab],
    queryFn:  async () => {
      const { data } = await api.get(`/admin/leave?status=${tab}`);
      return data.data;
    },
  });

  const reviewMutation = useMutation({
    mutationFn: ({ id, action, comment }) =>
      api.patch(`/admin/leave/${id}/review`, { action, comment }),
    onSuccess: (_, vars) => {
      toast.success(`Leave ${vars.action === 'approve' ? 'approved ✅' : 'rejected ❌'}.`);
      qc.invalidateQueries(['admin-leaves']);
      qc.invalidateQueries(['admin-dashboard']);
      setShowReject(null);
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Action failed.'),
  });

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-extrabold text-gray-900">Leave Management</h1>
        <p className="text-sm text-gray-400 mt-0.5">Review and manage employee leave requests</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
        {TABS.map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-semibold rounded-lg transition-all capitalize
              ${tab === t ? 'bg-white shadow text-brand-primary' : 'text-gray-500 hover:text-gray-700'}`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Leave cards */}
      {isLoading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="card animate-pulse">
              <div className="h-4 w-48 bg-gray-100 rounded mb-3" />
              <div className="h-4 w-32 bg-gray-100 rounded" />
            </div>
          ))}
        </div>
      ) : !data.length ? (
        <div className="card text-center py-12">
          <Clock className="w-12 h-12 text-gray-200 mx-auto mb-3" />
          <p className="font-semibold text-gray-500 capitalize">No {tab} leave requests</p>
        </div>
      ) : (
        <div className="space-y-4">
          {data.map(req => (
            <div key={req.id} className="card">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="font-bold text-gray-800">{req.full_name}</h3>
                  <p className="text-sm text-gray-400">{req.employee_id} · {req.department}</p>
                </div>
                <span className="bg-brand-light text-brand-primary text-xs font-bold px-3 py-1 rounded-full">
                  {LABELS[req.leave_type] || req.leave_type} Leave
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-4">
                {[
                  { label: 'From',   val: format(new Date(req.from_date), 'dd MMM yyyy') },
                  { label: 'To',     val: format(new Date(req.to_date),   'dd MMM yyyy') },
                  { label: 'Days',   val: `${req.days_requested} day${req.days_requested > 1 ? 's' : ''}` },
                  { label: 'Applied',val: format(new Date(req.submitted_at), 'dd MMM yyyy') },
                ].map(item => (
                  <div key={item.label}>
                    <p className="text-xs text-gray-400">{item.label}</p>
                    <p className="font-semibold text-gray-700 mt-0.5">{item.val}</p>
                  </div>
                ))}
              </div>

              <div className="mt-3 bg-gray-50 rounded-xl px-3 py-2.5">
                <p className="text-xs text-gray-400 mb-0.5">Reason</p>
                <p className="text-sm text-gray-700">{req.reason}</p>
              </div>

              {req.admin_comment && (
                <div className="mt-2 bg-blue-50 rounded-xl px-3 py-2">
                  <p className="text-xs text-blue-500 mb-0.5">Admin Comment</p>
                  <p className="text-sm text-blue-700">{req.admin_comment}</p>
                </div>
              )}

              {tab === 'pending' && (
                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    onClick={() => reviewMutation.mutate({ id: req.id, action: 'approve', comment: 'Approved' })}
                    disabled={reviewMutation.isPending}
                    className="flex items-center gap-1.5 px-5 py-2.5 bg-green-500 hover:bg-green-600
                               text-white text-sm font-semibold rounded-xl transition"
                  >
                    <CheckCircle className="w-4 h-4" /> Approve
                  </button>
                  <button
                    onClick={() => setShowReject(showReject === req.id ? null : req.id)}
                    className="flex items-center gap-1.5 px-5 py-2.5 bg-red-50 hover:bg-red-100
                               text-red-600 text-sm font-semibold rounded-xl transition"
                  >
                    <XCircle className="w-4 h-4" /> Reject
                  </button>
                </div>
              )}

              {showReject === req.id && (
                <div className="mt-3 flex gap-2 animate-fade-in">
                  <input
                    className="input flex-1 text-sm"
                    placeholder="Rejection reason..."
                    value={rejectNote[req.id] || ''}
                    onChange={e => setRejectNote(n => ({ ...n, [req.id]: e.target.value }))}
                  />
                  <button
                    onClick={() => {
                      if (!rejectNote[req.id]?.trim()) return toast.error('Please provide a reason.');
                      reviewMutation.mutate({ id: req.id, action: 'reject', comment: rejectNote[req.id] });
                    }}
                    className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white text-sm font-semibold rounded-xl transition"
                  >
                    Confirm
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
