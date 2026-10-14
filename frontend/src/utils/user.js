/**
 * Helper to get the display name of a user.
 * Prioritizes first_name (+ last_name), then name, then username, then email username prefix.
 */
export const getUserDisplayName = (user) => {
  if (!user) return 'Account';

  const fullName = `${user.first_name || ''} ${user.last_name || ''}`.trim();
  if (fullName) return fullName;

  if (user.name && user.name.trim()) {
    return user.name.trim();
  }

  if (user.first_name && user.first_name.trim()) {
    return user.first_name.trim();
  }

  if (user.username && user.username.trim() && !user.username.startsWith('user_')) {
    return user.username.trim();
  }

  if (user.email && user.email.includes('@')) {
    const prefix = user.email.split('@')[0];
    if (prefix) {
      return prefix.charAt(0).toUpperCase() + prefix.slice(1);
    }
  }

  return 'Account';
};

/**
 * Helper to get the single character initial for a user's avatar profile icon.
 * Returns the first letter of the user's name (or email if name is not set).
 */
export const getUserInitial = (user) => {
  if (!user) return 'U';

  const name =
    (user.first_name && user.first_name.trim()) ||
    (user.name && user.name.trim()) ||
    (user.username && user.username.trim() && !user.username.startsWith('user_') ? user.username.trim() : '') ||
    (user.email && user.email.split('@')[0]) ||
    '';

  const trimmed = name.trim();
  if (trimmed.length > 0) {
    return trimmed[0].toUpperCase();
  }

  return 'U';
};
