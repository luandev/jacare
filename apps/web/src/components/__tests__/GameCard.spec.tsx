import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import GameCard from '../GameCard';
import type { CrocdbEntry } from '@crocdesk/shared';

const mockEntry: CrocdbEntry = {
  slug: 'metroid-nes',
  title: 'Metroid',
  platform: 'nes',
  boxart_url: 'https://example.com/boxart.jpg',
  regions: ['us'],
  links: [
    {
      name: 'Mirror 1',
      type: 'download',
      format: 'zip',
      url: 'https://example.com/metroid.zip',
      filename: 'metroid.zip',
      host: 'example',
      size: 1024,
      size_str: '1KB'
    }
  ],
  screenshots: []
};

const Wrapper = ({ children }: { children: React.ReactNode }) => (
  <BrowserRouter>{children}</BrowserRouter>
);

describe('GameCard', () => {
  it('renders game title and platform', () => {
    render(
      <Wrapper>
        <GameCard entry={mockEntry} />
      </Wrapper>
    );
    
    expect(screen.getByText('Metroid')).toBeInTheDocument();
    // Platform appears in status div and SVG - check for status div
    expect(screen.getByText('NES', { selector: '.status' })).toBeInTheDocument();
  });

  it('renders owned badge when isOwned is true', () => {
    render(
      <Wrapper>
        <GameCard entry={mockEntry} isOwned={true} />
      </Wrapper>
    );
    
    expect(screen.getByText('Owned')).toBeInTheDocument();
  });

  it('renders downloading badge when isDownloading is true', () => {
    render(
      <Wrapper>
        <GameCard entry={mockEntry} isDownloading={true} />
      </Wrapper>
    );
    
    expect(screen.getByText('Downloading…')).toBeInTheDocument();
  });

  it('shows download button when not owned and not downloading', () => {
    const onDownload = vi.fn();
    render(
      <Wrapper>
        <GameCard entry={mockEntry} onDownload={onDownload} />
      </Wrapper>
    );
    
    // Use queryAllByRole to handle potential strict mode double render
    const downloadButtons = screen.queryAllByRole('button', { name: 'Queue Download' });
    expect(downloadButtons.length).toBeGreaterThan(0);
  });

  it('renders download button when onDownload handler is provided', () => {
    const onDownload = vi.fn();
    render(
      <Wrapper>
        <GameCard entry={mockEntry} onDownload={onDownload} />
      </Wrapper>
    );
    
    // Use getAllByRole in case of strict mode double render
    const downloadButtons = screen.getAllByRole('button', { name: 'Queue Download' });
    expect(downloadButtons.length).toBeGreaterThan(0);
    // Button should be enabled
    expect(downloadButtons[0]).not.toBeDisabled();
  });

  it('renders cover image when boxart_url is provided', () => {
    render(
      <Wrapper>
        <GameCard entry={mockEntry} />
      </Wrapper>
    );
    
    // Use getAllByAltText to handle strict mode double render
    const images = screen.getAllByAltText('Metroid cover art');
    expect(images.length).toBeGreaterThan(0);
    expect(images[0]).toHaveAttribute('src', 'https://example.com/boxart.jpg');
  });

  it('renders placeholder when boxart_url is not provided', () => {
    const entryWithoutCover = { ...mockEntry, boxart_url: undefined };
    render(
      <Wrapper>
        <GameCard entry={entryWithoutCover} />
      </Wrapper>
    );
    
    // Should render PlatformIcon placeholder - check for thumb-placeholder class
    const placeholder = document.querySelector('.thumb-placeholder');
    expect(placeholder).toBeInTheDocument();
  });
});
