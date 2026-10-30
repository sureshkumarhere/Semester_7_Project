// MODULE: Complaint Management (Part 2) - this file belongs to the code for this module.
// ChangePriorityDialog modal for managers/admins to manually update or override complaint priority.

import React, { useState, useEffect } from 'react';
import { updateComplaintPriority } from '../../api/complaints';
import { X, Flag, AlertCircle, CheckCircle2 } from 'lucide-react';

interface ChangePriorityDialogProps {
  ticketId: string;
  currentPriority: string;
  isOpen: boolean;
  onClose: () => void;
  onPriorityUpdated: () => void;
}

const PRIORITY_OPTIONS = [
  {
    value: 'CRITICAL',
    label: 'Critical',
    desc: 'Campus-wide outage, VIP office, central server/switch fault, or urgent exam centre.',
    badgeClass: 'bg-red-100 text-red-800 border-red-300 ring-red-400',
    selectedClass: 'border-red-500 bg-red-50/70'
  },
  {
    value: 'HIGH',
    label: 'High',
    desc: 'Entire lab/hostel wing affected, recurring hardware fault, or high-density area.',
    badgeClass: 'bg-amber-100 text-amber-800 border-amber-300 ring-amber-400',
    selectedClass: 'border-amber-500 bg-amber-50/70'
  },
  {
    value: 'MEDIUM',
    label: 'Medium',
    desc: 'Standard single-user complaint or general connectivity problem (System Default).',
    badgeClass: 'bg-blue-100 text-blue-800 border-blue-300 ring-blue-400',
    selectedClass: 'border-blue-500 bg-blue-50/70'
  },
  {
    value: 'LOW',
    label: 'Low',
    desc: 'Minor issue, informational inquiry, cosmetic defect, or scheduled maintenance.',
    badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-300 ring-emerald-400',
    selectedClass: 'border-emerald-500 bg-emerald-50/70'
  }
];

export const ChangePriorityDialog: React.FC<ChangePriorityDialogProps> = ({
  ticketId,
  currentPriority,
  isOpen,
  onClose,
  onPriorityUpdated
}) => {
  const [selectedPriority, setSelectedPriority] = useState<string>(currentPriority || 'MEDIUM');
  const [reason, setReason] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setSelectedPriority(currentPriority || 'MEDIUM');
      setReason('');
      setError(null);
    }
  }, [isOpen, currentPriority]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedPriority === currentPriority) {
      setError('Please select a different priority level.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await updateComplaintPriority(ticketId, selectedPriority, reason.trim() || undefined);
      onPriorityUpdated();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to update complaint priority');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50">
          <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
            <Flag className="w-4 h-4 text-amber-600" />
            Update Complaint Priority (Ticket #{ticketId})
          </h3>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="p-3 bg-red-50 text-red-700 text-xs flex items-center gap-2 border-b border-red-100">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-slate-700">
                Select Priority Level <span className="text-red-500">*</span>
              </label>
              <span className="text-[11px] text-slate-500">
                Current: <strong className="uppercase">{currentPriority || 'MEDIUM'}</strong>
              </span>
            </div>

            <div className="grid grid-cols-1 gap-2.5">
              {PRIORITY_OPTIONS.map((opt) => {
                const isSelected = selectedPriority === opt.value;
                return (
                  <label
                    key={opt.value}
                    onClick={() => setSelectedPriority(opt.value)}
                    className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                      isSelected
                        ? `${opt.selectedClass} shadow-sm ring-1 ring-offset-0 ring-blue-500/30`
                        : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50/50'
                    }`}
                  >
                    <input
                      type="radio"
                      name="priority"
                      value={opt.value}
                      checked={isSelected}
                      onChange={() => setSelectedPriority(opt.value)}
                      className="mt-0.5 text-blue-600 focus:ring-blue-500"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase ${opt.badgeClass}`}>
                          {opt.label}
                        </span>
                        {opt.value === currentPriority && (
                          <span className="text-[10px] text-slate-400 italic">(Currently active)</span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-600 mt-1 leading-relaxed">{opt.desc}</p>
                    </div>
                    {isSelected && <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />}
                  </label>
                );
              })}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Reason / Escalation Note <span className="text-slate-400 font-normal">(Optional)</span>
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. High-impact lab session, Director office request, or downgrading standard query..."
              rows={2}
              maxLength={500}
              className="w-full p-2.5 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
            />
            <p className="text-[10px] text-slate-400 text-right mt-0.5">{reason.length} / 500</p>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 border border-slate-300 text-slate-600 hover:bg-slate-50 text-xs font-medium rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || selectedPriority === currentPriority}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-semibold rounded-xl transition-colors shadow-sm flex items-center gap-1.5"
            >
              {loading ? (
                <span>Updating...</span>
              ) : (
                <>
                  <Flag className="w-3.5 h-3.5" />
                  <span>Update Priority</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
