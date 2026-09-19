import React, { useState, useRef, useEffect, useCallback } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import CodeEditor from "../components/CodeEditor/CodeEditor";
import ConsolePanel from "../components/Console/ConsolePanel";
import Navbar from "../components/Navbar/Navbar";
import SplitPane from "../components/SplitPane/SplitPane";
import SaveModal from "../components/SavedCodes/SaveModal";
import SnippetSaveModal from "../components/SavedCodes/SnippetSaveModal";
import ResetModal from "../components/ResetModal/ResetModal";
import SnippetLibraryModal from "../components/Templates/SnippetLibraryModal";
import ShareModal from "../components/Share/ShareModal";
import SharedBanner from "../components/SharedBanner/SharedBanner";
import AuthModal from "../components/Auth/AuthModal";
import { LANGUAGES } from "../constants/languages";
import { boilerCodes } from "../boilerCodes";
import { submitCode, snippetsApi, codesApi } from "../api";
import { useAuth } from "../context/AuthContext";
import { useSnippets } from "../Hook/useSnippets";
import {
  getSavedCode,
  saveCode,
  resetSavedCode,
  getSavedTestCases,
  saveTestCases,
  getSavedLanguage,
  saveLanguage,
} from "../utils/storage";

// Safe base64 decoding helper
const decodeBase64 = (val) => {
  if (!val) return "";
  try {
    return atob(val);
  } catch {
    return val;
  }
};

// Safe base64 encoding helper
const encodeBase64 = (str) => {
  try {
    return btoa(unescape(encodeURIComponent(str || "")));
  } catch {
    return btoa(str || "");
  }
};

