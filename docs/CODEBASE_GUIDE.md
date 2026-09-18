# Codebase Architecture & Interview Prep Guide

Quick-reference guide to the architecture, state flows, and non-obvious implementation details across all modules in `src/`.

---

## 1. Pages & Root (`src/`)

### `src/App.jsx`
- **Responsibility:** Configures top-level client-side routing between the home dashboard and individual canvas editors.
- **Key Props / State:** None (stateless routing definition).
- **Non-Obvious Logic:**
  - Uses dynamic path parameter `/canvas/:canvasId` rather than query strings so canvas URLs can be directly shared and bookmarked.
  - Keeps routing minimal; canvas loading and initialization are pushed down to `CanvasEditor.jsx`.

### `src/Home.jsx`
- **Responsibility:** Renders the lightweight dashboard displaying recent canvas document tiles and an integrated "+ New" creation tile.
- **Key Props / State:**
  - State: `recentList` (cached canvases from localStorage), `isCreating` (in-flight creation flag), `errorMessage`, `copiedId` (transient copied tile ID).
- **Non-Obvious Logic:**
  - **Optimistic Creation:** Calls `doc(collection(db, 'canvases')).id` to generate a Firestore document ID on the client and saves metadata to localStorage *before* navigating, so route transition is instant without blocking on network latency.
  - Background sync pushes `{ name: 'Untitled', createdAt: serverTimestamp() }` to Firestore asynchronously with a swallowed catch handler so offline users can still proceed.

### `src/CanvasEditor.jsx`
- **Responsibility:** Main workspace page coordinating the artboard, floating toolbar, rulers, status bar, zoom controls, and canvas title editing.
- **Key Props / State:**
  - Props: None (extracts `canvasId` via `useParams()`).
  - State: `hasObjects` (toggles empty artboard guide), `isEditingTitle`/`titleInput` (inline document rename), `coords` (`{x, y}` cursor position), `isCopied` (share status), `zoomPercent`.
- **Non-Obvious Logic:**
  - **Scene vs. Screen Coordinates:** Calculates cursor position using Fabric v6's `fabricCanvas.getScenePoint(e)` (fallback to `getPointer(e)`) to ensure coordinates reflect true canvas space regardless of CSS zoom or pan offsets.
  - **Ruler Pointer Tracking:** Listens to both canvas `mouse:out` and artboard container `mouseleave` to clear `coords` to `null`, preventing frozen crosshair markers on the rulers when the cursor leaves the workspace.
  - **Centered Zoom:** Zooms around `fabricCanvas.getCenterPoint()` rather than `(0, 0)` so scaling remains intuitive relative to the visible viewport.
  - **Pre-navigation Flush:** When user triggers "New Canvas", `handleCreateNewCanvas` awaits `save()` to flush unpersisted edits before switching routes.

---

## 2. Components (`src/components/`)

### `src/components/Toolbar.jsx`
- **Responsibility:** Renders the floating drawing tool palette and manages tool switching, primitive shape creation, color updates, and keyboard shortcuts.
- **Key Props / State:**
  - Props: `fabricCanvas` (Fabric canvas instance).
  - State: `activeTool` (`'select' | 'custom' | 'pen'`), `color` (active fill/stroke hex).
- **Non-Obvious Logic:**
  - **Input Shielding on Hotkeys:** The global `keydown` listener explicitly verifies `document.activeElement` is not an `<input>`, `<textarea>`, or contentEditable element, and ensures `activeObj.isEditing` is false before executing hotkeys (`V`, `R`, `C`, `T`, `P`, `Del`, `Ctrl+D`) to prevent typing conflicts.
  - **PencilBrush Binding:** Fabric freehand drawing requires both `canvas.isDrawingMode = true` and `canvas.freeDrawingBrush = new fabric.PencilBrush(canvas)`. If the brush instance is missing, freehand input will not register.
  - **ActiveSelection Duplication:** To clone a multi-selection (`activeSelection`), the clone must re-parent objects to the canvas individually and invoke `setCoordinates()` so selection bounding boxes don't desynchronize.

### `src/components/PropertiesPanel.jsx`
- **Responsibility:** Contextual inspector that binds to the selected canvas object to adjust fill/stroke color, font style (bold/italic), and font size.
- **Key Props / State:**
  - Props: `fabricCanvas`.
  - State: `activeObject`, `fillColor`, `isBold`, `isItalic`, `fontSize`, `isTextObject`.
