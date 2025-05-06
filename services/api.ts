import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL, API_ENDPOINTS } from '@/constants/api';
import axios from 'axios';

interface LoginResponse {
  access: string;
  refresh: string;
}

export interface FileResponse {
  id: number;
  file: string;
}
// Типы ответов
export interface CreateDeliveryData {
  transport?: number;
  number?: string;
  departure_time?: string;
  delivery_time?: string;
  distance?: string;
  services?: number[];
  status?: number;
  technical_state?: boolean;
  fio?: string;
  comment?: string;
  packaging?: number;
  file?: number[];
}
// Универсальный fetch с авторизацией и обновлением токена
export async function fetchWithAuth(input: RequestInfo, init: RequestInit = {}, logout?: () => Promise<void>): Promise<Response> {
  // Получение токенов из хранилища
  let accessToken = await AsyncStorage.getItem('accessToken');
  let refreshToken = await AsyncStorage.getItem('refreshToken');
// Формирование заголовков
  const headers = {
    ...(init.headers || {}),
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
  };
  // Первичный запрос
  let response = await fetch(input, { ...init, headers });
  // Если токен просрочен, пытаемся обновить его
  if (response.status === 401 && refreshToken) {
    // Пробуем обновить токен с помощью refresh токена
    const refreshResp = await fetch(`${API_URL}/api/identity/auth/jwt/refresh/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh: refreshToken }),
    });
    // Если токен обновлен успешно, повторяем запрос
    if (refreshResp.ok) {
      const { access } = await refreshResp.json();
      await AsyncStorage.setItem('accessToken', access);
      headers['Authorization'] = `Bearer ${access}`;
      response = await fetch(input, { ...init, headers });
    } else {
      // Если токен не обновлен, вызываем logout
      if (logout) await logout();
      throw new Error('Unauthorized');
    }
  }
  return response;
}

// Универсальный fetch для отправки FormData
export async function fetchWithAuthForFormData(input: RequestInfo, init: RequestInit = {}, logout?: () => Promise<void>): Promise<Response> {
  let accessToken = await AsyncStorage.getItem('accessToken');
  let refreshToken = await AsyncStorage.getItem('refreshToken');

  const headers = new Headers(init.headers || {}); 
  if (accessToken) {
      headers.set('Authorization', `Bearer ${accessToken}`);
  }

  let response = await fetch(input, { ...init, headers });

  if (response.status === 401 && refreshToken) {
    const refreshResp = await fetch(`${API_URL}/api/identity/auth/jwt/refresh/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh: refreshToken }),
    });
    if (refreshResp.ok) {
      const { access } = await refreshResp.json();
      await AsyncStorage.setItem('accessToken', access);
      headers.set('Authorization', `Bearer ${access}`); 
      response = await fetch(input, { ...init, headers });
    } else {
      if (logout) await logout();
      throw new Error('Unauthorized');
    }
  }
  return response;
}
// Объект API с методами
export const api = {
  // Авторизация
  async login(username: string, password: string): Promise<LoginResponse> {
    try {
      const response = await fetch(`${API_URL}${API_ENDPOINTS.LOGIN}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Ошибка входа');
      }

      return response.json();
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(error.message);
      }
      throw new Error('Произошла ошибка при входе');
    }
  },
// Выход
  async logout(token: string): Promise<void> {
    try {
      await AsyncStorage.removeItem('accessToken');
      await AsyncStorage.removeItem('refreshToken');
    } catch (error) {
      console.error('Error during logout:', error);
    }
  },
  // Получение списка доставок с фильтрацией
  async getDeliveries(logout?: () => Promise<void>, filters: any = {}) {
    const params = new URLSearchParams();
    if (filters.service) params.append('service', filters.service);
    if (filters.transport) params.append('transport', filters.transport);
    if (filters.date_from) params.append('date_from', filters.date_from);
    if (filters.date_to) params.append('date_to', filters.date_to);
    const url = `${API_URL}/api/v1/deliverys/?${params.toString()}`;
    const response = await fetchWithAuth(url, {}, logout);
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Ошибка загрузки доставок');
    }
    return response.json();
  },

  async getTransports(logout?: () => Promise<void>) {
    try {
      const response = await fetchWithAuth(`${API_URL}/api/v1/transports/`, {}, logout);
      if (!response.ok) {
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          const error = await response.json();
          throw new Error(error.detail || 'Ошибка загрузки транспорта');
        } else {
          const text = await response.text();
          console.error('Unexpected response:', text);
          throw new Error('Сервер вернул неверный формат данных');
        }
      }
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Transport fetch error:', error);
      throw error;
    }
  },

  async getServices(logout?: () => Promise<void>) {
    try {
      const response = await fetchWithAuth(`${API_URL}/api/v1/services/`, {}, logout);
      if (!response.ok) {
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          const error = await response.json();
          throw new Error(error.detail || 'Ошибка загрузки услуг');
        } else {
          const text = await response.text();
          console.error('Unexpected response:', text);
          throw new Error('Сервер вернул неверный формат данных');
        }
      }
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Services fetch error:', error);
      throw error;
    }
  },

  async getPackagings(logout?: () => Promise<void>) {
    try {
      const response = await fetchWithAuth(`${API_URL}/api/v1/packagings/`, {}, logout);
      if (!response.ok) {
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          const error = await response.json();
          throw new Error(error.detail || 'Ошибка загрузки упаковок');
        } else {
          const text = await response.text();
          console.error('Unexpected response:', text);
          throw new Error('Сервер вернул неверный формат данных');
        }
      }
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Packagings fetch error:', error);
      throw error;
    }
  },

  async getStatuses(logout?: () => Promise<void>) {
    try {
      const response = await fetchWithAuth(`${API_URL}/api/v1/statuses/`, {}, logout);
      if (!response.ok) {
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          const error = await response.json();
          throw new Error(error.detail || 'Ошибка загрузки статусов');
        } else {
          const text = await response.text();
          console.error('Unexpected response:', text);
          throw new Error('Сервер вернул неверный формат данных');
        }
      }
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Statuses fetch error:', error);
      throw error;
    }
  },

  async getDeliveryById(id: number, logout?: () => Promise<void>) {
    try {
      const response = await fetchWithAuth(`${API_URL}/api/v1/deliverys/${id}/`, {}, logout);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Ошибка загрузки доставки');
      }
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error fetching delivery by ID:', error);
      throw error;
    }
  },

  async getFileById(id: number, logout?: () => Promise<void>): Promise<FileResponse> {
    const url = `${API_URL}/api/v1/files/${id}/`;
    try {
        const response = await fetchWithAuth(url, {}, logout);
        if (!response.ok) {
            let errorDetail = `Ошибка загрузки файла ID ${id} (${response.status})`;
            try {
               const errorData = await response.json();
               errorDetail = errorData.detail || JSON.stringify(errorData);
            } catch(e) { /* ignore */ }
            throw new Error(errorDetail);
        }
        return response.json();
    } catch (error) {
        console.error(`Error fetching file ${id}:`, error);
        throw error;
    }
  },

  async createDelivery(data: CreateDeliveryData, logout?: () => Promise<void>): Promise<any> {
    try {
      console.log('Creating delivery with data:', data);

      const response = await fetchWithAuth(
        `${API_URL}/api/v1/deliverys/`,
        {
          method: 'POST',
          body: JSON.stringify({
            transport: data.transport,
            number: data.number,
            departure_time: data.departure_time,
            delivery_time: data.delivery_time,
            distance: data.distance,
            services: data.services,
            status: data.status,
            technical_state: data.technical_state,
            fio: data.fio,
            comment: data.comment,
            packaging: data.packaging,
            file: data.file // Send file IDs
          })
        },
        logout
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Ошибка создания доставки');
      }

      const responseData = await response.json();
      console.log('Delivery created successfully:', responseData);
      return responseData;
    } catch (error) {
      console.error('Error creating delivery:', error);
      throw error;
    }
  },

  // Функция для обновления доставки
  async updateDelivery(id: number, data: Partial<CreateDeliveryData>, logout?: () => Promise<void>): Promise<any> {
    try {
      console.log(`Updating delivery ${id} with data:`, data);

      const response = await fetchWithAuth(
        `${API_URL}/api/v1/deliverys/${id}/`, // Endpoint для конкретной доставки
        {
          method: 'PATCH', // Используем PATCH для частичного обновления
          body: JSON.stringify(data) // Отправляем только измененные данные
        },
        logout
      );

      if (!response.ok) {
        let errorDetail = 'Ошибка обновления доставки';
        try {
           const errorData = await response.json();
           errorDetail = errorData.detail || JSON.stringify(errorData);
        } catch (e) {
           // Handle cases where response is not JSON
           errorDetail = await response.text();
        }
        throw new Error(errorDetail);
      }

      const responseData = await response.json();
      console.log('Delivery updated successfully:', responseData);
      return responseData;
    } catch (error) {
      console.error('Error updating delivery:', error);
      throw error;
    }
  },

  async deleteDelivery(id: number, logout?: () => Promise<void>): Promise<void> {
    try {
      const response = await fetchWithAuth(
        `${API_URL}/api/v1/deliverys/${id}/`,
        {
          method: 'DELETE',
        },
        logout
      );

      if (!response.ok && response.status !== 204) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Ошибка удаления доставки');
      }
    } catch (error) {
      console.error('Error deleting delivery:', error);
      throw error;
    }
  },

  async uploadFile(formData: FormData, logout?: () => Promise<void>): Promise<FileResponse[]> {
    // Assuming the endpoint is /api/v1/upload/ - ADJUST IF DIFFERENT
    const uploadUrl = `${API_URL}/api/upload-file/`; // Corrected endpoint
    try {
      const response = await fetchWithAuthForFormData(
        uploadUrl,
        {
          method: 'POST',
          body: formData, // Pass FormData directly
        },
        logout
      );

      if (!response.ok) {
         // Try to parse error details
         let errorDetail = `Ошибка загрузки файла (${response.status})`;
         try {
            const errorData = await response.json();
            errorDetail = errorData.detail || JSON.stringify(errorData);
         } catch(e) {
             // Error response might not be JSON
             console.warn("Could not parse upload error response as JSON");
         }
        throw new Error(errorDetail);
      }

      const responseData = await response.json();
      // The backend returns a list even for single file upload
      return responseData as FileResponse[]; 
    } catch (error) {
      console.error("Error in uploadFile API call:", error);
      throw error; // Re-throw the error to be caught by the caller
    }
  },

  // Function to delete a file
  async deleteFile(fileId: number, logout?: () => Promise<void>): Promise<void> {
    const deleteUrl = `${API_URL}/api/v1/files/${fileId}/`;
    try {
      const response = await fetchWithAuth(
        deleteUrl,
        {
          method: 'DELETE',
        },
        logout
      );

      // DELETE requests often return 204 No Content on success
      if (!response.ok && response.status !== 204) {
         let errorDetail = `Ошибка удаления файла ID ${fileId} (${response.status})`;
         try {
            const errorData = await response.json();
            errorDetail = errorData.detail || JSON.stringify(errorData);
         } catch(e) { /* ignore if response is not JSON */ }
        throw new Error(errorDetail);
      }
      // No content to return on success (204)
    } catch (error) {
      console.error(`Error deleting file ${fileId}:`, error);
      throw error; // Re-throw
    }
  },
}; 