function IdePage() {
  const { snippetId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  const defaultLanguage = LANGUAGES[0]; // C++

  const [language, setLanguage] = useState(() => getSavedLanguage(defaultLanguage));
  const [code, setCode] = useState(() => getSavedCode(language.id, boilerCodes(language.id)));
  const [testCases, setTestCases] = useState(() => getSavedTestCases(language.id));
  const [activeCaseId, setActiveCaseId] = useState(() => testCases[0]?.id || "1");

  const [activeTab, setActiveTab] = useState("testcase");
  const [results, setResults] = useState(null);
  const [overallStatus, setOverallStatus] = useState(null);
  const [isRunning, setIsRunning] = useState(false);
  const [alertMessage, setAlertMessage] = useState(null);
  const [toastMessage, setToastMessage] = useState(null);

  // Snippets hook (fetching, cache, Monaco completions)
  const {
    snippets,
    loading: snippetsLoading,
    refetch: refetchSnippets,
    deleteSnippet: deleteSnippetFromCloud,
  } = useSnippets(language?.id);

  // Saved codes state & pagination
  const [savedCodes, setSavedCodes] = useState([]);
  const [codesLoading, setCodesLoading] = useState(false);
  const [codesPagination, setCodesPagination] = useState({ page: 1, total: 0, totalPages: 1 });
  const [codesSearch, setCodesSearch] = useState("");
  const [currentCode, setCurrentCode] = useState(null);

  // Cloud snippet & sharing state
  const [cloudSnippet, setCloudSnippet] = useState(null);
  const [isReadOnly, setIsReadOnly] = useState(false);
  const [isForking, setIsForking] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  // Modals state
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  const [isSnippetSaveModalOpen, setIsSnippetSaveModalOpen] = useState(false);
  const [snippetSaveError, setSnippetSaveError] = useState("");
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [isSnippetsModalOpen, setIsSnippetsModalOpen] = useState(false);

  // Load user's saved codes on mount or user change
  const loadCodes = useCallback(
    async (page = 1, search = "") => {
      if (!user) return;
      setCodesLoading(true);
      try {
        const data = await codesApi.getMyCodes({ page, limit: 50, search });
        setSavedCodes((prev) => (page === 1 ? data.codes : [...prev, ...data.codes]));
        setCodesPagination(data.pagination);
      } catch (err) {
        console.warn("Failed to load codes:", err);
      } finally {
        setCodesLoading(false);
      }
    },
    [user]
  );

  useEffect(() => {
    if (!user) {
      setSavedCodes([]);
      return;
    }
    loadCodes(1, "");
  }, [user, loadCodes]);

  // Handle code snippet passed from Learnings ("Run in CodePad")
  useEffect(() => {
    if (location.state?.initialCode) {
      setCode(location.state.initialCode);
      if (location.state.languageId) {
        const matched = LANGUAGES.find((l) => l.id === location.state.languageId);
        if (matched) setLanguage(matched);
      }
      setIsReadOnly(false);
      setCloudSnippet(null);
      setCurrentCode({
        title: "Snippet from Learnings",
        description: "Imported from CodePad Learnings",
      });
      showToast("Loaded snippet from Learnings into editor", "success");
    }
  }, [location.state]);

  const saveTimeoutRef = useRef(null);
  const editorInstanceRef = useRef(null);
  const latestStateRef = useRef({});

  // Keep latestStateRef always synchronized with current state
  useEffect(() => {
    latestStateRef.current = {
      code,
      testCases,
      language,
      cloudSnippet,
      currentCode,
      user,
      isReadOnly,
    };
  });

  // Cleanup auto-save timeouts on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  // Global keyboard shortcut: Ctrl+S / Cmd+S to save code
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        const saveBtn = document.getElementById("navbar-save-button");
        if (saveBtn) {
          saveBtn.click();
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Show temporary toast notification
  const showToast = (message, type = "success") => {
    setToastMessage({ message, type });
    setTimeout(() => {
      setToastMessage(null);
    }, 3500);
  };

  // Synchronize activeCaseId if testCases change
  useEffect(() => {
    if (!testCases.some((c) => c.id === activeCaseId)) {
      setActiveCaseId(testCases[0]?.id || "1");
    }
  }, [testCases, activeCaseId]);

  // Load shared snippet from cloud if snippetId is in URL
  useEffect(() => {
    if (!snippetId) {
      setCloudSnippet(null);
      setIsReadOnly(false);
      return;
    }

    const fetchSnippet = async () => {
      try {
        const data = await snippetsApi.getById(snippetId);
        setCloudSnippet(data);
        setCurrentCode(null);

        // Find language matching snippet
        const matchedLang = LANGUAGES.find((l) => l.id === data.languageId) || language;
        setLanguage(matchedLang);
        setCode(data.code);

        if (Array.isArray(data.testCases) && data.testCases.length > 0) {
          setTestCases(data.testCases);
          setActiveCaseId(data.testCases[0].id || "1");
        }

        // Read-only if user is not the author
        const isAuthor = user && data.author && user.id === data.author.id;
        setIsReadOnly(!isAuthor);
      } catch (err) {
        const msg =
          err.response?.status === 403
            ? "This snippet is private. Only the author can access it."
            : "Snippet not found or failed to load.";
        showToast(msg, "error");
        navigate("/ide", { replace: true });
      }
    };

    fetchSnippet();
  }, [snippetId, user]);

  const getAllTemplates = useCallback(
    (langId) => {
      const targetId = langId || language?.id;
      return (snippets || [])
        .filter((s) => !s.languageId || s.languageId === targetId || Number(s.languageId) === Number(targetId))
        .map((s) => ({
          ...s,
          name: s.title || s.name || "",
        }));
    },
    [snippets, language?.id]
  );

  // Handle language switch
  const handleLanguageChange = (newLang) => {
    if (!isReadOnly) {
      saveCode(language.id, code);
      saveTestCases(language.id, testCases);
    }

    setLanguage(newLang);
    latestStateRef.current.language = newLang;
    saveLanguage(newLang);

    if (!isReadOnly) {
      const savedCode = getSavedCode(newLang.id, boilerCodes(newLang.id));
      setCode(savedCode);
      latestStateRef.current.code = savedCode;
      const savedCases = getSavedTestCases(newLang.id);
      setTestCases(savedCases);
      latestStateRef.current.testCases = savedCases;
      setActiveCaseId(savedCases[0]?.id || "1");
    }

    setResults(null);
    setOverallStatus(null);
  };

  // Handle code change with local transient save (300ms debounce)
  const handleCodeChange = (newCode) => {
    setCode(newCode);
    latestStateRef.current.code = newCode;
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    saveTimeoutRef.current = setTimeout(() => {
      if (!isReadOnly) {
        saveCode(language.id, newCode);
      }
    }, 300);
    // No cloud auto-sync — save is explicit
  };

  // Add / Remove / Update Testcase
  const handleAddCase = () => {
    if (testCases.length >= 8) {
      showToast("Maximum 8 test cases allowed.", "info");
      return;
    }
    const currentCase = testCases.find((c) => c.id === activeCaseId) || testCases[testCases.length - 1];
    if (currentCase && !currentCase.input?.trim()) {
      showToast("Please enter input in current case first.", "info");
      return;
    }

    const newCase = {
      id: Date.now().toString(),
      name: `Case ${testCases.length + 1}`,
      input: "",
      expected: "",
    };
    const updated = [...testCases, newCase].map((c, idx) => ({ ...c, name: `Case ${idx + 1}` }));
    latestStateRef.current.testCases = updated;
    setTestCases(updated);
    setActiveCaseId(newCase.id);
  };

  const handleRemoveCase = (caseId) => {
    if (testCases.length <= 1) return;
    const remaining = testCases.filter((c) => c.id !== caseId);
    const updated = remaining.map((c, idx) => ({ ...c, name: `Case ${idx + 1}` }));
    latestStateRef.current.testCases = updated;
    setTestCases(updated);
    if (activeCaseId === caseId) {
      setActiveCaseId(updated[0]?.id || "1");
    }
  };

  const handleUpdateCase = (caseId, field, value) => {
    const updated = testCases.map((c) => (c.id === caseId ? { ...c, [field]: value } : c));
    latestStateRef.current.testCases = updated;
    setTestCases(updated);
  };

  // Reset code to boilerplate template
  const handleConfirmReset = () => {
    resetSavedCode(language.id);
    const defaultBoiler = boilerCodes(language.id);
    setCode(defaultBoiler);
    saveCode(language.id, defaultBoiler);
    setCurrentCode(null);
    setCloudSnippet(null);
    showToast(`Reset code to template for ${language.name}!`);
    if (snippetId) {
      navigate("/ide", { replace: true });
    }
  };

  // Save to MongoDB Cloud (for sharing)
  const handleSaveToCloud = async () => {
    if (!user) {
      setIsAuthModalOpen(true);
      showToast("Please sign in to share code.", "info");
      return null;
    }
    try {
      const baseCmd = (currentCode?.title || language.name)
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "")
        .slice(0, 15);
      const command = `/${baseCmd || "snippet"}_${Date.now().toString(36)}`;
      const payload = {
        title: currentCode?.title || `${language.name} Solution`,
        command,
        description: currentCode?.description || "",
        languageId: language.id,
        languageName: language.name,
        code,
        testCases,
        isPublic: true,
      };

      if (cloudSnippet && user && cloudSnippet.author?.id === user.id) {
        // Update existing owned snippet
        const updated = await snippetsApi.update(cloudSnippet.snippetId, payload);
        setCloudSnippet(updated);
        showToast("Snippet updated on cloud!");
        return updated;
      } else {
        // Create new snippet
        const created = await snippetsApi.create(payload);
        setCloudSnippet(created);
        setIsReadOnly(false);
        await refetchSnippets();
        showToast(`Saved to cloud! Snippet ID: ${created.snippetId}`);
        navigate(`/s/${created.snippetId}`, { replace: true });
        return created;
      }
    } catch (err) {
      showToast(err.response?.data?.message || "Failed to save to cloud", "info");
      return null;
    }
  };

  // Fork shared snippet
  const handleForkSnippet = async () => {
    if (!cloudSnippet) return;
    if (!user) {
      setIsAuthModalOpen(true);
      showToast("Please sign in to fork this snippet.", "info");
      return;
    }
    setIsForking(true);
    try {
      const forked = await snippetsApi.fork(cloudSnippet.snippetId);
      setCloudSnippet(forked);
      setCurrentCode(null);
      setIsReadOnly(false);
      showToast(`Forked! You now have your own editable copy.`);
      navigate(`/s/${forked.snippetId}`, { replace: true });
    } catch (err) {
      // Local fallback fork
      setIsReadOnly(false);
      setCurrentCode({
        title: `${cloudSnippet.title} (Fork)`,
        description: cloudSnippet.description || "",
      });
      showToast("Cloned code into your active editor!");
      navigate("/ide", { replace: true });
    } finally {
      setIsForking(false);
    }
  };

  // Save current viewed snippet as user's own new snippet
  const handleSaveAsSnippet = () => {
    if (!user) {
      setIsAuthModalOpen(true);
      showToast("Please sign in to save this as your snippet.", "info");
      return;
    }
    setIsSnippetSaveModalOpen(true);
  };

  // Open Share modal
  const handleOpenShare = () => {
    if (!user) {
      setIsAuthModalOpen(true);
      showToast("Please sign in to share your code.", "info");
      return;
    }
    if (!cloudSnippet) {
      // Auto-save to cloud first to get a permanent URL
      handleSaveToCloud().then((created) => {
        if (created) setIsShareModalOpen(true);
      });
    } else {
      setIsShareModalOpen(true);
    }
  };

  // Load a saved code into the active editor
  const handleLoadCode = (codeItem) => {
    const matchedLang = LANGUAGES.find((l) => l.id === codeItem.languageId) || language;
    setLanguage(matchedLang);
    setCode(codeItem.code || "");
    setTestCases(codeItem.testCases || []);
    setCurrentCode(codeItem);
    setCloudSnippet(null);
    setIsReadOnly(false);
    showToast(`Loaded "${codeItem.title}" into editor!`);
  };

  // Delete a saved code from cloud
  const handleDeleteCode = async (codeId) => {
    try {
      await codesApi.delete(codeId);
      setSavedCodes((prev) => prev.filter((c) => c.codeId !== codeId));
      setCodesPagination((prev) => ({
        ...prev,
        total: Math.max(0, prev.total - 1),
      }));
      if (currentCode?.codeId === codeId) {
        setCurrentCode(null);
      }
      showToast("Code deleted.", "info");
    } catch (err) {
      showToast("Failed to delete code.", "error");
    }
  };

  // Run code against test cases in the sandbox engine
  const handleRunCode = async () => {
    if (isRunning) return;

    setActiveTab("result");
    setIsRunning(true);
    setOverallStatus("Running...");
    setAlertMessage(null);

    try {
      const executionPromises = testCases.map(async (tc) => {
        const payload = {
          language_id: language.id,
          source_code: encodeBase64(code),
          stdin: encodeBase64(tc.input || ""),
        };

        const res = await submitCode(payload, { wait: true });
        if (!res.success) {
          return {
            caseId: tc.id,
            name: tc.name,
            input: tc.input,
            expected: tc.expected,
            actualOutput: "",
            stderr: res.err || "Submission failed",
            compileOutput: "",
            status: { id: 13, description: "Internal Error" },
            isPassed: false,
            isWrongAnswer: false,
          };
        }

        const data = res.data;
        const actualOutput = decodeBase64(data.stdout || "");
        const stderr = decodeBase64(data.stderr || "");
        const compileOutput = decodeBase64(data.compile_output || "");
        const statusId = data.status?.id;

        let isPassed = false;
        let isWrongAnswer = false;

        if (statusId === 3) {
          const expectedTrimmed = (tc.expected || "").trim();
          const actualTrimmed = actualOutput.trim();

          if (expectedTrimmed !== "") {
            if (actualTrimmed === expectedTrimmed) {
              isPassed = true;
              isWrongAnswer = false;
            } else {
              isPassed = false;
              isWrongAnswer = true;
            }
          } else {
            isPassed = true;
            isWrongAnswer = false;
          }
        }

        return {
          caseId: tc.id,
          name: tc.name,
          input: tc.input,
          expected: tc.expected,
          actualOutput,
          stderr,
          compileOutput,
          status: data.status,
          time: data.time,
          memory: data.memory,
          isPassed,
          isWrongAnswer,
        };
      });

      const caseResults = await Promise.all(executionPromises);
      setResults(caseResults);

      const hasCompileError = caseResults.some((r) => r.status?.id === 6);
      const hasRuntimeError = caseResults.some((r) => [7, 11, 12].includes(r.status?.id));
      const hasTLE = caseResults.some((r) => r.status?.id === 5);
      const allPassed = caseResults.every((r) => r.isPassed);

      let computedStatus = "Accepted";
      if (hasCompileError) computedStatus = "Compile Error";
      else if (hasRuntimeError) computedStatus = "Runtime Error";
      else if (hasTLE) computedStatus = "Time Limit Exceeded";
      else if (!allPassed) computedStatus = "Wrong Answer";

      setOverallStatus(computedStatus);
    } catch (err) {
      setOverallStatus("Error");
      setAlertMessage(err.message || "An unexpected error occurred.");
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="h-screen w-full flex flex-col bg-[#1a1a1a] text-gray-200 overflow-hidden font-sans">
      {/* Top Navbar */}
      <Navbar
        language={language}
        setLanguage={handleLanguageChange}
        onRun={handleRunCode}
        onReset={() => setIsResetModalOpen(true)}
        onOpenSaveModal={async () => {
          if (!user) {
            setIsAuthModalOpen(true);
            showToast("Please sign in to save your code.", "info");
            return;
          }
          if (currentCode?.codeId) {
            // Quick-save existing code
            try {
              const payload = {
                title: currentCode.title,
                description: currentCode.description || "",
                languageId: language.id,
                languageName: language.name,
                code,
                testCases,
              };
              const updated = await codesApi.update(currentCode.codeId, payload);
              setCurrentCode(updated);
              setSavedCodes((prev) =>
                prev.map((c) => (c.codeId === updated.codeId ? updated : c))
              );
              showToast(`Saved "${updated.title}"!`);
            } catch (err) {
              showToast(err.response?.data?.message || "Failed to save", "error");
            }
          } else {
            setIsSaveModalOpen(true);
          }
        }}
        onShare={handleOpenShare}
        activeSnippetName={currentCode?.title || cloudSnippet?.title || ""}
        savedCodes={savedCodes}
        codesLoading={codesLoading}
        codesPagination={codesPagination}
        onSearchCodes={(q) => {
          setCodesSearch(q);
          loadCodes(1, q);
        }}
        onLoadMoreCodes={() => {
          if (codesPagination.page < codesPagination.totalPages) {
            loadCodes(codesPagination.page + 1, codesSearch);
          }
        }}
        onLoadCode={handleLoadCode}
        onDeleteCode={handleDeleteCode}
        isRunning={isRunning}
        onOpenAuthModal={() => setIsAuthModalOpen(true)}
      />

      {/* Shared Snippet Read-Only Banner */}
      {cloudSnippet && isReadOnly && (
        <SharedBanner
          snippet={cloudSnippet}
          onFork={handleForkSnippet}
          onSaveAsSnippet={handleSaveAsSnippet}
          isForking={isForking}
        />
      )}

      {/* Floating Toast Notification */}
      {toastMessage && (
        <div
          className={`fixed top-14 right-4 z-50 px-4 py-2.5 rounded-lg shadow-lg border text-xs font-medium flex items-center space-x-2 animate-in slide-in-from-top duration-200 ${
            toastMessage.type === "info"
              ? "bg-[#252525] border-gray-600 text-gray-200"
              : "bg-[#172e21] border-[#2cbb5d]/50 text-[#2cbb5d]"
          }`}
        >
          <span>{toastMessage.message}</span>
          <button
            type="button"
            onClick={() => setToastMessage(null)}
            className="text-gray-400 hover:text-white ml-2"
          >
            ✕
          </button>
        </div>
      )}

      {/* Alert Banner */}
      {alertMessage && (
        <div className="bg-red-950/80 border-b border-red-800 text-red-300 text-xs px-4 py-2 flex items-center justify-between select-none flex-shrink-0">
          <span>{alertMessage}</span>
          <button
            type="button"
            onClick={() => setAlertMessage(null)}
            className="text-red-400 hover:text-white font-bold ml-4"
          >
            ✕
          </button>
        </div>
      )}

      {/* Main Dynamic Split Layout */}
      <SplitPane minLeft={320} minRight={280} minTop={200} minBottom={180}>
        <CodeEditor
          code={code}
          setCode={handleCodeChange}
          language={language}
          getAllTemplates={getAllTemplates}
          editorInstanceRef={editorInstanceRef}
          onOpenSnippetsModal={() => setIsSnippetsModalOpen(true)}
          readOnly={isReadOnly}
        />

        <ConsolePanel
          testCases={testCases}
          setTestCases={setTestCases}
          activeCaseId={activeCaseId}
          setActiveCaseId={setActiveCaseId}
          results={results}
          isRunning={isRunning}
          overallStatus={overallStatus}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          onAddCase={handleAddCase}
          onRemoveCase={handleRemoveCase}
          onUpdateCase={handleUpdateCase}
        />
      </SplitPane>

      {/* Modals */}
      <SaveModal
        isOpen={isSaveModalOpen}
        onClose={() => setIsSaveModalOpen(false)}
        initialName={currentCode?.title || cloudSnippet?.title || ""}
        initialCommand=""
        initialDescription={currentCode?.description || cloudSnippet?.description || ""}
        onSave={async (data) => {
          try {
            const created = await codesApi.create({
              title: data.name,
              description: data.description || "",
              languageId: data.languageId || language.id,
              languageName: data.languageName || language.name,
              code: data.code || code,
              testCases: data.testCases || testCases,
            });
            setSavedCodes((prev) => [created, ...prev]);
            setCurrentCode(created);
            setCodesPagination((prev) => ({ ...prev, total: prev.total + 1 }));
            showToast(`Saved "${created.title}"!`);
          } catch (err) {
            showToast(err.response?.data?.message || "Failed to save", "error");
          }
        }}
        currentLanguage={language}
        code={code}
        testCases={testCases}
      />

      <ResetModal
        isOpen={isResetModalOpen}
        onClose={() => setIsResetModalOpen(false)}
        onConfirm={handleConfirmReset}
        currentLanguage={language}
      />

      <SnippetLibraryModal
        isOpen={isSnippetsModalOpen}
        onClose={() => setIsSnippetsModalOpen(false)}
        allSnippets={snippets.map((s) => ({ ...s, name: s.title || s.name || "" }))}
        loading={snippetsLoading}
        currentLanguage={language}
        onSaveAsSnippet={() => {
          setIsSnippetsModalOpen(false);
          setIsSnippetSaveModalOpen(true);
        }}
        onInsertSnippet={(snippetCode) => {
          const editor = editorInstanceRef.current;
          if (editor && !isReadOnly) {
            const selection = editor.getSelection();
            editor.executeEdits("snippet-insert", [
              { range: selection, text: snippetCode, forceMoveMarkers: true },
            ]);
            editor.focus();
          } else if (!isReadOnly) {
            setCode((prev) => prev + "\n" + snippetCode);
          }
          showToast("Snippet inserted!");
        }}
        onDeleteSnippet={async (snippetIdOrCmd) => {
          const target = snippets.find(
            (s) => s.snippetId === snippetIdOrCmd || s._id === snippetIdOrCmd || s.command === snippetIdOrCmd
          );
          const idToDelete = target?.snippetId || target?._id || snippetIdOrCmd;
          try {
            await deleteSnippetFromCloud(idToDelete);
            showToast("Snippet deleted.", "info");
          } catch (err) {
            showToast("Failed to delete snippet.", "error");
          }
        }}
      />

      <SnippetSaveModal
        isOpen={isSnippetSaveModalOpen}
        onClose={() => {
          setIsSnippetSaveModalOpen(false);
          setSnippetSaveError("");
        }}
        serverError={snippetSaveError}
        currentLanguage={language}
        code={code}
        testCases={testCases}
        onSave={async (data) => {
          try {
            const created = await snippetsApi.create({
              title: data.name,
              command: data.command,
              description: data.description,
              languageId: data.languageId,
              languageName: data.languageName,
              code: data.code,
              testCases: data.testCases,
            });
            await refetchSnippets(); // invalidates cache, re-registers Monaco completions
            setIsSnippetSaveModalOpen(false);
            setSnippetSaveError("");
            showToast(`Snippet "${created.command}" saved!`);
          } catch (err) {
            const msg = err.response?.data?.message || "Failed to save snippet";
            setSnippetSaveError(msg);
          }
        }}
      />

      <ShareModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        snippetId={cloudSnippet?.snippetId}
        title={cloudSnippet?.title}
        languageName={cloudSnippet?.languageName || language.name}
        initialVisibility={cloudSnippet?.visibility || (cloudSnippet?.isPublic ? "public" : "unlisted")}
        isAuthor={!cloudSnippet?.author || (user && cloudSnippet.author.id === user.id)}
        onVisibilityChange={(newVis) => {
          setCloudSnippet((prev) => (prev ? { ...prev, visibility: newVis, isPublic: newVis === "public" } : prev));
          showToast(
            `Snippet access updated to ${
              newVis === "private" ? "Private" : newVis === "public" ? "Public (Explore)" : "Anyone with URL"
            }`
          );
        }}
      />

      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onSuccess={() => showToast("Signed in successfully!")}
      />
    </div>
  );
}

export default IdePage;
