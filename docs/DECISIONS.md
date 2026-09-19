# Architecture Decision Records (ADRs)

This document records key architectural, engineering, and design decisions made in the development of **2D Canvas Editor (`canvas2D`)**.

---

## ADR-001: Selection of Fabric.js v7 over Raw HTML5 2D Canvas API

### Context
When building a rich 2D vector editor requiring interactive object manipulation (selection, scaling, rotation, z-index ordering, text editing, and JSON serialization), raw HTML5 `<canvas>` 2D Context API requires custom hit-testing algorithms, manual spatial indices, transform matrix tracking, and re-rendering loops.

### Decision
We chose **Fabric.js `v7.4.0`** as the core vector graphics rendering engine.

### Rationale
- **Object-Oriented Model:** Fabric wraps canvas primitives (`Rect`, `Circle`, `Triangle`, `Line`, `Polygon`, `Textbox`, `ActiveSelection`) into self-contained objects with built-in control handles.
- **Scene-Graph & Serialization:** Fabric provides native bidirectional serialization to and from JSON (`canvas.toJSON()` / `canvas.loadFromJSON()`), eliminating custom parser boilerplate.
- **Scene Point Resolution:** Fabric v6+ provides `canvas.getScenePoint(e)` which maps screen pixels directly to true scene coordinates regardless of pan/zoom transformations.
- **Selection Management:** Standardizes multi-selection bounds (`ActiveSelection`) and object transformations without manual bounding-box recalculations.

---

## ADR-002: Dual-Layer Offline-First Persistence with Cloud Fallback Race

### Context
Users require instant UI response when editing vector graphics. Remote database round-trips (Firestore writes) add network latency (100ms–2000ms) and can fail when offline or under poor network conditions. Conversely, relying solely on `localStorage` limits accessibility across devices.

### Decision
We implemented a **Dual-Layer Persistence Strategy** in `useCanvasPersistence.js`:
1. **Synchronous Local Cache:** `canvas.toJSON()` is written directly to `localStorage` under `canvas_${canvasId}` immediately.
2. **Asynchronous Cloud Sync with Timeout Race:** Firestore `setDoc()` is executed concurrently and raced against a `4-second` rejection timer via `Promise.race()`.

```javascript
const firestorePromise = setDoc(docRef, { data: sanitizedData, name: currentName, updatedAt: nowStr }, { merge: true });
const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('Firestore timeout')), 4000));
await Promise.race([firestorePromise, timeoutPromise]);
```

### Consequences
- **Instant Save Feedback:** Saves complete immediately without waiting for server response.
- **Offline Resilience:** If network drops or Firebase config is uninitialized, the app gracefully swallows cloud errors and falls back to local data.
- **No Freezing:** UI never hangs due to unhandled promise hangs or cloud timeouts.

---

## ADR-003: Custom Polygon Tool with Magnetic Snapping & Micro-Click Filter

### Context
Drawing custom polygons via vertex clicking presents two classic UX issues:
1. **Unclosed Shape Residue:** Users struggle to click the exact pixel of the first vertex to close a polygon, creating tiny unwanted offset lines.
2. **Micro-Click Artifacts:** Double-clicking or clicking twice in rapid succession creates zero-length edge segments (e.g. vertices separated by `< 4px`).

### Decision
In `useCustomShapeTool.js`, we established two explicit constraints:
1. **Magnetic Start-Point Snapping (16px Radius):** When at least 3 vertices exist and cursor is within 16px of vertex 0 (`pts[0]`), the rubber-band endpoint automatically locks to `pts[0]` and the start node turns green with a pointer cursor. Clicking within this radius triggers `finishPolygon()` without adding a new point.
2. **Micro-Click Distance Gate:** Mouse clicks occurring within 4px of the preceding vertex are filtered out (`Math.hypot(dx, dy) < 4`).

### Consequences
- Polygon edges close cleanly with 0 corner artifacts.
- Zero-length line segment bugs are eliminated.

---

## ADR-004: Client-Side Optimistic Canvas ID Generation

### Context
When creating a new document on the dashboard or topbar dropdown, blocking navigation until Firebase responds with a generated document ID causes noticeable button-click lag.

### Decision
In `Home.jsx` and `CanvasEditor.jsx`, client-side ID generation is performed optimistically using Firebase's client SDK:

```javascript
const newDocRef = doc(collection(db, 'canvases'));
const canvasId = newDocRef.id; // Generates unique client UUID immediately
saveRecentCanvas({ id: canvasId, name: 'Untitled', updatedAt: nowStr });
setDoc(newDocRef, { name: 'Untitled', createdAt: serverTimestamp() }).catch(() => {});
navigate(`/canvas/${canvasId}`);
```

### Consequences
- Page route transition is instantaneous (`0ms` wait time).
- Firestore background write is fired asynchronously with a swallowed catch handler so offline users face no blocking UI modal.

---

## ADR-005: Dimension Stripping for Dynamic Viewport Resizing

### Context
`canvas.toJSON()` includes root `width` and `height` properties based on the device screen size where the canvas was last edited. Restoring these fixed dimensions on a device with a different screen resolution causes canvas distortion or unwanted scrollbars.

### Decision
Before persisting canvas JSON to storage, root `width` and `height` properties are explicitly deleted:

```javascript
const rawJson = canvas.toJSON();
delete rawJson.width;
delete rawJson.height;
```

Upon loading, `useFabricCanvas` and `useCanvasPersistence` observe the container container dimensions via `ResizeObserver` and invoke `fabricCanvas.setDimensions({ width, height })`.

### Consequences
- Canvases scale seamlessly to fit any display resolution or container width without clipping or stretching vector elements.

---

## ADR-006: Global Input Shielding for Keyboard Shortcuts

### Context
Design tool hotkeys (`V` for select, `T` for text, `Del` for delete) conflict with standard text entry. If a user types the letter "t" inside a text box or title input, global hotkey handlers must not execute canvas commands.

### Decision
In `Toolbar.jsx`, hotkey evaluation enforces strict input shielding:

```javascript
const activeEl = document.activeElement;
const isInputFocused = activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA' || activeEl.isContentEditable);
const activeObj = fabricCanvas.getActiveObject();
const isEditingText = activeObj && activeObj.isEditing;

if (isInputFocused || isEditingText) return;
```

### Consequences
- Prevents accidental object deletion or tool switches while editing canvas textboxes or document titles.

---

## ADR-007: React 18/19 StrictMode Lifecycle & Fabric Teardown Guard

### Context
React 18+ StrictMode mounts, unmounts, and re-mounts components in development mode to catch side-effect bugs. Fabric.js creates DOM wrapper elements (`canvas-container`) around the target `<canvas>`. Double-initialization creates duplicate canvas elements and memory leaks.

### Decision
`useFabricCanvas.js` enforces a ref-based initialization guard (`isInitializedRef`) and clean teardown in `useEffect`:

```javascript
const isInitializedRef = useRef(false);
// ...
return () => {
  if (fabricCanvasRef.current) {
    fabricCanvasRef.current.dispose();
    fabricCanvasRef.current = null;
  }
  isInitializedRef.current = false;
};
```

### Consequences
- Guarantees single Canvas instance per DOM node.
- Eliminates memory leaks and orphaned Fabric wrappers upon route teardown.
