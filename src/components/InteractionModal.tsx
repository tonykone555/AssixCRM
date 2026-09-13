import React, { useState } from 'react';
import { X, Calendar } from 'lucide-react';
import { Lead, Interaction } from '../types';

interface InteractionModalProps {
  lead: Lead;
  onClose: () => void;
  onAddInteraction: (leadId: string, interaction: Interaction) => void;
  isDarkMode: boolean;
}

export const InteractionModal: React.FC<InteractionModalProps> = ({
  lead,
  onClose,
  onAddInteraction,
}) => {
  const [date, setDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [type, setType] = useState<Interaction['type']>('DM Sent');
  const [notes, setNotes] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!notes.trim()) return;

    const newInteraction: Interaction = {
      id: `int_${Date.now()}`,
      date,
      type,
      notes: notes.trim(),
    };

    onAddInteraction(lead.id, newInteraction);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/60 backdrop-blur-xs font-sans animate-in fade-in duration-150">
      <div className="w-full max-w-md bg-white dark:bg-zinc-950 text-zinc-900 dark:text-white rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-2xl p-6">
        <div className="flex items-center justify-between pb-3 border-b border-zinc-200 dark:border-zinc-800 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center font-bold">
              <Calendar className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-zinc-900 dark:text-white">Log Interaction</h3>
              <p className="text-xs text-zinc-500">Lead: {lead.name}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs font-medium">
          <div>
            <label className="block text-zinc-500 font-semibold mb-1">
              Date *
            </label>
            <input
              type="date"
              required
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-800 text-zinc-900 dark:text-white focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-zinc-500 font-semibold mb-1">
              Interaction Type
            </label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as Interaction['type'])}
              className="w-full px-3.5 py-2 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-800 text-zinc-900 dark:text-white font-semibold cursor-pointer focus:outline-none"
            >
              <option value="DM Sent">DM Sent</option>
              <option value="Reply Received">Reply Received</option>
              <option value="Follow Up">Follow Up</option>
              <option value="Call">Call / Meeting</option>
              <option value="Proposal">Proposal Sent</option>
              <option value="Note">General Note</option>
            </select>
          </div>

          <div>
            <label className="block text-zinc-500 font-semibold mb-1">
              Details / Notes *
            </label>
            <textarea
              rows={3}
              required
              placeholder="Details of interaction..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-800 text-zinc-900 dark:text-white focus:outline-none"
            />
          </div>

          <div className="pt-2 flex justify-end gap-2 border-t border-zinc-200 dark:border-zinc-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-black hover:bg-zinc-800 text-white font-bold transition-all shadow-sm cursor-pointer"
            >
              Save Activity
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
