export function getRecentCanvases() {
  try {
    const raw = localStorage.getItem('recent_canvases');
    if (!raw) return [];
    const list = JSON.parse(raw);
    return Array.isArray(list)
      ? list.sort((a, b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0))
      : [];
  } catch (e) {
    return [];
  }
}

export function saveRecentCanvas({ id, name = 'Untitled', updatedAt }) {
  if (!id) return;
  const current = getRecentCanvases();
  const existingIndex = current.findIndex((item) => item.id === id);
  const nowStr = updatedAt || new Date().toISOString();

  let updatedList;
  if (existingIndex >= 0) {
    current[existingIndex] = {
      ...current[existingIndex],
      name: name || current[existingIndex].name || 'Untitled',
      updatedAt: nowStr,
    };
    updatedList = current;
  } else {
    updatedList = [{ id, name: name || 'Untitled', updatedAt: nowStr }, ...current];
  }

  try {
    localStorage.setItem('recent_canvases', JSON.stringify(updatedList.slice(0, 30)));
  } catch (e) {
    console.warn('Failed to save recent canvases:', e);
  }
}

export function deleteRecentCanvas(id) {
  if (!id) return;
  const current = getRecentCanvases();
  const updatedList = current.filter((item) => item.id !== id);
  try {
    localStorage.setItem('recent_canvases', JSON.stringify(updatedList));
  } catch (e) {
    console.warn('Failed to delete recent canvas:', e);
  }
}

