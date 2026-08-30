import { AbstractMod } from './better_mod_loader.mjs';

export default class MultiPromptLinearMod extends AbstractMod {
  constructor() {
    super("multi_prompt_linear", "Multi-Prompt & Linear Choices Mod", 1, []);
  }

  initialize() {
    const PERCENT_STEPS = [0, 20, 40, 60, 80, 100];
    const MAX_CONCURRENT_PROMPTS = 3; // Controls maximum questions open at once (e.g., 2, 3, or 5)

    // Helper to transform event choices into 6 percentage choices
    const transformEventChoices = (eventObj) => {
      if (!eventObj || !eventObj.choices) return;

      const baseChoices = Array.isArray(eventObj.choices) ? eventObj.choices : [];
      const baseEffect = baseChoices[0]?.effect;

      eventObj.choices = PERCENT_STEPS.map((pct) => {
        const linearFactor = pct / 100;

        return {
          text: `${pct}% Intensity`,
          percentage: pct,
          scaleFactor: linearFactor,
          effect: (state) => {
            if (typeof baseEffect === 'function') {
              baseEffect(state, linearFactor);
            } else if (state && typeof state.lastChoiceFactor !== 'undefined') {
              state.lastChoiceFactor = linearFactor;
            }
          }
        };
      });
    };

    // Apply linear choices to all existing events
    if (typeof events !== 'undefined' && events !== null) {
      Object.keys(events).forEach((eventId) => {
        transformEventChoices(events[eventId]);
      });
    }

    // Override the event display manager to support showing 2+ prompt questions concurrently
    if (typeof window.showPrompt !== 'undefined') {
      const originalShowPrompt = window.showPrompt;
      window.activePromptsCount = 0;
      window.promptQueue = [];

      window.showPrompt = function(promptData) {
        if (window.activePromptsCount < MAX_CONCURRENT_PROMPTS) {
          window.activePromptsCount++;
          
          // Force choice conversion on dynamic runtime events
          if (promptData && promptData.choices) {
            transformEventChoices(promptData);
          }

          // Call base display logic and hook into user resolution
          const element = originalShowPrompt.apply(this, arguments);
          
          if (element && element.addEventListener) {
            element.addEventListener('click', () => {
              window.activePromptsCount = Math.max(0, window.activePromptsCount - 1);
              // Process next queued question if any exist
              if (window.promptQueue.length > 0) {
                const nextPrompt = window.promptQueue.shift();
                window.showPrompt(nextPrompt);
              }
            }, { once: true });
          }
          return element;
        } else {
          // Store additional incoming events in queue instead of dropping them
          window.promptQueue.push(promptData);
        }
      };
    }

    console.log(`Loaded: Multi-Prompt (Max: ${MAX_CONCURRENT_PROMPTS}) with 6-Step Linear Choices.`);
  }
}
