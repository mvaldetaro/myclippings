/**
 * Erros de domínio da aplicação.
 *
 * Cada classe mapeia para um status HTTP específico.
 * O middleware de erro centralizado converte AppError em respostas.
 */
export class AppError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
    public readonly code: string,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

/** Recurso não encontrado (404) */
export class NotFoundError extends AppError {
  constructor(resource: string) {
    super(`${resource} não encontrado`, 404, 'NOT_FOUND');
    this.name = 'NotFoundError';
  }
}

/** Não autorizado (401) - credenciais ausentes ou inválidas */
export class UnauthorizedError extends AppError {
  constructor(message = 'Não autorizado') {
    super(message, 401, 'UNAUTHORIZED');
    this.name = 'UnauthorizedError';
  }
}

/** Acesso proibido (403) - credenciais válidas mas sem permissão */
export class ForbiddenError extends AppError {
  constructor(message = 'Acesso proibido') {
    super(message, 403, 'FORBIDDEN');
    this.name = 'ForbiddenError';
  }
}

/** Conflito (409) - recurso já existe (ex: email duplicado) */
export class ConflictError extends AppError {
  constructor(message: string) {
    super(message, 409, 'CONFLICT');
    this.name = 'ConflictError';
  }
}

/** Erro de validação (400) */
export class ValidationError extends AppError {
  constructor(message: string) {
    super(message, 400, 'VALIDATION_ERROR');
    this.name = 'ValidationError';
  }
}

/** Erro interno (500) */
export class InternalError extends AppError {
  constructor(message = 'Erro interno do servidor') {
    super(message, 500, 'INTERNAL_ERROR');
    this.name = 'InternalError';
  }
}
