import { useEffect, useState, useRef, useCallback } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { saveRecentCanvas } from '../lib/recentCanvases';

export function useCanvasPersistence(fabricCanvas, canvasId, containerRef) {
  const [saveStatus, setSaveStatus] = useState('saved');
  const [errorMessage, setErrorMessage] = useState('');
  const [canvasName, setCanvasName] = useState('Untitled');
  const timerRef = useRef(null);
  const isLoadingRef = useRef(true);
  const nameRef = useRef(canvasName);
  const loadedCanvasIdRef = useRef(null);
  const fabricRef = useRef(fabricCanvas);

  fabricRef.current = fabricCanvas;
  nameRef.current = canvasName;

  const save = useCallback(async () => {
    const canvas = fabricRef.current;
    if (!canvas || !canvasId) return;

    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    setSaveStatus('saving');
    setErrorMessage('');

    try {
      const rawJson = canvas.toJSON();
      delete rawJson.width;
      delete rawJson.height;

      const sanitizedData = JSON.stringify(rawJson);
      const currentName = nameRef.current || 'Untitled';
      const nowStr = new Date().toISOString();

      try {
        localStorage.setItem(`canvas_${canvasId}`, sanitizedData);
        saveRecentCanvas({ id: canvasId, name: currentName, updatedAt: nowStr });
      } catch (e) {
        console.warn('localStorage save warning:', e);
      }

      const docRef = doc(db, 'canvases', canvasId);
      const firestorePromise = setDoc(
        docRef,
        {
          data: sanitizedData,
          name: currentName,
          updatedAt: nowStr,
        },
        { merge: true }
      );

      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Firestore timeout')), 4000)
      );

      await Promise.race([firestorePromise, timeoutPromise]);
      setSaveStatus('saved');
    } catch (err) {
      console.warn('Firestore cloud save warning:', err);
      setSaveStatus('saved');
    }
  }, [canvasId]);

  const updateCanvasName = useCallback(
    (newName) => {
      const trimmed = newName.trim() || 'Untitled';
      setCanvasName(trimmed);
      nameRef.current = trimmed;
      const nowStr = new Date().toISOString();

      saveRecentCanvas({ id: canvasId, name: trimmed, updatedAt: nowStr });

      if (canvasId) {
        const docRef = doc(db, 'canvases', canvasId);
        setDoc(docRef, { name: trimmed, updatedAt: nowStr }, { merge: true }).catch(
          () => {}
        );
      }
    },
    [canvasId]
  );

  useEffect(() => {
    if (!fabricCanvas || !canvasId) return;
    if (loadedCanvasIdRef.current === canvasId) return;

    loadedCanvasIdRef.current = canvasId;
    let isMounted = true;
    isLoadingRef.current = true;

    const loadCanvasData = async () => {
      try {
        let loadedData = null;
        let loadedName = 'Untitled';

        const localData = localStorage.getItem(`canvas_${canvasId}`);
        if (localData) {
          try {
            loadedData = JSON.parse(localData);
          } catch (e) {
            console.warn('Local storage parse error:', e);
          }
        }

        try {
          const docRef = doc(db, 'canvases', canvasId);
          const fetchPromise = getDoc(docRef);
          const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Fetch timeout')), 3000)
          );

          const snapshot = await Promise.race([fetchPromise, timeoutPromise]);
          if (snapshot && snapshot.exists()) {
            const docData = snapshot.data();
            if (docData) {
              if (docData.name) {
                loadedName = docData.name;
              }
              if (docData.data) {
                loadedData =
                  typeof docData.data === 'string'
                    ? JSON.parse(docData.data)
                    : docData.data;
              }
            }
          }
        } catch (cloudErr) {
          console.warn('Cloud fetch fallback to local:', cloudErr);
        }

        if (isMounted) {
          setCanvasName(loadedName);
          saveRecentCanvas({
            id: canvasId,
            name: loadedName,
            updatedAt: new Date().toISOString(),
          });
        }

        if (isMounted && loadedData) {
          const res = fabricCanvas.loadFromJSON(loadedData);
          if (res && typeof res.then === 'function') {
            await res;
          }

          if (containerRef?.current) {
            const w = containerRef.current.clientWidth;
            const h = containerRef.current.clientHeight;
            if (w > 0 && h > 0) {
              fabricCanvas.setDimensions({ width: w, height: h });
            }
          }

          fabricCanvas.renderAll();
        }
      } catch (err) {
        console.error('Load error:', err);
        if (isMounted) {
          setErrorMessage('Failed to load canvas.');
          setSaveStatus('error');
        }
      } finally {
        if (isMounted) {
          setTimeout(() => {
            isLoadingRef.current = false;
          }, 200);
        }
      }
    };

    loadCanvasData();

    return () => {
      isMounted = false;
    };
  }, [fabricCanvas, canvasId, containerRef]);

  useEffect(() => {
    if (!fabricCanvas) return;

    const triggerAutoSave = () => {
      if (isLoadingRef.current) return;

      setSaveStatus('unsaved');

      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }

      timerRef.current = setTimeout(() => {
        save();
      }, 500);
    };

    fabricCanvas.on('object:added', triggerAutoSave);
    fabricCanvas.on('object:modified', triggerAutoSave);
    fabricCanvas.on('object:removed', triggerAutoSave);

    return () => {
      fabricCanvas.off('object:added', triggerAutoSave);
      fabricCanvas.off('object:modified', triggerAutoSave);
      fabricCanvas.off('object:removed', triggerAutoSave);

      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [fabricCanvas, save]);

  return { saveStatus, errorMessage, canvasName, updateCanvasName, save };
}
