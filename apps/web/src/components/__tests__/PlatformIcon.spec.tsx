import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import PlatformIcon from '../PlatformIcon';

afterEach(() => cleanup());

describe('PlatformIcon', () => {
  it('uses platform naming to pick a brand-specific icon', () => {
    render(<PlatformIcon platform="snes" size={24} />);
    const icon = screen.getByLabelText(/nintendo|snes/i);
    expect(icon).toBeInTheDocument();
    expect(icon).toHaveAttribute('data-brand', 'nintendo');
  });

  it('renders stylized vector paths for known brands', () => {
    const { container } = render(<PlatformIcon platform="psx" brand="PlayStation" size={28} />);
    const icon = screen.getByLabelText(/playstation|psx/i);
    expect(icon).toBeInTheDocument();
    expect(icon).toHaveAttribute('data-brand', 'sony');
    expect(container.querySelectorAll('path').length).toBeGreaterThan(0);
    expect(container.querySelector('text')).toBeNull();
  });

  it('falls back to initials for unknown brands', () => {
    render(<PlatformIcon platform="retro future" label="Retro Console" size={24} />);
    const icon = screen.getByLabelText(/retro console/i);
    expect(icon).toHaveAttribute('data-brand', 'generic');
    expect(icon.textContent).toMatch(/RC/);
  });
});
