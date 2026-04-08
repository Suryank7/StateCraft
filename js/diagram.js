// ============================================================
// StateCraft — Interactive SVG Diagram Renderer
// Force-directed layout + drag & drop + zoom/pan
// ============================================================

export class DiagramRenderer {
  constructor(containerEl) {
    this.container = containerEl;
    this.svg = null;
    this.mainGroup = null;
    this.machine = null;

    // Layout config
    this.nodeWidth = 140;
    this.nodeHeight = 50;
    this.nodeRadius = 12;
    this.padding = 80;

    // Interaction state
    this.dragTarget = null;
    this.dragOffset = { x: 0, y: 0 };
    this.viewBox = { x: 0, y: 0, w: 1000, h: 600 };
    this.isPanning = false;
    this.panStart = { x: 0, y: 0 };
    this.zoomLevel = 1;

    // Active state for simulator
    this.activeState = null;
    this.activeTransition = null;

    // Callbacks
    this.onStateClick = null;

    this.init();
  }

  init() {
    this.svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    this.svg.classList.add('diagram-svg');
    this.svg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');

    // Defs — arrowheads and filters
    const defs = this.createDefs();
    this.svg.appendChild(defs);

    // Main group for transforms
    this.mainGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    this.mainGroup.setAttribute('id', 'diagram-main');
    this.svg.appendChild(this.mainGroup);

    this.container.appendChild(this.svg);

    this.updateViewBox();
    this.bindEvents();
  }

  createDefs() {
    const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');

    // Arrow marker
    const marker = document.createElementNS('http://www.w3.org/2000/svg', 'marker');
    marker.setAttribute('id', 'arrowhead');
    marker.setAttribute('markerWidth', '12');
    marker.setAttribute('markerHeight', '8');
    marker.setAttribute('refX', '11');
    marker.setAttribute('refY', '4');
    marker.setAttribute('orient', 'auto');
    marker.setAttribute('markerUnits', 'userSpaceOnUse');

    const arrowPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    arrowPath.setAttribute('d', 'M 0 0 L 12 4 L 0 8 L 3 4 Z');
    arrowPath.setAttribute('fill', '#475569');
    marker.appendChild(arrowPath);
    defs.appendChild(marker);

    // Active arrow marker (blue)
    const activeMarker = marker.cloneNode(true);
    activeMarker.setAttribute('id', 'arrowhead-active');
    activeMarker.querySelector('path').setAttribute('fill', '#60a5fa');
    defs.appendChild(activeMarker);

    // Glow filter for active states
    const glowFilter = document.createElementNS('http://www.w3.org/2000/svg', 'filter');
    glowFilter.setAttribute('id', 'glow');
    glowFilter.setAttribute('x', '-50%');
    glowFilter.setAttribute('y', '-50%');
    glowFilter.setAttribute('width', '200%');
    glowFilter.setAttribute('height', '200%');

    const blur = document.createElementNS('http://www.w3.org/2000/svg', 'feGaussianBlur');
    blur.setAttribute('stdDeviation', '4');
    blur.setAttribute('result', 'coloredBlur');

    const merge = document.createElementNS('http://www.w3.org/2000/svg', 'feMerge');
    const mergeNode1 = document.createElementNS('http://www.w3.org/2000/svg', 'feMergeNode');
    mergeNode1.setAttribute('in', 'coloredBlur');
    const mergeNode2 = document.createElementNS('http://www.w3.org/2000/svg', 'feMergeNode');
    mergeNode2.setAttribute('in', 'SourceGraphic');
    merge.appendChild(mergeNode1);
    merge.appendChild(mergeNode2);

    glowFilter.appendChild(blur);
    glowFilter.appendChild(merge);
    defs.appendChild(glowFilter);

    return defs;
  }

  // ---- Rendering ----

