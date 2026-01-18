/**
 * Type declaration for pdfjs-dist worker module
 * This module is dynamically imported server-side to populate globalThis.pdfjsWorker
 */
declare module 'pdfjs-dist/legacy/build/pdf.worker.mjs' {
  export const WorkerMessageHandler: unknown;
}
