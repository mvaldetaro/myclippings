/** Usuário do sistema */
export interface User {
  /** Identificador único do usuário (ULID) */
  id: string;
  /** Nome completo */
  name: string;
  /** E-mail de acesso */
  email: string;
  /** Hash da senha (nunca a senha em texto plano) */
  passwordHash: string;
  /** Data de criação do registro (ISO 8601) */
  createdAt: string;
  /** Data da última atualização do registro (ISO 8601) */
  updatedAt: string;
}

/** Entrada para criação de usuário (senha em texto plano, antes do hash) */
export interface CreateUserInput {
  /** Nome completo */
  name: string;
  /** E-mail de acesso */
  email: string;
  /** Senha em texto plano (será hasheada na camada de aplicação) */
  password: string;
}

/** Entrada para login */
export interface LoginInput {
  /** E-mail de acesso */
  email: string;
  /** Senha em texto plano */
  password: string;
}
