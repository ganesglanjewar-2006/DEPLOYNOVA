import axiosInstance from './axios';

// Note: Use a separate base URL for LifeOS if running on different port
const LIFEOS_BASE_URL = import.meta.env.VITE_LIFEOS_URL || 'http://localhost:5001/api';

const ruleApi = {
  // 📋 Fetch all rules
  getRules: async () => {
    const response = await axiosInstance.get(`${LIFEOS_BASE_URL}/rules`);
    return response.data;
  },

  // ➕ Create a new rule
  createRule: async (ruleData) => {
    const response = await axiosInstance.post(`${LIFEOS_BASE_URL}/rules`, ruleData);
    return response.data;
  },

  // 🔄 Update an existing rule
  updateRule: async (id, ruleData) => {
    const response = await axiosInstance.put(`${LIFEOS_BASE_URL}/rules/${id}`, ruleData);
    return response.data;
  },

  // 🗑️ Delete a rule
  deleteRule: async (id) => {
    const response = await axiosInstance.delete(`${LIFEOS_BASE_URL}/rules/${id}`);
    return response.data;
  },

  // 📜 Fetch execution logs
  getLogs: async () => {
    const response = await axiosInstance.get(`${LIFEOS_BASE_URL}/rules/logs`);
    return response.data;
  }
};

export default ruleApi;
