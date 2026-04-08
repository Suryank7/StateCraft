const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const Project = require('./models/Project');

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// Replace with your MongoDB connection string if not local
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/statecraft_ai';

mongoose.connect(MONGO_URI)
  .then(() => console.log('✅ Connected to MongoDB'))
  .catch(err => console.error('❌ MongoDB connection error:', err));

// ==========================================
// REST API FOR PROJECTS
// ==========================================

// Get all projects
app.get('/api/projects', async (req, res) => {
  try {
    const projects = await Project.find().sort({ createdAt: -1 });
    res.json(projects);
  } catch (err) {
    res.status(500).json({ error: 'Server error fetching projects' });
  }
});

// Get a single project
app.get('/api/projects/:id', async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) return res.status(404).json({ error: 'Project not found' });
    res.json(project);
  } catch (err) {
    res.status(500).json({ error: 'Server error fetching project' });
  }
});

// Create a new project
app.post('/api/projects', async (req, res) => {
  try {
    const { title, prompt, stateMachine, visualThumbnailUrl } = req.body;
    const project = new Project({ title, prompt, stateMachine, visualThumbnailUrl });
    await project.save();
    res.status(201).json(project);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create project' });
  }
});

// Update a project (e.g. after AI generates the diagram)
app.put('/api/projects/:id', async (req, res) => {
  try {
    const project = await Project.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(project);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update project' });
  }
});

// Delete a project
app.delete('/api/projects/:id', async (req, res) => {
  try {
    await Project.findByIdAndDelete(req.params.id);
    res.json({ message: 'Project deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete project' });
  }
});

// ==========================================
// PROXY AI REQUESTS TO PYTHON SERVER
// ==========================================
// We route them through Node to keep API keys secure or handle auth later
app.post('/api/ai/generate-state-machine', async (req, res) => {
  try {
    // Dynamically import node-fetch if using Node 18+ fetch, or use it directly
    // Assuming Node 18+, we can use global fetch
    const response = await fetch('http://127.0.0.1:8000/generate-state', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req.body)
    });
    const data = await response.json();
    res.json(data);
  } catch (err) {
    console.error("AI Service Error:", err);
    res.status(500).json({ error: 'Failed to communicate with AI Service' });
  }
});

app.post('/api/ai/generate-visual', async (req, res) => {
  try {
    const response = await fetch('http://127.0.0.1:8000/generate-visual', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req.body)
    });
    const data = await response.json();
    res.json(data);
  } catch (err) {
    console.error("AI Service Error:", err);
    res.status(500).json({ error: 'Failed to communicate with AI Service' });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Node.js Backend running on port ${PORT}`));
