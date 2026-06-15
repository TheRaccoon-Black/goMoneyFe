import apiClient from './axios';

export interface UserProfile {
  id: number;
  name: string;
  email: string;
}

export interface Account {
  ID: number;
  Name: string;
  Balance: number;
}

export interface SubCategory {
  ID: number;
  Name: string;
}

export interface Category {
  ID: number;
  Name: string;
  Type: string;
  SubCategories: SubCategory[];
}

export interface Budget {
  ID: number;
  UserID: number;
  CategoryID: number;
  Category?: { ID: number; Name: string; Type: string };
  Amount: number;
  Month: number;
  Year: number;
}

export interface BudgetSuggestion {
  CategoryID: number;
  CategoryName: string;
  SuggestedAmount: number;
  Reason: string;
}

export interface Transaction {
  ID: number;
  Notes?: string;
  Amount: number;
  Type: 'income' | 'expense' | 'transfer';
  TransactionDate: string;
  Account: { ID: number; Name: string };
  SubCategory?: { ID: number; Name: string; Category: { Name: string } };
  DestinationAccountID?: number;
}

export const authApi = {
  login: (email: string, password: string) =>
    apiClient.post<{ message: string; token: string }>('/auth/login', { email, password }),

  register: (name: string, email: string, password: string) =>
    apiClient.post<{ message: string }>('/auth/register', { name, email, password }),
};

export const userApi = {
  profile: () => apiClient.get<UserProfile>('/api/profile'),
};

export const accountsApi = {
  list: () => apiClient.get<Account[]>('/api/accounts'),

  create: (name: string, balance: number) =>
    apiClient.post<Account>('/api/accounts', { name, balance }),

  update: (id: number, name: string, balance: number) =>
    apiClient.put<Account>(`/api/accounts/${id}`, { name, balance }),

  remove: (id: number) => apiClient.delete(`/api/accounts/${id}`),
};

export const categoriesApi = {
  list: () => apiClient.get<Category[]>('/api/categories'),

  create: (name: string, type: string) =>
    apiClient.post<Category>('/api/categories', { name, type }),

  update: (id: number, name: string, type: string) =>
    apiClient.put<Category>(`/api/categories/${id}`, { name, type }),

  remove: (id: number) => apiClient.delete(`/api/categories/${id}`),

  listSubCategories: (categoryId: number) =>
    apiClient.get<SubCategory[]>(`/api/categories/${categoryId}/subcategories`),

  listAllSubCategories: (categoryId: number) =>
    apiClient.get<SubCategory[]>(`/api/categories/${categoryId}/allsubcategories`),

  createSubCategory: (categoryId: number, name: string) =>
    apiClient.post<SubCategory>(`/api/categories/${categoryId}/subcategories`, { name }),

  updateSubCategory: (id: number, name: string) =>
    apiClient.put<SubCategory>(`/api/subcategories/${id}`, { name }),

  removeSubCategory: (id: number) => apiClient.delete(`/api/subcategories/${id}`),
};

export const transactionsApi = {
  list: (year?: number, month?: number) => {
    const params = year && month ? { year, month } : undefined;
    return apiClient.get<Transaction[]>('/api/transactions', { params });
  },

  get: (id: number) => apiClient.get<Transaction>(`/api/transactions/${id}`),

  create: (payload: {
    account_id: number;
    sub_category_id?: number | null;
    amount: number;
    type: 'income' | 'expense' | 'transfer';
    notes?: string;
    transaction_date: string;
    destination_account_id?: number | null;
  }) => apiClient.post<Transaction>('/api/transactions', payload),

  update: (
    id: number,
    payload: {
      account_id: number;
      sub_category_id?: number | null;
      amount: number;
      type: 'income' | 'expense' | 'transfer';
      notes?: string;
      transaction_date: string;
      destination_account_id?: number | null;
    }
  ) => apiClient.put<Transaction>(`/api/transactions/${id}`, payload),

  remove: (id: number) => apiClient.delete(`/api/transactions/${id}`),
};

export const budgetsApi = {
  list: () => apiClient.get<Budget[]>('/api/budgets'),

  set: (payload: { category_id: number; amount: number; month: number; year: number }) =>
    apiClient.post<Budget>('/api/budgets', payload),

  suggestions: () => apiClient.get<BudgetSuggestion[]>('/api/budgets/suggestions'),
};
