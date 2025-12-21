export {};

declare global {
  interface Window {
    crocdesk?: {
      revealInFolder: (filePath: string) => void;
    };
  }
}
