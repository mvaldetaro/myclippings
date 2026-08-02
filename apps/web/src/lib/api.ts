/**
 * Cliente HTTP para a API Fastify.
 *
 * A URL base é configurada via proxy Vite em desenvolvimento,
 * então as chamadas usam caminhos relativos.
 * Cookies httpOnly são enviados automaticamente via credentials: "include".
 */

/**
 * Erro tipado da API com status code e mensagem.
 */
export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/**
 * Executa uma requisição à API e trata erros de forma padronizada.
 * Em caso de 401, redireciona para /login (exceto em rotas de auth).
 */
async function request<T>(url: string, options: RequestInit = {}): Promise<T> {
  const hasBody = options.body !== undefined && options.body !== null;
  const res = await fetch(url, {
    ...options,
    credentials: 'include',
    headers: {
      ...(hasBody ? { 'Content-Type': 'application/json' } : {}),
      ...options.headers,
    },
  });

  // Redireciona para login em caso de 401 (não em rotas de auth)
  if (res.status === 401 && !url.startsWith('/api/auth')) {
    // Só redireciona no cliente
    if (typeof window !== 'undefined') {
      // Evita loop infinito: não redireciona se já está em /login ou /register
      const currentPath = window.location.pathname;
      if (currentPath !== '/login' && currentPath !== '/register') {
        window.location.href = '/login';
      }
    }
    throw new ApiError(401, 'Não autorizado');
  }

  // Trata erros HTTP
  if (!res.ok) {
    let message = `Erro ${res.status}`;
    try {
      const body = await res.json();
      if (body.message) message = body.message;
    } catch {
      // corpo não é JSON
    }
    throw new ApiError(res.status, message);
  }

  // Para downloads, retorna o blob
  if (
    res.headers.get('content-type')?.includes('application/octet-stream') ||
    res.headers.get('content-type')?.includes('image/') ||
    res.headers.get('content-disposition')
  ) {
    return res.blob() as unknown as T;
  }

  // Resposta vazia (ex: logout)
  const text = await res.text();
  if (!text) return undefined as unknown as T;

  return JSON.parse(text) as T;
}

/** GET request */
export async function get<T>(url: string): Promise<T> {
  return request<T>(url);
}

/** GET request que retorna texto puro (para markdown, etc.) */
export async function getText(url: string): Promise<string> {
  const res = await fetch(url, { credentials: 'include' });

  if (res.status === 401 && typeof window !== 'undefined') {
    const currentPath = window.location.pathname;
    if (currentPath !== '/login' && currentPath !== '/register') {
      window.location.href = '/login';
    }
    throw new ApiError(401, 'Não autorizado');
  }

  if (!res.ok) {
    let message = `Erro ${res.status}`;
    try {
      const body = await res.json();
      if (body.message) message = body.message;
    } catch {
      // corpo não é JSON
    }
    throw new ApiError(res.status, message);
  }

  return res.text();
}

/** POST request com body JSON */
export async function post<T>(url: string, body?: unknown): Promise<T> {
  return request<T>(url, {
    method: 'POST',
    body: body ? JSON.stringify(body) : undefined,
  });
}

/** PATCH request com body JSON */
export async function patch<T>(url: string, body?: unknown): Promise<T> {
  return request<T>(url, {
    method: 'PATCH',
    body: body ? JSON.stringify(body) : undefined,
  });
}

/** POST multipart form data */
export async function uploadFile<T>(url: string, file: File): Promise<T> {
  const formData = new FormData();
  formData.append('file', file);

  const res = await fetch(url, {
    method: 'POST',
    credentials: 'include',
    body: formData,
  });

  if (res.status === 401) {
    if (typeof window !== 'undefined') {
      window.location.href = '/login';
    }
    throw new ApiError(401, 'Não autorizado');
  }

  if (!res.ok) {
    let message = `Erro ${res.status}`;
    try {
      const body = await res.json();
      if (body.message) message = body.message;
    } catch {
      // corpo não é JSON
    }
    throw new ApiError(res.status, message);
  }

  return res.json() as Promise<T>;
}

/** Baixa um arquivo e dispara o download no navegador */
export function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
