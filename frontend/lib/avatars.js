function buildUiAvatar(name, background = 'F29A4D', color = 'ffffff') {
  const safeName = encodeURIComponent(name || 'Nanny');
  return `https://ui-avatars.com/api/?name=${safeName}&background=${background}&color=${color}&bold=true`;
}

export function resolveAvatar(user, options = {}) {
  const {
    supportBackground = '4A6CFF',
    defaultBackground = 'F29A4D',
  } = options;

  if (user?.avatar_url) return user.avatar_url;
  if (user?.is_support || user?.display_role === 'support') {
    return buildUiAvatar(user.display_name || user.full_name || 'Support', supportBackground);
  }
  return buildUiAvatar(user?.display_name || user?.full_name || 'Nanny', defaultBackground);
}
