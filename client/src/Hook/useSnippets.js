import { useState, useEffect, useCallback, useRef } from 'react';
import { useMonaco } from '@monaco-editor/react';
import { snippetsApi } from '../api';
import { useAuth } from '../context/AuthContext';
import { getSnippetsCache, setSnippetsCache, clearSnippetsCache } from '../utils/storage';

// Mapping from CodePad numeric languageId -> Monaco language identifier
const LANG_MAP = {
  54: 'cpp', 50: 'c', 62: 'java', 63: 'javascript', 74: 'typescript',
  71: 'python', 70: 'python', 72: 'ruby', 73: 'rust', 60: 'go',
  78: 'kotlin', 79: 'swift', 80: 'scala',
};

export const useSnippets = (languageId) => {
  const { user } = useAuth();
  const monaco = useMonaco();
  const [snippets, setSnippets] = useState([]);
  const [loading, setLoading] = useState(false);
  const disposerRef = useRef(null);

  const registerCompletions = useCallback((allSnippets, monacoInstance, langId) => {
    if (!monacoInstance || !langId) return;
    if (disposerRef.current) {
      disposerRef.current.dispose();
      disposerRef.current = null;
    }

    const monacoLang = LANG_MAP[langId] || LANG_MAP[Number(langId)] || 'plaintext';
    const langSnippets = allSnippets.filter(
      (s) => !s.languageId || s.languageId === langId || Number(s.languageId) === Number(langId)
    );
    if (langSnippets.length === 0) return;

    disposerRef.current = monacoInstance.languages.registerCompletionItemProvider(monacoLang, {
      triggerCharacters: ['/'],
      provideCompletionItems: (model, position) => {
        const linePrefix = model.getValueInRange({
          startLineNumber: position.lineNumber,
          startColumn: 1,
          endLineNumber: position.lineNumber,
          endColumn: position.column,
        });
        if (!/(?:^|\s)\/[a-z0-9_-]*$/.test(linePrefix)) return { suggestions: [] };

        const wordUntil = model.getWordUntilPosition(position);
        const suggestions = langSnippets.map((s) => ({
          label: s.command,
          kind: monacoInstance.languages.CompletionItemKind.Snippet,
          insertText: s.code,
          insertTextRules: monacoInstance.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          documentation: s.description || s.title,
          detail: `CodePad: ${s.title}`,
          range: {
            startLineNumber: position.lineNumber,
            startColumn: Math.max(1, wordUntil.startColumn - 1), // include leading '/'
            endLineNumber: position.lineNumber,
            endColumn: position.column,
          },
        }));
        return { suggestions };
      },
    });
  }, []);

  const userId = user?.id || user?._id;

  const fetchAndCache = useCallback(async () => {
    if (!userId) {
      setSnippets([]);
      clearSnippetsCache();
      return;
    }
    setLoading(true);
    try {
      const data = await snippetsApi.getMySnippets();
      const list = data.snippets || [];
      setSnippets(list);
      setSnippetsCache(userId, list);
    } catch (err) {
      console.warn('Failed to fetch snippets:', err);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  // On user change: hit cache first, else fetch
  useEffect(() => {
    if (!userId) {
      setSnippets([]);
      return;
    }
    const cached = getSnippetsCache(userId);
    if (cached && Array.isArray(cached)) {
      setSnippets(cached);
    } else {
      fetchAndCache();
    }
  }, [userId, fetchAndCache]);

  // Re-register whenever snippets or language change
  useEffect(() => {
    if (monaco && languageId && snippets.length > 0) {
      registerCompletions(snippets, monaco, languageId);
    }
    return () => {
      if (disposerRef.current) {
        disposerRef.current.dispose();
        disposerRef.current = null;
      }
    };
  }, [snippets, monaco, languageId, registerCompletions]);

  useEffect(() => () => {
    if (disposerRef.current) {
      disposerRef.current.dispose();
      disposerRef.current = null;
    }
  }, []);

  const deleteSnippet = useCallback(async (snippetId) => {
    await snippetsApi.delete(snippetId);
    clearSnippetsCache();
    await fetchAndCache();
  }, [fetchAndCache]);

  return { snippets, loading, refetch: fetchAndCache, deleteSnippet };
};

export default useSnippets;
