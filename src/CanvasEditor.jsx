import { useRef, useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { collection, doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from './lib/firebase';
import { useFabricCanvas } from './hooks/useFabricCanvas';
import { useCanvasPersistence } from './hooks/useCanvasPersistence';
import { saveRecentCanvas } from './lib/recentCanvases';
import { Toolbar } from './components/Toolbar';
import { PropertiesPanel } from './components/PropertiesPanel';
import { SaveStatus } from './components/SaveStatus';
import { RecentCanvasesDropdown } from './components/RecentCanvasesDropdown';
import { CanvasRulers } from './components/CanvasRulers';
import { LogoIcon, ShareIcon, CheckIcon } from './components/Icons';

export function CanvasEditor() {
  const { canvasId } = useParams();
  const navigate = useNavigate();
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const [hasObjects, setHasObjects] = useState(false);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleInput, setTitleInput] = useState('');
  const [coords, setCoords] = useState(null);
  const [isCopied, setIsCopied] = useState(false);
  const [zoomPercent, setZoomPercent] = useState(100);

  const fabricCanvas = useFabricCanvas(canvasRef, containerRef);
  const { saveStatus, errorMessage, canvasName, updateCanvasName, save } =
    useCanvasPersistence(fabricCanvas, canvasId, containerRef);

  useEffect(() => {
    setTitleInput(canvasName || 'Untitled');
  }, [canvasName]);

  useEffect(() => {
    if (!fabricCanvas) return;

    const checkObjects = () => {
      const count = fabricCanvas.getObjects().length;
      setHasObjects(count > 0);
    };

    fabricCanvas.on('object:added', checkObjects);
    fabricCanvas.on('object:removed', checkObjects);
    fabricCanvas.on('canvas:cleared', checkObjects);

    checkObjects();

    return () => {
      fabricCanvas.off('object:added', checkObjects);
      fabricCanvas.off('object:removed', checkObjects);
      fabricCanvas.off('canvas:cleared', checkObjects);
    };
  }, [fabricCanvas]);

  useEffect(() => {
    if (!fabricCanvas) return;

    const handleMouseMove = (options) => {
      if (!options.e) return;
      const pointer = fabricCanvas.getScenePoint
        ? fabricCanvas.getScenePoint(options.e)
        : fabricCanvas.getPointer(options.e);

      const x = Math.round(pointer.x);
      const y = Math.round(pointer.y);

      if (x >= 0 && y >= 0) {
        setCoords({ x, y });
      } else {
        setCoords(null);
      }
    };

    const handleMouseOut = () => {
      setCoords(null);
    };

    fabricCanvas.on('mouse:move', handleMouseMove);
    fabricCanvas.on('mouse:out', handleMouseOut);

    return () => {
      fabricCanvas.off('mouse:move', handleMouseMove);
      fabricCanvas.off('mouse:out', handleMouseOut);
    };
  }, [fabricCanvas]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleMouseLeave = () => setCoords(null);
    container.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      container.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, [containerRef]);

  const handleTitleSubmit = () => {
    setIsEditingTitle(false);
    updateCanvasName(titleInput);
  };

  const handleTitleKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleTitleSubmit();
    } else if (e.key === 'Escape') {
      setIsEditingTitle(false);
      setTitleInput(canvasName || 'Untitled');
    }
  };

  const handleCreateNewCanvas = async () => {
    try {
      await save();
    } catch (e) {
      console.warn('Pre-navigation save warning:', e);
    }

    if (fabricCanvas) {
      fabricCanvas.discardActiveObject();
      fabricCanvas.clear();
      fabricCanvas.backgroundColor = 'transparent';
      fabricCanvas.renderAll();
    }

    setHasObjects(false);
    setIsEditingTitle(false);
    setTitleInput('Untitled');

    const newDocRef = doc(collection(db, 'canvases'));
    const newId = newDocRef.id;
    const nowStr = new Date().toISOString();

    saveRecentCanvas({ id: newId, name: 'Untitled', updatedAt: nowStr });
    setDoc(newDocRef, { name: 'Untitled', createdAt: serverTimestamp() }).catch(
      () => {}
    );
    navigate(`/canvas/${newId}`);
  };

  const handleShare = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 1500);
    } catch (err) {
      console.error('Copy URL failed:', err);
    }
  };

  const handleZoomIn = useCallback(() => {
    if (!fabricCanvas) return;
    const current = fabricCanvas.getZoom();
    const next = Math.min(2.5, Math.round((current + 0.1) * 10) / 10);
    const center = fabricCanvas.getCenterPoint();
    fabricCanvas.zoomToPoint(center, next);
    setZoomPercent(Math.round(next * 100));
  }, [fabricCanvas]);

  const handleZoomOut = useCallback(() => {
    if (!fabricCanvas) return;
    const current = fabricCanvas.getZoom();
    const next = Math.max(0.4, Math.round((current - 0.1) * 10) / 10);
    const center = fabricCanvas.getCenterPoint();
    fabricCanvas.zoomToPoint(center, next);
    setZoomPercent(Math.round(next * 100));
  }, [fabricCanvas]);

  const handleResetZoom = useCallback(() => {
    if (!fabricCanvas) return;
    const center = fabricCanvas.getCenterPoint();
    fabricCanvas.zoomToPoint(center, 1);
    setZoomPercent(100);
  }, [fabricCanvas]);

  return (
    <div className="editor-layout">
      {/* Minimal Top Navigation */}
      <header className="minimal-topbar">
        <div className="topbar-left">
          <button
            className="logo-mark-btn"
            onClick={() => navigate('/')}
            title="Back to Home"
            aria-label="Home"
          >
            <LogoIcon />
          </button>

          {isEditingTitle ? (
            <input
              type="text"
              className="title-editable-input"
              value={titleInput}
              onChange={(e) => setTitleInput(e.target.value)}
              onBlur={handleTitleSubmit}
              onKeyDown={handleTitleKeyDown}
              autoFocus
            />
          ) : (
            <div
              className="title-display-wrapper"
              onClick={() => setIsEditingTitle(true)}
              title="Click to rename"
            >
              <h1 className="title-display-text">{canvasName || 'Untitled'}</h1>
              <span className="title-edit-hint">✎</span>
            </div>
          )}
        </div>

        <div className="topbar-right">
          <SaveStatus saveStatus={saveStatus} errorMessage={errorMessage} />

          <button
            className={`minimal-share-btn ${isCopied ? 'copied' : ''}`}
            onClick={handleShare}
            title="Copy canvas URL"
          >
            {isCopied ? <CheckIcon size={15} /> : <ShareIcon size={15} />}
            <span>{isCopied ? 'Copied' : 'Share'}</span>
          </button>

          <RecentCanvasesDropdown
            currentCanvasId={canvasId}
            onNewCanvas={handleCreateNewCanvas}
          />
        </div>
      </header>

      {/* Main Canvas Artboard & Floating Controls */}
      <div className="canvas-area-wrapper">
        <Toolbar fabricCanvas={fabricCanvas} onSave={save} />
        <PropertiesPanel fabricCanvas={fabricCanvas} />
        <CanvasRulers containerRef={containerRef} coords={coords} />

        <div className="artboard-container" ref={containerRef}>
          <canvas ref={canvasRef} />
          {!hasObjects && (
            <div className="canvas-placeholder">
              Click a tool to draw or press P for pen
            </div>
          )}
        </div>

        {/* Subtle Bottom-Right Status Bar */}
        <div className="bottom-status-bar">
          <span className="coords-text">
            {coords ? `X: ${coords.x}   Y: ${coords.y}` : 'X: —   Y: —'}
          </span>
          <span className="status-separator">│</span>
          <div className="zoom-controls">
            <button
              className="zoom-btn"
              onClick={handleZoomOut}
              title="Zoom out"
              aria-label="Zoom out"
            >
              −
            </button>
            <button
              className="zoom-percent-btn"
              onClick={handleResetZoom}
              title="Reset zoom to 100%"
              aria-label="Reset zoom"
            >
              {zoomPercent}%
            </button>
            <button
              className="zoom-btn"
              onClick={handleZoomIn}
              title="Zoom in"
              aria-label="Zoom in"
            >
              +
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
