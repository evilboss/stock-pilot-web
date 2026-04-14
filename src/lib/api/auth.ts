import apiClient from './axios';

export const authApi = {
  login: async (email: string, password: string) => {
    const res = await apiClient.post('/auth/login', { email, password });
    return res.data;
  },
  logout: async () => {
    const res = await apiClient.post('/auth/logout');
    return res.data;
  },
  getProfile: async () => {
    const res = await apiClient.get('/auth/profile');
    return res.data;
  },
};
