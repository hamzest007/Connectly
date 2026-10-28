const API_URL = 'http://localhost:4000/api/v1';

type ApiResponse<T> = {
  success: boolean;
  data: T;
  error?: { message: string };
};

export async function apiRequest<T>(
  path: string,
  options: RequestInit = {},
  accessToken?: string,
): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      ...(options.headers ?? {}),
    },
  });
  const payload = (await response.json()) as ApiResponse<T>;
  if (!response.ok || !payload.success)
    throw new Error(payload.error?.message ?? 'Request failed.');
  return payload.data;
}

export const apiConfig = { baseUrl: API_URL };
