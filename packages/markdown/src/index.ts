export type {
  MarkdownFrontMatter,
  MarkdownClipping,
  SerializedBook,
  DeserializedBook,
} from './types';
export { computeFingerprint, normalizeContent } from './fingerprint';
export { slugify, sanitizePath, buildBookPath, isWithinBase } from './path-utils';
export { serializeBook } from './serializer';
export { deserializeBook, readFrontMatter } from './deserializer';
export { readMarkdownFile, writeMarkdownFile, fileExists, ensureDirectory } from './file-ops';
export { LockManager, lockManager } from './lock-manager';
