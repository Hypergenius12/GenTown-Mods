import { AbstractMod } from "./better_mod_loader_11.mjs"; 

class AdvancedTools extends AbstractMod {
    constructor() {
        super("advanced_tools", "Advanced Tools (Editor & Camera)", 5);
    }

    initialize() {
        const initTools = () => {
            console.log("Advanced Tools Mod Loading...");

            // ==========================================
            // 1. EXECUTIVE EDITOR (Graceful text injection)
            // ==========================================
            window._origPopulateExecutive = window.populateExecutive;
            window.populateExecutive = function(items, title, main) {
                // Let the native function run FIRST to build the DOM properly
                window._origPopulateExecutive(items, title, main);
                
                if (title === "Customize" || (typeof title === "string" && title.startsWith("Edit "))) {
                    const list = document.getElementById(main ? "actionMainList" : "actionSubList");
                    if (!list) return;
                    
                    const domItems = list.querySelectorAll(".actionItem.item");
                    items.forEach((item, i) => {
                        if (item.slider) {
                            let el = domItems[i];
                            if (el && !el.querySelector(".adv-input")) {
                                let input = document.createElement("input");
                                input.className = "adv-input";
                                input.type = "text";
                                input.value = item.value !== undefined ? item.value : item.default;
                                input.style.cssText = "width:60px;background:rgba(0,0,0,0.5);color:white;border:1px solid #aaa;border-radius:4px;padding:2px 5px;margin-left:10px;font-family:inherit;";
                                
                                input.addEventListener("change", e => {
                                    let val = parseFloat(e.target.value);
                                    if (!isNaN(val)) {
                                        el.setAttribute("data-value", val);
                                        // Update the slider visuals native to gentown
                                        let percent = (val - (item.min||0)) / ((item.max||1) - (item.min||0));
                                        el.style.background = `linear-gradient(to right, rgba(255, 255, 255, 0.2) ${percent * 100}%, transparent ${percent * 100}%)`;
                                        
                                        if (item.func) item.func(item.slider, val);
                                        if (typeof window.updateCanvas === 'function') window.updateCanvas();
                                    }
                                });
                                input.addEventListener("click", e => e.stopPropagation());
                                input.addEventListener("mousedown", e => e.stopPropagation());
                                input.addEventListener("keydown", e => {
                                    e.stopPropagation();
                                    if (e.key === "Enter") input.blur();
                                });
                                
                                el.appendChild(input);
                            }
                        }
                    });
                }
            };

            // ==========================================
            // 2. ENTITY EDITOR (Append Raw Data Instead of Destroying Native)
            // ==========================================
            window._origHandleEdit = window.handleEdit; 
            window.handleEdit = function(entity) {
                if (entity.end) { 
                    if (typeof window.closeExecutive === 'function') window.closeExecutive(); 
                    return; 
                }

                // Call native handler first to open the menu with native options intact
                window._origHandleEdit(entity);

                // Wait a tick for the menu to populate, then inject raw properties
                setTimeout(() => {
                    const list = document.getElementById("actionSubList");
                    if (!list) return;

                    list.insertAdjacentHTML("beforeend", `<span class="actionItem item" style="padding-top:1em;text-align:center;color:yellow;pointer-events:none;">--- Raw Data ---</span>`);

                    function addPropToDOM(obj, key, pathName) {
                        let val = obj[key];
                        let type = typeof val;
                        if (val === null || type === "function" || key === "_reg" || key === "id" || key === "del" || key === "center" || key === "chunks") return;
                        
                        if (type === "object") {
                            if (Array.isArray(val) && val.length > 0 && typeof val[0] === "number") {
                                renderRawInput(obj, key, pathName, val.join(", "), "array");
                            } else if (!Array.isArray(val)) {
                                for (let k in val) { 
                                    addPropToDOM(val, k, pathName + " " + (k.charAt(0).toUpperCase() + k.slice(1))); 
                                }
                            }
                            return;
                        }
                        renderRawInput(obj, key, pathName, val, type);
                    }

                    function renderRawInput(obj, key, pathName, origValue, type) {
                        let el = document.createElement("span");
                        el.className = "actionItem item actionSetting";
                        el.innerHTML = `${pathName}: <input type="text" value="${origValue}" style="width:100px;background:rgba(0,0,0,0.5);color:white;border:1px solid #aaa;border-radius:4px;padding:2px 5px;margin-left:auto;font-family:inherit;">`;
                        
                        let input = el.querySelector("input");
                        input.addEventListener("change", e => {
                            let v = e.target.value;
                            if (type === "number") { 
                                v = parseFloat(v); 
                                if (isNaN(v)) return; 
                            } else if (type === "boolean") {
                                v = (v === "true" || v === "1");
                            } else if (type === "array") {
                                v = v.split(",").map(s => parseFloat(s.trim()));
                            }
                            obj[key] = v;
                            
                            if (key === "name") {
                                delete entity.prefix;
                                delete entity.suffix;
                            }

                            if (typeof window.renderHighlight === 'function') window.renderHighlight();
                            if (typeof window.updateCanvas === 'function') window.updateCanvas();
                            if (typeof window.updateStats === 'function') window.updateStats();
                            if (typeof window.autosave === 'function') window.autosave();
                        });
                        input.addEventListener("click", e => e.stopPropagation());
                        input.addEventListener("mousedown", e => e.stopPropagation());
                        input.addEventListener("keydown", e => {
                            e.stopPropagation();
                            if (e.key === "Enter") input.blur();
                        });
                        
                        list.appendChild(el);
                    }

                    for (let k in entity) { 
                        addPropToDOM(entity, k, k.charAt(0).toUpperCase() + k.slice(1)); 
                    }
                }, 10);
            };

            // ==========================================
            // 3. MAP CONTROLS (Utilize CSS Translate)
            // ==========================================
            const canvas = document.getElementById("mapCanvas") || window.mapCanvas;
            if (canvas) {
                let isPanning = false;
                let lastMouseX, lastMouseY;

                window.dragPosition = window.dragPosition || [0, 0];

                canvas.addEventListener("mousedown", (e) => {
                    if (e.button === 2) { 
                        isPanning = true;
                        lastMouseX = e.clientX;
                        lastMouseY = e.clientY;
                    }
                });

                window.addEventListener("mousemove", (e) => {
                    if (isPanning) {
                        const dx = e.clientX - lastMouseX;
                        const dy = e.clientY - lastMouseY;

                        window.dragPosition[0] += dx;
                        window.dragPosition[1] += dy;

                        lastMouseX = e.clientX;
                        lastMouseY = e.clientY;

                        // FIX: Actually apply the translation so it visually pans
                        canvas.style.translate = `${window.dragPosition[0]}px ${window.dragPosition[1]}px`;
                    }
                });

                window.addEventListener("mouseup", (e) => {
                    if (e.button === 2) {
                        isPanning = false;
                    }
                });

                canvas.addEventListener("contextmenu", (e) => e.preventDefault());
            }

            console.log("Advanced Tools Mod Successfully Initialized.");
        };

        // If the game is already loaded (due to async modules), run immediately.
        if (window.gameLoaded) {
            initTools();
        } else {
            window.Mod.afterLoad(initTools);
        }
    }
}

new AdvancedTools();
