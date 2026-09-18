import { useEffect, useRef } from 'react';
import * as fabric from 'fabric';

export function useCustomShapeTool(fabricCanvas, isActive, onComplete, color = '#800020') {
  const pointsRef = useRef([]);
  const tempObjectsRef = useRef([]);
  const rubberBandRef = useRef(null);

  useEffect(() => {
    if (!fabricCanvas || !isActive) return;

    fabricCanvas.defaultCursor = 'crosshair';
    fabricCanvas.selection = false;

    const cleanupTempObjects = () => {
      tempObjectsRef.current.forEach((obj) => fabricCanvas.remove(obj));
      tempObjectsRef.current = [];
      if (rubberBandRef.current) {
        fabricCanvas.remove(rubberBandRef.current);
        rubberBandRef.current = null;
      }
      pointsRef.current = [];
      fabricCanvas.requestRenderAll();
    };

    const finishPolygon = () => {
      const pts = pointsRef.current;
      if (pts.length >= 3) {
        const polygon = new fabric.Polygon(pts, {
          fill: color,
          stroke: color,
          strokeWidth: 1,
        });
        fabricCanvas.add(polygon);
        fabricCanvas.setActiveObject(polygon);
      }
      cleanupTempObjects();
      fabricCanvas.defaultCursor = 'default';
      fabricCanvas.selection = true;
      onComplete?.();
    };

    const handleMouseDown = (options) => {
      const evt = options.e;
      if (evt.button === 2) {
        evt.preventDefault();
        finishPolygon();
        return;
      }

      const pointer = fabricCanvas.getPointer
        ? fabricCanvas.getPointer(evt)
        : { x: evt.offsetX, y: evt.offsetY };

      const newPoint = { x: pointer.x, y: pointer.y };
      const pts = pointsRef.current;

      const marker = new fabric.Circle({
        left: newPoint.x - 3,
        top: newPoint.y - 3,
        radius: 3,
        fill: '#ef4444',
        selectable: false,
        evented: false,
      });
      fabricCanvas.add(marker);
      tempObjectsRef.current.push(marker);

      if (pts.length > 0) {
        const lastPt = pts[pts.length - 1];
        const seg = new fabric.Line([lastPt.x, lastPt.y, newPoint.x, newPoint.y], {
          stroke: color,
          strokeWidth: 2,
          selectable: false,
          evented: false,
        });
        fabricCanvas.add(seg);
        tempObjectsRef.current.push(seg);
      }

      pts.push(newPoint);
      fabricCanvas.requestRenderAll();
    };

    const handleMouseMove = (options) => {
      const pts = pointsRef.current;
      if (pts.length === 0) return;

      const evt = options.e;
      const pointer = fabricCanvas.getPointer
        ? fabricCanvas.getPointer(evt)
        : { x: evt.offsetX, y: evt.offsetY };

      const lastPt = pts[pts.length - 1];

      if (rubberBandRef.current) {
        rubberBandRef.current.set({
          x1: lastPt.x,
          y1: lastPt.y,
          x2: pointer.x,
          y2: pointer.y,
        });
      } else {
        const rubberLine = new fabric.Line([lastPt.x, lastPt.y, pointer.x, pointer.y], {
          stroke: color,
          strokeWidth: 1,
          strokeDashArray: [4, 4],
          selectable: false,
          evented: false,
        });
        rubberBandRef.current = rubberLine;
        fabricCanvas.add(rubberLine);
      }
      fabricCanvas.requestRenderAll();
    };

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        finishPolygon();
      }
    };

    const handleContextMenu = (e) => {
      e.preventDefault();
      finishPolygon();
    };

    fabricCanvas.on('mouse:down', handleMouseDown);
    fabricCanvas.on('mouse:move', handleMouseMove);
    window.addEventListener('keydown', handleKeyDown);

    const canvasWrapper = fabricCanvas.upperCanvasEl || fabricCanvas.getElement();
    canvasWrapper?.addEventListener('contextmenu', handleContextMenu);

    return () => {
      fabricCanvas.off('mouse:down', handleMouseDown);
      fabricCanvas.off('mouse:move', handleMouseMove);
      window.removeEventListener('keydown', handleKeyDown);
      canvasWrapper?.removeEventListener('contextmenu', handleContextMenu);

      cleanupTempObjects();
      fabricCanvas.defaultCursor = 'default';
      fabricCanvas.selection = true;
    };
  }, [fabricCanvas, isActive, color, onComplete]);
}
