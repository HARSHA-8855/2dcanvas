import { useState, useEffect, useCallback } from 'react';

function toHexColor(color) {
  if (!color || typeof color !== 'string') return '#800020';
  if (color.startsWith('#')) {
    if (color.length === 4) {
      return `#${color[1]}${color[1]}${color[2]}${color[2]}${color[3]}${color[3]}`;
    }
    return color.slice(0, 7);
  }
  try {
    const ctx = document.createElement('canvas').getContext('2d');
    ctx.fillStyle = color;
    const hex = ctx.fillStyle;
    if (hex && hex.startsWith('#')) return hex;
  } catch (e) {
    // fallback
  }
  return '#800020';
}

export function PropertiesPanel({ fabricCanvas }) {
  const [activeObject, setActiveObject] = useState(null);
  const [fillColor, setFillColor] = useState('#800020');
  const [isBold, setIsBold] = useState(false);
  const [isItalic, setIsItalic] = useState(false);
  const [fontSize, setFontSize] = useState('24');
  const [isTextObject, setIsTextObject] = useState(false);

  const syncProperties = useCallback(() => {
    if (!fabricCanvas) return;

    const active = fabricCanvas.getActiveObject();
    if (!active) {
      setActiveObject(null);
      return;
    }

    setActiveObject(active);

    const targetObj =
      active.type === 'activeSelection' && active.getObjects
        ? active.getObjects()[0]
        : active;

    if (!targetObj) return;

    const rawColor = targetObj.type === 'line' ? targetObj.stroke : targetObj.fill;
    setFillColor(toHexColor(rawColor));

    const isText =
      targetObj.type === 'text' ||
      targetObj.type === 'i-text' ||
      targetObj.type === 'textbox' ||
      Boolean(targetObj.text);

    setIsTextObject(isText);

    if (isText) {
      const styleObj =
        targetObj.isEditing && targetObj.getSelectionStyles
          ? targetObj.getSelectionStyles()[0] || {}
          : {};

      const currentWeight = styleObj.fontWeight || targetObj.fontWeight;
      const currentStyle = styleObj.fontStyle || targetObj.fontStyle;
      const currentSize = styleObj.fontSize || targetObj.fontSize;

      const boldState =
        currentWeight === 'bold' ||
        currentWeight === 700 ||
        currentWeight === '700';

      const italicState =
        currentStyle === 'italic' || currentStyle === 'oblique';

      setIsBold(boldState);
      setIsItalic(italicState);
      setFontSize(String(currentSize || 24));
    }
  }, [fabricCanvas]);

  useEffect(() => {
    if (!fabricCanvas) return;

    fabricCanvas.on('selection:created', syncProperties);
    fabricCanvas.on('selection:updated', syncProperties);
    fabricCanvas.on('selection:cleared', syncProperties);
    fabricCanvas.on('object:modified', syncProperties);
    fabricCanvas.on('object:scaling', syncProperties);
    fabricCanvas.on('text:selection:changed', syncProperties);
    fabricCanvas.on('text:changed', syncProperties);

    syncProperties();

    return () => {
      fabricCanvas.off('selection:created', syncProperties);
      fabricCanvas.off('selection:updated', syncProperties);
      fabricCanvas.off('selection:cleared', syncProperties);
      fabricCanvas.off('object:modified', syncProperties);
      fabricCanvas.off('object:scaling', syncProperties);
      fabricCanvas.off('text:selection:changed', syncProperties);
      fabricCanvas.off('text:changed', syncProperties);
    };
  }, [fabricCanvas, syncProperties]);

  if (!activeObject) return null;

  const handleColorChange = (e) => {
    const newColor = e.target.value;
    setFillColor(newColor);

    const objects =
      activeObject.type === 'activeSelection' && activeObject.getObjects
        ? activeObject.getObjects()
        : [activeObject];

    objects.forEach((obj) => {
      if (obj.type === 'line') {
        obj.set('stroke', newColor);
      } else {
        obj.set('fill', newColor);
      }
      if (obj.isEditing && typeof obj.setSelectionStyles === 'function') {
        obj.setSelectionStyles({ fill: newColor });
      }
    });

    fabricCanvas.requestRenderAll();
  };

  const handleBoldToggle = () => {
    const newWeight = isBold ? 'normal' : 'bold';
    const objects =
      activeObject.type === 'activeSelection' && activeObject.getObjects
        ? activeObject.getObjects()
        : [activeObject];

    objects.forEach((obj) => {
      obj.set('fontWeight', newWeight);
      if (obj.isEditing && typeof obj.setSelectionStyles === 'function') {
        obj.setSelectionStyles({ fontWeight: newWeight });
      }
    });

    setIsBold(!isBold);
    fabricCanvas.requestRenderAll();
  };

  const handleItalicToggle = () => {
    const newStyle = isItalic ? 'normal' : 'italic';
    const objects =
      activeObject.type === 'activeSelection' && activeObject.getObjects
        ? activeObject.getObjects()
        : [activeObject];

    objects.forEach((obj) => {
      obj.set('fontStyle', newStyle);
      if (obj.isEditing && typeof obj.setSelectionStyles === 'function') {
        obj.setSelectionStyles({ fontStyle: newStyle });
      }
    });

    setIsItalic(!isItalic);
    fabricCanvas.requestRenderAll();
  };

  const handleFontSizeChange = (e) => {
    const valStr = e.target.value;
    setFontSize(valStr);

    if (valStr !== '') {
      const num = parseInt(valStr, 10);
      if (!isNaN(num) && num > 0) {
        const objects =
          activeObject.type === 'activeSelection' && activeObject.getObjects
            ? activeObject.getObjects()
            : [activeObject];

        objects.forEach((obj) => {
          obj.set('fontSize', num);
          if (obj.isEditing && typeof obj.setSelectionStyles === 'function') {
            obj.setSelectionStyles({ fontSize: num });
          }
        });

        fabricCanvas.requestRenderAll();
      }
    }
  };

  return (
    <div className="properties-panel">
      <div className="property-group">
        <label className="property-label">Color</label>
        <input
          type="color"
          value={fillColor}
          onChange={handleColorChange}
          className="color-input"
        />
      </div>

      {isTextObject && (
        <>
          <div className="property-group">
            <label className="property-label">Style</label>
            <button
              className={`prop-button ${isBold ? 'active' : ''}`}
              onClick={handleBoldToggle}
              title="Bold"
              type="button"
            >
              B
            </button>
            <button
              className={`prop-button ${isItalic ? 'active' : ''}`}
              onClick={handleItalicToggle}
              title="Italic"
              type="button"
            >
              I
            </button>
          </div>

          <div className="property-group">
            <label className="property-label">Size</label>
            <input
              type="number"
              min="8"
              max="200"
              value={fontSize}
              onChange={handleFontSizeChange}
              className="number-input"
            />
          </div>
        </>
      )}
    </div>
  );
}
