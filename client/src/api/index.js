import axios from "axios";

export const API_BASE_URL =
  (typeof import.meta !== "undefined" && import.meta.env && import.meta.env.VITE_API_URL) ||
  "http://localhost:5001";

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
});

// Automatically inject JWT Authorization Bearer token into all requests
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem("codepad_auth_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ==================== SUBMISSIONS API ====================

export const submitCode = async (formData, options = {}) => {
  try {
    const query = options.wait ? "?base64_encoded=true&wait=true" : "?base64_encoded=true";
    const response = await apiClient.post(`/submissions${query}`, formData);
    return { success: true, data: response.data };
  } catch (err) {
    const message = err.response?.data?.message || err.message;
    return { success: false, err: message, status: err.response?.status };
  }
};

export const checkStatus = async (token) => {
  try {
    const response = await apiClient.get(`/submissions/${token}?base64_encoded=true`);
    const statusId = response.data.status?.id;

    if (statusId === 1 || statusId === 2) {
      await new Promise((r) => setTimeout(r, 400));
      return checkStatus(token);
    }
    return { success: true, data: response.data };
  } catch (err) {
    const message = err.response?.data?.message || err.message;
    return { success: false, err: message };
  }
};

// ==================== AUTH API ====================

export const authApi = {
  loginWithGoogle: async (credential) => {
    const res = await apiClient.post("/auth/google", { credential });
    return res.data;
  },
  devLogin: async (userData = {}) => {
    const res = await apiClient.post("/auth/dev-login", userData);
    return res.data;
  },
  getMe: async () => {
    const res = await apiClient.get("/auth/me");
    return res.data;
  },
  updateProfile: async (data) => {
    const res = await apiClient.put("/auth/profile", data);
    return res.data;
  },
};

// ==================== CODES API ====================

export const codesApi = {
  getMyCodes: async (params = {}) => {
    const res = await apiClient.get("/codes/me", { params });
    return res.data;
  },
  create: async (data) => {
    const res = await apiClient.post("/codes", data);
    return res.data;
  },
  update: async (codeId, data) => {
    const res = await apiClient.put(`/codes/${codeId}`, data);
    return res.data;
  },
  delete: async (codeId) => {
    const res = await apiClient.delete(`/codes/${codeId}`);
    return res.data;
  },
};

// ==================== SNIPPETS API ====================

export const snippetsApi = {
  getMySnippets: async (params = {}) => {
    const res = await apiClient.get("/snippets/me", { params });
    return res.data;
  },
  getPublic: async (params = {}) => {
    const res = await apiClient.get("/snippets", { params });
    return res.data;
  },
  getById: async (snippetId) => {
    const res = await apiClient.get(`/snippets/${snippetId}`);
    return res.data;
  },
  create: async (data) => {
    const res = await apiClient.post("/snippets", data);
    return res.data;
  },
  update: async (snippetId, data) => {
    const res = await apiClient.put(`/snippets/${snippetId}`, data);
    return res.data;
  },
  delete: async (snippetId) => {
    const res = await apiClient.delete(`/snippets/${snippetId}`);
    return res.data;
  },
  fork: async (snippetId) => {
    const res = await apiClient.post(`/snippets/${snippetId}/fork`);
    return res.data;
  },
};

// ==================== USERS & SOCIAL API ====================

export const usersApi = {
  getProfile: async (username) => {
    const res = await apiClient.get(`/users/${username}`);
    return res.data;
  },
  getSnippets: async (username) => {
    const res = await apiClient.get(`/users/${username}/snippets`);
    return res.data;
  },
  toggleFollow: async (username) => {
    const res = await apiClient.post(`/users/${username}/follow`);
    return res.data;
  },
  getFollowers: async (username) => {
    const res = await apiClient.get(`/users/${username}/followers`);
    return res.data;
  },
  getFollowing: async (username) => {
    const res = await apiClient.get(`/users/${username}/following`);
    return res.data;
  },
  search: async (query) => {
    const res = await apiClient.get("/users/search", { params: { q: query } });
    return res.data;
  },
};

// ==================== LEARNINGS API ====================

export const learningsApi = {
  getPublic: async (params = {}) => {
    const res = await apiClient.get("/learnings", { params });
    return res.data;
  },
  getMyLearnings: async (params = {}) => {
    const res = await apiClient.get("/learnings/me", { params });
    return res.data;
  },
  getById: async (learningId) => {
    const res = await apiClient.get(`/learnings/${learningId}`);
    return res.data;
  },
  create: async (data) => {
    const res = await apiClient.post("/learnings", data);
    return res.data;
  },
  update: async (learningId, data) => {
    const res = await apiClient.put(`/learnings/${learningId}`, data);
    return res.data;
  },
  delete: async (learningId) => {
    const res = await apiClient.delete(`/learnings/${learningId}`);
    return res.data;
  },
};

const apiService = {
  submitCode,
  checkStatus,
  auth: authApi,
  snippets: snippetsApi,
  codes: codesApi,
  users: usersApi,
  learnings: learningsApi,
};

export default apiService;