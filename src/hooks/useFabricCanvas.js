import { useEffect, useState, useRef } from 'react';
import * as fabric from 'fabric';

export function useFabricCanvas(canvasRef, containerRef) {
  const [fabricCanvas, setFabricCanvas] = useState(null);
  const isInitializedRef = useRef(false);

  useEffect(() => {
    if (isInitializedRef.current) return;
    if (!canvasRef.current || !containerRef.current) return;

    isInitializedRef.current = true;

    const container = containerRef.current;
    const canvasEl = canvasRef.current;

    const initialWidth = container.clientWidth || 800;
    const initialHeight = container.clientHeight || 600;

    const canvas = new fabric.Canvas(canvasEl, {
      width: initialWidth,
      height: initialHeight,
      backgroundColor: 'transparent',
      selection: true,
      preserveObjectStacking: true,
    });

    if (fabric.PencilBrush) {
      canvas.freeDrawingBrush = new fabric.PencilBrush(canvas);
      canvas.freeDrawingBrush.color = '#800020';
      canvas.freeDrawingBrush.width = 4;
    }

    setFabricCanvas(canvas);

    const handleResize = () => {
      if (containerRef.current && canvas) {
        const width = containerRef.current.clientWidth;
        const height = containerRef.current.clientHeight;
        if (width > 0 && height > 0) {
          canvas.setDimensions({ width, height });
          canvas.renderAll();
        }
      }
    };

    const resizeObserver = new ResizeObserver(() => {
      handleResize();
    });

    resizeObserver.observe(container);

    return () => {
      resizeObserver.disconnect();
      canvas.dispose();
      isInitializedRef.current = false;
      setFabricCanvas(null);
    };
  }, []);

  return fabricCanvas;
}
