import axios from 'axios';

const baseUrl = import.meta.env.VITE_API_URL || '/api';

const api = axios.create({
  baseURL: baseUrl,
  headers: {
    'Content-Type': 'application/json'
  }
});

export const setAuthToken = (token) => {
  if (token) {
    api.defaults.headers.common.Authorization = `Bearer ${token}`;
  } else {
    delete api.defaults.headers.common.Authorization;
  }
};

export const login = (credentials) => api.post('/auth/login', credentials);
export const register = (user) => api.post('/auth/register', user);
export const getAccounts = () => api.get('/accounts/mine');
export const getDashboard = () => api.get('/admin/dashboard');
export const getAdminUsers = (params) => api.get('/admin/users', { params });
export const getAdminTransactions = (params) => api.get('/admin/transactions', { params });
export const getTransactions = (accountNumber) => api.get(`/transactions/history/${accountNumber}`);
export const getLoans = () => api.get('/loans/mine');
export const applyForLoan = (loanData) => api.post('/loans/apply', loanData);
export const rejectLoan = (loanId, reason) => api.put(`/loans/reject/${loanId}`, { rejectionReason: reason });
export const approveLoan = (loanId) => api.put(`/loans/approve/${loanId}`);
export const getCounters = () => api.get('/tickets/counters');
export const getSecurityStaff = () => api.get('/admin/staff');
export const createSecurityStaff = (staff) => api.post('/admin/staff', staff);
export const updateSecurityStaff = (staffId, staff) => api.put(`/admin/staff/${staffId}`, staff);
export const deleteSecurityStaff = (staffId) => api.delete(`/admin/staff/${staffId}`);
export const banUser = (userId, reason) => api.put(`/admin/users/${userId}/ban`, { banReason: reason });
export const unbanUser = (userId) => api.put(`/admin/users/${userId}/unban`);
export const getProfile = () => api.get('/profile');
export const updateProfile = (profile) => api.put('/profile', profile);
export const getProfileActivity = () => api.get('/profile/activity');

export default api;
