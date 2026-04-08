// ============================================================
// StateCraft — Main Application Orchestrator
// Wires all modules: parser, diagram, analyzer, codegen, simulator
// ============================================================

import { NLParser } from './parser.js';
import { DiagramRenderer } from './diagram.js';
import { Analyzer } from './analyzer.js';
import { CodeGenerator } from './codegen.js';
import { Simulator } from './simulator.js';
import { EXAMPLES } from './examples.js';
import { StateMachine } from './stateMachine.js';

class App {
  constructor() {
    this.parser = new NLParser();
    this.analyzer = new Analyzer();
    this.codegen = new CodeGenerator();
    this.diagram = null;
    this.simulator = null;
    this.currentMachine = null;

    this.init();
  }

  init() {
    // Wait for DOM
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.setup());
    } else {
      this.setup();
    }
  }

  setup() {
    // Initialize diagram renderer
    const diagramContainer = document.getElementById('diagram-container');
    if (diagramContainer) {
      this.diagram = new DiagramRenderer(diagramContainer);
    }

    // Bind UI elements
    this.els = {
      input: document.getElementById('nl-input'),
      parseBtn: document.getElementById('btn-parse'),
      clearBtn: document.getElementById('btn-clear'),
      examplesGrid: document.getElementById('examples-grid'),
      // Diagram
      diagramEmpty: document.getElementById('diagram-empty'),
      diagramStats: document.getElementById('diagram-stats'),
      zoomInBtn: document.getElementById('btn-zoom-in'),
      zoomOutBtn: document.getElementById('btn-zoom-out'),
      resetZoomBtn: document.getElementById('btn-reset-zoom'),
      exportSvgBtn: document.getElementById('btn-export-svg'),
      shareBtn: document.getElementById('btn-share'),
      // Analysis
      analysisEmpty: document.getElementById('analysis-empty'),
      analysisContent: document.getElementById('analysis-content'),
      analysisSummary: document.getElementById('analysis-summary'),
      issueList: document.getElementById('issue-list'),
      coverageMatrix: document.getElementById('coverage-matrix'),
      // Output tabs
      tabBtns: document.querySelectorAll('.tab-btn'),
      tabPanels: document.querySelectorAll('.tab-panel'),
      // Code outputs
      codeBlocks: {
        xstate: document.getElementById('code-xstate'),
        reducer: document.getElementById('code-reducer'),
        typescript: document.getElementById('code-typescript'),
        zustand: document.getElementById('code-zustand'),
        mermaid: document.getElementById('code-mermaid'),
        json: document.getElementById('code-json'),
      },
      copyBtns: document.querySelectorAll('.btn-copy'),
      // Simulator
      simCurrentState: document.getElementById('sim-current-state'),
      simEventsGrid: document.getElementById('sim-events-grid'),
      simHistoryList: document.getElementById('sim-history-list'),
      simDeadEnd: document.getElementById('sim-deadend'),
      simResetBtn: document.getElementById('btn-sim-reset'),
      simStepBackBtn: document.getElementById('btn-sim-stepback'),
      // Toast
      toastContainer: document.getElementById('toast-container'),
      // Modal
      modalOverlay: document.getElementById('modal-overlay'),
      shareUrlInput: document.getElementById('share-url-input'),
      copyShareBtn: document.getElementById('btn-copy-share'),
      closeModalBtn: document.getElementById('btn-close-modal'),
    };

    this.bindEvents();
    this.loadExamples();
    this.checkURLHash();
  }

  // ---- Event Binding ----

  bindEvents() {
    // Parse button
    this.els.parseBtn?.addEventListener('click', () => this.parse());

    // Clear button
    this.els.clearBtn?.addEventListener('click', () => this.clear());

    // Keyboard shortcut: Ctrl+Enter to parse
    this.els.input?.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        this.parse();
      }
    });

    // Tab switching
    this.els.tabBtns.forEach(btn => {
      btn.addEventListener('click', () => this.switchTab(btn.dataset.tab));
    });

    // Zoom controls
    this.els.zoomInBtn?.addEventListener('click', () => this.diagram?.zoomIn());
    this.els.zoomOutBtn?.addEventListener('click', () => this.diagram?.zoomOut());
    this.els.resetZoomBtn?.addEventListener('click', () => this.diagram?.resetZoom());

    // Export SVG
    this.els.exportSvgBtn?.addEventListener('click', () => this.exportSVG());

    // Share
    this.els.shareBtn?.addEventListener('click', () => this.showShareModal());
    this.els.closeModalBtn?.addEventListener('click', () => this.hideModal());
    this.els.copyShareBtn?.addEventListener('click', () => this.copyShareURL());
    this.els.modalOverlay?.addEventListener('click', (e) => {
      if (e.target === this.els.modalOverlay) this.hideModal();
    });

    // Copy buttons
    this.els.copyBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const format = btn.dataset.format;
        this.copyCode(format);
      });
    });

    // Simulator
    this.els.simResetBtn?.addEventListener('click', () => this.resetSimulator());
    this.els.simStepBackBtn?.addEventListener('click', () => this.stepBackSimulator());

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      if (e.ctrlKey && e.key === 'e') { e.preventDefault(); this.exportSVG(); }
      if (e.ctrlKey && e.key === 's') { e.preventDefault(); this.showShareModal(); }
      if (e.key === 'Escape') this.hideModal();
    });
  }

  // ---- Parse & Process Pipeline ----

  parse() {
    const text = this.els.input?.value?.trim();
    if (!text) {
      this.showToast('Please enter a state description', 'error');
      return;
    }

    // Parse NL → State Machine
    const { machine, errors, warnings } = this.parser.parse(text);

    if (errors.length > 0 && machine.states.size === 0) {
      this.showToast(`Parse error: ${errors[0]}`, 'error');
      return;
    }

    // Show warnings as toasts
    for (const w of warnings.slice(0, 2)) {
      this.showToast(w, 'info');
    }

    this.currentMachine = machine;

    // Render diagram
    this.renderDiagram(machine);

    // Run analysis
    this.renderAnalysis(machine);

    // Generate code
    this.generateAllCode(machine);

    // Initialize simulator
    this.initSimulator(machine);

    // Show success
    this.showToast(`Parsed: ${machine.states.size} states, ${machine.transitions.length} transitions`, 'success');

    // Update URL hash
    this.updateURLHash(machine);
  }

  clear() {
    if (this.els.input) this.els.input.value = '';
    this.currentMachine = null;
    this.diagram?.clearActive();

    // Reset diagram
    const container = document.getElementById('diagram-container');
    if (container) {
      container.innerHTML = '';
      this.diagram = new DiagramRenderer(container);
    }

    // Show empties
    this.els.diagramEmpty?.classList.remove('hidden');
    this.els.diagramStats?.classList.add('hidden');
    this.els.analysisEmpty?.classList.remove('hidden');
    this.els.analysisContent?.classList.add('hidden');

    // Clear code blocks
    for (const key in this.els.codeBlocks) {
      if (this.els.codeBlocks[key]) this.els.codeBlocks[key].innerHTML = '// Generate a state machine to see code here';
    }

    // Clear simulator
    this.clearSimulatorUI();

    // Clear URL hash
    history.replaceState(null, '', window.location.pathname);
  }

  // ---- Diagram Rendering ----

  renderDiagram(machine) {
    this.els.diagramEmpty?.classList.add('hidden');
    this.els.diagramStats?.classList.remove('hidden');
    this.diagram?.render(machine);

    // Update stats
    const statsEl = this.els.diagramStats;
    if (statsEl) {
      const complexity = machine.getComplexityScore();
      statsEl.innerHTML = `
        <div class="stat-chip"><span class="stat-chip-dot" style="background: var(--success-400)"></span>${machine.states.size} States</div>
        <div class="stat-chip"><span class="stat-chip-dot" style="background: var(--primary-400)"></span>${machine.transitions.length} Transitions</div>
        <div class="stat-chip"><span class="stat-chip-dot" style="background: var(--warning-400)"></span>${machine.getAllEvents().length} Events</div>
        <div class="complexity-badge complexity-${complexity.level}">${complexity.label}</div>
      `;
    }
  }

  // ---- Analysis Rendering ----

  renderAnalysis(machine) {
    this.els.analysisEmpty?.classList.add('hidden');
    this.els.analysisContent?.classList.remove('hidden');

    const result = this.analyzer.analyze(machine);

    // Summary cards
    const criticalCount = result.issues.filter(i => i.severity === 'critical').length;
    const warningCount = result.issues.filter(i => i.severity === 'warning').length;
    const infoCount = result.issues.filter(i => i.severity === 'info').length;
    const successCount = result.issues.filter(i => i.severity === 'success').length;

    if (this.els.analysisSummary) {
      this.els.analysisSummary.innerHTML = `
        <div class="analysis-summary-card">
          <div class="analysis-summary-count" style="color: var(--error-400)">${criticalCount}</div>
          <div class="analysis-summary-label">Critical</div>
        </div>
        <div class="analysis-summary-card">
          <div class="analysis-summary-count" style="color: var(--warning-400)">${warningCount}</div>
          <div class="analysis-summary-label">Warnings</div>
        </div>
        <div class="analysis-summary-card">
          <div class="analysis-summary-count" style="color: var(--info-400)">${infoCount + successCount}</div>
          <div class="analysis-summary-label">Info</div>
        </div>
      `;
    }

    // Issue list
    if (this.els.issueList) {
      this.els.issueList.innerHTML = result.issues.map(issue => {
        const icons = { critical: '🔴', warning: '🟡', info: '🔵', success: '🟢' };
        return `
          <div class="issue-card ${issue.severity}">
            <span class="issue-icon">${icons[issue.severity] || '⚪'}</span>
            <div class="issue-content">
              <div class="issue-title">${issue.title}</div>
              <div class="issue-desc">${issue.desc}${issue.fix ? ` <strong>Fix:</strong> ${issue.fix}` : ''}</div>
            </div>
          </div>
        `;
      }).join('');
    }

    // Coverage matrix
    if (this.els.coverageMatrix && result.coverageMatrix.length > 0) {
      const events = machine.getAllEvents();
      let html = `
        <div class="coverage-matrix-title">📊 Transition Coverage Matrix</div>
        <table class="coverage-table">
          <thead><tr>
            <th>State</th>
            ${events.map(e => `<th>${e}</th>`).join('')}
          </tr></thead>
          <tbody>
      `;

      for (const row of result.coverageMatrix) {
        html += `<tr><td class="state-name">${row.state}</td>`;
        for (const event of events) {
          const target = row.events[event];
          if (target) {
            html += `<td class="handled" title="→ ${target}">→ ${target}</td>`;
          } else {
            html += `<td class="unhandled">—</td>`;
          }
        }
        html += `</tr>`;
      }

      html += `</tbody></table>`;
      this.els.coverageMatrix.innerHTML = html;
      this.els.coverageMatrix.classList.remove('hidden');
    } else {
      this.els.coverageMatrix?.classList.add('hidden');
    }
  }

  // ---- Code Generation ----

  generateAllCode(machine) {
    const formats = ['xstate', 'reducer', 'typescript', 'zustand', 'mermaid', 'json'];
    for (const format of formats) {
      const el = this.els.codeBlocks[format];
      if (el) {
        const { code, language } = this.codegen.generate(machine, format);
        el.innerHTML = this.codegen.highlight(code, language);
      }
    }
  }

  copyCode(format) {
    if (!this.currentMachine) return;
    const { code } = this.codegen.generate(this.currentMachine, format);
    navigator.clipboard.writeText(code).then(() => {
      this.showToast(`${format.toUpperCase()} code copied to clipboard!`, 'success');
    }).catch(() => {
      this.showToast('Failed to copy', 'error');
    });
  }

  // ---- Simulator ----

  initSimulator(machine) {
    this.simulator = new Simulator(machine);

    this.simulator.onStateChange = (state, entry) => {
      this.updateSimulatorUI();
      this.diagram?.setActiveState(state);
    };

    this.simulator.onTransition = (entry) => {
      this.diagram?.setActiveTransition({
        from: entry.from,
        to: entry.to,
        event: entry.event,
      });
    };

    this.updateSimulatorUI();
  }

  updateSimulatorUI() {
    if (!this.simulator) return;

    // Current state
    if (this.els.simCurrentState) {
      const state = this.simulator.state;
      const stateNode = this.currentMachine?.getState(state);
      let stateColor = 'var(--primary-400)';
      if (stateNode?.type === 'error') stateColor = 'var(--error-400)';
      if (stateNode?.type === 'final') stateColor = 'var(--success-400)';
      if (stateNode?.type === 'initial') stateColor = 'var(--success-400)';

      this.els.simCurrentState.innerHTML = `
        <span class="sim-state-label">Current State</span>
        <span class="sim-state-value" style="background: linear-gradient(135deg, ${stateColor}, var(--accent-cyan)); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;">
          ${state ? state.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) : 'None'}
        </span>
      `;
    }

    // Available events
    if (this.els.simEventsGrid) {
      const events = this.simulator.getAvailableEvents();
      if (events.length > 0) {
        this.els.simEventsGrid.innerHTML = events.map(e =>
          `<button class="sim-event-btn" data-event="${e.event}" title="→ ${e.target}">
            ${e.event.replace(/_/g, ' ')}
            <span style="opacity: 0.5; font-size: 0.7rem"> → ${e.target}</span>
          </button>`
        ).join('');

        // Bind click handlers
        this.els.simEventsGrid.querySelectorAll('.sim-event-btn').forEach(btn => {
          btn.addEventListener('click', () => {
            this.simulator.send(btn.dataset.event);
          });
        });
      } else {
        this.els.simEventsGrid.innerHTML = '';
      }
    }

    // Dead end / Final state indicator
    if (this.els.simDeadEnd) {
      if (this.simulator.isFinalState()) {
        this.els.simDeadEnd.textContent = '✅ Final state reached — machine has completed';
        this.els.simDeadEnd.classList.remove('hidden');
        this.els.simDeadEnd.style.color = 'var(--success-400)';
      } else if (this.simulator.isDeadEnd()) {
        this.els.simDeadEnd.textContent = '⚠️ Dead end — no available transitions from this state';
        this.els.simDeadEnd.classList.remove('hidden');
        this.els.simDeadEnd.style.color = 'var(--warning-400)';
      } else {
        this.els.simDeadEnd.classList.add('hidden');
      }
    }

    // History
    if (this.els.simHistoryList) {
      this.els.simHistoryList.innerHTML = this.simulator.history.map(entry =>
        `<div class="sim-history-entry">
          <span class="sim-history-from">${entry.from}</span>
          <span class="sim-history-arrow">→</span>
          <span class="sim-history-event">${entry.event}</span>
          <span class="sim-history-arrow">→</span>
          <span class="sim-history-to">${entry.to}</span>
          <span class="sim-history-time">${this.simulator.formatTime(entry.timestamp)}</span>
        </div>`
      ).join('');

      // Scroll to bottom
      this.els.simHistoryList.scrollTop = this.els.simHistoryList.scrollHeight;
    }
  }

  clearSimulatorUI() {
    this.simulator = null;
    if (this.els.simCurrentState) this.els.simCurrentState.innerHTML = '<span class="sim-state-label" style="color: var(--text-muted)">Parse a state machine to start simulating</span>';
    if (this.els.simEventsGrid) this.els.simEventsGrid.innerHTML = '';
    if (this.els.simHistoryList) this.els.simHistoryList.innerHTML = '';
    if (this.els.simDeadEnd) this.els.simDeadEnd.classList.add('hidden');
  }

  resetSimulator() {
    if (this.simulator) {
      this.simulator.reset();
      this.updateSimulatorUI();
      this.diagram?.clearActive();
      this.diagram?.setActiveState(this.simulator.state);
      this.showToast('Simulator reset', 'info');
    }
  }

  stepBackSimulator() {
    if (this.simulator?.stepBack()) {
      this.updateSimulatorUI();
    } else {
      this.showToast('No history to undo', 'info');
    }
  }

  // ---- Tab Switching ----

  switchTab(tabId) {
    this.els.tabBtns.forEach(btn => {
      btn.classList.toggle('active', btn.dataset.tab === tabId);
    });
    this.els.tabPanels.forEach(panel => {
      panel.classList.toggle('active', panel.id === `panel-${tabId}`);
    });

    // When switching to simulator, update diagram highlighting
    if (tabId === 'simulator' && this.simulator) {
      this.diagram?.setActiveState(this.simulator.state);
    } else {
      this.diagram?.clearActive();
      if (this.currentMachine) this.diagram?.render(this.currentMachine);
    }
  }

  // ---- Examples ----

  loadExamples() {
    if (!this.els.examplesGrid) return;

    this.els.examplesGrid.innerHTML = EXAMPLES.map(ex => `
      <div class="example-card" data-example="${ex.id}">
        <span class="example-card-icon">${ex.icon}</span>
        <div class="example-card-content">
          <div class="example-card-title">${ex.title}</div>
          <div class="example-card-desc">${ex.desc}</div>
        </div>
      </div>
    `).join('');

    this.els.examplesGrid.querySelectorAll('.example-card').forEach(card => {
      card.addEventListener('click', () => {
        const example = EXAMPLES.find(e => e.id === card.dataset.example);
        if (example && this.els.input) {
          this.els.input.value = example.text;
          this.parse();
          this.els.input.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      });
    });
  }

  // ---- URL Hash Sharing ----

  updateURLHash(machine) {
    const hash = machine.toURLHash();
    if (hash) {
      history.replaceState(null, '', `#${hash}`);
    }
  }

  checkURLHash() {
    const hash = window.location.hash.slice(1);
    if (!hash) return;

    try {
      const machine = StateMachine.fromURLHash(hash);
      if (machine && machine.states.size > 0) {
        this.currentMachine = machine;

        // Reconstruct text representation
        let text = '';
        if (machine.initialState) {
          text += `Starts in ${machine.initialState} state.\n`;
        }
        for (const t of machine.transitions) {
          text += `From ${t.from}, ${t.event} goes to ${t.to}.\n`;
        }
        for (const f of machine.finalStates) {
          text += `${f} is the final state.\n`;
        }
        if (this.els.input) this.els.input.value = text;

        this.renderDiagram(machine);
        this.renderAnalysis(machine);
        this.generateAllCode(machine);
        this.initSimulator(machine);
        this.showToast('Loaded state machine from shared URL', 'info');
      }
    } catch {
      // Invalid hash, ignore
    }
  }

  showShareModal() {
    if (!this.currentMachine) {
      this.showToast('Parse a state machine first', 'error');
      return;
    }

    const hash = this.currentMachine.toURLHash();
    const url = `${window.location.origin}${window.location.pathname}#${hash}`;

    if (this.els.shareUrlInput) {
      this.els.shareUrlInput.value = url;
    }
    this.els.modalOverlay?.classList.remove('hidden');
  }

  hideModal() {
    this.els.modalOverlay?.classList.add('hidden');
  }

  copyShareURL() {
    const url = this.els.shareUrlInput?.value;
    if (url) {
      navigator.clipboard.writeText(url).then(() => {
        this.showToast('Share URL copied!', 'success');
        this.hideModal();
      });
    }
  }

  // ---- Export SVG ----

  exportSVG() {
    if (!this.diagram || !this.currentMachine) {
      this.showToast('Generate a diagram first', 'error');
      return;
    }

    const svgString = this.diagram.exportSVG();
    const blob = new Blob([svgString], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = `statecraft-${this.currentMachine.id || 'diagram'}.svg`;
    a.click();
    URL.revokeObjectURL(url);

    this.showToast('SVG diagram exported!', 'success');
  }

  // ---- Toast Notifications ----

  showToast(message, type = 'info') {
    if (!this.els.toastContainer) return;

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    const icons = { success: '✓', error: '✕', info: 'ℹ' };
    toast.innerHTML = `<span>${icons[type] || 'ℹ'}</span> ${message}`;
    this.els.toastContainer.appendChild(toast);

    setTimeout(() => {
      toast.classList.add('toast-exit');
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }
}

// ---- Initialize ----
const app = new App();
