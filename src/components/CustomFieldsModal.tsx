import React, { useState } from 'react';
import { X, SlidersHorizontal, Trash2, Plus } from 'lucide-react';
import { CustomFieldDefinition } from '../types';

interface CustomFieldsModalProps {
  customFieldsDefs: CustomFieldDefinition[];
  onClose: () => void;
  onAddCustomField: (field: CustomFieldDefinition) => void;
  onDeleteCustomField: (fieldId: string) => void;
  isDarkMode: boolean;
}

export const CustomFieldsModal: React.FC<CustomFieldsModalProps> = ({
  customFieldsDefs,
  onClose,
  onAddCustomField,
  onDeleteCustomField,
}) => {
  const [fieldName, setFieldName] = useState('');
  const [fieldType, setFieldType] = useState<CustomFieldDefinition['type']>('text');

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fieldName.trim()) return;

    const newField: CustomFieldDefinition = {
      id: `field_${Date.now()}`,
      name: fieldName.trim(),
      type: fieldType,
    };

    onAddCustomField(newField);
    setFieldName('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/60 backdrop-blur-xs font-sans animate-in fade-in duration-150">
      <div className="w-full max-w-md bg-white dark:bg-zinc-950 text-zinc-900 dark:text-white rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-2xl p-6">
        <div className="flex items-center justify-between pb-3 border-b border-zinc-200 dark:border-zinc-800 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold">
              <SlidersHorizontal className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-zinc-900 dark:text-white">Custom Lead Fields</h3>
              <p className="text-xs text-zinc-500">Add custom metrics to track on every lead</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-4 text-xs font-medium">
          {/* Add Field Form */}
          <form onSubmit={handleAdd} className="p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200/80 dark:border-zinc-800 space-y-2">
            <p className="font-semibold text-zinc-900 dark:text-white text-[11px] uppercase tracking-wider">Create Field</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <input
                type="text"
                required
                placeholder="e.g. Budget or Niche"
                value={fieldName}
                onChange={(e) => setFieldName(e.target.value)}
                className="px-3 py-1.5 rounded-lg bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-800 text-zinc-900 dark:text-white focus:outline-none"
              />
              <select
                value={fieldType}
                onChange={(e) => setFieldType(e.target.value as CustomFieldDefinition['type'])}
                className="px-3 py-1.5 rounded-lg bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-800 text-zinc-900 dark:text-white font-semibold cursor-pointer focus:outline-none"
              >
                <option value="text">Text Input</option>
                <option value="number">Numeric</option>
                <option value="date">Date</option>
              </select>
            </div>
            <button
              type="submit"
              className="w-full py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold transition-colors flex items-center justify-center gap-1 shadow-sm"
            >
              <Plus className="w-4 h-4" />
              <span>Add Custom Metric</span>
            </button>
          </form>

          {/* List of Fields */}
          <div>
            <p className="font-semibold text-zinc-500 text-[11px] uppercase tracking-wider mb-2">Active Tracked Fields</p>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {customFieldsDefs.map((field) => (
                <div
                  key={field.id}
                  className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200/60 dark:border-zinc-800/60 flex items-center justify-between text-xs"
                >
                  <div>
                    <span className="font-semibold text-zinc-900 dark:text-white">{field.name}</span>
                    <span className="ml-2 text-[10px] text-zinc-500 font-normal">({field.type})</span>
                  </div>
                  <button
                    onClick={() => onDeleteCustomField(field.id)}
                    className="p-1.5 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 text-zinc-400 hover:text-rose-600 transition-colors"
                    title="Remove field"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-2 flex justify-end border-t border-zinc-200 dark:border-zinc-800">
            <button
              onClick={onClose}
              className="px-5 py-2 rounded-xl bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 font-semibold"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