  render(machine) {
    this.machine = machine;
    if (!machine || machine.states.size === 0) {
      this.mainGroup.innerHTML = '';
      return;
    }

    // Calculate layout
    this.calculateLayout(machine);

    // Clear and redraw
    this.mainGroup.innerHTML = '';

    // Draw transitions first (below nodes)
    const transitionGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    transitionGroup.setAttribute('class', 'transitions-layer');
    this.renderTransitions(transitionGroup, machine);
    this.mainGroup.appendChild(transitionGroup);

    // Draw initial state indicator
    if (machine.initialState) {
      this.renderInitialIndicator(machine);
    }

    // Draw state nodes
    const nodesGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    nodesGroup.setAttribute('class', 'nodes-layer');
    this.renderNodes(nodesGroup, machine);
    this.mainGroup.appendChild(nodesGroup);

    // Fit to view
    this.fitToView(machine);
  }

  // ---- Force-Directed Layout ----

  calculateLayout(machine) {
    const states = Array.from(machine.states.values());
    const n = states.length;
    if (n === 0) return;

    // Initialize positions in a circle
    const cx = 500, cy = 300;
    const radius = Math.min(200, 80 * n);

    states.forEach((state, i) => {
      const angle = (2 * Math.PI * i) / n - Math.PI / 2;
      state.x = cx + radius * Math.cos(angle);
      state.y = cy + radius * Math.sin(angle);
    });

    // Force simulation parameters
    const repulsionStrength = 8000;
    const attractionStrength = 0.005;
    const gravityStrength = 0.01;
    const damping = 0.85;
    const iterations = 300;

    // Velocity arrays
    const vx = new Float64Array(n);
    const vy = new Float64Array(n);

    // Build edge index
    const edges = machine.transitions.map(t => ({
      source: states.findIndex(s => s.name === t.from),
      target: states.findIndex(s => s.name === t.to)
    })).filter(e => e.source >= 0 && e.target >= 0);

    for (let iter = 0; iter < iterations; iter++) {
      const cooling = 1 - iter / iterations;

      // Apply repulsion (Coulomb's law) between all pairs
      for (let i = 0; i < n; i++) {
        for (let j = i + 1; j < n; j++) {
          const dx = states[i].x - states[j].x;
          const dy = states[i].y - states[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;
          const force = (repulsionStrength * cooling) / (dist * dist);
          const fx = (dx / dist) * force;
          const fy = (dy / dist) * force;
          vx[i] += fx;
          vy[i] += fy;
          vx[j] -= fx;
          vy[j] -= fy;
        }
      }

      // Apply attraction (Hooke's law) along edges
      for (const edge of edges) {
        const dx = states[edge.target].x - states[edge.source].x;
        const dy = states[edge.target].y - states[edge.source].y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        const idealDist = 200;
        const force = attractionStrength * (dist - idealDist) * cooling;
        const fx = (dx / dist) * force;
        const fy = (dy / dist) * force;
        vx[edge.source] += fx;
        vy[edge.source] += fy;
        vx[edge.target] -= fx;
        vy[edge.target] -= fy;
      }

      // Gravity toward center
      for (let i = 0; i < n; i++) {
        vx[i] += (cx - states[i].x) * gravityStrength * cooling;
        vy[i] += (cy - states[i].y) * gravityStrength * cooling;
      }

      // Apply velocities with damping
      for (let i = 0; i < n; i++) {
        vx[i] *= damping;
        vy[i] *= damping;
        states[i].x += vx[i];
        states[i].y += vy[i];
      }
    }
  }

  // ---- Render Nodes ----

  renderNodes(group, machine) {
    for (const [name, state] of machine.states) {
      const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      g.setAttribute('class', 'state-node');
      g.setAttribute('data-state', name);
      g.setAttribute('transform', `translate(${state.x}, ${state.y})`);

      // Background rect
      const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      const halfW = this.nodeWidth / 2;
      const halfH = this.nodeHeight / 2;
      rect.setAttribute('x', -halfW);
      rect.setAttribute('y', -halfH);
      rect.setAttribute('width', this.nodeWidth);
      rect.setAttribute('height', this.nodeHeight);
      rect.setAttribute('rx', this.nodeRadius);
      rect.setAttribute('ry', this.nodeRadius);

      // Style based on type
      let bgClass = 'state-bg state-bg-normal';
      if (state.type === 'initial') bgClass = 'state-bg state-bg-initial';
      if (state.type === 'final') bgClass = 'state-bg state-bg-final';
      if (state.type === 'error') bgClass = 'state-bg state-bg-error';
      if (this.activeState === name) bgClass += ' state-bg-active';

      rect.setAttribute('class', bgClass);

      if (this.activeState === name) {
        g.setAttribute('filter', 'url(#glow)');
      }

      g.appendChild(rect);

      // Final state: double border
      if (state.type === 'final') {
        const innerRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        innerRect.setAttribute('x', -(halfW - 4));
        innerRect.setAttribute('y', -(halfH - 4));
        innerRect.setAttribute('width', this.nodeWidth - 8);
        innerRect.setAttribute('height', this.nodeHeight - 8);
        innerRect.setAttribute('rx', this.nodeRadius - 2);
        innerRect.setAttribute('ry', this.nodeRadius - 2);
        innerRect.setAttribute('fill', 'none');
        innerRect.setAttribute('stroke', '#3b82f6');
        innerRect.setAttribute('stroke-width', '1');
        innerRect.setAttribute('opacity', '0.5');
        g.appendChild(innerRect);
      }

      // State name label
      const label = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      label.setAttribute('class', 'state-label');
      label.setAttribute('y', state.type !== 'normal' ? '-3' : '0');
      label.textContent = this.formatStateName(name);
      g.appendChild(label);

      // Type badge
      if (state.type !== 'normal') {
        const badge = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        badge.setAttribute('class', 'state-type-badge');
        badge.setAttribute('y', '13');
        badge.textContent = state.type === 'initial' ? '▶ INITIAL' : state.type === 'final' ? '◼ FINAL' : '⚠ ERROR';

        if (state.type === 'initial') badge.setAttribute('fill', '#34d399');
        if (state.type === 'final') badge.setAttribute('fill', '#60a5fa');
        if (state.type === 'error') badge.setAttribute('fill', '#fb7185');

        g.appendChild(badge);
      }

      // Drag handling
      g.addEventListener('mousedown', (e) => this.onNodeMouseDown(e, name));
      g.addEventListener('click', () => {
        if (this.onStateClick) this.onStateClick(name);
      });

      group.appendChild(g);
    }
  }

  // ---- Render Transitions ----

  renderTransitions(group, machine) {
    // Group transitions by from-to pair for parallel edge handling
    const edgeMap = new Map();
    for (const t of machine.transitions) {
      const key = `${t.from}->${t.to}`;
      if (!edgeMap.has(key)) edgeMap.set(key, []);
      edgeMap.get(key).push(t);
    }

    for (const [key, transitions] of edgeMap) {
      const fromState = machine.states.get(transitions[0].from);
      const toState = machine.states.get(transitions[0].to);
      if (!fromState || !toState) continue;

      transitions.forEach((t, idx) => {
        const offset = (idx - (transitions.length - 1) / 2) * 18;

        if (t.isSelfLoop) {
          this.renderSelfLoopEdge(group, t, fromState, offset);
        } else {
          // Check for reverse edge
          const reverseKey = `${t.to}->${t.from}`;
          const hasReverse = edgeMap.has(reverseKey);
          this.renderCurvedEdge(group, t, fromState, toState, offset, hasReverse);
        }
      });
    }
  }

  renderCurvedEdge(group, transition, fromState, toState, offset, hasReverse) {
    const dx = toState.x - fromState.x;
    const dy = toState.y - fromState.y;
    const dist = Math.sqrt(dx * dx + dy * dy) || 1;

    // Normal vector for curve control
    const nx = -dy / dist;
    const ny = dx / dist;

    // Calculate curvature
    const curvature = hasReverse ? 30 + Math.abs(offset) : offset * 0.8;
    const cpx = (fromState.x + toState.x) / 2 + nx * curvature;
    const cpy = (fromState.y + toState.y) / 2 + ny * curvature;

    // Adjust start/end to stop at node borders
    const halfW = this.nodeWidth / 2 + 2;
    const halfH = this.nodeHeight / 2 + 2;

    const startPoint = this.getEdgeEndpoint(fromState.x, fromState.y, cpx, cpy, halfW, halfH);
    const endPoint = this.getEdgeEndpoint(toState.x, toState.y, cpx, cpy, halfW, halfH);

    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    const d = `M ${startPoint.x} ${startPoint.y} Q ${cpx} ${cpy} ${endPoint.x} ${endPoint.y}`;
    path.setAttribute('d', d);

    const isActive = this.activeTransition &&
      this.activeTransition.from === transition.from &&
      this.activeTransition.to === transition.to &&
      this.activeTransition.event === transition.event;

    path.setAttribute('class', `transition-path${isActive ? ' active' : ''}`);
    if (isActive) {
      path.setAttribute('stroke-dasharray', '8 4');
      path.style.stroke = '#60a5fa';
      path.style.markerEnd = 'url(#arrowhead-active)';
    }
    path.setAttribute('data-from', transition.from);
    path.setAttribute('data-to', transition.to);
    path.setAttribute('data-event', transition.event);
    group.appendChild(path);

    // Label
    const labelX = cpx * 0.5 + (fromState.x + toState.x) * 0.25;
    const labelY = cpy * 0.5 + (fromState.y + toState.y) * 0.25;
    this.renderEdgeLabel(group, transition.event, labelX, labelY, transition.guard);
  }

  renderSelfLoopEdge(group, transition, state, offset) {
    const loopRadius = 35;
    const angleOffset = offset * 0.3;
    const cx = state.x + 0 + angleOffset;
    const cy = state.y - this.nodeHeight / 2 - loopRadius;

    const startX = state.x - 15;
    const startY = state.y - this.nodeHeight / 2 - 2;
    const endX = state.x + 15;
    const endY = state.y - this.nodeHeight / 2 - 2;

    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    const d = `M ${startX} ${startY} C ${startX - 20} ${cy - 10}, ${endX + 20} ${cy - 10}, ${endX} ${endY}`;
    path.setAttribute('d', d);
    path.setAttribute('class', 'transition-path');
    path.setAttribute('data-event', transition.event);
    group.appendChild(path);

    // Label
    this.renderEdgeLabel(group, transition.event, cx, cy - 12, transition.guard);
  }

  renderEdgeLabel(group, event, x, y, guard) {
    const text = this.formatEventName(event);
    const fullText = guard ? `${text} [${guard}]` : text;

    // Background
    const bg = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    const textWidth = fullText.length * 6.5 + 12;
    bg.setAttribute('x', x - textWidth / 2);
    bg.setAttribute('y', y - 9);
    bg.setAttribute('width', textWidth);
    bg.setAttribute('height', 18);
    bg.setAttribute('class', 'transition-label-bg');
    group.appendChild(bg);

    // Text
    const label = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    label.setAttribute('x', x);
    label.setAttribute('y', y);
    label.setAttribute('class', 'transition-label');
    label.setAttribute('dominant-baseline', 'central');
    label.textContent = fullText;
    group.appendChild(label);
  }

  renderInitialIndicator(machine) {
    const initialState = machine.states.get(machine.initialState);
    if (!initialState) return;

    const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');

    // Small filled circle
    const cx = initialState.x - this.nodeWidth / 2 - 30;
    const cy = initialState.y;

    const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    circle.setAttribute('cx', cx);
    circle.setAttribute('cy', cy);
    circle.setAttribute('r', '6');
    circle.setAttribute('class', 'initial-indicator');
    g.appendChild(circle);

    // Arrow to state
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.setAttribute('x1', cx + 6);
    line.setAttribute('y1', cy);
    line.setAttribute('x2', initialState.x - this.nodeWidth / 2);
    line.setAttribute('y2', cy);
    line.setAttribute('stroke', '#10b981');
    line.setAttribute('stroke-width', '2');
    line.setAttribute('marker-end', 'url(#arrowhead)');
    g.appendChild(line);

    this.mainGroup.appendChild(g);
  }

  // ---- Edge Endpoint Calculation ----

  getEdgeEndpoint(stateX, stateY, targetX, targetY, halfW, halfH) {
    const dx = targetX - stateX;
    const dy = targetY - stateY;
    const absDx = Math.abs(dx) || 0.001;
    const absDy = Math.abs(dy) || 0.001;

    let scale;
    if (absDx / halfW > absDy / halfH) {
      scale = halfW / absDx;
    } else {
      scale = halfH / absDy;
    }

    return {
      x: stateX + dx * scale,
      y: stateY + dy * scale,
    };
  }

  // ---- View Fitting ----

  fitToView(machine) {
    const states = Array.from(machine.states.values());
    if (states.length === 0) return;

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const s of states) {
      minX = Math.min(minX, s.x - this.nodeWidth);
      minY = Math.min(minY, s.y - this.nodeHeight - 50);
      maxX = Math.max(maxX, s.x + this.nodeWidth);
      maxY = Math.max(maxY, s.y + this.nodeHeight);
    }

    this.viewBox = {
      x: minX - this.padding,
      y: minY - this.padding,
      w: (maxX - minX) + this.padding * 2,
      h: (maxY - minY) + this.padding * 2
    };

    this.updateViewBox();
  }

