import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import DownloadCard from '../DownloadCard';
import type { JobRecord } from '@crocdesk/shared';

const mockJob: JobRecord & { preview?: { slug: string; title: string; platform: string; boxart_url?: string } } = {
  id: 'job-1',
  type: 'download_and_install',
  status: 'running',
  payload: { slug: 'metroid-nes' },
  createdAt: Date.now(),
  updatedAt: Date.now(),
  preview: {
    slug: 'metroid-nes',
    title: 'Metroid',
    platform: 'nes',
    boxart_url: 'https://example.com/boxart.jpg'
  }
};

const createQueryClient = () => new QueryClient({
  defaultOptions: {
    queries: { retry: false },
    mutations: { retry: false }
  }
});

const Wrapper = ({ children }: { children: React.ReactNode }) => {
  const queryClient = createQueryClient();
  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
};

describe('DownloadCard', () => {
  it('renders job title and platform', () => {
    render(
      <Wrapper>
        <DownloadCard job={mockJob} speedHistory={[]} />
      </Wrapper>
    );
    
    expect(screen.getByText('Metroid')).toBeInTheDocument();
    // Platform appears in status div - check for it
    expect(screen.getByText('NES', { selector: '.status' })).toBeInTheDocument();
  });

  it('renders job status badge', () => {
    render(
      <Wrapper>
        <DownloadCard job={mockJob} speedHistory={[]} />
      </Wrapper>
    );
    
    // Use getAllByText to handle strict mode double render
    const statusBadges = screen.getAllByText('running');
    expect(statusBadges.length).toBeGreaterThan(0);
  });

  it('shows pause button when status is running', () => {
    render(
      <Wrapper>
        <DownloadCard job={mockJob} speedHistory={[]} />
      </Wrapper>
    );
    
    // Use getAllByRole to handle strict mode double render
    const pauseButtons = screen.getAllByRole('button', { name: /pause/i });
    expect(pauseButtons.length).toBeGreaterThan(0);
  });

  it('shows resume button when status is paused', () => {
    const pausedJob = { ...mockJob, status: 'paused' as const };
    render(
      <Wrapper>
        <DownloadCard job={pausedJob} speedHistory={[]} />
      </Wrapper>
    );
    
    expect(screen.getByRole('button', { name: /resume/i })).toBeInTheDocument();
  });

  it('shows cancel button', () => {
    render(
      <Wrapper>
        <DownloadCard job={mockJob} speedHistory={[]} />
      </Wrapper>
    );
    
    // Use getAllByRole to handle strict mode double render
    const cancelButtons = screen.getAllByRole('button', { name: /cancel/i });
    expect(cancelButtons.length).toBeGreaterThan(0);
  });

  it('displays progress when currentProgress is provided', () => {
    render(
      <Wrapper>
        <DownloadCard 
          job={mockJob} 
          speedHistory={[]} 
          currentProgress={0.5}
          currentBytes={{ downloaded: 500, total: 1000 }}
        />
      </Wrapper>
    );
    
    // Progress element should be visible (check for progress class or DownloadProgress component)
    const progressElement = document.querySelector('.progress');
    expect(progressElement).toBeInTheDocument();
  });
});

