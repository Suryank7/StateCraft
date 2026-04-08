// ============================================================
// StateCraft — State Machine Analyzer
// Deep graph analysis: reachability, dead-ends, determinism,
// coverage, cycles, and actionable recommendations
// ============================================================

export class Analyzer {
  /**
   * Perform comprehensive analysis on a state machine
   * @param {import('./stateMachine.js').StateMachine} machine
   * @returns {AnalysisResult}
   */
  analyze(machine) {
    const issues = [];
    const stats = {
      stateCount: machine.states.size,
      transitionCount: machine.transitions.length,
      eventCount: machine.getAllEvents().length,
      complexity: machine.getComplexityScore(),
    };

    if (machine.states.size === 0) {
      return { issues: [{ severity: 'critical', title: 'Empty Machine', desc: 'No states defined.' }], stats, coverageMatrix: [] };
    }

    // 1. Unreachable states
    issues.push(...this.checkReachability(machine));

    // 2. Dead-end states
    issues.push(...this.checkDeadEnds(machine));

    // 3. Non-determinism
    issues.push(...this.checkDeterminism(machine));

    // 4. Completeness (missing event handlers)
    issues.push(...this.checkCompleteness(machine));

    // 5. Cycle detection
    issues.push(...this.checkCycles(machine));

    // 6. Missing initial state
    if (!machine.initialState) {
      issues.push({
        severity: 'critical',
        title: 'No Initial State',
        desc: 'Every state machine needs a defined starting state.',
        fix: 'Add "starts in <state>" to your description.'
      });
    }

    // 7. Single-state machine
    if (machine.states.size === 1) {
      issues.push({
        severity: 'info',
        title: 'Single State Machine',
        desc: 'Machine has only one state. This is a trivially simple machine.',
      });
    }

    // 8. No transitions at all
    if (machine.transitions.length === 0 && machine.states.size > 1) {
      issues.push({
        severity: 'critical',
        title: 'No Transitions',
        desc: 'States are defined but there are no transitions between them.',
        fix: 'Add transitions like "From X, event goes to Y".'
      });
    }

    // 9. Success: all good!
    if (issues.length === 0) {
      issues.push({
        severity: 'success',
        title: 'All Checks Passed',
        desc: 'Your state machine has no detectable issues. Well designed!',
      });
    }

    // Build coverage matrix
    const coverageMatrix = this.buildCoverageMatrix(machine);

    return { issues, stats, coverageMatrix };
  }

  // ---- 1. Reachability Analysis (BFS) ----

  checkReachability(machine) {
    const issues = [];
    if (!machine.initialState) return issues;

    const reachable = machine.getReachableStates();
    for (const [name] of machine.states) {
      if (!reachable.has(name)) {
        issues.push({
          severity: 'critical',
          title: `Unreachable State: "${name}"`,
          desc: `State "${name}" cannot be reached from the initial state "${machine.initialState}". It will never be entered.`,
          fix: `Add a transition from a reachable state to "${name}", or remove it.`,
          relatedStates: [name],
        });
      }
    }
    return issues;
  }

  // ---- 2. Dead-End Detection ----

  checkDeadEnds(machine) {
    const issues = [];
    for (const [name, state] of machine.states) {
      if (state.type === 'final') continue; // Finals are expected dead-ends

      const outgoing = machine.getTransitionsFrom(name);
      if (outgoing.length === 0) {
        issues.push({
          severity: 'warning',
          title: `Dead-End State: "${name}"`,
          desc: `State "${name}" has no outgoing transitions. Once entered, the user is stuck.`,
          fix: `Add a transition from "${name}" to another state, or mark it as a final state.`,
          relatedStates: [name],
        });
      }
    }
    return issues;
  }

  // ---- 3. Non-Determinism Check ----

