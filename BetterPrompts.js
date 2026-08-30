(function() {
  const PERCENT_STEPS = [0, 20, 40, 60, 80, 100];
  const MAX_CONCURRENT_PROMPTS = 3;

  window.activePromptsCount = 0;
  window.promptQueue = window.promptQueue || [];

  /**
   * Safely transforms event choices into a 6-step percentage scale
   */
  function transformEventChoices(eventObj) {
    // Prevent double-transforming already modified events
    if (!eventObj || !eventObj.choices || eventObj._linearTransformed) return;
    eventObj._linearTransformed = true;

    const baseChoices = Array.isArray(eventObj.choices) ? eventObj.choices : [];
    const baseEffect = baseChoices[0]?.effect;

    eventObj.choices = PERCENT_STEPS.map((pct) => {
      const linearFactor = pct / 100;

      return {
        text: `${pct}% Intensity`,
        percentage: pct,
        scaleFactor: linearFactor,
        effect: function(state) {
          // Execute original logic scaled by linear percentage
          if (typeof baseEffect === 'function') {
            baseEffect(state, linearFactor);
          } else if (state && typeof state.lastChoiceFactor !== 'undefined') {
            state.lastChoiceFactor = linearFactor;
          }

          // Decrement prompt count only when an explicit selection is made
          window.activePromptsCount = Math.max(0, window.activePromptsCount - 1);

          // Flush queued prompts if capacity is available
          if (window.promptQueue.length > 0) {
            const nextPrompt = window.promptQueue.shift();
            window.showPrompt(nextPrompt);
          }
        }
      };
    });
  }

  // Transform existing events in the global registry
  if (typeof events !== 'undefined' && events !== null) {
    Object.keys(events).forEach((eventId) => {
      transformEventChoices(events[eventId]);
    });
  }

  // Override window.showPrompt without module imports
  if (typeof window.showPrompt !== 'undefined' && !window.showPrompt._wrapped) {
    const originalShowPrompt = window.showPrompt;

    window.showPrompt = function(promptData) {
      if (promptData && promptData.choices) {
        transformEventChoices(promptData);
      }

      if (window.activePromptsCount < MAX_CONCURRENT_PROMPTS) {
        window.activePromptsCount++;
        return originalShowPrompt.call(this, promptData);
      } else {
        window.promptQueue.push(promptData);
      }
    };

    window.showPrompt._wrapped = true;
  }

  console.log(`Loaded Standalone Mod: Max ${MAX_CONCURRENT_PROMPTS} Concurrent Prompts & Linear Choices.`);
})();
