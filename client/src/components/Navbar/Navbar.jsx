import React, { useState, useRef, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faPlay,
  faSpinner,
  faRotateLeft,
  faFloppyDisk,
  faChevronDown,
  faSearch,
  faTrash,
  faArrowRight,
  faShareNodes,
  faCompass,
  faRightFromBracket,
  faUser,
  faCode,
  faBookOpen,
} from "@fortawesome/free-solid-svg-icons";
import LanguageDropdown from "../Dropdowns/LanguageDropdown";
import { CodePadBrand } from "../Brand/CodePadLogo";
import { useAuth } from "../../context/AuthContext";
import UserAvatar from "../common/UserAvatar";
import Tooltip from "../ui/tooltip";
import DeleteConfirmModal from "../common/DeleteConfirmModal";

const Navbar = ({
  language,
  setLanguage,
  onRun,
  onReset,
  onOpenSaveModal,
  onShare,
  activeSnippetName = "",
  savedCodes = [],
  codesLoading = false,
  codesPagination = { total: 0, page: 1, totalPages: 1 },
  onSearchCodes,
  onLoadMoreCodes,
  onLoadCode,
  onDeleteCode,
  isRunning,
  onOpenAuthModal,
}) => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const isInIdeOrViewingCode =
    location.pathname === "/ide" || location.pathname.startsWith("/s/");

  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [searchFilter, setSearchFilter] = useState("");
  const [codeToDelete, setCodeToDelete] = useState(null);
  const dropdownRef = useRef(null);
  const userMenuRef = useRef(null);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) {
        setUserMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, []);

  return (
    <div className="bg-[#282828] border-b border-[#3e3e3e] px-4 py-2 flex items-center justify-between gap-3 select-none flex-shrink-0 h-[50px] relative z-40">
      {/* Brand Title & Quick Navigation */}
      <div className="flex items-center space-x-3">
        <Link to="/" className="hover:opacity-90 transition-opacity">
          <CodePadBrand />
        </Link>
        <div className="hidden lg:flex items-center space-x-1 pl-2 border-l border-[#3e3e3e]">
          {!isInIdeOrViewingCode && (
            <Link
              to="/ide"
              className="px-2.5 py-1 text-xs text-gray-300 hover:text-white rounded-md hover:bg-[#333333] transition-colors flex items-center space-x-1.5"
            >
              <FontAwesomeIcon icon={faCode} className="text-[11px] text-[#ffa116]" />
              <span>IDE</span>
            </Link>
          )}
          <Link
            to="/learnings"
            className={`px-2.5 py-1 text-xs rounded-md hover:bg-[#333333] transition-colors flex items-center space-x-1.5 ${
              location.pathname.startsWith("/learnings")
                ? "text-[#ffa116] bg-[#333333]"
                : "text-gray-300 hover:text-white"
            }`}
          >
            <FontAwesomeIcon icon={faBookOpen} className="text-[11px] text-[#00b4d8]" />
            <span>Learnings</span>
          </Link>
          <Link
            to="/explore"
            className="px-2.5 py-1 text-xs text-gray-300 hover:text-white rounded-md hover:bg-[#333333] transition-colors flex items-center space-x-1.5"
          >
            <FontAwesomeIcon icon={faCompass} className="text-[11px] text-[#2cbb5d]" />
            <span>Explore</span>
          </Link>
        </div>
      </div>

      {/* Center Controls: Language Selector, Save, Share, Reset */}
      <div className="flex items-center space-x-1.5 sm:space-x-2.5">
        <LanguageDropdown language={language} setLanguage={setLanguage} />

        {/* Combined Save Button + Dropdown */}
        <div className="relative inline-flex items-center" ref={dropdownRef}>
          <Tooltip
            content={
              activeSnippetName
                ? `Save changes to "${activeSnippetName}" (Ctrl + S)`
                : "Save code (Ctrl + S)"
            }
            side="bottom"
          >
            <button
              type="button"
              id="navbar-save-button"
              onClick={onOpenSaveModal}
              className="inline-flex items-center space-x-1.5 px-2.5 py-1.5 text-xs text-white bg-[#333333] hover:bg-[#3f3f3f] border border-[#4a4a4a] rounded-l-md transition-colors"
            >
              <FontAwesomeIcon
                icon={faFloppyDisk}
                className="text-xs text-[#ffa116]"
              />
              <span className="font-semibold">Save</span>
              {activeSnippetName && (
                <>
                  <span className="text-gray-500 text-[11px]">|</span>
                  <span
                    className="font-medium text-white max-w-[80px] sm:max-w-[120px] truncate"
                    title={activeSnippetName}
                  >
                    {activeSnippetName}
                  </span>
                </>
              )}
            </button>
          </Tooltip>

          <Tooltip content="Browse saved codes" side="bottom">
            <button
              type="button"
              onClick={() => setDropdownOpen((prev) => !prev)}
              className="px-2 py-1.5 text-xs text-gray-300 bg-[#333333] hover:bg-[#3f3f3f] border-t border-r border-b border-[#4a4a4a] rounded-r-md transition-colors hover:text-white"
            >
              <FontAwesomeIcon
                icon={faChevronDown}
                className={`text-[10px] transition-transform duration-150 ${dropdownOpen ? "rotate-180" : ""}`}
              />
            </button>
          </Tooltip>

          {/* Saved Codes Dropdown Menu */}
          {dropdownOpen && (
            <div className="absolute top-full left-0 mt-1.5 w-72 sm:w-84 bg-[#222222] border border-[#3e3e3e] rounded-lg shadow-2xl z-50 overflow-hidden text-xs text-gray-200 animate-in fade-in zoom-in-95 duration-100">
              {/* Header */}
              <div className="px-3 py-2 bg-[#1c1c1c] border-b border-[#333333] flex items-center justify-between">
                <span className="font-semibold text-white">Saved Codes</span>
                <span className="bg-[#2e2e2e] text-gray-300 text-[10px] px-1.5 py-0.5 rounded-full font-mono">
                  {codesPagination?.total ?? savedCodes.length} total
                </span>
              </div>

              {/* Search */}
              <div className="p-2 border-b border-[#333333] bg-[#1a1a1a]">
                <div className="relative">
                  <FontAwesomeIcon
                    icon={faSearch}
                    className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-500 text-[10px]"
                  />
                  <input
                    type="text"
                    value={searchFilter}
                    onChange={(e) => {
                      setSearchFilter(e.target.value);
                      onSearchCodes && onSearchCodes(e.target.value);
                    }}
                    placeholder="Search codes..."
                    className="w-full pl-7 pr-2.5 py-1 bg-[#121212] border border-[#3e3e3e] rounded text-xs text-gray-200 placeholder-gray-500 focus:outline-none focus:border-[#ffa116]"
                  />
                </div>
              </div>

              {/* Code list */}
              <div className="max-h-64 overflow-y-auto divide-y divide-[#2d2d2d]">
                {codesLoading && savedCodes.length === 0 ? (
                  <div className="p-4 text-center text-gray-500 text-[11px] flex items-center justify-center space-x-2">
                    <FontAwesomeIcon icon={faSpinner} className="animate-spin" />
                    <span>Loading...</span>
                  </div>
                ) : savedCodes.length === 0 ? (
                  <div className="p-4 text-center text-gray-500 text-[11px]">
                    {searchFilter ? "No matching codes." : "No saved codes yet."}
                  </div>
                ) : (
                  savedCodes.map((codeItem) => (
                    <div
                      key={codeItem.codeId || codeItem._id || codeItem.id}
                      className="p-2.5 hover:bg-[#2a2a2a] transition-colors flex items-center justify-between gap-2 group"
                    >
                      <div
                        onClick={() => {
                          onLoadCode && onLoadCode(codeItem);
                          setDropdownOpen(false);
                        }}
                        className="cursor-pointer min-w-0 flex-1"
                      >
                        <div className="font-medium text-white truncate text-[12px] group-hover:text-[#ffa116] transition-colors">
                          {codeItem.title}
                        </div>
                        <div className="text-[10px] text-gray-500 mt-0.5">
                          {codeItem.languageName || "Code"} • {codeItem.testCases?.length || 0} cases
                        </div>
                      </div>
                      <div className="flex items-center space-x-1 flex-shrink-0">
                        <button
                          type="button"
                          onClick={() => setCodeToDelete(codeItem)}
                          className="p-1 text-gray-500 hover:text-red-400 rounded transition-colors"
                          title="Delete saved code"
                        >
                          <FontAwesomeIcon icon={faTrash} className="text-[10px]" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            onLoadCode && onLoadCode(codeItem);
                            setDropdownOpen(false);
                          }}
                          className="px-2 py-1 bg-[#2cbb5d] hover:bg-[#26a050] text-white rounded font-medium text-[11px] transition-colors shadow"
                          title="Load code"
                        >
                          <FontAwesomeIcon icon={faArrowRight} className="text-[9px]" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
                {/* Load more */}
                {codesPagination && codesPagination.page < codesPagination.totalPages && (
                  <button
                    type="button"
                    onClick={onLoadMoreCodes}
                    disabled={codesLoading}
                    className="w-full py-2 text-center text-[11px] text-gray-400 hover:text-white hover:bg-[#2a2a2a] transition-colors disabled:opacity-50 flex items-center justify-center space-x-1.5"
                  >
                    {codesLoading ? (
                      <>
                        <FontAwesomeIcon icon={faSpinner} className="animate-spin text-[10px]" />
                        <span>Loading...</span>
                      </>
                    ) : (
                      "Load more..."
                    )}
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Share Button */}
        {onShare && (
          <Tooltip content="Share snippet with unique link" side="bottom">
            <button
              type="button"
              onClick={onShare}
              className="flex items-center space-x-1 px-2.5 py-1.5 text-xs text-white bg-[#333333] hover:bg-[#3f3f3f] border border-[#4a4a4a] rounded-md transition-colors"
            >
              <FontAwesomeIcon icon={faShareNodes} className="text-xs text-[#00b4d8]" />
              <span className="font-semibold hidden sm:inline">Share</span>
            </button>
          </Tooltip>
        )}

        {/* Reset button */}
        <Tooltip content="Reset code to default template" side="bottom">
          <button
            type="button"
            onClick={onReset}
            disabled={isRunning}
            className="flex items-center space-x-1 px-2 py-1.5 text-xs text-gray-300 bg-[#333333] hover:bg-[#3f3f3f] border border-[#444444] rounded-md transition-colors disabled:opacity-50"
          >
            <FontAwesomeIcon icon={faRotateLeft} className="text-xs text-gray-400" />
            <span className="hidden lg:inline">Reset</span>
          </button>
        </Tooltip>
      </div>

      {/* Right Controls: Run Button & User Profile / Login */}
      <div className="flex items-center space-x-2 sm:space-x-3 flex-shrink-0">
        <Tooltip content="Run code against test cases (Ctrl + Enter)" side="bottom">
          <button
            type="button"
            onClick={onRun}
            disabled={isRunning}
            className={`flex items-center space-x-1.5 sm:space-x-2 px-3 sm:px-4 py-1.5 rounded-md text-xs font-semibold text-white shadow transition-all ${
              isRunning
                ? "bg-[#258547] cursor-not-allowed opacity-80"
                : "bg-[#2cbb5d] hover:bg-[#26a050] active:scale-95"
            }`}
          >
            {isRunning ? (
              <>
                <FontAwesomeIcon icon={faSpinner} className="animate-spin text-xs" />
                <span>Running...</span>
              </>
            ) : (
              <>
                <FontAwesomeIcon icon={faPlay} className="text-[11px]" />
                <span>Run</span>
              </>
            )}
          </button>
        </Tooltip>

        {/* User Authentication Menu */}
        {user ? (
          <div className="relative" ref={userMenuRef}>
            <Tooltip content={`@${user.username} (Profile & Menu)`} side="bottom">
              <button
                type="button"
                onClick={() => setUserMenuOpen((prev) => !prev)}
                className="flex items-center space-x-1.5 p-1 rounded-full hover:ring-2 hover:ring-[#ffa116] transition-all"
              >
                <UserAvatar
                  avatar={user.avatar}
                  name={user.name}
                  username={user.username}
                  size="md"
                />
              </button>
            </Tooltip>

            {userMenuOpen && (
              <div className="absolute right-0 top-full mt-2 w-52 bg-[#222222] border border-[#3e3e3e] rounded-lg shadow-2xl z-50 overflow-hidden text-xs text-gray-200 animate-in fade-in zoom-in-95 duration-100">
                <div className="p-3 bg-[#1a1a1a] border-b border-[#333333]">
                  <div className="font-semibold text-white truncate">{user.name}</div>
                  <div className="text-[11px] text-[#ffa116]">@{user.username}</div>
                </div>
                <div className="p-1">
                  <Link
                    to={`/u/${user.username}`}
                    onClick={() => setUserMenuOpen(false)}
                    className="flex items-center space-x-2 px-3 py-2 rounded hover:bg-[#2f2f2f] transition-colors text-gray-200 hover:text-white"
                  >
                    <FontAwesomeIcon icon={faUser} className="text-xs text-gray-400" />
                    <span>My Profile</span>
                  </Link>

                  <button
                    type="button"
                    onClick={() => {
                      logout();
                      setUserMenuOpen(false);
                    }}
                    className="w-full flex items-center space-x-2 px-3 py-2 rounded hover:bg-[#2f2f2f] transition-colors text-red-400 hover:text-red-300 text-left"
                  >
                    <FontAwesomeIcon icon={faRightFromBracket} className="text-xs" />
                    <span>Sign Out</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <Tooltip content="Sign in with Google" side="bottom">
            <button
              type="button"
              onClick={onOpenAuthModal}
              className="flex items-center space-x-1.5 px-3 py-1.5 text-xs font-semibold bg-[#383838] hover:bg-[#444444] text-white border border-[#4f4f4f] rounded-md transition-all shadow active:scale-95"
            >
              <FontAwesomeIcon icon={faUser} className="text-[11px] text-[#ffa116]" />
              <span>Sign In</span>
            </button>
          </Tooltip>
        )}
      </div>

      <DeleteConfirmModal
        isOpen={Boolean(codeToDelete)}
        onClose={() => setCodeToDelete(null)}
        onConfirm={() => {
          if (codeToDelete) {
            onDeleteCode && onDeleteCode(codeToDelete.codeId || codeToDelete._id || codeToDelete.id);
            setCodeToDelete(null);
          }
        }}
        title="Delete Saved Code"
        itemName={codeToDelete?.title}
      />
    </div>
  );
};

export default Navbar;
