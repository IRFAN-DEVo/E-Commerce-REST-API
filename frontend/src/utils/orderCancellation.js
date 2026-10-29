/**
 * Formats cancellation deadline and calculates remaining time based on the authoritative
 * backend deadline (cancellation_deadline or created_at + 24 hours).
 *
 * @param {Object} order The order object from the API
 * @returns {Object|null} Formatted deadline, countdown label, and expiry state
 */
export const getCancellationDeadlineInfo = (order) => {
  if (!order) return null;

  let deadlineMs = null;
  if (order.cancellation_deadline) {
    deadlineMs = new Date(order.cancellation_deadline).getTime();
  } else if (order.created_at) {
    deadlineMs = new Date(order.created_at).getTime() + 24 * 60 * 60 * 1000;
  }

  if (!deadlineMs || isNaN(deadlineMs)) return null;

  const nowMs = Date.now();
  const diffMs = deadlineMs - nowMs;

  const deadlineDate = new Date(deadlineMs);
  const formattedDeadline = deadlineDate.toLocaleString(undefined, {
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
  });

  const isExpired = diffMs <= 0;

  if (isExpired) {
    return {
      isExpired: true,
      deadlineText: formattedDeadline,
      label: 'Cancellation window expired',
      detail: `Cancellation window expired on ${formattedDeadline}`,
      remainingText: 'Expired',
    };
  }

  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

  let remainingText = '';
  if (hours > 0) {
    remainingText = `${hours} hours ${minutes} minutes`;
  } else {
    remainingText = `${minutes} minutes`;
  }

  return {
    isExpired: false,
    deadlineText: formattedDeadline,
    label: `Cancel available for ${remainingText}`,
    detail: `Cancellation available until ${formattedDeadline}`,
    remainingText,
  };
};

