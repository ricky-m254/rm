import { apiClient } from './client';

export const sportsApi = {
  getDashboard: () => apiClient.get('/sports/dashboard/').then((res: any) => res.data),
  getClubs: (params?: any) => apiClient.get('/sports/clubs/', { params }).then((res: any) => res.data),
  getMemberships: (params?: any) => apiClient.get('/sports/memberships/', { params }).then((res: any) => res.data),
  getTournaments: (params?: any) => apiClient.get('/sports/tournaments/', { params }).then((res: any) => res.data),
  getAwards: (params?: any) => apiClient.get('/sports/awards/', { params }).then((res: any) => res.data),
};

export const cafeteriaApi = {
  getDashboard: () => apiClient.get('/cafeteria/dashboard/').then((res: any) => res.data),
  getMealPlans: (params?: any) => apiClient.get('/cafeteria/meal-plans/', { params }).then((res: any) => res.data),
  getMenus: (params?: any) => apiClient.get('/cafeteria/menus/', { params }).then((res: any) => res.data),
  getEnrollments: (params?: any) => apiClient.get('/cafeteria/enrollments/', { params }).then((res: any) => res.data),
  getTransactions: (params?: any) => apiClient.get('/cafeteria/transactions/', { params }).then((res: any) => res.data),
  getWallet: (params?: any) => apiClient.get('/cafeteria/wallet/', { params }).then((res: any) => res.data),
};
