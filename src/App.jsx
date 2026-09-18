import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Home } from './Home';
import { CanvasEditor } from './CanvasEditor';
import './App.css';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/canvas/:canvasId" element={<CanvasEditor />} />
      </Routes>
    </BrowserRouter>
  );
}
