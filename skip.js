(function() {
    function injectSkipButtons() {
        const nextDayBtn = document.getElementById("nextDay");
        if (!nextDayBtn) return false;
        const container = nextDayBtn.parentNode;
        if (!container || container.querySelector("#skip10Btn")) return true;

        const makeBtn = (id, text, days) => {
            const btn = document.createElement("button");
            btn.id = id;
            btn.className = "nextDay";
            btn.innerText = text;
            btn.style.marginLeft = "6px";
            btn.onclick = () => runSkip(days);
            return btn;
        };

        container.appendChild(makeBtn("skip10Btn", "+10", 10));
        container.appendChild(makeBtn("skip100Btn", "+100", 100));
        container.appendChild(makeBtn("skip1000Btn", "+1000", 1000));
        return true;
    }

    function autoPilot() {
        if (typeof promptState !== "undefined" && promptState) {
            let val = "Landmark";
            if (promptState.default) {
                val = promptState.default;
            } else if (typeof generateWord === "function") {
                val = titleCase(generateWord(randRange(2, 3)));
            }
            if (promptState.preview && typeof promptState.preview === "function") {
                try {
                    let prevText = promptState.preview(val, promptState.subject, promptState.target);
                    let pseudo = document.createElement("span");
                    pseudo.innerHTML = prevText;
                    let parts = pseudo.querySelectorAll(".previewPart");
                    if (promptState.eventArgs) {
                        promptState.eventArgs.previewParts = [...parts].map(e => e.textContent || e.getAttribute("data-original") || val);
                    }
                    if (!promptState.eventArgs && currentEvents) {
                        for (let id in currentEvents) {
                            if (currentEvents[id].args) {
                                currentEvents[id].args.previewParts = [...parts].map(e => e.textContent || e.getAttribute("data-original") || val);
                            }
                        }
                    }
                    pseudo.remove();
                } catch(e) {}
            }
            if (typeof handlePrompt === "function") {
                handlePrompt(val);
            }
        }
        const popupYes = document.getElementById("popupYes");
        if (popupYes && popupYes.style.display !== "none") {
            popupYes.click();
            return;
        }
        const popupOk = document.getElementById("popupOk");
        if (popupOk && popupOk.style.display !== "none") {
            popupOk.click();
            return;
        }
        const actBtns = document.querySelectorAll('#logMessages .logMessage[new="true"] .logAct span[type="yes"], #logMessages .logMessage[new="true"] .logAct span[type="choice"], #logMessages .logMessage[new="true"] .logAct span[type="act"]');
        if (actBtns.length > 0) {
            actBtns.forEach(btn => {
                if (btn.getAttribute("type") === "no") return;
                btn.click();
            });
        }
    }

    function runSkip(days) {
        const btn10 = document.getElementById("skip10Btn");
        const btn100 = document.getElementById("skip100Btn");
        const btn1000 = document.getElementById("skip1000Btn");
        if (btn10) btn10.setAttribute("disabled", "true");
        if (btn100) btn100.setAttribute("disabled", "true");
        if (btn1000) btn1000.setAttribute("disabled", "true");

        let count = 0;
        function step() {
            if (count < days && typeof planet !== "undefined" && !planet.locked) {
                if (typeof nextDay === "function") nextDay();
                autoPilot();
                count++;
                setTimeout(step, 1);
            } else {
                if (btn10) btn10.removeAttribute("disabled");
                if (btn100) btn100.removeAttribute("disabled");
                if (btn1000) btn1000.removeAttribute("disabled");
                if (typeof renderMap === "function") renderMap();
                if (typeof renderHighlight === "function") renderHighlight();
                if (typeof updateCanvas === "function") updateCanvas();
                if (typeof updateStats === "function") updateStats();
            }
        }
        step();
    }

    if (typeof Mod !== "undefined" && Mod.afterLoad) {
        Mod.afterLoad(injectSkipButtons);
    }

    let interval = setInterval(() => {
        if (injectSkipButtons()) {
            clearInterval(interval);
        }
    }, 100);
    setTimeout(injectSkipButtons, 500);
})();
