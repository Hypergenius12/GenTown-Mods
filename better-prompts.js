(function initGenTownLinearMod() {
  const PERCENT_STEPS =;

  function deepSnapshot(obj, visited = new WeakSet()) {
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
  }

  function applyDeepDelta(target, snap, factor) {
    if (!target || !snap) return;
    for (const key in snap) {
      if (typeof snap[key] === 'number') {
        const delta = target[key] - snap[key];
        if (delta !== 0) {
          // Enforce precision and trigger reactive setter properties if present
          const newValue = snap[key] + (delta * factor);
          target[key] = Number(newValue.toFixed(4)); 
        }
      } else if (typeof snap[key] === 'object' && target[key]) {
        applyDeepDelta(target[key], snap[key], factor);
      }
    }
  }

  function wrapEffect(originalEffect, factor) {
    if (typeof originalEffect !== 'function') return originalEffect;

    return function(...args) {
      // Capture context target strings across runtime mutations
      const stateTarget = (args[0] && typeof args[0] === 'object') ? args[0] : this;
      
      if (stateTarget && typeof stateTarget === 'object') {
        const snapshot = deepSnapshot(stateTarget);
        const result = originalEffect.apply(this, args);
        applyDeepDelta(stateTarget, snapshot, factor);
        return result;
      }
      return originalEffect.apply(this, args);
    };
  }

  function expandChoiceLinear(baseChoice) {
    if (!baseChoice) return [];

    return PERCENT_STEPS.map((pct) => {
      const factor = pct / 100;
      const newChoice = Object.assign({}, baseChoice, {
        text: `${baseChoice.text || 'Option'} (${pct}%)`,
        scaleFactor: factor,
        _isLinearStep: true
      });

      // Maintain precision across resource structures
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
      return newChoice;
    });
  }

  function processPrompt(promptData) {
    if (!promptData || !Array.isArray(promptData.choices)) return;
    if (!promptData._originalChoices) {
      promptData._originalChoices = [...promptData.choices];
    }

    const expanded = [];
    promptData._originalChoices.forEach((choice) => {
      expanded.push(...expandChoiceLinear(choice));
    });
    promptData.choices = expanded;
  }

  function applyRuntimeScrollbar() {
    // Dynamic universal modal tracking matching R74n components layout
    const dialogs = document.querySelectorAll('dialog, [role="dialog"], #modal, .modal, .prompt');
    dialogs.forEach((el) => {
      const buttonContainer = el.querySelector('.choices, .buttons, div') || el;
      if (buttonContainer && buttonContainer.children.length > 4) {
        buttonContainer.style.maxHeight = '45vh';
        buttonContainer.style.overflowY = 'auto';
        buttonContainer.style.display = 'flex';
        buttonContainer.style.flexDirection = 'column';
        buttonContainer.style.gap = '6px';
      }
    });
  }

  function attachEngineHooks() {
    if (typeof window.showPrompt === 'function' && !window.showPrompt._isHooked) {
      const originalShowPrompt = window.showPrompt;

      window.showPrompt = function(promptData) {
        processPrompt(promptData);
        const result = originalShowPrompt.apply(this, arguments);
        
        applyRuntimeScrollbar();
        setTimeout(applyRuntimeScrollbar, 50);
        return result;
      };

      window.showPrompt._isHooked = true;
    } else {
      setTimeout(attachEngineHooks, 50);
    }
  }

  attachEngineHooks();
})();