  updateViewBox() {
    this.svg.setAttribute('viewBox',
      `${this.viewBox.x} ${this.viewBox.y} ${this.viewBox.w} ${this.viewBox.h}`
    );
  }

  // ---- Interaction Events ----

  bindEvents() {
    // Pan
    this.svg.addEventListener('mousedown', (e) => {
      if (e.target === this.svg || e.target === this.mainGroup) {
        this.isPanning = true;
        this.panStart = { x: e.clientX, y: e.clientY };
        this.svg.style.cursor = 'grabbing';
      }
    });

    window.addEventListener('mousemove', (e) => {
      if (this.isPanning) {
        const dx = (e.clientX - this.panStart.x) * (this.viewBox.w / this.svg.clientWidth);
        const dy = (e.clientY - this.panStart.y) * (this.viewBox.h / this.svg.clientHeight);
        this.viewBox.x -= dx;
        this.viewBox.y -= dy;
        this.updateViewBox();
        this.panStart = { x: e.clientX, y: e.clientY };
      }

      if (this.dragTarget && this.machine) {
        const state = this.machine.states.get(this.dragTarget);
        if (state) {
          const svgRect = this.svg.getBoundingClientRect();
          const scaleX = this.viewBox.w / svgRect.width;
          const scaleY = this.viewBox.h / svgRect.height;
          state.x = this.viewBox.x + (e.clientX - svgRect.left) * scaleX + this.dragOffset.x;
          state.y = this.viewBox.y + (e.clientY - svgRect.top) * scaleY + this.dragOffset.y;
          this.render(this.machine);
        }
      }
    });

    window.addEventListener('mouseup', () => {
      this.isPanning = false;
      this.dragTarget = null;
      this.svg.style.cursor = 'grab';
    });

    // Zoom
    this.svg.addEventListener('wheel', (e) => {
      e.preventDefault();
      const factor = e.deltaY > 0 ? 1.1 : 0.9;

      const svgRect = this.svg.getBoundingClientRect();
      const mouseX = this.viewBox.x + ((e.clientX - svgRect.left) / svgRect.width) * this.viewBox.w;
      const mouseY = this.viewBox.y + ((e.clientY - svgRect.top) / svgRect.height) * this.viewBox.h;

      this.viewBox.w *= factor;
      this.viewBox.h *= factor;
      this.viewBox.x = mouseX - ((e.clientX - svgRect.left) / svgRect.width) * this.viewBox.w;
      this.viewBox.y = mouseY - ((e.clientY - svgRect.top) / svgRect.height) * this.viewBox.h;

      this.updateViewBox();
    }, { passive: false });
  }

