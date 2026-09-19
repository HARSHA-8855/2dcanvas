import { useEffect, useRef } from 'react';
import * as fabric from 'fabric';

const SNAP_RADIUS = 16;

export function useCustomShapeTool(fabricCanvas, isActive, onComplete, color = '#800020') {
  const pointsRef = useRef([]);
  const tempObjectsRef = useRef([]);
  const rubberBandRef = useRef(null);
  const startMarkerRef = useRef(null);

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
      startMarkerRef.current = null;
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

    const getPointerCoords = (evt) => {
      if (fabricCanvas.getScenePoint) {
        return fabricCanvas.getScenePoint(evt);
      }
      if (fabricCanvas.getPointer) {
        return fabricCanvas.getPointer(evt);
      }
      return { x: evt.offsetX, y: evt.offsetY };
    };

    const handleMouseDown = (options) => {
      const evt = options.e;
      if (evt.button === 2) {
        evt.preventDefault();
        finishPolygon();
        return;
      }

      const pointer = getPointerCoords(evt);
      const pts = pointsRef.current;

      // If we have at least 3 points and the user clicks on/near the start point, close cleanly!
      if (pts.length >= 3) {
        const startPt = pts[0];
        const distToStart = Math.hypot(pointer.x - startPt.x, pointer.y - startPt.y);
        if (distToStart <= SNAP_RADIUS) {
          finishPolygon();
          return;
        }
      }

      // Avoid creating micro-duplicate points if clicking the exact same position
      if (pts.length > 0) {
        const lastPt = pts[pts.length - 1];
        if (Math.hypot(pointer.x - lastPt.x, pointer.y - lastPt.y) < 4) {
          return;
        }
      }

      const newPoint = { x: Math.round(pointer.x), y: Math.round(pointer.y) };

      if (pts.length === 0) {
        // Create prominent, interactive start marker
        const startMarker = new fabric.Circle({
          left: newPoint.x - 6,
          top: newPoint.y - 6,
          radius: 6,
          fill: '#4F46E5',
          stroke: '#ffffff',
          strokeWidth: 2,
          selectable: false,
          evented: false,
        });
        startMarkerRef.current = startMarker;
        fabricCanvas.add(startMarker);
        tempObjectsRef.current.push(startMarker);
      } else {
        // Intermediate vertex marker
        const marker = new fabric.Circle({
          left: newPoint.x - 4,
          top: newPoint.y - 4,
          radius: 4,
          fill: '#6366F1',
          stroke: '#ffffff',
          strokeWidth: 1.5,
          selectable: false,
          evented: false,
        });
        fabricCanvas.add(marker);
        tempObjectsRef.current.push(marker);

        // Line connecting previous point to new point
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
      const pointer = getPointerCoords(evt);
      const lastPt = pts[pts.length - 1];

      let targetX = pointer.x;
      let targetY = pointer.y;

      // Check if cursor is hovering near start point (only active if >= 3 points placed)
      if (pts.length >= 3) {
        const startPt = pts[0];
        const distToStart = Math.hypot(pointer.x - startPt.x, pointer.y - startPt.y);

        if (distToStart <= SNAP_RADIUS) {
          // Snap rubber band directly to start point!
          targetX = startPt.x;
          targetY = startPt.y;
          fabricCanvas.defaultCursor = 'pointer';

          if (startMarkerRef.current) {
            startMarkerRef.current.set({
              left: startPt.x - 8,
              top: startPt.y - 8,
              radius: 8,
              fill: '#10B981', // green snap indicator (click to close)
              stroke: '#ffffff',
              strokeWidth: 2.5,
            });
          }
        } else {
          fabricCanvas.defaultCursor = 'crosshair';
          if (startMarkerRef.current) {
            startMarkerRef.current.set({
              left: startPt.x - 6,
              top: startPt.y - 6,
              radius: 6,
              fill: '#4F46E5',
              stroke: '#ffffff',
              strokeWidth: 2,
            });
          }
        }
      }

      if (rubberBandRef.current) {
        rubberBandRef.current.set({
          x1: lastPt.x,
          y1: lastPt.y,
          x2: targetX,
          y2: targetY,
        });
      } else {
        const rubberLine = new fabric.Line([lastPt.x, lastPt.y, targetX, targetY], {
          stroke: color,
          strokeWidth: 1.5,
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
      if (e.key === 'Escape' || e.key === 'Enter') {
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
