// ============================================================
// StateCraft — Interactive State Machine Simulator
// Walk through states, fire events, see animated transitions
// ============================================================

export class Simulator {
  /**
   * @param {import('./stateMachine.js').StateMachine} machine
   */
  constructor(machine) {
    this.machine = machine;
    this.currentState = machine.initialState || machine.getStateNames()[0] || null;
    this.history = [];
    this.startTime = Date.now();

    // Callbacks
    this.onStateChange = null;
    this.onTransition = null;
  }

  get state() { return this.currentState; }

  /**
   * Get available events from current state
   * @returns {Array<{event: string, target: string, guard: string|null}>}
   */
  getAvailableEvents() {
    if (!this.currentState) return [];
    return this.machine.getTransitionsFrom(this.currentState).map(t => ({
      event: t.event,
      target: t.to,
      guard: t.guard,
    }));
  }

  /**
   * Check if the current state is a dead end
   */
  isDeadEnd() {
    if (!this.currentState) return true;
    const stateNode = this.machine.getState(this.currentState);
    if (stateNode?.type === 'final') return false; // Final is expected
    return this.getAvailableEvents().length === 0;
  }

  /**
   * Check if the current state is a final state
   */
  isFinalState() {
    if (!this.currentState) return false;
    return this.machine.finalStates.has(this.currentState);
  }

  /**
   * Fire an event and transition
   * @param {string} event
   * @returns {{success: boolean, from: string, to: string, event: string}|null}
   */
  send(event) {
    if (!this.currentState) return null;

    const transitions = this.machine.getTransitionsFrom(this.currentState)
      .filter(t => t.event === event);

    if (transitions.length === 0) return null;

    // Take the first valid transition
    const transition = transitions[0];
    const from = this.currentState;
    const to = transition.to;

    const entry = {
      from,
      to,
      event,
      timestamp: Date.now() - this.startTime,
      step: this.history.length + 1,
    };

    this.history.push(entry);
    this.currentState = to;

    if (this.onTransition) this.onTransition(entry);
    if (this.onStateChange) this.onStateChange(to, entry);

    return entry;
  }

  /**
   * Reset to initial state
   */
  reset() {
    this.currentState = this.machine.initialState || this.machine.getStateNames()[0] || null;
    this.history = [];
    this.startTime = Date.now();
    if (this.onStateChange) this.onStateChange(this.currentState, null);
  }

  /**
   * Step back one transition (undo)
   */
  stepBack() {
    if (this.history.length === 0) return false;
    const last = this.history.pop();
    this.currentState = last.from;
    if (this.onStateChange) this.onStateChange(this.currentState, null);
    return true;
  }

  /**
   * Format timestamp for display
   */
  formatTime(ms) {
    const seconds = Math.floor(ms / 1000);
    const millis = ms % 1000;
    return `${seconds}.${String(millis).padStart(3, '0')}s`;
  }
}
