import { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import { Sparkles, Save, Code, Play, RefreshCw, Image as ImageIcon } from 'lucide-react';

import { StateMachine } from '../legacy_core/stateMachine.js';
import { DiagramRenderer } from '../legacy_core/diagram.js';
import { CodeGenerator } from '../legacy_core/codegen.js';

export default function Workspace() {
  const { id } = useParams();
  const [project, setProject] = useState(null);
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [machine, setMachine] = useState(null);
  const [codeOutput, setCodeOutput] = useState('');
  const [activeTab, setActiveTab] = useState('xstate');
  
  const diagramRef = useRef(null);
  const rendererRef = useRef(null);
  const codeGenRef = useRef(new CodeGenerator());

  useEffect(() => {
    if (id) fetchProject();
  }, [id]);

  useEffect(() => {
    // Re-initialize diagram when machine updates
    if (machine && diagramRef.current) {
      diagramRef.current.innerHTML = ''; // Clear old SVG
      rendererRef.current = new DiagramRenderer(diagramRef.current);
      rendererRef.current.render(machine);
      updateCodeOutput(machine, activeTab);
    }
  }, [machine]);

  useEffect(() => {
    if (machine) {
      updateCodeOutput(machine, activeTab);
    }
  }, [activeTab]);

  const fetchProject = async () => {
    try {
      const res = await axios.get(`http://localhost:5000/api/projects/${id}`);
      setProject(res.data);
      setPrompt(res.data.prompt || '');
      
      if (res.data.stateMachine && res.data.stateMachine.states) {
        // Rehydrate legacy state machine
        const parsedMachine = StateMachine.fromJSON(res.data.stateMachine);
        setMachine(parsedMachine);
      }
    } catch (err) {
      console.error('Failed to load project', err);
    }
  };

  const saveProject = async (updates = {}) => {
    // Only execute if we have a valid DB project record
    if (!project?._id) return;
    try {
      const res = await axios.put(`http://localhost:5000/api/projects/${project._id}`, {
        prompt,
        ...updates
      });
      setProject(res.data);
    } catch (err) {
      console.error('Save failed', err);
    }
  };

  const handleDeepSeekGenerate = async () => {
    setIsGenerating(true);
    try {
      // 1. Call our Python AI Service to get intelligent FSM JSON
      const aiRes = await axios.post('http://localhost:5000/api/ai/generate-state-machine', { prompt });
      const fsmJson = aiRes.data.data;
      
      // 2. Load it into the legacy core engine
      const newMachine = StateMachine.fromJSON(fsmJson);
      setMachine(newMachine);
      
      // 3. Save to DB
      await saveProject({ stateMachine: fsmJson, title: `Agent: ${prompt.substring(0, 15)}...` });
      
    } catch (err) {
      console.error('AI Generation Failed', err);
      alert('AI Agent Generation failed. Check console.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleStableDiffusionGenerate = async () => {
    setIsGeneratingImage(true);
    try {
      const res = await axios.post('http://localhost:5000/api/ai/generate-visual', { prompt });
      const imgUri = res.data.image_url;
      await saveProject({ visualThumbnailUrl: imgUri });
    } catch (err) {
      console.error('SD Generation Failed', err);
    } finally {
      setIsGeneratingImage(false);
    }
  };

  const updateCodeOutput = (m, format) => {
    const { code } = codeGenRef.current.generate(m, format);
    // highlight returns html string
    const html = codeGenRef.current.highlight(code, 'typescript');
    setCodeOutput(html);
  };

  return (
    <div className="flex-1 flex overflow-hidden">
      {/* Left Panel: AI Agent Interface */}
      <div className="w-1/3 bg-bg-surface border-r border-white/5 flex flex-col">
        <div className="p-4 border-b border-white/5 flex justify-between items-center bg-bg-elevated">
          <h2 className="font-semibold flex items-center gap-2"><Sparkles size={16} className="text-purple-400"/> AI Prompt</h2>
          <button onClick={() => saveProject()} className="text-gray-400 hover:text-white p-1" title="Save Project"><Save size={16}/></button>
        </div>
        <div className="p-4 flex-1 flex flex-col gap-4">
          <textarea 
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            className="w-full h-48 bg-bg-deepest border border-white/10 rounded-md p-3 text-sm focus:outline-none focus:border-blue-500 resize-none font-mono text-gray-300"
            placeholder="Describe the UI state machine workflow in detail. Let the AI reason about it..."
          />
          <button 
            onClick={handleDeepSeekGenerate}
            disabled={isGenerating || !prompt}
            className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-md py-2 font-medium flex items-center justify-center gap-2 transition"
          >
            {isGenerating ? <RefreshCw size={16} className="animate-spin" /> : <Sparkles size={16} />}
            {isGenerating ? 'AI Agent Thinking...' : 'Generate Architecture'}
          </button>
          
          {/* Visual AI Section */}
          <div className="mt-8 border-t border-white/5 pt-4">
            <h3 className="text-sm font-semibold text-gray-400 mb-3 flex items-center gap-2"><ImageIcon size={14}/> Stable Diffusion Assets</h3>
            {project?.visualThumbnailUrl ? (
              <div className="rounded-md overflow-hidden relative group border border-white/10">
                <img src={project.visualThumbnailUrl} alt="Generated UI" className="w-full object-cover" />
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition">
                    <button onClick={handleStableDiffusionGenerate} className="bg-white/20 px-3 py-1 rounded backdrop-blur text-sm">Regenerate</button>
                </div>
              </div>
            ) : (
                <button 
                  onClick={handleStableDiffusionGenerate}
                  disabled={isGeneratingImage || !prompt}
                  className="w-full border border-dashed border-white/20 hover:border-white/40 text-gray-400 rounded-md py-8 flex flex-col items-center justify-center gap-2 transition"
                >
                  {isGeneratingImage ? <RefreshCw size={24} className="animate-spin text-blue-400" /> : <ImageIcon size={24} />}
                  <span className="text-sm">{isGeneratingImage ? 'Painting UI...' : 'Generate UI Wireframe'}</span>
                </button>
            )}
          </div>
        </div>
      </div>

      {/* Right Panel: Legacy Core Integrations */}
      <div className="flex-1 flex flex-col relative bg-bg-deepest h-[calc(100vh-64px)] overflow-hidden">
        
        {/* Diagram Area (re-using vanilla JS SVG renderer) */}
        <div className="flex-1 relative" ref={diagramRef}>
           {!machine && (
             <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-600">
                <Play size={48} className="mb-4 opacity-50" />
                <p>Waiting for Agent Input...</p>
             </div>
           )}
        </div>

        {/* Code Output Sliding Drawer */}
        <div className="h-64 bg-bg-surface border-t border-white/5 flex flex-col relative z-20">
          <div className="flex bg-bg-elevated border-b border-white/5 px-2">
             {['xstate', 'reducer', 'typescript', 'zustand', 'json'].map(tab => (
               <button 
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-4 py-2 text-sm font-mono border-b-2 transition ${activeTab === tab ? 'border-blue-500 text-white' : 'border-transparent text-gray-500 hover:text-gray-300'}`}
               >
                 {tab.toUpperCase()}
               </button>
             ))}
          </div>
          <div className="flex-1 overflow-auto p-4 bg-[#0d1322]">
             <pre 
               className="font-mono text-sm leading-relaxed" 
               dangerouslySetInnerHTML={{ __html: codeOutput || '// Generate a machine to see code' }} 
             />
          </div>
        </div>
      </div>
    </div>
  );
}