  onNodeMouseDown(e, stateName) {
    e.stopPropagation();
    this.dragTarget = stateName;

    const state = this.machine?.states.get(stateName);
    if (state) {
      const svgRect = this.svg.getBoundingClientRect();
      const scaleX = this.viewBox.w / svgRect.width;
      const scaleY = this.viewBox.h / svgRect.height;
      const mouseX = this.viewBox.x + (e.clientX - svgRect.left) * scaleX;
      const mouseY = this.viewBox.y + (e.clientY - svgRect.top) * scaleY;
      this.dragOffset = { x: state.x - mouseX, y: state.y - mouseY };
    }
  }

  // ---- Simulator Integration ----

  setActiveState(stateName) {
    this.activeState = stateName;
    if (this.machine) this.render(this.machine);
  }

  setActiveTransition(transition) {
    this.activeTransition = transition;
    if (this.machine) {
      this.render(this.machine);
      // Clear after animation
      setTimeout(() => {
        this.activeTransition = null;
        this.render(this.machine);
      }, 1200);
    }
  }

  clearActive() {
    this.activeState = null;
    this.activeTransition = null;
    if (this.machine) this.render(this.machine);
  }

  // ---- Zoom Controls ----

  zoomIn() {
    const cx = this.viewBox.x + this.viewBox.w / 2;
    const cy = this.viewBox.y + this.viewBox.h / 2;
    this.viewBox.w *= 0.85;
    this.viewBox.h *= 0.85;
    this.viewBox.x = cx - this.viewBox.w / 2;
    this.viewBox.y = cy - this.viewBox.h / 2;
    this.updateViewBox();
  }

