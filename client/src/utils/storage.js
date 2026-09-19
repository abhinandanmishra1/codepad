import { boilerCodes } from "../boilerCodes/index.js";

// CodePad storage keys (with legacy leetcode_ide_* fallbacks)
export const CODE_PREFIX = "codepad_code_";
export const LEGACY_CODE_PREFIX = "leetcode_ide_code_";

export const STDIN_PREFIX = "codepad_stdin_";
export const LEGACY_STDIN_PREFIX = "leetcode_ide_stdin_";

export const TESTCASES_PREFIX = "codepad_testcases_";
export const LEGACY_TESTCASES_PREFIX = "leetcode_ide_testcases_";

export const LAST_LANG_KEY = "codepad_last_lang";
export const LEGACY_LAST_LANG_KEY = "leetcode_ide_last_lang";

export const LAST_THEME_KEY = "codepad_last_theme";
export const LEGACY_LAST_THEME_KEY = "leetcode_ide_last_theme";

export const DEFAULT_TESTCASES = [
  {
    id: "1",
    name: "Case 1",
    input: "5\nhello\n1 2 3 4 5",
    expected: "Number: 5\nString: hello\nArray: 1 2 3 4 5",
  },
];

/**
 * Normalizes a user-provided name to a unique identifier:
 * Replaces spaces with "_", strips invalid characters, lowercases.
 * e.g., "Two Sum Solution" -> "two_sum_solution"
 */
export const normalizeId = (name) => {
  if (!name) return "";
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s_-]/g, "")
    .replace(/\s+/g, "_");
};

/**
 * Normalizes a slash command shortcut:
 * Ensures it starts with "/" and contains only valid command characters.
 * e.g., "trie" -> "/trie", "/dsu" -> "/dsu"
 */
export const normalizeCommand = (cmd) => {
  if (!cmd) return "";
  const cleaned = cmd.trim().toLowerCase().replace(/[^a-z0-9_-]/g, "");
  return cleaned.startsWith("/") ? cleaned : `/${cleaned}`;
};

/**
 * Helper to get an item from localStorage with transparent legacy fallback and migration.
 * 1. Checks newKey first. If a non-null, non-empty value is found, returns it.
 * 2. If newKey is null or empty, checks legacyKey (if provided).
 * 3. If legacyKey has a non-null, non-empty value, migrates it to newKey and returns it.
 * 4. Otherwise returns the value from newKey (or null).
 */
export const getItemWithFallback = (newKey, legacyKey) => {
  try {
    const newVal = localStorage.getItem(newKey);
    if (newVal !== null) {
      return newVal;
    }
    if (legacyKey) {
      const legacyVal = localStorage.getItem(legacyKey);
      if (legacyVal !== null) {
        try {
          localStorage.setItem(newKey, legacyVal);
        } catch (e) {
          // localStorage quota or security error
        }
        return legacyVal;
      }
    }
    return null;
  } catch (e) {
    return null;
  }
};

export const getSavedCode = (languageId, defaultCode = "") => {
  try {
    const saved = getItemWithFallback(
      `${CODE_PREFIX}${languageId}`,
      `${LEGACY_CODE_PREFIX}${languageId}`
    );
    if (!saved) return defaultCode;

    // Auto-migrate outdated boilerplate templates to the new strictly validated version
    const numId = Number(languageId);
    const isOutdatedJsTs =
      (numId === 63 || numId === 74) &&
      (saved.includes("function getNumInput") || saved.includes("_inputTokens")) &&
      !saved.includes("class Scanner");

    const isOutdatedCpp =
      numId === 54 &&
      saved.includes("readInt()");

    const isOutdatedC =
      numId === 50 &&
      saved.includes("readInt()");

    if (isOutdatedJsTs || isOutdatedCpp || isOutdatedC) {
      const fresh = boilerCodes(languageId);
      saveCode(languageId, fresh);
      return fresh;
    }

    return saved;
  } catch (e) {
    return defaultCode;
  }
};

export const saveCode = (languageId, code) => {
  try {
    localStorage.setItem(`${CODE_PREFIX}${languageId}`, code);
  } catch (e) {
    console.warn("LocalStorage quota exceeded or unavailable");
  }
};

export const resetSavedCode = (languageId) => {
  try {
    localStorage.removeItem(`${CODE_PREFIX}${languageId}`);
    localStorage.removeItem(`${LEGACY_CODE_PREFIX}${languageId}`);
  } catch (e) {}
};

export const getSavedStdin = (languageId) => {
  try {
    return (
      getItemWithFallback(
        `${STDIN_PREFIX}${languageId}`,
        `${LEGACY_STDIN_PREFIX}${languageId}`
      ) || ""
    );
  } catch (e) {
    return "";
  }
};

export const saveStdin = (languageId, stdin) => {
  try {
    localStorage.setItem(`${STDIN_PREFIX}${languageId}`, stdin);
  } catch (e) {}
};

