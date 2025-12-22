import React from "react";
import ReactDOM from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import App from "./App";
import "./styles.css";
import { ThemeProvider } from "./components/ThemeProvider";
import { useSSEStore } from "./store";

const client = new QueryClient();

// Initialize SSE connection on app mount
function AppWithSSE() {
  React.useEffect(() => {
    const { connect, disconnect } = useSSEStore.getState();
    connect();
    
    return () => {
      disconnect();
    };
  }, []);
  
  return <App />;
}

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <QueryClientProvider client={client}>
      <ThemeProvider>
        <AppWithSSE />
      </ThemeProvider>
    </QueryClientProvider>
  </React.StrictMode>
);