  zoomOut() {
    const cx = this.viewBox.x + this.viewBox.w / 2;
    const cy = this.viewBox.y + this.viewBox.h / 2;
    this.viewBox.w *= 1.2;
    this.viewBox.h *= 1.2;
    this.viewBox.x = cx - this.viewBox.w / 2;
    this.viewBox.y = cy - this.viewBox.h / 2;
    this.updateViewBox();
  }

  resetZoom() {
    if (this.machine) this.fitToView(this.machine);
  }

  // ---- Export ----

  exportSVG() {
    const clone = this.svg.cloneNode(true);
    // Add inline styles for export
    const styleEl = document.createElementNS('http://www.w3.org/2000/svg', 'style');
    styleEl.textContent = `
      .state-bg-normal { fill: #1e293b; stroke: #334155; stroke-width: 2; }
      .state-bg-initial { fill: rgba(16,185,129,0.1); stroke: #10b981; stroke-width: 2.5; }
      .state-bg-final { fill: rgba(59,130,246,0.1); stroke: #3b82f6; stroke-width: 2.5; }
      .state-bg-error { fill: rgba(239,68,68,0.1); stroke: #ef4444; stroke-width: 2.5; }
      .state-label { fill: #f1f5f9; font-family: Inter, sans-serif; font-size: 13px; font-weight: 600; text-anchor: middle; dominant-baseline: central; }
      .state-type-badge { fill: #64748b; font-family: Inter, sans-serif; font-size: 9px; font-weight: 600; text-anchor: middle; }
      .transition-path { fill: none; stroke: #475569; stroke-width: 1.5; }
      .transition-label { fill: #94a3b8; font-family: 'JetBrains Mono', monospace; font-size: 11px; text-anchor: middle; }
      .transition-label-bg { fill: #030712; opacity: 0.85; }
      .initial-indicator { fill: #10b981; }
    `;
    clone.insertBefore(styleEl, clone.firstChild);

    const serializer = new XMLSerializer();
    const svgString = serializer.serializeToString(clone);
    return svgString;
  }

  // ---- Helpers ----

  formatStateName(name) {
    return name.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  }

  formatEventName(name) {
    return name.replace(/_/g, ' ');
  }
}
