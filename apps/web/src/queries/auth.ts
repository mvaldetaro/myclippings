import { get, post } from '@/lib/api';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

export interface UserResponse {
  id: string;
  name: string;
  email: string;
  createdAt?: string;
}

/**
 * Verifica se o usuário está autenticado tentando acessar um endpoint protegido.
 * A API usa httpOnly cookies — a verificação funciona apenas no cliente
 * onde os cookies estão disponíveis.
 */
export function useCurrentUser() {
  return useQuery<UserResponse | null>({
    queryKey: ['auth', 'me'],
    queryFn: async () => {
      try {
        const res = await get<{ books: Array<{ id: string }> }>('/books');
        if (res?.books) {
          return { id: 'authenticated', name: '', email: '' };
        }
        return null;
      } catch {
        return null;
      }
    },
    retry: false,
    staleTime: 1000 * 60 * 5,
    // Só executa no cliente — cookies httpOnly não estão disponíveis no SSR
    enabled: typeof window !== 'undefined',
  });
}

/** Registro de novo usuário */
export function useRegister() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (data: { name: string; email: string; password: string }) =>
      post<UserResponse>('/auth/register', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['auth'] });
    },
  });
}

/** Login */
export function useLogin() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (data: { email: string; password: string }) =>
      post<UserResponse>('/auth/login', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['auth'] });
    },
  });
}

/** Logout */
export function useLogout() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: () => post<{ message: string }>('/auth/logout'),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['auth'] });
      qc.clear();
    },
  });
}
