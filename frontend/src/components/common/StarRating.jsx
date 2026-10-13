import React from 'react';
import { Star } from 'lucide-react';

export const StarRating = ({ rating = 0, max = 5, onRate, interactive = false, size = 18 }) => {
  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '2px' }}>
      {Array.from({ length: max }, (_, index) => {
        const starNumber = index + 1;
        const isFilled = starNumber <= rating;

        if (interactive) {
          return (
            <button
              key={index}
              type="button"
              onClick={() => onRate && onRate(starNumber)}
              style={{
                color: isFilled ? 'var(--warning-500)' : 'var(--gray-300)',
                background: 'none',
                padding: '2px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
              }}
              aria-label={`Rate ${starNumber} out of ${max} stars`}
            >
              <Star size={size} fill={isFilled ? 'var(--warning-500)' : 'none'} />
            </button>
          );
        }

        return (
          <span
            key={index}
            style={{
              color: isFilled ? 'var(--warning-500)' : 'var(--gray-300)',
              display: 'inline-flex',
              alignItems: 'center',
            }}
          >
            <Star size={size} fill={isFilled ? 'var(--warning-500)' : 'none'} />
          </span>
        );
      })}
    </div>
  );
};
