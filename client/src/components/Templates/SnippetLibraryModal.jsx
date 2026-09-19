import React, { useState, useMemo } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faTimes,
  faSearch,
  faPlus,
  faCopy,
  faCheck,
  faCode,
  faBolt,
  faTrash,
  faSpinner,
} from "@fortawesome/free-solid-svg-icons";
import Tooltip from "../ui/tooltip";
import DeleteConfirmModal from "../common/DeleteConfirmModal";

export const SnippetLibraryModal = ({
  isOpen,
  onClose,
  allSnippets = [],
  currentLanguage,
  onInsertSnippet,
  onDeleteSnippet,
  loading = false,
  onSaveAsSnippet,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [copiedCmd, setCopiedCmd] = useState(null);
  const [snippetToDelete, setSnippetToDelete] = useState(null);

  const filtered = useMemo(() => {
    if (!searchQuery.trim()) return allSnippets;
    const q = searchQuery.toLowerCase();
    return allSnippets.filter(
      (s) =>
        (s.name && s.name.toLowerCase().includes(q)) ||
        (s.command && s.command.toLowerCase().includes(q)) ||
        (s.code && s.code.toLowerCase().includes(q))
    );
  }, [allSnippets, searchQuery]);

  if (!isOpen) return null;

  const handleCopy = async (snippet) => {
    try {
      await navigator.clipboard.writeText(snippet.code);
      setCopiedCmd(snippet.command);
      setTimeout(() => setCopiedCmd(null), 2000);
    } catch {}
  };

  const handleDelete = (snippet) => {
    setSnippetToDelete(snippet);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-150">
      <div className="bg-[#242424] border border-[#3e3e3e] rounded-xl w-full max-w-xl shadow-2xl overflow-hidden font-sans text-xs text-gray-200 flex flex-col max-h-[80vh]">
        {/* Header matching LeetCode Snippet Library */}
        <div className="flex items-center justify-between px-4 py-3 bg-[#1e1e1e] border-b border-[#333333] flex-shrink-0">
          <div className="flex items-center space-x-2 text-sm font-semibold text-white">
            <span className="text-[#ffa116]">
              <FontAwesomeIcon icon={faCode} />
            </span>
            <span>Snippet Library</span>
            {currentLanguage && (
              <span className="text-[11px] bg-[#2a2a2a] text-gray-300 border border-[#3e3e3e] px-2 py-0.5 rounded font-mono font-normal">
                {currentLanguage.name}
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors p-1"
          >
            <FontAwesomeIcon icon={faTimes} className="text-sm" />
          </button>
        </div>

        {/* Search Bar & Subtitle */}
        <div className="p-3 bg-[#1e1e1e] border-b border-[#333333] flex-shrink-0 space-y-2">
          <div className="relative">
            <FontAwesomeIcon
              icon={faSearch}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs"
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search snippets e.g. /binarysearch, /trie..."
              className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-[#141414] border border-[#3e3e3e] text-white focus:outline-none focus:border-[#2cbb5d] transition-colors text-xs"
            />
          </div>
          <p className="text-[11px] text-gray-400 flex items-center space-x-1">
            <FontAwesomeIcon icon={faBolt} className="text-[#ffa116] text-[10px]" />
            <span>Tip: Type <code className="text-[#2cbb5d] font-mono">/command</code> anywhere in the editor to expand directly!</span>
          </p>
        </div>

        {/* Compact Snippet Rows matching LeetCode */}
        <div className="flex-1 overflow-y-auto divide-y divide-[#2d2d2d] p-1">
          {loading ? (
            <div className="p-8 text-center text-gray-500 flex items-center justify-center space-x-2">
              <FontAwesomeIcon icon={faSpinner} className="animate-spin" />
              <span>Loading snippets...</span>
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-8 text-center text-gray-500 space-y-1">
              <p>No snippets found for {currentLanguage?.name || "this language"}.</p>
              <p className="text-[11px] text-gray-600">Click "+ New Snippet" to create one with a slash command.</p>
            </div>
          ) : (
            filtered.map((snippet) => (
              <div
                key={snippet.snippetId || `${snippet.command}_${snippet.languageId || "all"}`}
                className="flex items-center justify-between px-4 py-3 hover:bg-[#282828] transition-colors gap-3 group"
              >
                {/* Left: Icon, Name, Command, Description */}
                <div className="flex items-start space-x-3 min-w-0 flex-1">
                  <span className="text-gray-500 group-hover:text-gray-300 transition-colors mt-0.5 text-xs">
                    <FontAwesomeIcon icon={faCode} />
                  </span>
                  <div className="min-w-0">
                    <div className="flex items-center space-x-2 flex-wrap">
                      <span className="font-semibold text-gray-100 text-xs">{snippet.name}</span>
                      <code className="bg-[#1b2b23] text-[#2cbb5d] border border-[#2cbb5d]/40 px-1.5 py-0.2 rounded font-mono text-[10px] font-bold">
                        {snippet.command}
                      </code>
                    </div>
                    {snippet.description && (
                      <p className="text-[11px] text-gray-400 mt-0.5 line-clamp-2">
                        {snippet.description}
                      </p>
                    )}
                  </div>
                </div>

                {/* Right: Copy, Delete, and Insert Buttons */}
                <div className="flex items-center space-x-1.5 flex-shrink-0">
                  <Tooltip content="Copy snippet code" side="top">
                    <button
                      type="button"
                      onClick={() => handleCopy(snippet)}
                      className="p-1.5 text-gray-400 hover:text-white rounded bg-[#2d2d2d] hover:bg-[#383838] transition-colors text-xs"
                    >
                      <FontAwesomeIcon
                        icon={copiedCmd === snippet.command ? faCheck : faCopy}
                        className={copiedCmd === snippet.command ? "text-[#2cbb5d]" : ""}
                      />
                    </button>
                  </Tooltip>

                  <Tooltip content="Delete snippet" side="top">
                    <button
                      type="button"
                      onClick={() => handleDelete(snippet)}
                      className="p-1.5 text-gray-500 hover:text-red-400 rounded bg-[#2d2d2d] hover:bg-[#383838] transition-colors text-xs"
                    >
                      <FontAwesomeIcon icon={faTrash} />
                    </button>
                  </Tooltip>

                  <Tooltip content="Insert into editor" side="top">
                    <button
                      type="button"
                      onClick={() => {
                        onInsertSnippet(snippet.code);
                        onClose();
                      }}
                      className="w-7 h-7 flex items-center justify-center rounded-full bg-[#ffa116] hover:bg-[#e08d0e] text-black font-semibold transition-all shadow active:scale-95 ml-1"
                    >
                      <FontAwesomeIcon icon={faPlus} className="text-xs" />
                    </button>
                  </Tooltip>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="p-3 bg-[#1e1e1e] border-t border-[#333333] flex justify-between items-center flex-shrink-0">
          {onSaveAsSnippet && (
            <button
              type="button"
              onClick={onSaveAsSnippet}
              className="px-3 py-1.5 rounded-lg bg-[#ffa116] hover:bg-[#e08d0e] text-black font-semibold text-xs transition-colors"
            >
              + New Snippet
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-[#333333] hover:bg-[#3f3f3f] text-gray-300 hover:text-white font-medium transition-colors text-xs ml-auto"
          >
            Close
          </button>
        </div>
      </div>

      <DeleteConfirmModal
        isOpen={Boolean(snippetToDelete)}
        onClose={() => setSnippetToDelete(null)}
        onConfirm={() => {
          if (snippetToDelete && onDeleteSnippet) {
            onDeleteSnippet(
              snippetToDelete.snippetId ||
                snippetToDelete._id ||
                snippetToDelete.id ||
                snippetToDelete.command
            );
            setSnippetToDelete(null);
          }
        }}
        title="Delete Snippet"
        itemName={snippetToDelete ? `${snippetToDelete.name} (${snippetToDelete.command})` : ""}
      />
    </div>
  );
};

export default SnippetLibraryModal;