  checkDeterminism(machine) {
    const issues = [];
    const transMap = new Map();

    for (const t of machine.transitions) {
      const key = `${t.from}:${t.event}`;
      if (!transMap.has(key)) transMap.set(key, []);
      transMap.get(key).push(t);
    }

    for (const [key, transitions] of transMap) {
      if (transitions.length > 1) {
        // Check if they have guards (guarded transitions are OK)
        const unguarded = transitions.filter(t => !t.guard);
        if (unguarded.length > 1) {
          const [state, event] = key.split(':');
          const targets = unguarded.map(t => `"${t.to}"`).join(', ');
          issues.push({
            severity: 'warning',
            title: `Non-Deterministic Transition`,
            desc: `Event "${event}" in state "${state}" leads to multiple states: ${targets}. This creates ambiguity.`,
            fix: `Add guard conditions to differentiate, e.g., "if success go to X", "if failure go to Y".`,
            relatedStates: [state, ...unguarded.map(t => t.to)],
          });
        }
      }
    }
    return issues;
  }

  // ---- 4. Completeness Check ----

  checkCompleteness(machine) {
    const issues = [];
    const allEvents = machine.getAllEvents();
    if (allEvents.length === 0) return issues;

    const stateNames = machine.getStateNames();
    const missingHandlers = [];

    for (const state of stateNames) {
      const stateNode = machine.getState(state);
      if (stateNode?.type === 'final') continue; // Finals don't need handlers

      const handledEvents = new Set(machine.getTransitionsFrom(state).map(t => t.event));
      const missing = allEvents.filter(e => !handledEvents.has(e));

      if (missing.length > 0 && missing.length < allEvents.length) {
        missingHandlers.push({ state, missing });
      }
    }

    if (missingHandlers.length > 0) {
      const total = missingHandlers.reduce((sum, m) => sum + m.missing.length, 0);
      issues.push({
        severity: 'info',
        title: `${total} Unhandled Event${total > 1 ? 's' : ''} Found`,
        desc: `Some states don't handle all known events. Check the coverage matrix below for details.`,
        fix: 'Consider adding explicit handlers or ignoring intentionally unhandled events.',
      });
    }

    return issues;
  }

  // ---- 5. Cycle Detection (DFS) ----

  checkCycles(machine) {
    const issues = [];
    const adj = machine.toAdjacencyList();
    const visited = new Set();
    const inStack = new Set();
    const cycles = [];

    const dfs = (node, path) => {
      visited.add(node);
      inStack.add(node);
      path.push(node);

      for (const { to } of (adj.get(node) || [])) {
        if (!visited.has(to)) {
          dfs(to, [...path]);
        } else if (inStack.has(to)) {
          const cycleStart = path.indexOf(to);
          if (cycleStart >= 0) {
            const cycle = path.slice(cycleStart);
            cycle.push(to);
            const cycleKey = [...cycle].sort().join(',');
            if (!cycles.some(c => [...c].sort().join(',') === cycleKey)) {
              cycles.push(cycle);
            }
          }
        }
      }

      inStack.delete(node);
    };

    for (const state of machine.getStateNames()) {
      if (!visited.has(state)) {
        dfs(state, []);
      }
    }

    if (cycles.length > 0) {
      for (const cycle of cycles.slice(0, 3)) { // Limit to 3
        const cycleStr = cycle.map(s => `"${s}"`).join(' → ');
        issues.push({
          severity: 'info',
          title: 'Cycle Detected',
          desc: `States form a cycle: ${cycleStr}. Cycles are normal in many UI flows but can cause infinite loops if not properly guarded.`,
          relatedStates: cycle,
        });
      }
    }

    return issues;
  }

  // ---- Coverage Matrix ----

  buildCoverageMatrix(machine) {
    const states = machine.getStateNames();
    const events = machine.getAllEvents();
    if (states.length === 0 || events.length === 0) return [];

    const matrix = [];
    for (const state of states) {
      const stateNode = machine.getState(state);
      const row = { state, type: stateNode?.type || 'normal', events: {} };
      const handledEvents = machine.getTransitionsFrom(state);

      for (const event of events) {
        const handler = handledEvents.find(t => t.event === event);
        row.events[event] = handler ? handler.to : null;
      }

      matrix.push(row);
    }

    return matrix;
  }
}
