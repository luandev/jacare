export {};

declare global {
  interface Window {
    crocdesk?: {
      revealInFolder: (filePath: string) => void;
    };
    API_URL?: string; // Injected API URL for separate deployments (Docker, etc.)
  }
}
