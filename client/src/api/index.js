import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
});

// Attach JWT token to every request
api.interceptors.request.use((config) => {
  const token = sessionStorage.getItem('edurecord_token') || localStorage.getItem('edurecord_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Auth
export const loginFaculty = (data) => api.post('/auth/login', data);
export const getMe = () => api.get('/auth/me');

// Students
export const searchStudents = (params) => api.get('/students/search', { params });
export const getStudentById = (id) => api.get(`/students/${id}`);
export const createStudent = (data) => api.post('/students', data);
export const updateStudent = (id, data) => api.put(`/students/${id}`, data);
export const deleteStudent = (id) => api.delete(`/students/${id}`);
export const bulkDeleteStudents = (rollNumbers) => api.post('/students/bulk-delete', { rollNumbers });
export const getAnalytics = (params) => api.get('/students/analytics', { params });
export const getFilterOptions = () => api.get('/students/filter-options');
export const exportStudentsExcel = (fields) => api.post('/students/export/excel', { fields });
export const bulkImportStudents = (mode, students) => api.post('/students/bulk-import', { mode, students });

// Faculty
export const getAllFaculty = (params) => api.get('/faculty', { params });
export const getFacultyById = (id) => api.get(`/faculty/${id}`);
export const createFaculty = (data) => api.post('/faculty', data);
export const updateFaculty = (id, data) => api.put(`/faculty/${id}`, data);
export const deleteFaculty = (id) => api.delete(`/faculty/${id}`);
export const updateProfile = (data) => api.put('/faculty/profile/update', data);

export default api;
