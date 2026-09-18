import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from './lib/firebase';
import { getRecentCanvases, saveRecentCanvas } from './lib/recentCanvases';

export function Home() {
  const navigate = useNavigate();
  const [isCreating, setIsCreating] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [recentList, setRecentList] = useState([]);
  const [copiedId, setCopiedId] = useState(null);

  useEffect(() => {
    // Show recent canvases up to 6 so they wrap cleanly or display alongside New
    setRecentList(getRecentCanvases().slice(0, 6));
  }, []);

  const createNewCanvas = () => {
    if (isCreating) return;
    setIsCreating(true);
    setErrorMessage('');
    try {
      const newDocRef = doc(collection(db, 'canvases'));
      const canvasId = newDocRef.id;
      const nowStr = new Date().toISOString();

      saveRecentCanvas({ id: canvasId, name: 'Untitled', updatedAt: nowStr });
      setDoc(newDocRef, { name: 'Untitled', createdAt: serverTimestamp() }).catch(
        () => {}
      );
      navigate(`/canvas/${canvasId}`);
    } catch (error) {
      setErrorMessage('Failed to create canvas. Please try again.');
      setIsCreating(false);
    }
  };

  const handleOpenCanvas = (id) => {
    navigate(`/canvas/${id}`);
  };

  const handleShareCard = async (e, id) => {
    e.stopPropagation();
    const url = `${window.location.origin}/canvas/${id}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopiedId(id);
      setTimeout(() => {
        setCopiedId(null);
      }, 1500);
    } catch (err) {
      console.error('Copy URL failed:', err);
    }
  };

  return (
    <div className="home-workspace">
      <div className="home-workspace-inner">
        <h1 className="home-main-title">2D Canvas Editor</h1>

        {errorMessage && <div className="home-error-banner">{errorMessage}</div>}

        <div className="home-tiles-container">
          <div className="home-tiles-row">
            {recentList.map((item) => (
              <div
                key={item.id}
                className="canvas-document-tile"
                onClick={() => handleOpenCanvas(item.id)}
                title={`Open ${item.name || 'Untitled'}`}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleOpenCanvas(item.id);
                  }
                }}
              >
                <div className="tile-canvas-preview">
                  <svg
                    className="tile-preview-art"
                    viewBox="0 0 80 80"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                    aria-hidden="true"
                  >
                    <rect x="12" y="14" width="56" height="52" rx="4" stroke="#E2E8F0" strokeWidth="1.2" strokeDasharray="3 3" />
                    <rect x="20" y="24" width="22" height="16" rx="2" fill="#F8FAFC" stroke="#CBD5E1" strokeWidth="1" />
                    <circle cx="52" cy="46" r="10" fill="#F1F5F9" stroke="#CBD5E1" strokeWidth="1" />
                    <line x1="22" y1="52" x2="38" y2="52" stroke="#CBD5E1" strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                  <button
                    type="button"
                    className={`tile-share-btn ${copiedId === item.id ? 'copied' : ''}`}
                    onClick={(e) => handleShareCard(e, item.id)}
                    title={copiedId === item.id ? 'Link copied!' : 'Copy link'}
                    aria-label="Copy canvas link"
                  >
                    {copiedId === item.id ? (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    ) : (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                        <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                      </svg>
                    )}
                  </button>
                </div>
                <span className="tile-document-label">{item.name || 'Untitled'}</span>
              </div>
            ))}

            <div
              className={`canvas-document-tile new-tile ${isCreating ? 'creating' : ''}`}
              onClick={createNewCanvas}
              title="Create new canvas"
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  createNewCanvas();
                }
              }}
            >
              <div className="tile-canvas-preview new-tile-preview">
                <svg
                  className="new-tile-plus-icon"
                  width="32"
                  height="32"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
              </div>
              <span className="tile-document-label">New</span>
            </div>
          </div>
        </div>

        <footer className="home-footer">
          Made with ♡ by{' '}
          <a
            href="https://github.com/HARSHA-8855"
            target="_blank"
            rel="noopener noreferrer"
            className="home-footer-link"
          >
            Harsha
          </a>
        </footer>
      </div>
    </div>
  );
}

