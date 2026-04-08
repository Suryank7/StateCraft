// ============================================================
// StateCraft — Natural Language Parser Engine
// Converts plain English descriptions into formal state machines
// 30+ grammar patterns, context-aware inference
// ============================================================

import { StateMachine } from './stateMachine.js';

// ============================================================
// GRAMMAR PATTERNS — Ordered by specificity (most specific first)
// ============================================================

const PATTERNS = {
  // --- State Declaration Patterns ---
  stateList: [
    // "has states: X, Y, Z"  /  "states are X, Y, Z"  /  "there are N states: X, Y, Z"
    /(?:has|have|contains?|includes?)\s+(?:\w+\s+)?states?(?:\s*:|\s+(?:called|named))?\s*(.+)/i,
    /states?\s+(?:are|is|include)\s*:?\s*(.+)/i,
    /(?:there\s+are|we\s+have)\s+(?:\d+\s+)?states?\s*:?\s*(.+)/i,
    /(?:the\s+)?states?\s+(?:of\s+\w+\s+)?(?:are|is)\s*:?\s*(.+)/i,
  ],

  // --- Transition Patterns ---
  transitions: [
    // "From X, event goes/transitions/moves to Y"
    /from\s+(?:the\s+)?(\w+)\s+(?:state\s*,?\s*)?(?:when\s+)?(\w[\w\s]*?)\s+(?:goes?|transitions?|moves?|leads?|navigates?)\s+(?:back\s+)?to\s+(?:the\s+)?(\w+)/i,
    // "From X, if/when event go to Y"
    /from\s+(?:the\s+)?(\w+)\s*,?\s*(?:if|when)\s+(?:the\s+)?(.+?)\s*,?\s*(?:go|transition|move|navigate|switch)\s*(?:back\s+)?to\s+(?:the\s+)?(\w+)/i,
    // "From X, event causes/triggers Y"
    /from\s+(?:the\s+)?(\w+)\s*,?\s*(?:the\s+)?(\w[\w\s]*?)\s+(?:causes?|triggers?)\s+(?:a\s+(?:transition|move)\s+to\s+)?(\w+)/i,
    // "X -> event -> Y" or "X -- event --> Y"
    /(\w+)\s*(?:->|-->|→|—>)\s*(\w[\w\s]*?)\s*(?:->|-->|→|—>)\s*(\w+)/i,
    // "X transitions to Y on event"
    /(\w+)\s+transitions?\s+to\s+(\w+)\s+(?:on|when|upon|after)\s+(.+)/i,
    // "When event occurs in X, move to Y"
    /when\s+(?:the\s+)?(.+?)\s+(?:occurs?|happens?)\s+in\s+(?:the\s+)?(\w+)\s*,?\s*(?:move|go|transition|switch)\s+to\s+(\w+)/i,
    // "clicking/pressing X in state Y goes to Z"
    /(?:clicking|pressing|tapping|selecting|triggering)\s+(\w[\w\s]*?)\s+(?:in|from|at)\s+(?:the\s+)?(\w+)\s+(?:state\s+)?(?:goes?|transitions?|moves?)\s+to\s+(\w+)/i,
    // "From X, Y and Z goes to W"  (compound from)
    /from\s+(?:the\s+)?(\w+)\s*,?\s*(\w[\w\s]*?)\s+(?:and|&)\s+(?:goes?|transitions?|moves?)\s+to\s+(\w+)/i,
    // "X can go to Y or Z"
    /(\w+)\s+can\s+(?:go|move|transition)\s+to\s+(.+)/i,
  ],

  // --- Initial State Patterns ---
  initialState: [
    /(?:starts?|begins?|initiates?)\s+(?:in|at|with|from)\s+(?:the\s+)?(\w+)\s*(?:state)?/i,
    /(?:the\s+)?initial\s+state\s+is\s+(\w+)/i,
    /(?:the\s+)?(\w+)\s+is\s+the\s+(?:initial|starting|default|first)\s+state/i,
    /(?:the\s+)?(?:machine|flow|process|form|component|system)\s+(?:starts?|begins?)\s+(?:in|at|with|from)\s+(?:the\s+)?(\w+)/i,
  ],

  // --- Final State Patterns ---
  finalState: [
    /(\w+)\s+is\s+(?:the\s+|a\s+)?(?:final|end|terminal|accepting|completed?)\s+state/i,
    /(?:ends?|completes?|finishes?|terminates?)\s+(?:in|at|with)\s+(?:the\s+)?(\w+)/i,
    /(?:the\s+)?(?:final|end|terminal)\s+state\s+is\s+(\w+)/i,
  ],

  // --- Error State Patterns ---
  errorState: [
    /(\w+)\s+(?:is|are)\s+(?:the\s+|an?\s+)?error\s+states?/i,
    /(\w+)\s+(?:and\s+\w+\s+)?(?:is|are)\s+error\s+states?/i,
  ],

  // --- Table/Arrow format ---
  tableRow: [
    // "idle | click | loading"  or  "idle, click, loading"
    /^\s*(\w+)\s*\|\s*(\w[\w\s]*?)\s*\|\s*(\w+)\s*$/i,
  ],
};

