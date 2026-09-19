import { useState, useEffect, useCallback, useRef } from 'react';
import * as fabric from 'fabric';
import { useCustomShapeTool } from '../hooks/useCustomShapeTool';
import {
  CursorIcon,
  SquareIcon,
  CircleIcon,
  TriangleIcon,
  LineIcon,
  PolygonIcon,
  TypeIcon,
  PencilIcon,
  TrashIcon,
  SaveIcon,
  CheckIcon,
} from './Icons';

export function Toolbar({ fabricCanvas, onSave }) {
  const [activeTool, setActiveTool] = useState('select');
  const [color, setColor] = useState('#4F46E5');
  const [savedFeedback, setSavedFeedback] = useState(false);
  const colorInputRef = useRef(null);

  const handleSaveClick = useCallback(async () => {
    if (onSave) {
      try {
        await onSave();
        setSavedFeedback(true);
        setTimeout(() => setSavedFeedback(false), 1500);
      } catch (e) {
        console.warn('Save failed:', e);
      }
    }
  }, [onSave]);

  const handleCustomShapeComplete = useCallback(() => {
    setActiveTool('select');
  }, []);

  useCustomShapeTool(
    fabricCanvas,
    activeTool === 'custom',
    handleCustomShapeComplete,
    color
  );

  const deleteActiveObject = useCallback(() => {
    if (!fabricCanvas) return;
    const activeObjects = fabricCanvas.getActiveObjects();
    if (activeObjects && activeObjects.length > 0) {
      fabricCanvas.discardActiveObject();
      activeObjects.forEach((obj) => fabricCanvas.remove(obj));
      fabricCanvas.requestRenderAll();
    }
  }, [fabricCanvas]);

  const duplicateActiveObject = useCallback(async () => {
    if (!fabricCanvas) return;
    const activeObj = fabricCanvas.getActiveObject();
    if (!activeObj) return;

    const cloned = await activeObj.clone();
    fabricCanvas.discardActiveObject();
    cloned.set({
      left: (cloned.left || 0) + 10,
      top: (cloned.top || 0) + 10,
      evented: true,
    });
    if (cloned.type === 'activeSelection') {
      cloned.canvas = fabricCanvas;
      cloned.forEachObject((obj) => {
        fabricCanvas.add(obj);
      });
      cloned.setCoordinates();
    } else {
      fabricCanvas.add(cloned);
    }
    fabricCanvas.setActiveObject(cloned);
    fabricCanvas.requestRenderAll();
  }, [fabricCanvas]);

  const setTool = useCallback(
    (tool) => {
      if (!fabricCanvas) return;
      setActiveTool(tool);

      if (tool === 'pen') {
        if (!fabricCanvas.freeDrawingBrush && fabric.PencilBrush) {
          fabricCanvas.freeDrawingBrush = new fabric.PencilBrush(fabricCanvas);
        }
        fabricCanvas.isDrawingMode = true;
        if (fabricCanvas.freeDrawingBrush) {
          fabricCanvas.freeDrawingBrush.color = color;
          fabricCanvas.freeDrawingBrush.width = 3;
        }
      } else {
        fabricCanvas.isDrawingMode = false;
      }
    },
    [fabricCanvas, color]
  );

  const handleColorChange = (e) => {
    const newColor = e.target.value;
    setColor(newColor);
    if (fabricCanvas && fabricCanvas.freeDrawingBrush) {
      fabricCanvas.freeDrawingBrush.color = newColor;
    }
    const activeObj = fabricCanvas?.getActiveObject();
    if (activeObj) {
      if (activeObj.type === 'line') {
        activeObj.set('stroke', newColor);
      } else {
        activeObj.set('fill', newColor);
      }
      fabricCanvas.requestRenderAll();
    }
  };

  const addRectangle = () => {
    if (!fabricCanvas) return;
    fabricCanvas.isDrawingMode = false;
    setActiveTool('select');
    const rect = new fabric.Rect({
      left: 120,
      top: 120,
      fill: color || '#4F46E5',
      width: 120,
      height: 80,
    });
    fabricCanvas.add(rect);
    fabricCanvas.setActiveObject(rect);
    fabricCanvas.requestRenderAll();
  };

  const addCircle = () => {
    if (!fabricCanvas) return;
    fabricCanvas.isDrawingMode = false;
    setActiveTool('select');
    const circle = new fabric.Circle({
      left: 150,
      top: 150,
      fill: color || '#4F46E5',
      radius: 50,
    });
    fabricCanvas.add(circle);
    fabricCanvas.setActiveObject(circle);
    fabricCanvas.requestRenderAll();
  };

  const addTriangle = () => {
    if (!fabricCanvas) return;
    fabricCanvas.isDrawingMode = false;
    setActiveTool('select');
    const triangle = new fabric.Triangle({
      left: 180,
      top: 180,
      fill: color || '#4F46E5',
      width: 100,
      height: 100,
    });
    fabricCanvas.add(triangle);
    fabricCanvas.setActiveObject(triangle);
    fabricCanvas.requestRenderAll();
  };

  const addLine = () => {
    if (!fabricCanvas) return;
    fabricCanvas.isDrawingMode = false;
    setActiveTool('select');
    const line = new fabric.Line([50, 50, 200, 200], {
      left: 200,
      top: 200,
      stroke: color || '#4F46E5',
      strokeWidth: 3,
    });
    fabricCanvas.add(line);
    fabricCanvas.setActiveObject(line);
    fabricCanvas.requestRenderAll();
  };

  const addText = () => {
    if (!fabricCanvas) return;
    fabricCanvas.isDrawingMode = false;
    setActiveTool('select');
    const center = fabricCanvas.getCenterPoint?.() || {
      x: (fabricCanvas.width || 800) / 2,
      y: (fabricCanvas.height || 600) / 2,
    };
    const textbox = new fabric.Textbox('Text', {
      left: Math.max(60, center.x - 40),
      top: Math.max(60, center.y - 15),
      fill: color || '#4F46E5',
      fontSize: 22,
    });
    fabricCanvas.add(textbox);
    fabricCanvas.setActiveObject(textbox);
    if (typeof textbox.enterEditing === 'function') {
      textbox.enterEditing();
      if (typeof textbox.selectAll === 'function') {
        textbox.selectAll();
      }
    }
    fabricCanvas.requestRenderAll();
  };

  useEffect(() => {
    if (!fabricCanvas) return;

    const handleKeyDown = (e) => {
      const activeEl = document.activeElement;
      const isInputFocused =
        activeEl &&
        (activeEl.tagName === 'INPUT' ||
          activeEl.tagName === 'TEXTAREA' ||
          activeEl.isContentEditable);

      const activeObj = fabricCanvas.getActiveObject();
      const isEditingText = activeObj && activeObj.isEditing;

      if (isInputFocused || isEditingText) return;

      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        deleteActiveObject();
      } else if ((e.ctrlKey || e.metaKey) && (e.key === 's' || e.key === 'S')) {
        e.preventDefault();
        handleSaveClick();
      } else if ((e.ctrlKey || e.metaKey) && (e.key === 'd' || e.key === 'D')) {
        e.preventDefault();
        duplicateActiveObject();
      } else if (e.key === 'v' || e.key === 'V') {
        setTool('select');
      } else if (e.key === 'r' || e.key === 'R') {
        addRectangle();
      } else if (e.key === 'c' || e.key === 'C') {
        addCircle();
      } else if (e.key === 'l' || e.key === 'L') {
        addLine();
      } else if (e.key === 't' || e.key === 'T') {
        addText();
      } else if (e.key === 'p' || e.key === 'P') {
        setTool('pen');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [fabricCanvas, setTool, deleteActiveObject, duplicateActiveObject, handleSaveClick]);

  return (
    <nav className="floating-toolbar" aria-label="Drawing tools">
      {/* Save */}
      <button
        className={`floating-tool-btn save-tool-btn ${savedFeedback ? 'saved' : ''}`}
        onClick={handleSaveClick}
        data-tooltip={savedFeedback ? 'Saved!' : 'Save (Ctrl+S)'}
        aria-label="Save canvas"
      >
        {savedFeedback ? <CheckIcon size={16} /> : <SaveIcon size={18} />}
      </button>

      <div className="toolbar-separator" />

      {/* Selection */}
      <button
        className={`floating-tool-btn ${activeTool === 'select' ? 'active' : ''}`}
        onClick={() => setTool('select')}
        data-tooltip="Select (V)"
        aria-label="Select"
      >
        <CursorIcon />
      </button>

      <div className="toolbar-separator" />

      {/* Shapes */}
      <button
        className="floating-tool-btn"
        onClick={addRectangle}
        data-tooltip="Rectangle (R)"
        aria-label="Rectangle"
      >
        <SquareIcon />
      </button>

      <button
        className="floating-tool-btn"
        onClick={addCircle}
        data-tooltip="Circle (C)"
        aria-label="Circle"
      >
        <CircleIcon />
      </button>

      <button
        className="floating-tool-btn"
        onClick={addTriangle}
        data-tooltip="Triangle"
        aria-label="Triangle"
      >
        <TriangleIcon />
      </button>

      <button
        className="floating-tool-btn"
        onClick={addLine}
        data-tooltip="Line (L)"
        aria-label="Line"
      >
        <LineIcon />
      </button>

      <button
        className={`floating-tool-btn ${activeTool === 'custom' ? 'active' : ''}`}
        onClick={() => setTool('custom')}
        data-tooltip="Custom Shape"
        aria-label="Custom Shape"
      >
        <PolygonIcon />
      </button>

      <div className="toolbar-separator" />

      {/* Text & Pen */}
      <button
        className="floating-tool-btn"
        onClick={addText}
        data-tooltip="Text (T)"
        aria-label="Text"
      >
        <TypeIcon />
      </button>

      <button
        className={`floating-tool-btn ${activeTool === 'pen' ? 'active' : ''}`}
        onClick={() => setTool('pen')}
        data-tooltip="Pen (P)"
        aria-label="Pen"
      >
        <PencilIcon />
      </button>

      <div className="toolbar-separator" />

      {/* Color Swatch Button */}
      <button
        className="floating-tool-btn color-btn"
        onClick={() => colorInputRef.current?.click()}
        data-tooltip="Color"
        aria-label="Change color"
      >
        <span className="color-preview-dot" style={{ backgroundColor: color }} />
        <input
          ref={colorInputRef}
          type="color"
          value={color}
          onChange={handleColorChange}
          className="hidden-color-input"
          aria-hidden="true"
        />
      </button>

      {/* Delete */}
      <button
        className="floating-tool-btn delete-btn"
        onClick={deleteActiveObject}
        data-tooltip="Delete (Del)"
        aria-label="Delete selected object"
      >
        <TrashIcon />
      </button>
    </nav>
  );
}
