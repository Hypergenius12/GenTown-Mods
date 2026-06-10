Mod.afterLoad(function() {
    console.log("Loading Advanced Tools Mod...");

    window._origHandleEdit = window.handleEdit;
    window.handleEdit = function(entity) {
        window.__currentEntity = entity;
        window._origHandleEdit(entity);
    };

    window._origPopulateExecutive = window.populateExecutive;
    window.populateExecutive = function(items, title, main) {
        window._origPopulateExecutive(items, title, main);
        
        setTimeout(() => {
            const listId = main ? "actionMainList" : "actionSubList";
            const list = document.getElementById(listId);
            if (!list) return;

            const domItems = list.querySelectorAll(".actionItem.item");

            if (title === "Customize" || title.startsWith("Edit ")) {
                items.forEach((item, i) => {
                    if (item.slider && domItems[i]) {
                        let el = domItems[i];
                        if (!el.querySelector(".adv-input")) {
                            let input = document.createElement("input");
                            input.className = "adv-input";
                            input.type = "text";
                            input.value = item.value !== undefined ? item.value : item.default;
                            input.style.cssText = "width:60px;background:rgba(0,0,0,0.5);color:white;border:1px solid #aaa;border-radius:4px;padding:2px 5px;margin-left:10px;font-family:inherit;";
                            
                            input.addEventListener("change", e => {
                                let val = parseFloat(e.target.value);
                                if (!isNaN(val)) {
                                    if (item.func) item.func(item.slider, val);
                                    if (typeof window.updateCanvas === 'function') window.updateCanvas();
                                }
                            });
                            input.addEventListener("keydown", e => e.stopPropagation());
                            input.addEventListener("click", e => e.stopPropagation());
                            el.appendChild(input);
                        }
                    }
                });
            }

            if (title.startsWith("Edit ") && window.__currentEntity && !window.__currentEntity.end) {
                let entity = window.__currentEntity;
                list.insertAdjacentHTML("beforeend", `<span class="actionItem item" style="padding-top:1em;text-align:center;color:yellow;pointer-events:none;">--- Raw Data ---</span>`);

                for (let key in entity) {
                    let val = entity[key];
                    if (val === null || typeof val === "function" || ["_reg", "id", "del", "chunks", "center"].includes(key)) continue;

                    let isArray = Array.isArray(val);
                    if (typeof val === "object" && !isArray) continue;

                    let el = document.createElement("span");
                    el.className = "actionItem item actionSetting";
                    el.innerHTML = `${key}: <input type="text" value="${isArray ? val.join(", ") : val}" style="width:100px;background:rgba(0,0,0,0.5);color:white;border:1px solid #aaa;border-radius:4px;padding:2px 5px;margin-left:auto;font-family:inherit;">`;
                    
                    let input = el.querySelector("input");
                    input.addEventListener("change", e => {
                        let v = e.target.value;
                        if (typeof val === "number") v = parseFloat(v) || val;
                        else if (typeof val === "boolean") v = (v === "true");
                        else if (isArray) v = v.split(",").map(s => parseFloat(s.trim()));
                        
                        entity[key] = v;
                        if (typeof window.updateCanvas === 'function') window.updateCanvas();
                        if (typeof window.updateStats === 'function') window.updateStats();
                    });
                    input.addEventListener("keydown", e => e.stopPropagation());
                    input.addEventListener("click", e => e.stopPropagation());
                    list.appendChild(el);
                }
            }
        }, 10);
    };

    const canvas = document.getElementById("mapCanvas") || window.mapCanvas || document.querySelector("canvas");
    if (canvas) {
        let isPanning = false;
        let lastX, lastY;

        canvas.style.transformOrigin = "0 0";
        
        window.__dragX = window.__dragX || 0;
        window.__dragY = window.__dragY || 0;
        window.__zoom = window.__zoom || 1;

        canvas.addEventListener("wheel", (e) => {
            e.preventDefault();
            e.stopPropagation();
            
            let oldZoom = window.__zoom;
            let zoomDelta = e.deltaY < 0 ? 0.2 : -0.2;
            let newZoom = Math.max(0.1, Math.min(25, oldZoom + zoomDelta));
            
            if (newZoom === oldZoom) return;
            
            let ratio = newZoom / oldZoom;
            window.__dragX = e.clientX - (e.clientX - window.__dragX) * ratio;
            window.__dragY = e.clientY - (e.clientY - window.__dragY) * ratio;
            window.__zoom = newZoom;

            canvas.style.scale = window.__zoom;
            canvas.style.translate = `${window.__dragX}px ${window.__dragY}px`;
        }, { passive: false, capture: true });

        canvas.addEventListener("mousedown", (e) => {
            if (e.button === 2) { 
                isPanning = true;
                lastX = e.clientX;
                lastY = e.clientY;
            }
        });

        window.addEventListener("mousemove", (e) => {
            if (isPanning) {
                window.__dragX += (e.clientX - lastX);
                window.__dragY += (e.clientY - lastY);
                lastX = e.clientX;
                lastY = e.clientY;
                
                canvas.style.translate = `${window.__dragX}px ${window.__dragY}px`;
            }
        });

        window.addEventListener("mouseup", (e) => {
            if (e.button === 2) isPanning = false;
        });

        canvas.addEventListener("contextmenu", (e) => e.preventDefault());
    }
});
