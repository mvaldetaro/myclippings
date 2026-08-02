/**
 * Gerencia locks de concorrência por livro (RNF-007).
 *
 * Lock em processo: impede escritas simultâneas no arquivo Markdown de um
 * mesmo bookId. Locks de bookIds diferentes são independentes. Espera em
 * fila FIFO; a função de liberação retornada é idempotente.
 */
export class LockManager {
  /** bookIds com lock atualmente retido */
  private readonly held = new Set<string>();

  /** Filas de espera por bookId (cada entrada acorda um adquirente) */
  private readonly waiters = new Map<string, Array<() => void>>();

  /**
   * Adquire o lock para um bookId. Se já estiver em uso, aguarda em fila
   * até ser liberado.
   *
   * @returns Função de liberação — o chamador DEVE chamá-la para soltar o lock
   */
  async acquire(bookId: string): Promise<() => void> {
    // Enquanto outro detém o lock, entra na fila e aguarda ser acordado.
    // O laço revalida após o acordar (protege contra múltiplos acordes).
    while (this.held.has(bookId)) {
      await new Promise<void>((resolve) => {
        const queue = this.waiters.get(bookId) ?? [];
        queue.push(resolve);
        this.waiters.set(bookId, queue);
      });
    }

    this.held.add(bookId);

    let released = false;
    return () => {
      // Idempotente: liberações repetidas são ignoradas
      if (released) return;
      released = true;

      this.held.delete(bookId);

      // Acorda o próximo da fila (se houver) e descarta fila vazia
      const queue = this.waiters.get(bookId);
      const next = queue?.shift();
      if (queue && queue.length === 0) {
        this.waiters.delete(bookId);
      }
      next?.();
    };
  }

  /**
   * Verifica se um bookId está atualmente bloqueado.
   */
  isLocked(bookId: string): boolean {
    return this.held.has(bookId);
  }
}

/** Instância singleton do lock manager */
export const lockManager = new LockManager();
