import React from 'react';
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { Antigravity } from '../components/common/Antigravity';

describe('Antigravity Component', () => {
  it('renders canvas and container without errors in jsdom', () => {
    const { container } = render(
      <div style={{ width: '100%', height: '400px', position: 'relative' }}>
        <Antigravity
          colors={['#84cc16', '#000000', '#84cc16']}
          count={500}
          magnetRadius={9}
          ringRadius={7}
          particleSize={0.9}
          autoAnimate={true}
        />
      </div>
    );

    const antigravityDiv = container.querySelector('.antigravity');
    expect(antigravityDiv).toBeInTheDocument();
    const canvas = container.querySelector('canvas');
    expect(canvas).toBeInTheDocument();
  });
});
