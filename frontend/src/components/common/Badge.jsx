import React from 'react';

export const OrderStatusBadge = ({ status }) => {
  const normalized = (status || '').toUpperCase();
  let className = 'badge badge-pending';

  switch (normalized) {
    case 'PROCESSING':
      className = 'badge badge-processing';
      break;
    case 'SHIPPED':
      className = 'badge badge-shipped';
      break;
    case 'DELIVERED':
      className = 'badge badge-delivered';
      break;
    case 'CANCELLED':
      className = 'badge badge-cancelled';
      break;
    case 'PENDING':
    default:
      className = 'badge badge-pending';
      break;
  }

  return <span className={className}>{normalized}</span>;
};

export const StockBadge = ({ stock, isAvailable = true }) => {
  const inStock = isAvailable && (stock === undefined || stock > 0);
  return (
    <span className={inStock ? 'badge badge-instock' : 'badge badge-outofstock'}>
      {inStock ? (stock !== undefined ? `${stock} in stock` : 'In Stock') : 'Out of Stock'}
    </span>
  );
};