- **Non-Obvious Logic:**
  - **Color Normalization via 2D Context:** Uses a dummy canvas 2D context (`ctx.fillStyle = color; return ctx.fillStyle`) to convert arbitrary named CSS strings (e.g. `blue`, `rgb(...)`) to standard `#rrggbb` hex formats required by native `<input type="color">`.
  - **Selection Style Inheritance:** Checks `obj.isEditing` and applies changes via `obj.setSelectionStyles()` as well as top-level properties so that highlighted text substrings update correctly inside textboxes.
  - **Comprehensive Event Sync:** Subscribes to 7 distinct Fabric events (`selection:*`, `object:modified`, `object:scaling`, `text:*`) to ensure property inputs update when shapes are resized, edited, or transformed externally.

### `src/components/CanvasRulers.jsx`
- **Responsibility:** Renders SVG pixel coordinate rulers along the top and left edges of the canvas container with mouse tracker lines.
- **Key Props / State:**
  - Props: `containerRef` (artboard container ref), `coords` (`{x, y}` cursor position or `null`).
  - State: `dimensions` (`{ width, height }`).
- **Non-Obvious Logic:**
  - Uses a `ResizeObserver` attached to `containerRef` to dynamically measure container client dimensions, ensuring ruler ticks match the exact rendered width/height without requiring hardcoded aspect ratios.
  - Tracker lines (`coords.x` on top ruler, `coords.y` on left ruler) only render when values fall within bounds `[0, width]` and `[0, height]` to prevent SVG overflow artifacts.

### `src/components/RecentCanvasesDropdown.jsx`
- **Responsibility:** Secondary menu in topbar providing the canvas ID with copy button, new canvas creation trigger, and a list of recently opened documents.
- **Key Props / State:**
  - Props: `currentCanvasId`, `onNewCanvas`.
  - State: `isOpen`, `recentList`, `copiedId`.
- **Non-Obvious Logic:**
  - **Lazy Loading:** Only queries `getRecentCanvases()` from localStorage when `isOpen` flips to `true`, avoiding unnecessary reads during editor interaction.
  - **Outside Click Dismissal:** Attaches a `mousedown` listener to `window` and uses `dropdownRef.current.contains(e.target)` to close the menu on external clicks.

### `src/components/SaveStatus.jsx`
- **Responsibility:** Displays a clean, minimal status indicator badge in the top navigation reflecting cloud and local save state.
- **Key Props / State:**
  - Props: `saveStatus` (`'saved' | 'saving' | 'unsaved' | 'error'`), `errorMessage`.
  - State: None (pure functional component).
- **Non-Obvious Logic:**
  - Maps internal states directly to user-facing labels (`✓ Saved`, `Saving…`, `Unsaved changes`, or error tooltip) with distinct color classes.

### `src/components/Icons.jsx`
- **Responsibility:** Centralized repository of lightweight, standalone SVG icon components for tools, actions, and UI elements.
- **Key Props / State:**
  - Props: `size` (default 18/24), `className`.
- **Non-Obvious Logic:**
  - Pure SVG definitions with `currentColor` stroke/fill to allow dynamic styling via CSS without pulling in large third-party icon libraries.

---

## 3. Custom Hooks (`src/hooks/`)

### `src/hooks/useFabricCanvas.js`
- **Responsibility:** Initializes the `fabric.Canvas` instance on the supplied `<canvas>` ref and keeps dimensions synchronized with the artboard container.
- **Key Props / State / Returns:**
  - Parameters: `canvasRef`, `containerRef`.
  - State: `fabricCanvas` (the instantiated `fabric.Canvas`).
  - Returns: `fabricCanvas`.
- **Non-Obvious Logic:**
  - **React 18 StrictMode Guard:** Uses `isInitializedRef` to prevent double-initialization in development when StrictMode mounts and unmounts components twice.
  - **`preserveObjectStacking: true`:** Prevents Fabric from automatically jumping an object to the top of the z-index stack when selected.
  - **Resize Handling & Teardown:** Observes `containerRef` using `ResizeObserver` and invokes `canvas.setDimensions()`. The cleanup function disconnects the observer, calls `canvas.dispose()` to tear down canvas DOM wrappers and listeners, and resets state to avoid memory leaks.