export const getSavedTestCases = (languageId) => {
  try {
    const saved = getItemWithFallback(
      `${TESTCASES_PREFIX}${languageId}`,
      `${LEGACY_TESTCASES_PREFIX}${languageId}`
    );
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
    const legacyStdin = getSavedStdin(languageId);
    return [
      {
        id: "1",
        name: "Case 1",
        input: legacyStdin || "5\nhello\n1 2 3 4 5",
        expected: "Number: 5\nString: hello\nArray: 1 2 3 4 5",
      },
    ];
  } catch {
    return DEFAULT_TESTCASES;
  }
};

export const saveTestCases = (languageId, cases) => {
  try {
    localStorage.setItem(`${TESTCASES_PREFIX}${languageId}`, JSON.stringify(cases));
  } catch (e) {
    console.warn("LocalStorage quota exceeded or unavailable");
  }
};

export const resetSavedTestCases = (languageId) => {
  try {
    localStorage.removeItem(`${TESTCASES_PREFIX}${languageId}`);
    localStorage.removeItem(`${LEGACY_TESTCASES_PREFIX}${languageId}`);
  } catch (e) {}
};

export const getSavedLanguage = (defaultLang) => {
  try {
    const saved = getItemWithFallback(LAST_LANG_KEY, LEGACY_LAST_LANG_KEY);
    return saved ? JSON.parse(saved) : defaultLang;
  } catch (e) {
    return defaultLang;
  }
};

export const saveLanguage = (lang) => {
  try {
    localStorage.setItem(LAST_LANG_KEY, JSON.stringify(lang));
  } catch (e) {}
};

export const getSavedTheme = (defaultTheme = "leetcode-dark") => {
  try {
    const saved = getItemWithFallback(LAST_THEME_KEY, LEGACY_LAST_THEME_KEY);
    if (!saved) return defaultTheme;
    try {
      return JSON.parse(saved);
    } catch {
      return saved;
    }
  } catch (e) {
    return defaultTheme;
  }
};

export const saveTheme = (theme) => {
  try {
    localStorage.setItem(LAST_THEME_KEY, JSON.stringify(theme));
  } catch (e) {}
};

// ============================================================
// SNIPPET CACHE (user-scoped, localStorage-backed, for Monaco registration)
// ============================================================

export const SNIPPETS_CACHE_KEY = "codepad_snippets_cache";
export const SNIPPETS_CACHE_UID_KEY = "codepad_snippets_cache_uid";

/** Returns cached snippets array for userId, or null on miss/mismatch */
export const getSnippetsCache = (userId) => {
  try {
    if (!userId) return null;
    const cachedUid = localStorage.getItem(SNIPPETS_CACHE_UID_KEY);
    if (cachedUid !== String(userId)) return null;
    const raw = localStorage.getItem(SNIPPETS_CACHE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

/** Persists all snippet DTOs for the given user */
export const setSnippetsCache = (userId, snippets) => {
  try {
    if (!userId) return;
    localStorage.setItem(SNIPPETS_CACHE_UID_KEY, String(userId));
    localStorage.setItem(SNIPPETS_CACHE_KEY, JSON.stringify(snippets));
  } catch (e) {
    console.warn("Failed to cache snippets:", e);
  }
};

/** Clears snippet cache — call on logout or after any snippet mutation */
export const clearSnippetsCache = () => {
  try {
    localStorage.removeItem(SNIPPETS_CACHE_KEY);
    localStorage.removeItem(SNIPPETS_CACHE_UID_KEY);
  } catch {}
};

// ============================================================
// DEPRECATED STUBS (Temporary for backward-compatibility until Tasks 7-11 rewire IdePage & SaveModal)
// ============================================================
export const getSavedProblems = () => [];
export const getSavedProblem = () => null;
export const saveProblem = () => null;
export const deleteProblem = () => false;
export const getTemplates = () => [];
export const findExistingTemplate = () => null;
export const saveTemplate = () => null;
export const deleteTemplate = () => false;
export const getCustomTemplates = () => [];
export const saveCustomTemplate = () => null;
export const deleteCustomTemplate = () => false;

const storageService = {
  normalizeId,
  normalizeCommand,
  getItemWithFallback,
  getSavedCode,
  saveCode,
  resetSavedCode,
  getSavedStdin,
  saveStdin,
  getSavedTestCases,
  saveTestCases,
  resetSavedTestCases,
  getSavedLanguage,
  saveLanguage,
  getSavedTheme,
  saveTheme,
  getSnippetsCache,
  setSnippetsCache,
  clearSnippetsCache,
  CODE_PREFIX,
  LEGACY_CODE_PREFIX,
  STDIN_PREFIX,
  LEGACY_STDIN_PREFIX,
  TESTCASES_PREFIX,
  LEGACY_TESTCASES_PREFIX,
  LAST_LANG_KEY,
  LEGACY_LAST_LANG_KEY,
  LAST_THEME_KEY,
  LEGACY_LAST_THEME_KEY,
  DEFAULT_TESTCASES,
  SNIPPETS_CACHE_KEY,
  SNIPPETS_CACHE_UID_KEY,
};

export default storageService;
