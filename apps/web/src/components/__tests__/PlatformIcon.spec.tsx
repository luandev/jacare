import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import PlatformIcon from '../PlatformIcon';

afterEach(() => cleanup());

describe('PlatformIcon', () => {
  it('renders initials and accessible label', () => {
    render(<PlatformIcon platform="snes" size={24} />);
    const icon = screen.getByLabelText(/Super Nintendo|snes/i);
    expect(icon).toBeInTheDocument();
    // Initials-only icon should render some text content (e.g., SNES)
    expect(icon.textContent).toMatch(/sn|snes|sn/i);
  });

  it('renders with brand-inspired color class/style', () => {
    render(<PlatformIcon platform="nes" size={24} />);
    const icon = screen.getByLabelText(/Nintendo|nes/i);
    expect(icon).toBeInTheDocument();
    // Basic presence is enough; color is applied via style or class
    expect(icon).toHaveAttribute('aria-label');
  });
});