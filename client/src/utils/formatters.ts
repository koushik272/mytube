export function formatViews(views: number): string {
  if (views >= 1000000) {
    return (views / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
  }
  if (views >= 1000) {
    return (views / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
  }
  return views.toString();
}

export function formatLikes(likes: number): string {
  if (likes >= 1000000) {
    return (likes / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
  }
  if (likes >= 1000) {
    return (likes / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
  }
  return likes.toString();
}
