// ============================================================
// StateCraft — Core State Machine Data Model
// Formal representation of finite state machines
// ============================================================

export class StateNode {
  /**
   * @param {string} name - Unique state name
   * @param {'normal'|'initial'|'final'|'error'} type
   */
  constructor(name, type = 'normal') {
    this.name = name;
    this.type = type;
    this.meta = {};
    // Layout positions (set by diagram renderer)
    this.x = 0;
    this.y = 0;
  }

  get isInitial() { return this.type === 'initial'; }
  get isFinal() { return this.type === 'final'; }
  get isError() { return this.type === 'error'; }
}

export class Transition {
  /**
   * @param {string} from - Source state name
   * @param {string} to - Target state name
   * @param {string} event - Event name triggering transition
   * @param {string|null} guard - Optional guard condition
   * @param {string|null} action - Optional side effect
   */
  constructor(from, to, event, guard = null, action = null) {
    this.from = from;
    this.to = to;
    this.event = event;
    this.guard = guard;
    this.action = action;
  }

  get isSelfLoop() { return this.from === this.to; }
}

export class StateMachine {
  /**
   * @param {string} id - Machine identifier
   */
  constructor(id = 'untitled') {
    this.id = id;
    /** @type {Map<string, StateNode>} */
    this.states = new Map();
    /** @type {Transition[]} */
    this.transitions = [];
    /** @type {string|null} */
    this.initialState = null;
    /** @type {Set<string>} */
    this.finalStates = new Set();
  }

  // ---- State Management ----

  addState(name, type = 'normal') {
    const normalized = name.trim().toLowerCase().replace(/\s+/g, '_');
    if (!this.states.has(normalized)) {
      this.states.set(normalized, new StateNode(normalized, type));
    } else {
      // Upgrade type if needed (e.g., normal -> initial)
      const existing = this.states.get(normalized);
      if (type !== 'normal' && existing.type === 'normal') {
        existing.type = type;
      }
    }
    if (type === 'initial') this.initialState = normalized;
    if (type === 'final') this.finalStates.add(normalized);
    if (type === 'error') this.states.get(normalized).type = 'error';
    return normalized;
  }

  addTransition(from, to, event, guard = null, action = null) {
    const fromNorm = from.trim().toLowerCase().replace(/\s+/g, '_');
    const toNorm = to.trim().toLowerCase().replace(/\s+/g, '_');
    const eventNorm = event.trim().toLowerCase().replace(/\s+/g, '_');

    // Auto-create states if they don't exist
    if (!this.states.has(fromNorm)) this.addState(fromNorm);
    if (!this.states.has(toNorm)) this.addState(toNorm);

    // Avoid exact duplicates
    const exists = this.transitions.some(
      t => t.from === fromNorm && t.to === toNorm && t.event === eventNorm
    );
    if (!exists) {
      this.transitions.push(new Transition(fromNorm, toNorm, eventNorm, guard, action));
    }
  }

  // ---- Query Methods ----

  getState(name) {
    return this.states.get(name.trim().toLowerCase().replace(/\s+/g, '_'));
  }

  getStateNames() {
    return Array.from(this.states.keys());
  }

  getTransitionsFrom(stateName) {
    const norm = stateName.trim().toLowerCase().replace(/\s+/g, '_');
    return this.transitions.filter(t => t.from === norm);
  }

  getTransitionsTo(stateName) {
    const norm = stateName.trim().toLowerCase().replace(/\s+/g, '_');
    return this.transitions.filter(t => t.to === norm);
  }

  getAllEvents() {
    return [...new Set(this.transitions.map(t => t.event))];
  }

  // ---- Graph Operations ----

  /**
   * Build adjacency list representation
   * @returns {Map<string, Array<{to: string, event: string}>>}
   */
  toAdjacencyList() {
    const adj = new Map();
    for (const name of this.states.keys()) {
      adj.set(name, []);
    }
    for (const t of this.transitions) {
      adj.get(t.from)?.push({ to: t.to, event: t.event });
    }
    return adj;
  }

  /**
   * Get reachable states from initial state via BFS
   * @returns {Set<string>}
   */
  getReachableStates() {
    if (!this.initialState) return new Set(this.states.keys());
    const visited = new Set();
    const queue = [this.initialState];
    visited.add(this.initialState);
    const adj = this.toAdjacencyList();

    while (queue.length > 0) {
      const current = queue.shift();
      for (const edge of (adj.get(current) || [])) {
        if (!visited.has(edge.to)) {
          visited.add(edge.to);
          queue.push(edge.to);
        }
      }
    }
    return visited;
  }

  // ---- Validation ----

  validate() {
    const errors = [];

    if (this.states.size === 0) {
      errors.push('No states defined');
    }

    if (!this.initialState) {
      errors.push('No initial state defined');
    } else if (!this.states.has(this.initialState)) {
      errors.push(`Initial state "${this.initialState}" does not exist`);
    }

    for (const t of this.transitions) {
      if (!this.states.has(t.from)) {
        errors.push(`Transition references non-existent state: "${t.from}"`);
      }
      if (!this.states.has(t.to)) {
        errors.push(`Transition references non-existent state: "${t.to}"`);
      }
    }

    return { valid: errors.length === 0, errors };
  }

  // ---- Complexity Scoring ----

  getComplexityScore() {
    const S = this.states.size;
    const T = this.transitions.length;
    const E = this.getAllEvents().length;

    if (S <= 3 && T <= 4) return { level: 'simple', score: 1, label: 'Simple' };
    if (S <= 6 && T <= 12) return { level: 'moderate', score: 2, label: 'Moderate' };
    return { level: 'complex', score: 3, label: 'Complex' };
  }

  // ---- Serialization ----

  toJSON() {
    return {
      id: this.id,
      initialState: this.initialState,
      finalStates: [...this.finalStates],
      states: Object.fromEntries(
        Array.from(this.states.entries()).map(([k, v]) => [k, { type: v.type, meta: v.meta }])
      ),
      transitions: this.transitions.map(t => ({
        from: t.from, to: t.to, event: t.event, guard: t.guard, action: t.action
      }))
    };
  }

  static fromJSON(json) {
    const sm = new StateMachine(json.id);
    for (const [name, data] of Object.entries(json.states)) {
      sm.addState(name, data.type);
      const node = sm.getState(name);
      if (node && data.meta) node.meta = data.meta;
    }
    sm.initialState = json.initialState;
    sm.finalStates = new Set(json.finalStates || []);
    for (const t of json.transitions) {
      sm.addTransition(t.from, t.to, t.event, t.guard, t.action);
    }
    return sm;
  }

  /**
   * Encode state machine into a URL-safe hash string
   */
  toURLHash() {
    try {
      const json = JSON.stringify(this.toJSON());
      return btoa(encodeURIComponent(json));
    } catch {
      return '';
    }
  }

  static fromURLHash(hash) {
    try {
      const json = JSON.parse(decodeURIComponent(atob(hash)));
      return StateMachine.fromJSON(json);
    } catch {
      return null;
    }
  }

  /**
   * Export to Mermaid stateDiagram-v2 syntax
   */
  toMermaid() {
    const lines = ['stateDiagram-v2'];

    if (this.initialState) {
      lines.push(`    [*] --> ${this.initialState}`);
    }

    for (const t of this.transitions) {
      const label = t.guard ? `${t.event} [${t.guard}]` : t.event;
      lines.push(`    ${t.from} --> ${t.to} : ${label}`);
    }

    for (const final of this.finalStates) {
      lines.push(`    ${final} --> [*]`);
    }

    return lines.join('\n');
  }
}