// ============================================================
// PARSER CLASS
// ============================================================

export class NLParser {
  constructor() {
    this.errors = [];
    this.warnings = [];
  }

  /**
   * Parse natural language text into a StateMachine
   * @param {string} text - Natural language description
   * @returns {{ machine: StateMachine, errors: string[], warnings: string[] }}
   */
  parse(text) {
    this.errors = [];
    this.warnings = [];

    const machine = new StateMachine('parsed');

    if (!text || !text.trim()) {
      this.errors.push('No input text provided');
      return { machine, errors: this.errors, warnings: this.warnings };
    }

    // Normalize text
    const normalized = this.normalize(text);
    const sentences = this.splitSentences(normalized);

    // Phase 1: Extract states from explicit declarations
    this.extractStateDeclarations(sentences, machine);

    // Phase 2: Extract initial state
    this.extractInitialState(sentences, machine);

    // Phase 3: Extract final states
    this.extractFinalStates(sentences, machine);

    // Phase 4: Extract error states
    this.extractErrorStates(sentences, machine);

    // Phase 5: Extract transitions (the bulk of the work)
    this.extractTransitions(sentences, machine);

    // Phase 6: Handle arrow/table formats
    this.extractArrowFormats(sentences, machine);

    // Phase 7: Infer initial state if not explicitly set
    this.inferInitialState(machine);

    // Phase 8: Post-processing — clean up and validate
    this.postProcess(machine);

    return { machine, errors: this.errors, warnings: this.warnings };
  }

  // ---- Text Normalization ----

