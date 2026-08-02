import { get, post } from '@/lib/api';
import type { InterfacePreferences, QuotePreferences } from '@my-clippings/schemas';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

/** Configurações do usuário */
export interface UserSettingsResponse {
  quotePreferences: QuotePreferences;
  interfacePreferences: InterfacePreferences;
}

/** Busca configurações do usuário */
export function useSettings() {
  return useQuery<UserSettingsResponse>({
    queryKey: ['settings'],
    queryFn: () => get<UserSettingsResponse>('/api/settings'),
  });
}

/** Atualiza configurações do usuário */
export function useUpdateSettings() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (data: {
      quotePreferences?: Partial<QuotePreferences>;
      interfacePreferences?: Partial<InterfacePreferences>;
    }) => post<UserSettingsResponse>('/api/settings', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['settings'] });
    },
  });
}
