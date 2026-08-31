import { AbstractMod } from './better_mod_loader.mjs';

export default class LinearPercentageChoicesMod extends AbstractMod {
  constructor() {
    super("linear_percentage_choices", "Linear Percentage Choices", 1, []);
  }

  initialize() {
    const PERCENT_STEPS = [0, 20, 40, 60, 80, 100];
    
    const deepSnapshot = (obj, visited = new WeakSet()) => {
      if (!obj || typeof obj !== 'object' || visited.has(obj)) return null;
      visited.add(obj);
      const snap = {};
      for (const key in obj) {
        if (!Object.prototype.hasOwnProperty.call(obj, key)) continue;
        const val = obj[key];
        if (typeof val === 'number') {
          snap[key] = val;
        } else if (typeof val === 'object' && val !== null && !Array.isArray(val)) {
          const subSnap = deepSnapshot(val, visited);
          if (subSnap && Object.keys(subSnap).length > 0) snap[key] = subSnap;
        }
      }
      return snap;
    };

    const applyDeepDelta = (target, snap, factor) => {
      if (!target || !snap) return;
      for (const key in snap) {
        if (typeof snap[key] === 'number') {
          const delta = target[key] - snap[key];
          if (delta !== 0) {
            target[key] = Number((snap[key] + (delta * factor)).toFixed(4));
          }
        } else if (typeof snap[key] === 'object' && target[key]) {
          applyDeepDelta(target[key], snap[key], factor);
        }
      }
    };

    const wrapEffect = (originalEffect, factor) => {
      if (typeof originalEffect !== 'function') return originalEffect;
      return function(...args) {
        const stateTarget = (args && typeof args[0] === 'object') ? args[0] : this;
        if (stateTarget && typeof stateTarget === 'object') {
          const snapshot = deepSnapshot(stateTarget);
          const result = originalEffect.apply(this, args);
          applyDeepDelta(stateTarget, snapshot, factor);
          return result;
        }
        return originalEffect.apply(this, args);
      };
    };

    const transformEventChoices = (eventObj) => {
      if (!eventObj || !Array.isArray(eventObj.choices) || eventObj._linearProcessed) return;
      eventObj._linearProcessed = true;

      const expanded = [];
      eventObj.choices.forEach((baseChoice) => {
        PERCENT_STEPS.forEach((pct) => {
          const factor = pct / 100;
          const newChoice = Object.assign({}, baseChoice, {
            text: `${baseChoice.text || 'Option'} (${pct}%)`,
            scaleFactor: factor,
            _isLinearStep: true
          });

          if (typeof baseChoice.cost === 'number') {
            newChoice.cost = factor === 0 ? 0 : Math.max(1, Math.round(baseChoice.cost * factor));
          } else if (typeof baseChoice.cost === 'object' && baseChoice.cost !== null) {
            newChoice.cost = {};
            for (const [res, val] of Object.entries(baseChoice.cost)) {
              if (typeof val === 'number') {
                newChoice.cost[res] = factor === 0 ? 0 : Math.max(1, Math.round(val * factor));
              }
            }
          }

          newChoice.effect = wrapEffect(baseChoice.effect, factor);
          expanded.push(newChoice);
        });
      });

      eventObj.choices = expanded;
    };

    // inject the current events automatically
    if (typeof events !== 'undefined' && events !== null) {
      Object.keys(events).forEach((eventId) => transformEventChoices(events[eventId]));
    }

    if (typeof window.showPrompt === 'function' && !window.showPrompt._isHooked) {
      const originalShowPrompt = window.showPrompt;
      window.showPrompt = function(promptData) {
        if (promptData && Array.isArray(promptData.choices)) {
          transformEventChoices(promptData);
        }
        return originalShowPrompt.apply(this, arguments);
      };
      window.showPrompt._isHooked = true;
    }

    window.GenTownLinearChoices = { steps: PERCENT_STEPS, transform: transformEventChoices };
    console.log("Linear Percentage Choices Mod loaded successfully.");
  }
}
