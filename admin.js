import { AbstractMod } from "./better_mod_loader_11.mjs"; // Adjust the loader version number if yours is different

class AdvancedTools extends AbstractMod {
    constructor() {
        super("advanced_tools", "Advanced Tools (Editor & Camera)", 5);
    }

    initialize() {
        Mod.afterLoad(() => {
            console.log("Advanced Tools Mod Loading...");

            // ==========================================
            // 1. EXECUTIVE EDITOR (Sliders -> Text Inputs)
            // ==========================================
            window._origPopulateExecutive = window.populateExecutive;
            window.populateExecutive = function(items, title, main) {
                if (title === "Customize" || (typeof title === "string" && title.startsWith("Edit "))) {
                    items.forEach(item => {
                        if (item.slider) {
                            item._origSlider = item.slider;
                            item._origFunc = item.func;
                            item._origValue = item.value !== undefined ? item.value : item.default;
                            delete item.slider;
                            delete item.min;
                            delete item.max;
                            delete item.step;
                            delete item.func;
                        }
                    });
                }
                
                window._origPopulateExecutive(items, title, main);
                
                if (title === "Customize" || (typeof title === "string" && title.startsWith("Edit "))) {
                    const list = document.getElementById(main ? "actionMainList" : "actionSubList");
                    if (list) {
                        const domItems = list.querySelectorAll(".actionItem.item");
                        items.forEach((item, i) => {
                            if (item._origSlider) {
                                let el = domItems[i];
                                if (el) {
                                    el.innerHTML = `${item.text}: <input type="text" value="${item._origValue}" style="width:80px;background:rgba(0,0,0,0.5);color:white;border:1px solid #aaa;border-radius:4px;padding:2px 5px;margin-left:5px;font-family:inherit;">`;
                                    let input = el.querySelector("input");
                                    input.addEventListener("change", e => {
                                        let val = parseFloat(e.target.value);
                                        if (!isNaN(val)) {
                                            item._origFunc(item._origSlider, val);
                                            if (typeof updateCanvas === 'function') updateCanvas();
                                        }
                                    });
                                    input.addEventListener("click", e => e.stopPropagation());
                                    input.addEventListener("mousedown", e => e.stopPropagation());
                                    input.addEventListener("keydown", e => {
                                        e.stopPropagation();
                                        if (e.key === "Enter") input.blur();
                                    });
                                }
                            }
                        });
                    }
                }
            };

            // ==========================================
            // 2. ENTITY EDITOR (Town stats -> Text Inputs)
            // ==========================================
            window._origHandleEdit = window.handleEdit; 
            window.handleEdit = function(entity) {
                if (entity.end) { 
                    if (typeof closeExecutive === 'function') closeExecutive(); 
                    return; 
                }
                
                if (entity._reg === "town") {
                    if (!entity.resources) entity.resources = {};
                    ["crop", "lumber", "rock", "metal", "livestock", "cash"].forEach(r => {
                        if (entity.resources[r] === undefined) entity.resources[r] = 0;
                    });
                    if (!entity.jobs) entity.jobs = {};
                    ["farmer", "lumberer", "miner", "soldier"].forEach(j => {
                        if (entity.jobs[j] === undefined) entity.jobs[j] = 0;
                    });
                    if (!entity.influences) entity.influences = {};
                    ["happy", "crime", "farm", "disease", "travel", "trade", "hunger", "education", "military", "faith"].forEach(inf => {
                        if (entity.influences[inf] === undefined) entity.influences[inf] = 0;
                    });
                }

                let items = [];
                function addProp(obj, key, pathName) {
                    let val = obj[key];
                    let type = typeof val;
                    if (val === null || type === "function" || key === "_reg" || key === "id" || key === "del" || key === "center" || key === "chunks") return;
                    
                    if (type === "object") {
                        if (Array.isArray(val)) {
                            if (val.length > 0 && typeof val[0] === "number") {
                                items.push({ text: pathName, _rawEdit: true, _targetObj: obj, _targetKey: key, _origValue: val.join(", "), _type: "array" });
                            }
                        } else {
                            for (let k in val) { 
                                let formattedK = k.charAt(0).toUpperCase() + k.slice(1);
                                addProp(val, k, pathName + " " + formattedK); 
                            }
                        }
                        return;
                    }
                    items.push({ text: pathName, _rawEdit: true, _targetObj: obj, _targetKey: key, _origValue: val, _type: type });
                }

                for (let k in entity) { 
                    let formattedK = k.charAt(0).toUpperCase() + k.slice(1);
                    addProp(entity, k, formattedK); 
                }

                if (typeof window._origPopulateExecutive === 'function') {
                    window._origPopulateExecutive(items, `Edit {{regname:${entity._reg}|${entity.id}}}`);
                }

                const list = document.getElementById("actionSubList");
                if (list) {
                    const domItems = list.querySelectorAll(".actionItem.item");
                    items.forEach((item, i) => {
                        let el = domItems[i];
                        if (el && item._rawEdit) {
                            el.innerHTML = `${item.text}: <input type="text" value="${item._origValue}" style="width:100px;background:rgba(0,0,0,0.5);color:white;border:1px solid #aaa;border-radius:4px;padding:2px 5px;margin-left:5px;font-family:inherit;">`;
                            let input = el.querySelector("input");
                            input.addEventListener("change", e => {
                                let v = e.target.value;
                                if (item._type === "number") { 
                                    v = parseFloat(v); 
                                    if (isNaN(v)) return; 
                                } else if (item._type === "boolean") {
                                    v = (v === "true" || v === "1");
                                } else if (item._type === "array") {
                                    v = v.split(",").map(s => parseFloat(s.trim()));
                                }
                                item._targetObj[item._targetKey] = v;
                                
                                if (item._targetKey === "name") {
                                    delete entity.prefix;
                                    delete entity.suffix;
                                }

                                if (typeof renderHighlight === 'function') renderHighlight();
                                if (typeof updateCanvas === 'function') updateCanvas();
                                if (typeof updateStats === 'function') updateStats();
                                if (typeof autosave === 'function') autosave();
                            });
                            input.addEventListener("click", e => e.stopPropagation());
                            input.addEventListener("mousedown", e => e.stopPropagation());
                            input.addEventListener("keydown", e => {
                                e.stopPropagation();
                                if (e.key === "Enter") input.blur();
                            });
                        }
                    });
                }
            };

            // ==========================================
            // 3. MAP CONTROLS (Pan & Zoom to Mouse)
            // ==========================================
            const canvas = document.getElementById("mapCanvas") || window.mapCanvas;
            if (canvas) {
                let isPanning = false;
                let lastMouseX, lastMouseY;

                // Ensure the coordinate system array exists
                window.dragPosition = window.dragPosition || [0, 0];

                // Remove any broken CSS transforms that might have been applied earlier
                canvas.style.translate = "0px 0px"; 
                canvas.style.transform = "none";

                // --- ZOOM TO MOUSE ---
                canvas.addEventListener("wheel", (e) => {
                    e.preventDefault();
                    
                    let oldZoom = window.currentZoom || 1;
                    let zoomDir = e.deltaY < 0 ? 0.1 : -0.1;
                    
                    // Trigger the game's native zoom handler
                    if (typeof window.setZoom === 'function') window.setZoom(zoomDir);

                    let newZoom = window.currentZoom || (oldZoom + zoomDir);
                    
                    // Calculate relative cursor position to lock map coordinates
                    const rect = canvas.getBoundingClientRect();
                    const mouseX = e.clientX - rect.left;
                    const mouseY = e.clientY - rect.top;
                    const zoomRatio = newZoom / oldZoom;
                    
                    window.dragPosition[0] = mouseX - (mouseX - window.dragPosition[0]) * zoomRatio;
                    window.dragPosition[1] = mouseY - (mouseY - window.dragPosition[1]) * zoomRatio;

                    // Redraw map
                    if (typeof window.updateCanvas === 'function') window.updateCanvas();
                }, { passive: false });

                // --- RIGHT-CLICK TO PAN ---
                canvas.addEventListener("mousedown", (e) => {
                    if (e.button === 2) { // 2 = Right Click
                        isPanning = true;
                        lastMouseX = e.clientX;
                        lastMouseY = e.clientY;
                    }
                });

                window.addEventListener("mousemove", (e) => {
                    if (isPanning) {
                        const dx = e.clientX - lastMouseX;
                        const dy = e.clientY - lastMouseY;

                        // Mutate game's native coordinates, NOT CSS
                        window.dragPosition[0] += dx;
                        window.dragPosition[1] += dy;

                        lastMouseX = e.clientX;
                        lastMouseY = e.clientY;

                        // Force engine to redraw map at new coordinates (fixes black border)
                        if (typeof window.updateCanvas === 'function') window.updateCanvas();
                    }
                });

                window.addEventListener("mouseup", (e) => {
                    if (e.button === 2) {
                        isPanning = false;
                    }
                });

                // Stop the browser menu from opening when panning
                canvas.addEventListener("contextmenu", (e) => e.preventDefault());
            }

            console.log("Advanced Tools Mod Successfully Initialized.");
        });
    }
}

// Register the mod with the game loader
new AdvancedTools();
