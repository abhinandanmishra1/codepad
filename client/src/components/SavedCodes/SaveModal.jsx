import React, { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faFloppyDisk, faTimes, faCode } from '@fortawesome/free-solid-svg-icons';

export const SaveModal = ({
  isOpen, onClose, onSave, currentLanguage, code, testCases,
  initialName = '', initialDescription = '',
}) => {
  const [name, setName] = useState(initialName);
  const [description, setDescription] = useState(initialDescription);

  React.useEffect(() => {
    if (isOpen) { setName(initialName || ''); setDescription(initialDescription || ''); }
  }, [isOpen, initialName, initialDescription]);

  if (!isOpen) return null;

  const lineCount = (code || '').split('\n').length;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    onSave({
      name: name.trim(),
      description: description.trim(),
      languageId: currentLanguage?.id || 54,
      languageName: currentLanguage?.name || 'C++',
      code,
      testCases,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-150">
      <div className="bg-[#242424] border border-[#3e3e3e] rounded-xl w-full max-w-md shadow-2xl overflow-hidden font-sans text-xs text-gray-200">
        <div className="flex items-center justify-between px-4 py-3 bg-[#1e1e1e] border-b border-[#333333]">
          <div className="flex items-center space-x-2 text-sm font-semibold text-white">
            <span className="text-[#ffa116]"><FontAwesomeIcon icon={faFloppyDisk} /></span>
            <span>Save Code</span>
          </div>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-white p-1">
            <FontAwesomeIcon icon={faTimes} className="text-sm" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div className="flex items-center justify-between p-2.5 rounded-lg bg-[#1a1a1a] border border-[#333333] text-gray-400">
            <span className="flex items-center space-x-1.5">
              <FontAwesomeIcon icon={faCode} className="text-xs text-[#2cbb5d]" />
              <strong className="text-gray-200">{currentLanguage?.name || 'C++'}</strong>
            </span>
            <span>{lineCount} lines</span>
            <span>{testCases?.length || 0} testcases</span>
          </div>

          <div className="space-y-1.5">
            <label className="text-gray-300 font-medium">Code Name <strong className="text-red-400">*</strong></label>
            <input
              type="text" autoFocus value={name} onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Dijkstra Shortest Path"
              className="w-full px-3 py-2 rounded-lg bg-[#1a1a1a] border border-[#3e3e3e] text-white focus:outline-none focus:border-[#ffa116] transition-colors"
            />
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-gray-300 font-medium">Description (Optional)</label>
              <span className="text-gray-500 text-[11px]">{description.length}/250</span>
            </div>
            <textarea
              rows={2} maxLength={250} value={description} onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief notes or time complexity..."
              className="w-full px-3 py-2 rounded-lg bg-[#1a1a1a] border border-[#3e3e3e] text-white focus:outline-none focus:border-[#ffa116] transition-colors resize-none text-xs placeholder-gray-500"
            />
          </div>

          <div className="flex items-center justify-end space-x-2 pt-2 border-t border-[#333333]">
            <button type="button" onClick={onClose} className="px-3 py-1.5 rounded-lg bg-[#333333] hover:bg-[#3e3e3e] text-gray-300 font-medium transition-colors">Cancel</button>
            <button type="submit" disabled={!name.trim()} className="px-4 py-1.5 rounded-lg bg-[#2cbb5d] hover:bg-[#26a050] text-white font-semibold shadow disabled:opacity-50 transition-colors">
              Save Code
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SaveModal;
