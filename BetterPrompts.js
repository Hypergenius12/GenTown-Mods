(function() {
  const PERCENT_STEPS =;
  const MAX_CONCURRENT_PROMPTS = 3;

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

  if (typeof events !== 'undefined' && events !== null) {
    Object.keys(events).forEach((eventId) => {
      transformEventChoices(events[eventId]);
    });
  }

  if (typeof window.showPrompt !== 'undefined') {
    const originalShowPrompt = window.showPrompt;
    window.activePromptsCount = 0;
    window.promptQueue = [];

    window.showPrompt = function(promptData) {
      if (window.activePromptsCount < MAX_CONCURRENT_PROMPTS) {
        window.activePromptsCount++;
        
        if (promptData && promptData.choices) {
          transformEventChoices(promptData);
        }

        const element = originalShowPrompt.apply(this, arguments);
        
        if (element && element.addEventListener) {
          element.addEventListener('click', () => {
            window.activePromptsCount = Math.max(0, window.activePromptsCount - 1);
            if (window.promptQueue.length > 0) {
              const nextPrompt = window.promptQueue.shift();
              window.showPrompt(nextPrompt);
            }
          }, { once: true });
        }
        return element;
      } else {
        window.promptQueue.push(promptData);
      }
    };
  }

  console.log(`GenTown Mod Successfully Loaded: Multi-Prompt & 6-Step Linear Choices.`);
})();
