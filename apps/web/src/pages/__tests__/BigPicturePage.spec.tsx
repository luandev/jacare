import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import BigPicturePage from '../BigPicturePage';

// Mock the useUIStore hook
vi.mock('../../store', () => ({
  useUIStore: vi.fn(() => ({
    setBigPictureMode: vi.fn()
  }))
}));

// Mock the API module
vi.mock('../../lib/api', () => ({
  apiGet: vi.fn(() => Promise.resolve([]))
}));

const Wrapper = ({ children }: { children: React.ReactNode }) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });
  
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        {children}
      </BrowserRouter>
    </QueryClientProvider>
  );
};

describe('BigPicturePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the Big Picture welcome screen', () => {
    render(
      <Wrapper>
        <BigPicturePage />
      </Wrapper>
    );
    
    expect(screen.getAllByText('Welcome to Big Picture Mode')[0]).toBeInTheDocument();
  });

  it('renders navigation menu with all sections', () => {
    render(
      <Wrapper>
        <BigPicturePage />
      </Wrapper>
    );
    
    expect(screen.getAllByText('Home')[0]).toBeInTheDocument();
    expect(screen.getAllByText('Library')[0]).toBeInTheDocument();
    expect(screen.getAllByText('Search')[0]).toBeInTheDocument();
    expect(screen.getAllByText('Downloads')[0]).toBeInTheDocument();
    expect(screen.getAllByText('Settings')[0]).toBeInTheDocument();
    expect(screen.getAllByText('Exit')[0]).toBeInTheDocument();
  });

  it('displays controller instructions', () => {
    render(
      <Wrapper>
        <BigPicturePage />
      </Wrapper>
    );
    
    const dpadInstructions = screen.getAllByText(/D-Pad \/ Arrows:/);
    const selectInstructions = screen.getAllByText(/A \/ Enter:/);
    const backInstructions = screen.getAllByText(/B \/ Escape:/);
    
    expect(dpadInstructions.length).toBeGreaterThan(0);
    expect(selectInstructions.length).toBeGreaterThan(0);
    expect(backInstructions.length).toBeGreaterThan(0);
  });

  it('renders the Jacare logo', () => {
    render(
      <Wrapper>
        <BigPicturePage />
      </Wrapper>
    );
    
    const logos = screen.getAllByText('Jacare');
    expect(logos.length).toBeGreaterThan(0);
  });
});
