import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Plus, LayoutGrid, Clock, Trash2 } from 'lucide-react';

export default function Dashboard() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    try {
      const res = await axios.get('http://localhost:5000/api/projects');
      setProjects(res.data);
    } catch (err) {
      console.error('Failed to fetch projects', err);
    } finally {
      setLoading(false);
    }
  };

  const createNewProject = async () => {
    try {
      const res = await axios.post('http://localhost:5000/api/projects', {
        title: 'New AI Agent',
        prompt: 'Describe your agent workflow...',
      });
      navigate(`/workspace/${res.data._id}`);
    } catch (err) {
      console.error('Failed to create project', err);
    }
  };

  const deleteProject = async (id, e) => {
    e.preventDefault();
    if (!confirm('Delete this project?')) return;
    try {
      await axios.delete(`http://localhost:5000/api/projects/${id}`);
      setProjects(projects.filter(p => p._id !== id));
    } catch (err) {
      console.error('Failed to delete', err);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 w-full">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">My Agents</h1>
          <p className="text-gray-400 text-sm">Manage your AI-generated state machines and UI workflows.</p>
        </div>
        <button
          onClick={createNewProject}
          className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-md font-medium flex items-center gap-2 transition"
        >
          <Plus size={18} /> New Agent
        </button>
      </div>

      {loading ? (
        <div className="text-gray-400 text-center py-20">Loading...</div>
      ) : projects.length === 0 ? (
        <div className="border border-dashed border-white/10 rounded-xl p-12 text-center bg-bg-surface/30">
          <LayoutGrid className="mx-auto text-gray-500 mb-4" size={48} />
          <h3 className="text-lg font-medium text-white mb-2">No agents yet</h3>
          <p className="text-gray-400 mb-6">Create your first AI agent workspace to get started.</p>
          <button onClick={createNewProject} className="bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-md transition">
            Create Agent
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map(project => (
            <Link key={project._id} to={`/workspace/${project._id}`} className="group relative bg-bg-surface border border-white/5 rounded-xl overflow-hidden hover:border-blue-500/50 transition">
              {/* Thumbnail Area */}
              <div className="aspect-video bg-bg-deepest relative overflow-hidden border-b border-white/5">
                {project.visualThumbnailUrl ? (
                  <img src={project.visualThumbnailUrl} alt={project.title} className="w-full h-full object-cover group-hover:scale-105 transition duration-500" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-600">
                    <LayoutGrid size={32} />
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-bg-surface to-transparent opacity-60"></div>
              </div>
              
              <div className="p-5">
                <h3 className="text-lg font-semibold text-white mb-1 truncate">{project.title}</h3>
                <div className="flex justify-between items-center mt-4">
                  <div className="flex items-center text-xs text-gray-500 gap-1">
                    <Clock size={12} /> {new Date(project.createdAt).toLocaleDateString()}
                  </div>
                  <button 
                    onClick={(e) => deleteProject(project._id, e)}
                    className="text-gray-500 hover:text-red-400 p-1 rounded-md hover:bg-red-400/10 transition"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