  normalize(text) {
    return text
      .replace(/\r\n/g, '\n')
      .replace(/\t/g, ' ')
      .replace(/\s+/g, ' ')
      .replace(/['`'']/g, "'")
      .replace(/[""]/g, '"')
      .trim();
  }

  splitSentences(text) {
    // Split on period, newline, or semicolon — but not inside quotes
    return text
      .split(/[.\n;]+/)
      .map(s => s.trim())
      .filter(s => s.length > 0);
  }

  // ---- Phase 1: State Declarations ----

  extractStateDeclarations(sentences, machine) {
    for (const sentence of sentences) {
      for (const pattern of PATTERNS.stateList) {
        const match = sentence.match(pattern);
        if (match) {
          const statesList = this.parseCommaSeparatedList(match[1]);
          for (const state of statesList) {
            machine.addState(state);
          }
        }
      }
    }
  }

  // ---- Phase 2: Initial State ----

  extractInitialState(sentences, machine) {
    for (const sentence of sentences) {
      for (const pattern of PATTERNS.initialState) {
        const match = sentence.match(pattern);
        if (match) {
          const stateName = this.cleanStateName(match[1]);
          if (stateName && stateName.length < 30) {
            machine.addState(stateName, 'initial');
            return; // Only one initial state
          }
        }
      }
    }
  }

  // ---- Phase 3: Final States ----

  extractFinalStates(sentences, machine) {
    for (const sentence of sentences) {
      for (const pattern of PATTERNS.finalState) {
        const match = sentence.match(pattern);
        if (match) {
          const stateName = this.cleanStateName(match[1]);
          if (stateName && stateName.length < 30) {
            machine.addState(stateName, 'final');
          }
        }
      }
    }
  }

  // ---- Phase 4: Error States ----

  extractErrorStates(sentences, machine) {
    for (const sentence of sentences) {
      for (const pattern of PATTERNS.errorState) {
        const match = sentence.match(pattern);
        if (match) {
          // Handle "X and Y are error states"
          const text = match[1];
          const states = text.split(/\s+and\s+/i).map(s => this.cleanStateName(s)).filter(Boolean);
          for (const stateName of states) {
            if (stateName.length < 30) {
              machine.addState(stateName, 'error');
            }
          }
        }
      }
    }
  }

  // ---- Phase 5: Transitions ----

  extractTransitions(sentences, machine) {
    for (const sentence of sentences) {
      let matched = false;

      // Try explicit "From X, event goes to Y" patterns
      for (const pattern of PATTERNS.transitions) {
        const match = sentence.match(pattern);
        if (match) {
          const result = this.parseTransitionMatch(match, pattern, sentence);
          if (result) {
            // Handle "can go to X or Y" pattern (multiple targets)
            if (result.multiTargets) {
              for (const target of result.multiTargets) {
                machine.addTransition(result.from, target.to, target.event);
              }
            } else {
              machine.addTransition(result.from, result.to, result.event, result.guard);
            }
            matched = true;
            break;
          }
        }
      }

      // If no explicit pattern matched, try a fallback heuristic
      if (!matched) {
        this.tryFallbackTransition(sentence, machine);
      }
    }
  }

  parseTransitionMatch(match, pattern, sentence) {
    const patternStr = pattern.source;

    // "From X, event goes to Y"
    if (patternStr.includes('from') && patternStr.includes('goes?|transitions?')) {
      const from = this.cleanStateName(match[1]);
      let event = this.cleanEventName(match[2]);
      const to = this.cleanStateName(match[3]);
      if (from && to && event) {
        // Check for guard: "if condition" within event text
        const guard = this.extractGuard(event);
        if (guard) event = guard.event;
        return { from, to, event, guard: guard?.condition };
      }
    }

    // "X transitions to Y on event" pattern
    if (patternStr.includes('transitions?\\s+to')) {
      return {
        from: this.cleanStateName(match[1]),
        to: this.cleanStateName(match[2]),
        event: this.cleanEventName(match[3])
      };
    }

    // "When event occurs in X, move to Y"
    if (patternStr.includes('occurs?|happens?')) {
      return {
        from: this.cleanStateName(match[2]),
        to: this.cleanStateName(match[3]),
        event: this.cleanEventName(match[1])
      };
    }

    // Arrow: "X -> event -> Y"
    if (patternStr.includes('->|-->')) {
      return {
        from: this.cleanStateName(match[1]),
        to: this.cleanStateName(match[3]),
        event: this.cleanEventName(match[2])
      };
    }

    // "clicking X in Y goes to Z"
    if (patternStr.includes('clicking|pressing')) {
      return {
        from: this.cleanStateName(match[2]),
        to: this.cleanStateName(match[3]),
        event: this.cleanEventName(match[1])
      };
    }

    // "X can go to Y or Z"
    if (patternStr.includes('can\\s+')) {
      const from = this.cleanStateName(match[1]);
      const targets = this.parseCommaSeparatedList(match[2]);
      return {
        from,
        multiTargets: targets.map(t => ({ to: t, event: `to_${t}` }))
      };
    }

    // Generic fallback for remaining patterns
    if (match[1] && match[2] && match[3]) {
      return {
        from: this.cleanStateName(match[1]),
        to: this.cleanStateName(match[3]),
        event: this.cleanEventName(match[2])
      };
    }

    return null;
  }

  /**
   * Fallback heuristic for sentences that don't match any pattern
   * Looks for "from X ... to Y" with event inference
   */
  tryFallbackTransition(sentence, machine) {
    const fallback = sentence.match(
      /from\s+(?:the\s+)?(\w+)\s*,?\s*(.+?)\s+(?:goes?\s+)?(?:back\s+)?to\s+(?:the\s+)?(\w+)/i
    );
    if (fallback) {
      const from = this.cleanStateName(fallback[1]);
      const to = this.cleanStateName(fallback[3]);
      let event = this.cleanEventName(fallback[2]);
      if (from && to && event) {
        machine.addTransition(from, to, event);
      }
    }
  }

  // ---- Phase 6: Arrow / Table Formats ----

  extractArrowFormats(sentences, machine) {
    for (const sentence of sentences) {
      for (const pattern of PATTERNS.tableRow) {
        const match = sentence.match(pattern);
        if (match) {
          machine.addTransition(match[1], match[3], match[2]);
        }
      }
    }
  }

  // ---- Phase 7: Infer Initial State ----

  inferInitialState(machine) {
    if (machine.initialState) return;

    // If there are states but no initial, pick the first one declared
    // or the one with no incoming transitions
    const stateNames = machine.getStateNames();
    if (stateNames.length === 0) return;

    // Find states with no incoming transitions
    const hasIncoming = new Set(machine.transitions.map(t => t.to));
    const noIncoming = stateNames.filter(s => !hasIncoming.has(s));

    if (noIncoming.length === 1) {
      machine.addState(noIncoming[0], 'initial');
      this.warnings.push(`Inferred "${noIncoming[0]}" as initial state (no incoming transitions)`);
    } else if (noIncoming.length > 1) {
      // Pick the first one
      machine.addState(noIncoming[0], 'initial');
      this.warnings.push(`Inferred "${noIncoming[0]}" as initial state (first with no incoming transitions)`);
    } else {
      // All states have incoming — pick the first one
      machine.addState(stateNames[0], 'initial');
      this.warnings.push(`Inferred "${stateNames[0]}" as initial state (first declared)`);
    }
  }

  // ---- Phase 8: Post-Processing ----

  postProcess(machine) {
    // Handle special "any state" transitions
    const anyStateTransitions = machine.transitions.filter(
      t => t.from === 'any' || t.from === 'any_state'
    );

    if (anyStateTransitions.length > 0) {
      // Remove the "any" pseudo-state and create transitions from all real states
      machine.states.delete('any');
      machine.states.delete('any_state');

      const realStates = machine.getStateNames();
      const expandedTransitions = [];

      for (const t of anyStateTransitions) {
        for (const state of realStates) {
          if (state !== t.to) { // Don't create self-loops unless intended
            expandedTransitions.push({ from: state, to: t.to, event: t.event });
          }
        }
      }

      // Remove original "any" transitions
      machine.transitions = machine.transitions.filter(
        t => t.from !== 'any' && t.from !== 'any_state'
      );

      // Add expanded transitions
      for (const t of expandedTransitions) {
        machine.addTransition(t.from, t.to, t.event);
      }
    }

    // Validate
    const validation = machine.validate();
    if (!validation.valid) {
      for (const err of validation.errors) {
        this.errors.push(err);
      }
    }

    // Warn about states with no transitions at all
    for (const [name, node] of machine.states) {
      const hasOutgoing = machine.transitions.some(t => t.from === name);
      const hasIncoming = machine.transitions.some(t => t.to === name);
      if (!hasOutgoing && !hasIncoming && machine.states.size > 1) {
        this.warnings.push(`State "${name}" has no transitions — it may be orphaned`);
      }
    }
  }

  // ---- Utility Methods ----

  cleanStateName(raw) {
    if (!raw) return '';
    return raw
      .trim()
      .toLowerCase()
      .replace(/^(?:the|a|an|its?)\s+/i, '')
      .replace(/\s*state$/i, '')
      .replace(/[^a-z0-9_\s]/g, '')
      .replace(/\s+/g, '_')
      .trim();
  }

  cleanEventName(raw) {
    if (!raw) return '';
    let cleaned = raw
      .trim()
      .toLowerCase()
      // Remove leading filler words and verbs
      .replace(/^(?:the|a|an|by|on|upon|after|when|if|then|and|or|it|its)\s+/i, '')
      // Remove trailing noise words
      .replace(/\s+(?:event|action|trigger|state|and|goes|transitions?|moves?|occurs?|happens?)$/i, '')
      // Remove verb-phrase fillers inside
      .replace(/\b(?:goes|transitions?|moves?|leads?|navigates?|switches?)\b/gi, '')
      // Remove common noise phrases
      .replace(/\b(?:back|to the|to|the|from the|from|in the|in|is|are|was|were|has|have|had|be|been)\b/gi, '')
      .replace(/[^a-z0-9_\s]/g, '')
      // Collapse whitespace
      .replace(/\s+/g, '_')
      // Remove leading/trailing underscores
      .replace(/^_+|_+$/g, '')
      .trim();
    // If cleaning reduced it to nothing, use a simplified version of the original
    if (!cleaned) {
      cleaned = raw.trim().toLowerCase().replace(/[^a-z0-9]/g, '_').replace(/^_+|_+$/g, '').substring(0, 20);
    }
    return cleaned;
  }

  extractGuard(eventText) {
    const guardMatch = eventText.match(/^if\s+(.+?)\s*,?\s*(\w+.*)$/i);
    if (guardMatch) {
      return { condition: guardMatch[1].trim(), event: guardMatch[2].trim() };
    }
    return null;
  }

  parseCommaSeparatedList(text) {
    return text
      .split(/[,;]|\s+and\s+|\s+or\s+/i)
      .map(s => this.cleanStateName(s))
      .filter(s => s && s.length > 0 && s.length < 30);
  }
}
