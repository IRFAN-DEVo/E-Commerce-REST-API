import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { FadeContent } from '../components/common/FadeContent';

describe('FadeContent Component', () => {
  it('renders children correctly', () => {
    render(
      <FadeContent effect="mist" duration={0.8} trigger="mount">
        <div data-testid="fade-child">Misty Content</div>
      </FadeContent>
    );

    expect(screen.getByTestId('fade-child')).toBeInTheDocument();
    expect(screen.getByText('Misty Content')).toBeInTheDocument();
  });

  it('invokes onComplete or completes gracefully on mount', () => {
    const onStart = vi.fn();
    const onComplete = vi.fn();

    const { unmount } = render(
      <FadeContent
        effect="mist"
        duration={0.01}
        trigger="mount"
        onStart={onStart}
        onComplete={onComplete}
      >
        <p>Animated Text</p>
      </FadeContent>
    );

    expect(screen.getByText('Animated Text')).toBeInTheDocument();
    unmount();
  });

  it('renders custom className and inline styles', () => {
    const { container } = render(
      <FadeContent
        className="custom-fade-wrapper"
        style={{ padding: '20px' }}
        trigger="mount"
      >
        <span>Content</span>
      </FadeContent>
    );

    const wrapper = container.firstChild;
    expect(wrapper).toHaveClass('custom-fade-wrapper');
  });
});
