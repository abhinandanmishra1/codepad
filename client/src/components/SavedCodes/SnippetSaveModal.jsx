import React, { useState, useEffect } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faBolt,
  faTimes,
  faCode,
  faSpinner,
  faFloppyDisk,
  faExclamationCircle,
} from "@fortawesome/free-solid-svg-icons";

export const SnippetSaveModal = ({
  isOpen,
  onClose,
  serverError = "",
  currentLanguage,
  code = "",
  testCases = [],
  onSave,
}) => {
  const [name, setName] = useState("");
  const [command, setCommand] = useState("");
  const [description, setDescription] = useState("");
  const [localError, setLocalError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setName("");
      setCommand("");
      setDescription("");
      setLocalError("");
      setIsSubmitting(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleCommandChange = (e) => {
    let val = e.target.value.trim().toLowerCase();
    if (val && !val.startsWith("/")) {
      val = `/${val}`;
    }
    setCommand(val);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLocalError("");

    if (!name.trim()) {
      setLocalError("Please enter a snippet name.");
      return;
    }

    const trimmedCmd = command.trim();
    if (!trimmedCmd || !/^\/[a-zA-Z0-9_-]+$/.test(trimmedCmd)) {
      setLocalError("Command must start with '/' and contain only letters, numbers, hyphens, and underscores (e.g. /dsu).");
      return;
    }

    setIsSubmitting(true);
    try {
      await onSave({
        name: name.trim(),
        command: trimmedCmd,
        description: description.trim(),
        languageId: currentLanguage?.id || 54,
        languageName: currentLanguage?.name || "C++",
        code,
        testCases,
      });
    } catch (err) {
      // Error handled by parent or displayed via serverError
    } finally {
      setIsSubmitting(false);
    }
  };

  const lineCount = (code || "").split("\n").length;
  const displayError = serverError || localError;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-150">
      <div className="bg-[#242424] border border-[#3e3e3e] rounded-xl w-full max-w-md shadow-2xl overflow-hidden font-sans text-xs text-gray-200">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-[#1e1e1e] border-b border-[#333333]">
          <div className="flex items-center space-x-2 text-sm font-semibold text-white">
            <span className="text-[#ffa116]">
              <FontAwesomeIcon icon={faBolt} />
            </span>
            <span>Save as Snippet</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors p-1"
          >
            <FontAwesomeIcon icon={faTimes} className="text-sm" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {/* Summary Pill */}
          <div className="flex items-center justify-between p-2.5 rounded-lg bg-[#1a1a1a] border border-[#333333] text-gray-400">
            <span className="flex items-center space-x-1.5">
              <FontAwesomeIcon icon={faCode} className="text-xs text-[#2cbb5d]" />
              <span className="font-medium text-white">{currentLanguage?.name || "C++"}</span>
            </span>
            <span className="text-[11px]">
              {lineCount} {lineCount === 1 ? "line" : "lines"}
            </span>
          </div>

          {/* Error Banner */}
          {displayError && (
            <div className="p-2.5 rounded-lg bg-red-950/60 border border-red-800/80 text-red-300 text-xs flex items-center space-x-2">
              <FontAwesomeIcon icon={faExclamationCircle} className="text-red-400 flex-shrink-0" />
              <span>{displayError}</span>
            </div>
          )}

          {/* Snippet Title */}
          <div>
            <label className="block text-gray-300 font-medium mb-1">
              Snippet Name <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Disjoint Set Union"
              className="w-full px-3 py-2 rounded-lg bg-[#1a1a1a] border border-[#3e3e3e] text-white focus:outline-none focus:border-[#ffa116] transition-colors"
            />
          </div>

          {/* Slash Command Shortcut */}
          <div>
            <label className="block text-gray-300 font-medium mb-1">
              Slash Command Shortcut <span className="text-red-400">*</span>
            </label>
            <div className="relative">
              <input
                type="text"
                required
                value={command}
                onChange={handleCommandChange}
                placeholder="/dsu"
                className="w-full px-3 py-2 rounded-lg bg-[#1a1a1a] border border-[#3e3e3e] text-[#2cbb5d] font-mono font-medium focus:outline-none focus:border-[#2cbb5d] transition-colors"
              />
            </div>
            <p className="text-[10px] text-gray-500 mt-1">
              Type this shortcut in the editor (e.g. <span className="text-[#2cbb5d] font-mono">/dsu</span>) to instantly expand this snippet.
            </p>
          </div>

          {/* Description */}
          <div>
            <label className="block text-gray-300 font-medium mb-1">
              Description <span className="text-gray-500 font-normal">(optional)</span>
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description or usage notes..."
              className="w-full px-3 py-2 rounded-lg bg-[#1a1a1a] border border-[#3e3e3e] text-white focus:outline-none focus:border-[#ffa116] transition-colors resize-none"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end space-x-2 pt-2 border-t border-[#333333]">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 rounded-lg bg-[#333333] hover:bg-[#3e3e3e] text-gray-300 hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-1.5 rounded-lg bg-[#ffa116] hover:bg-[#e08d0e] text-black font-semibold transition-colors flex items-center space-x-1.5 disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <FontAwesomeIcon icon={faSpinner} className="animate-spin text-xs" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <FontAwesomeIcon icon={faFloppyDisk} className="text-xs" />
                  <span>Save Snippet</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SnippetSaveModal;
