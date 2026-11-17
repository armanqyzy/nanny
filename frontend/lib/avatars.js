import { absoluteAssetUrl } from './api';

function buildUiAvatar(name, background = 'F29A4D', color = 'ffffff') {
  const safeName = encodeURIComponent(name || 'Nanny');
  return `https://ui-avatars.com/api/?name=${safeName}&background=${background}&color=${color}&bold=true`;
}

export function resolveAvatar(user, options = {}) {
  const {
    supportBackground = '4A6CFF',
    defaultBackground = 'F29A4D',
  } = options;

  // Uploaded avatars live on the API server, so turn /uploads/... into a full URL.
  if (user?.avatar_url) return absoluteAssetUrl(user.avatar_url);
  if (user?.is_support || user?.display_role === 'support') {
    return buildUiAvatar(user.display_name || user.full_name || 'Support', supportBackground);
  }
  return buildUiAvatar(user?.display_name || user?.full_name || 'Nanny', defaultBackground);
}

// If an uploaded avatar is missing (for example wiped on the server), show initials instead.
export function avatarFallback(user) {
  return (event) => {
    event.currentTarget.onerror = null;
    event.currentTarget.src = buildUiAvatar(user?.display_name || user?.full_name || 'Nanny', 'F29A4D');
  };
}
