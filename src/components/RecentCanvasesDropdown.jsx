import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { getRecentCanvases } from '../lib/recentCanvases';
import { MoreIcon, CheckIcon } from './Icons';

export function RecentCanvasesDropdown({ currentCanvasId, onNewCanvas }) {
  const [isOpen, setIsOpen] = useState(false);
  const [recentList, setRecentList] = useState([]);
  const [copiedId, setCopiedId] = useState(false);
  const dropdownRef = useRef(null);
  const navigate = useNavigate();

  const toggleDropdown = () => {
    if (!isOpen) {
      setRecentList(getRecentCanvases());
    }
    setIsOpen(!isOpen);
  };

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    window.addEventListener('mousedown', handleClickOutside);
    return () => window.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (id) => {
    setIsOpen(false);
    if (id !== currentCanvasId) {
      navigate(`/canvas/${id}`);
    }
  };

  const handleCopyId = async () => {
    if (!currentCanvasId) return;
    try {
      await navigator.clipboard.writeText(currentCanvasId);
      setCopiedId(true);
      setTimeout(() => setCopiedId(false), 1500);
    } catch (e) {
      console.warn('Copy ID failed:', e);
    }
  };

  const formatDate = (isoStr) => {
    if (!isoStr) return '';
    try {
      const d = new Date(isoStr);
      return d.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return '';
    }
  };

  return (
    <div className="secondary-menu-wrapper" ref={dropdownRef}>
      <button
        className={`secondary-menu-btn ${isOpen ? 'active' : ''}`}
        onClick={toggleDropdown}
        title="Canvas details and options"
        aria-label="Options"
      >
        <MoreIcon />
      </button>

      {isOpen && (
        <div className="secondary-dropdown-menu">
          {/* Canvas ID Section */}
          <div className="dropdown-section">
            <span className="dropdown-section-title">Canvas Details</span>
            <div className="canvas-id-row">
              <span className="canvas-id-text" title={currentCanvasId}>
                ID: {currentCanvasId}
              </span>
              <button
                className="copy-id-btn"
                onClick={handleCopyId}
                title="Copy Canvas ID"
              >
                {copiedId ? <CheckIcon size={12} /> : 'Copy'}
              </button>
            </div>
          </div>

          <div className="dropdown-divider" />

          {/* New Canvas Action */}
          {onNewCanvas && (
            <>
              <button
                className="dropdown-action-item"
                onClick={() => {
                  setIsOpen(false);
                  onNewCanvas();
                }}
              >
                <span>+ New Canvas</span>
              </button>
              <div className="dropdown-divider" />
            </>
          )}

          {/* Recent Canvases */}
          <div className="dropdown-section">
            <span className="dropdown-section-title">Recent Canvases</span>
            <div className="recent-dropdown-list">
              {recentList.length === 0 ? (
                <div className="recent-dropdown-empty">No recent canvases</div>
              ) : (
                recentList.map((item) => (
                  <button
                    key={item.id}
                    className={`recent-dropdown-item ${
                      item.id === currentCanvasId ? 'current' : ''
                    }`}
                    onClick={() => handleSelect(item.id)}
                  >
                    <div className="recent-item-info">
                      <span className="recent-item-name">{item.name || 'Untitled'}</span>
                      <span className="recent-item-date">{formatDate(item.updatedAt)}</span>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
