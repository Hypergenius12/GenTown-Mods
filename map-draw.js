Mod.afterLoad(() => {
    // GenTown Default-Matched Biome Palette
    const bD = {
        water: {e:0.1, t:0.5, m:1.0, c:"#3d71d6"},
        grass: {e:0.5, t:0.5, m:0.5, c:"#4b9e4b"},
        mountain: {e:0.9, t:0.1, m:0.6, c:"#7a7a7a"},
        snow: {e:0.6, t:0.1, m:0.6, c:"#e8e8e8"},
        desert: {e:0.4, t:0.8, m:0.3, c:"#e0c96c"},
        badlands: {e:0.5, t:0.8, m:0.5, c:"#b58145"},
        tundra: {e:0.5, t:0.3, m:0.3, c:"#739c6a"},
        wetland: {e:0.5, t:0.8, m:0.9, c:"#558f62"}
    };

    let cP = "grass";
    let cT = "biome";
    let cSh = "circle";
    let pS = 2; 
    let mZ = 2; 
    let iD = false; 

    // Chunky, Larger UI
    let sE = document.createElement("style");
    sE.innerHTML = `
        #dO { position: absolute; inset: 0; background: rgba(0,0,0,0.85); z-index: 9999; display: none; flex-direction: column; color: #fff; font-family: inherit; }
        #dTb { padding: 16px; background: #000; display: flex; flex-wrap: wrap; gap: 16px; align-items: center; border-bottom: 6px solid #444; }
        .dGroup { display: flex; gap: 12px; align-items: center; background: #111; padding: 12px 18px; border: 3px solid #555; }
        .dGroup span { color: #ffff00; font-size: 1.3em; font-weight: bold; text-transform: uppercase; }
        .dGroup label { font-size: 16px; font-weight: bold; text-transform: uppercase; }
        #dTb button, #dTb select, #dTb input { background: #222; color: #fff; border: 3px solid #777; padding: 10px 16px; font-family: inherit; font-size: 16px; cursor: pointer; text-transform: uppercase; font-weight: bold; outline: none; }
        #dTb button:hover, #dTb select:hover { background: #444; border-color: #aaa; }
        #dTb input[type=range] { cursor: ew-resize; padding: 0; height: 18px; }
        .dBtnDanger { background: #611 !important; border-color: #b33 !important; }
        .dBtnDanger:hover { background: #922 !important; }
        .dBtnSafe { background: #161 !important; border-color: #3b3 !important; }
        .dBtnSafe:hover { background: #292 !important; }
        #dC { flex-grow: 1; overflow: auto; display: flex; justify-content: center; align-items: center; background: #1a1a1a; padding: 20px; }
        #dCv { cursor: crosshair; box-shadow: 0 0 0 6px #333, 0 0 25px rgba(0,0,0,1); image-rendering: pixelated; }
    `;
    document.head.appendChild(sE);

    let ov = document.createElement("div");
    ov.id = "dO";
    ov.innerHTML = `
        <div id="dTb">
            <div class="dGroup"><span>Map Editor</span></div>
            <div class="dGroup">
                <select id="dTool">
                    <option value="biome">Paint Biome</option>
                    <option value="raise">Raise Elev (+)</option>
                    <option value="lower">Lower Elev (-)</option>
                    <option value="flat">Flatten Elev (=)</option>
                    <option value="smooth">Smooth Elev (Blend)</option>
                </select>
                <select id="dShape"><option value="circle">Circle</option><option value="square">Square</option></select>
            </div>
            <div class="dGroup" id="grpPen">
                <select id="dPen">
                    <option value="grass">Grassland</option><option value="water">Water</option>
                    <option value="mountain">Mountain</option><option value="snow">Snowscape</option>
                    <option value="desert">Desert</option><option value="badlands">Badlands</option>
                    <option value="tundra">Tundra</option><option value="wetland">Wetland</option>
                </select>
            </div>
            <div class="dGroup">
                <label>Size: <input type="range" id="dSiz" min="1" max="20" value="2"> <span id="dSizV" style="color:#fff;">2</span></label>
                <label>Zoom: <input type="range" id="dZom" min="1" max="10" value="2"> <span id="dZomV" style="color:#fff;">2</span></label>
            </div>
            <div class="dGroup">
                <button id="dFA">Fill All</button>
            </div>
            <div class="dGroup">
                <button id="dImp">Import</button>
                <button id="dExp">Export</button>
            </div>
            <div style="flex-grow:1"></div>
            <div class="dGroup" style="border:none; background:transparent;">
                <button id="dCan" class="dBtnDanger">Cancel</button>
                <button id="dSav" class="dBtnSafe">Save & Apply</button>
            </div>
        </div>
        <div id="dC"><canvas id="dCv"></canvas></div>
    `;
    document.body.appendChild(ov);

    let cv = document.getElementById("dCv");
    let cx = cv.getContext("2d");

    function h2R(h) { 
        let i = parseInt(h.slice(1), 16); 
        return [(i >> 16) & 255, (i >> 8) & 255, i & 255]; 
    }

    function iC() {
        let cw = planet.config.width;
        let ch = planet.config.height;
        cv.width = cw;
        cv.height = ch;
        cv.style.width = (cw * mZ) + "px";
        cv.style.height = (ch * mZ) + "px";
        rC(); 
    }

    function rC() {
        let cw = planet.config.width;
        let ch = planet.config.height;
        let cs = planet.config.chunkSize;
        let id = cx.createImageData(cw, ch);

        for (let x = 0; x < cw; x++) {
            for (let y = 0; y < ch; y++) {
                let cX = Math.floor(x / cs);
                let cY = Math.floor(y / cs);
                let chunk = planet.chunks[cX + "," + cY];
                let i = (y * cw + x) * 4;

                let b = chunk && chunk.b && bD[chunk.b] ? chunk.b : "water";
                let e = (chunk && chunk.p && chunk.p[x % cs]) ? chunk.p[x % cs][y % cs] : bD[b].e;
                let rgb = h2R(bD[b].c);
                let mult = 0.4 + (e * 0.8);
                
                id.data[i] = Math.min(255, rgb[0] * mult); 
                id.data[i+1] = Math.min(255, rgb[1] * mult); 
                id.data[i+2] = Math.min(255, rgb[2] * mult); 
                id.data[i+3] = 255;
            }
        }
        cx.putImageData(id, 0, 0);
    }

    function pP(x, y) {
        if (x < 0 || x >= planet.config.width || y < 0 || y >= planet.config.height) return;
        
        let cs = planet.config.chunkSize;
        let cX = Math.floor(x / cs);
        let cY = Math.floor(y / cs);
        let pX = x % cs;
        let pY = y % cs;
        let chunk = planet.chunks[cX + "," + cY];
        
        if (!chunk || !chunk.p) return;

        if (cT === "biome") {
            chunk.b = cP; chunk.t = bD[cP].t; chunk.m = bD[cP].m;
        } else if (cT === "raise") {
            chunk.p[pX][pY] = Math.min(1.0, chunk.p[pX][pY] + 0.1);
        } else if (cT === "lower") {
            chunk.p[pX][pY] = Math.max(0.0, chunk.p[pX][pY] - 0.1);
        } else if (cT === "flat") {
            chunk.p[pX][pY] = bD[chunk.b] ? bD[chunk.b].e : 0.5;
        } else if (cT === "smooth") {
            let sum = 0, count = 0;
            for(let dx=-1; dx<=1; dx++) {
                for(let dy=-1; dy<=1; dy++) {
                    let nx = x+dx, ny = y+dy;
                    if(nx >= 0 && nx < planet.config.width && ny >= 0 && ny < planet.config.height) {
                        let nc = planet.chunks[Math.floor(nx/cs)+","+Math.floor(ny/cs)];
                        if (nc && nc.p) { sum += nc.p[nx%cs][ny%cs]; count++; }
                    }
                }
            }
            if(count > 0) chunk.p[pX][pY] = sum / count;
        }
    }

    function aB(e) {
        let r = cv.getBoundingClientRect();
        let sX = cv.width / r.width;
        let sY = cv.height / r.height;
        let x = Math.floor((e.clientX - r.left) * sX);
        let y = Math.floor((e.clientY - r.top) * sY);
        
        if (pS === 1) { 
            pP(x, y); 
        } else {
            let rad = Math.floor(pS / 2);
            for (let dx = -rad; dx <= rad; dx++) {
                for (let dy = -rad; dy <= rad; dy++) {
                    if (cSh === "circle" && (dx*dx + dy*dy > rad*rad)) continue;
                    pP(x + dx, y + dy);
                }
            }
        }
        rC(); 
    }

    cv.addEventListener("mousedown", (e) => { iD = true; aB(e); });
    cv.addEventListener("mousemove", (e) => { if(iD) aB(e); });
    window.addEventListener("mouseup", () => { iD = false; });
    
    document.getElementById("dTool").addEventListener("change", (e) => { cT = e.target.value; rC(); });
    document.getElementById("dShape").addEventListener("change", (e) => cSh = e.target.value);
    document.getElementById("dPen").addEventListener("change", (e) => cP = e.target.value);
    document.getElementById("dSiz").addEventListener("input", (e) => { pS = parseInt(e.target.value); document.getElementById("dSizV").innerText = pS; });
    document.getElementById("dZom").addEventListener("input", (e) => {
        mZ = parseInt(e.target.value);
        document.getElementById("dZomV").innerText = mZ;
        cv.style.width = (planet.config.width * mZ) + "px";
        cv.style.height = (planet.config.height * mZ) + "px";
    });

    document.getElementById("dFA").addEventListener("click", () => {
        let cs = planet.config.chunkSize;
        for (let key in planet.chunks) {
            let c = planet.chunks[key];
            if (!c || !c.p) continue;
            if (cT === "biome") {
                c.b = cP; c.t = bD[cP].t; c.m = bD[cP].m;
            } else if (cT === "flat") {
                let val = bD[c.b] ? bD[c.b].e : 0.5;
                for(let px=0; px<cs; px++) {
                    for(let py=0; py<cs; py++) { c.p[px][py] = val; }
                }
            }
        }
        rC();
    });

    document.getElementById("dCan").addEventListener("click", () => { ov.style.display = "none"; });
    
    document.getElementById("dSav").addEventListener("click", () => {
        try {
            let cs = planet.config.chunkSize;
            for (let key in planet.chunks) {
                let c = planet.chunks[key];
                if (!c || !c.p) continue;
                let el = 0;
                for (let px = 0; px < cs; px++) {
                    for (let py = 0; py < cs; py++) { el += c.p[px][py]; }
                }
                c.e = Math.ceil((el / (cs * cs)) * 100) / 100;
            }
            
            // Re-render engine variables safely
            if (typeof calculateLandmasses === "function") calculateLandmasses();
            if (typeof renderMap === "function") renderMap(); 
            if (typeof updateCanvas === "function") updateCanvas();
            
            ov.style.display = "none";
        } catch (error) {
            console.error("Map Drawer Save Error:", error);
            if (typeof logMessage === "function") logMessage("Error saving map edits. Check console.", "error");
        }
    });

    document.getElementById("dExp").addEventListener("click", () => {
        let exportData = { width: planet.config.width, height: planet.config.height, chunkSize: planet.config.chunkSize, chunks: planet.chunks };
        if (typeof downloadJSON === "function") {
            downloadJSON(exportData, "gentown-map-exact.json", "application/json");
        }
    });

    document.getElementById("dImp").addEventListener("click", () => {
        let inp = document.createElement("input");
        inp.type = "file"; inp.accept = "application/json";
        inp.onchange = e => {
            let f = e.target.files[0];
            if (!f) return;
            let rd = new FileReader();
            rd.onload = evt => {
                try {
                    let d = JSON.parse(evt.target.result);
                    if (d.width === planet.config.width && d.chunks) {
                        planet.chunks = d.chunks; 
                        rC();
                    } else { 
                        alert("Map config dimensions do not match the current planet."); 
                    }
                } catch(err) { 
                    alert("Invalid map file format."); 
                }
            };
            rd.readAsText(f);
        };
        inp.click();
    });

    function drawMapHotkey(e) {
        if (e.key.toLowerCase() === 'd' && !document.activeElement.tagName.match(/INPUT|TEXTAREA/) && !planet.settled && document.getElementById("dO").style.display !== "flex") {
            const drawBtn = document.getElementById("actionItem-drawMap");
            if (drawBtn) drawBtn.click();
        }
    }

    let aDB = () => {
        let cB = document.getElementById("actionItem-customize");
        if (cB && !document.getElementById("actionItem-drawMap")) {
            let dB = document.createElement("span");
            dB.className = "actionItem item clickable";
            dB.id = "actionItem-drawMap";
            dB.innerHTML = "Draw Map";
            dB.setAttribute("data-keybind", "d");
            
            dB.addEventListener("click", () => {
                if (planet.settled) { 
                    if (typeof logMessage === "function") logMessage("You cannot edit the map after settling.", "warning"); 
                    return; 
                }
                iC(); 
                ov.style.display = "flex"; 
                if (typeof closeExecutive === "function") closeExecutive();
            });
            
            cB.parentNode.insertBefore(dB, cB.nextSibling);
            
            document.removeEventListener('keydown', drawMapHotkey);
            document.addEventListener('keydown', drawMapHotkey);
        }
    };
    
    aDB();
    let obs = new MutationObserver(aDB);
    obs.observe(document.getElementById("actionMainList"), { childList: true, subtree: true });
    
    console.log("Map Drawer Mod Initialized");
});
