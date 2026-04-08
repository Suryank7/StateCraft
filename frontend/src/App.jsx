import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import Home from './pages/Home';
import Workspace from './pages/Workspace';
import { LayoutDashboard, Zap } from 'lucide-react';

function Navbar() {
  return (
    <nav className="border-b border-white/5 bg-bg-surface/50 backdrop-blur-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
              <Zap size={18} className="text-white" />
            </div>
            <span className="font-bold text-xl tracking-tight text-white">StateCraft AI</span>
          </Link>
          <div className="flex gap-4 items-center">
            <Link to="/dashboard" className="text-gray-300 hover:text-white flex items-center gap-2 text-sm font-medium">
              <LayoutDashboard size={16} />
              Dashboard
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
}

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-bg-deepest flex flex-col font-sans">
        <Navbar />
        <main className="flex-1 flex flex-col">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/workspace/:id" element={<Workspace />} />
            <Route path="/workspace/new" element={<Workspace />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
