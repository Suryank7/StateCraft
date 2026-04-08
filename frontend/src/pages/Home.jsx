import { Link } from 'react-router-dom';
import { ArrowRight, Bot, Cpu, Layers } from 'lucide-react';

export default function Home() {
  return (
    <div className="flex flex-col items-center">
      {/* Hero Section */}
      <div className="relative isolate pt-24 px-6 lg:px-8 w-full max-w-7xl">
        <div className="mx-auto max-w-3xl text-center">
          <div className="mb-8 flex justify-center">
            <div className="relative rounded-full px-4 py-1 text-sm leading-6 text-blue-300 ring-1 ring-white/10 hover:ring-white/20">
              Announcing StateCraft AI v2.0 <a href="#" className="font-semibold text-blue-400"><span className="absolute inset-0" aria-hidden="true" />Read more <span aria-hidden="true">&rarr;</span></a>
            </div>
          </div>
          <h1 className="text-5xl font-bold tracking-tight text-white sm:text-7xl mb-6 bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-500">
            Design UIs with AI Agents
          </h1>
          <p className="mt-6 text-lg leading-8 text-gray-300 mb-10">
            Tell our intelligent DeepSeek Agents your requirements. StateCraft AI autonomously builds the state machine logic, generates production-ready code, and designs visual wireframes.
          </p>
          <div className="flex items-center justify-center gap-x-6">
            <Link
              to="/workspace/new"
              className="rounded-md bg-blue-600 px-6 py-3 text-lg font-semibold text-white shadow-sm hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 flex items-center gap-2"
            >
              Start Generating <ArrowRight size={20} />
            </Link>
          </div>
        </div>
      </div>

      {/* Feature Grid */}
      <div className="mx-auto max-w-7xl px-6 lg:px-8 mt-32 pb-24">
        <div className="grid grid-cols-1 gap-12 sm:grid-cols-2 lg:grid-cols-3">
          <div className="bg-bg-surface/50 p-8 rounded-2xl border border-white/5 backdrop-blur">
            <Bot className="text-purple-400 mb-4" size={32} />
            <h3 className="text-xl font-semibold text-white mb-2">DeepSeek R1 Architecture</h3>
            <p className="text-gray-400">Powered by advanced LLMs to deeply understand your complex state transition logic from mere plain English.</p>
          </div>
          <div className="bg-bg-surface/50 p-8 rounded-2xl border border-white/5 backdrop-blur">
            <Cpu className="text-blue-400 mb-4" size={32} />
            <h3 className="text-xl font-semibold text-white mb-2">Stable Diffusion Gen</h3>
            <p className="text-gray-400">Instantly generate aesthetic wireframe thumbnails representing your application states.</p>
          </div>
          <div className="bg-bg-surface/50 p-8 rounded-2xl border border-white/5 backdrop-blur">
            <Layers className="text-green-400 mb-4" size={32} />
            <h3 className="text-xl font-semibold text-white mb-2">6+ Code Outputs</h3>
            <p className="text-gray-400">Export your AI-generated machine directly into XState, Zustand, or React reducers.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
