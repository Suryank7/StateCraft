const mongoose = require('mongoose');

const projectSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    default: 'Untitled Agent Project',
  },
  prompt: {
    type: String,
    required: true,
  },
  stateMachine: {
    type: Object, // Stores the JSON abstract syntax tree
    default: {},
  },
  visualThumbnailUrl: {
    type: String, // URL or base64 of the Stable Diffusion generated image
    default: '',
  },
  codeCache: {
    type: Object, // Cache generated code
    default: {},
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('Project', projectSchema);