### `src/hooks/useCanvasPersistence.js`
- **Responsibility:** Handles bidirectional synchronization of canvas JSON data and metadata between localStorage and Firestore, including debounced auto-save.
- **Key Props / State / Returns:**
  - Parameters: `fabricCanvas`, `canvasId`, `containerRef`.
  - State: `saveStatus`, `errorMessage`, `canvasName`.
  - Returns: `{ saveStatus, errorMessage, canvasName, updateCanvasName, save }`.
- **Non-Obvious Logic:**
  - **Dual-Layer Persistence:** Writes to `localStorage` immediately for synchronous, instant offline recovery, then attempts Firestore cloud persistence.
  - **Cloud Timeout Race:** Wraps Firestore `getDoc` and `setDoc` in `Promise.race()` with a 3–4 second reject timer. If cloud operations hang or fail (e.g. invalid credentials or network latency), execution gracefully falls back to local data without freezing the UI.
  - **Load Protection via `isLoadingRef`:** When loading canvas data from JSON via `fabricCanvas.loadFromJSON()`, `isLoadingRef.current` is set to `true` to block the auto-save event listeners from treating initial object additions as user edits (preventing overwriting saved data with blank states).
  - **Debounced Save (500ms):** Listens to `object:added`, `object:modified`, and `object:removed` and debounces writes via `timerRef` to avoid excessive disk/network traffic while dragging or drawing.
  - **Dimension Stripping:** Strips root `width` and `height` from `canvas.toJSON()` before storage so stored canvas dimensions don't override the client container's dynamic responsive dimensions on load.

### `src/hooks/useCustomShapeTool.js`
- **Responsibility:** Implements multi-point polygon creation with temporary vertex markers, connecting line segments, and real-time dashed rubber-band preview.
- **Key Props / State / Returns:**
  - Parameters: `fabricCanvas`, `isActive`, `onComplete`, `color`.
  - Returns: None (manages canvas state via refs).
- **Non-Obvious Logic:**
  - **Temporary Overlay Objects:** Stores vertex circles and connecting line segments in `tempObjectsRef` with `selectable: false` and `evented: false` so they don't interfere with mouse click detection.
  - **Rubber-Band Line Reuse:** Reuses a single `rubberBandRef` dashed line instance and updates its `(x2, y2)` endpoint on `mouse:move` rather than creating and destroying lines on every frame.
  - **Polygon Finalization:** Completes the polygon on right-click (`evt.button === 2` / `contextmenu` event) or `Escape` key. If points >= 3, instantiates a single `fabric.Polygon`, purges all temporary nodes from the canvas, restores cursor and selection mode, and fires `onComplete`.
  - **Cleanup Guarantee:** Any deactivation or unmount triggers `cleanupTempObjects()` to ensure no orphaned markers or dashed lines remain on the canvas.

---

## 4. Library & Configuration (`src/lib/`)

### `src/lib/firebase.js`
- **Responsibility:** Initializes the Firebase app and exports the Firestore database service instance (`db`).
- **Key Props / State / Returns:**
  - Exports: `db` (Firestore instance).
- **Non-Obvious Logic:**
  - Reads credentials from Vite environment variables (`import.meta.env.VITE_FIREBASE_*`).
  - If configuration is empty or fails, Firestore functions will throw errors that are caught by `useCanvasPersistence` and `Home.jsx`, which fall back seamlessly to local storage.

### `src/lib/recentCanvases.js`
- **Responsibility:** Utilities for reading and updating the list of recently accessed canvases in localStorage (`recent_canvases`).
- **Key Props / State / Returns:**
  - Exports: `getRecentCanvases()`, `saveRecentCanvas({ id, name, updatedAt })`.
- **Non-Obvious Logic:**
  - **Sorting:** `getRecentCanvases()` reads raw JSON from `recent_canvases` and returns an array sorted descending by `updatedAt` ISO date strings.
  - **Upsert & Cap:** `saveRecentCanvas()` updates existing entries in-place or prepends new ones, then truncates the stored array to a maximum of 30 items (`slice(0, 30)`) to prevent localStorage quota exhaustion over time.
