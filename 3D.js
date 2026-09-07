import { AbstractMod } from './better_mod_loader.mjs';

export default class GenTown3DMod extends AbstractMod {
    constructor() {
        super("gentown_3d_engine", "3D Map Engine", 1, []);
    }

    initialize() {
        let s1 = document.createElement("script");
        s1.src = "https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js";
        document.head.appendChild(s1);
        s1.onload = () => {
            let s2 = document.createElement("script");
            s2.src = "https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/controls/OrbitControls.js";
            document.head.appendChild(s2);
            s2.onload = () => {
                if (typeof window.Mod !== "undefined" && window.Mod.afterLoad) {
                    window.Mod.afterLoad(() => this.setup3DMap());
                }
                if (typeof window.planet !== "undefined" && window.planet.chunks) {
                    this.setup3DMap();
                }
            };
        };
    }

    setup3DMap() {
        if (typeof window.planet === "undefined" || !window.planet.config) return;

        const planet = window.planet;
        const THREE = window.THREE;

        let pw = planet.config.width;
        let ph = planet.config.height;
        let pz = planet.config.pixelSize;
        let chunkSize = planet.config.chunkSize;
        let dispScale = pw * 0.15;
        let W = pw * pz;
        let H = ph * pz;

        let mapDiv = document.getElementById("mapDiv");
        let mapCanvas = document.getElementById("mapCanvas");
        let existing = document.getElementById("webglCanvas");
        if (existing) existing.remove();

        let hmCanvas = document.createElement("canvas");
        hmCanvas.width = pw;
        hmCanvas.height = ph;
        let hCtx = hmCanvas.getContext("2d");

        for (let chunkKey in planet.chunks) {
            let chunk = planet.chunks[chunkKey];
            for (let x = 0; x < chunkSize; x++) {
                for (let y = 0; y < chunkSize; y++) {
                    let e = chunk.p[x][y];
                    let c = Math.floor(e * 255);
                    hCtx.fillStyle = `rgb(${c},${c},${c})`;
                    hCtx.fillRect(chunk.x * chunkSize + x, chunk.y * chunkSize + y, 1, 1);
                }
            }
        }

        let nmCanvas = document.createElement("canvas");
        nmCanvas.width = pw;
        nmCanvas.height = ph;
        let nCtx = nmCanvas.getContext("2d");
        let hData = hCtx.getImageData(0, 0, pw, ph).data;
        let nData = nCtx.createImageData(pw, ph);

        for (let y = 0; y < ph; y++) {
            for (let x = 0; x < pw; x++) {
                let i = (y * pw + x) * 4;
                let hL = x > 0 ? hData[i - 4] : hData[i];
                let hR = x < pw - 1 ? hData[i + 4] : hData[i];
                let hU = y > 0 ? hData[i - pw * 4] : hData[i];
                let hD = y < ph - 1 ? hData[i + pw * 4] : hData[i];
                let dx = (hL - hR) * 0.1;
                let dy = (hU - hD) * 0.1;
                let dz = 1.0;
                let len = Math.sqrt(dx * dx + dy * dy + dz * dz);
                nData.data[i] = Math.floor((dx / len * 0.5 + 0.5) * 255);
                nData.data[i + 1] = Math.floor((dy / len * 0.5 + 0.5) * 255);
                nData.data[i + 2] = Math.floor((dz / len * 0.5 + 0.5) * 255);
                nData.data[i + 3] = 255;
            }
        }
        nCtx.putImageData(nData, 0, 0);

        let scene = new THREE.Scene();
        let aspect = mapDiv.clientWidth / mapDiv.clientHeight;
        let frustumSize = Math.max(W, H) * 1.15;
        
        let orthoCamera = new THREE.OrthographicCamera(frustumSize * aspect / -2, frustumSize * aspect / 2, frustumSize / 2, frustumSize / -2, -1000, 10000);
        orthoCamera.position.set(0, frustumSize, frustumSize * 0.6);
        let perspCamera = new THREE.PerspectiveCamera(45, aspect, 0.1, 10000);
        perspCamera.position.set(0, Math.max(W, H) * 0.85, H * 0.9);

        let activeCamera = orthoCamera;
        let renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
        renderer.setSize(mapDiv.clientWidth, mapDiv.clientHeight);
        renderer.domElement.id = "webglCanvas";
        renderer.domElement.style.position = "absolute";
        renderer.domElement.style.top = "0";
        renderer.domElement.style.left = "0";
        renderer.domElement.style.width = "100%";
        renderer.domElement.style.height = "100%";
        renderer.domElement.style.zIndex = "10";
        renderer.domElement.style.touchAction = "none";
        
        mapDiv.style.position = "relative";
        mapDiv.appendChild(renderer.domElement);

        let controls = new THREE.OrbitControls(activeCamera, renderer.domElement);
        controls.enableDamping = true;
        controls.dampingFactor = 0.05;
        controls.maxPolarAngle = Math.PI / 2.2;
        controls.minZoom = 0.2;
        controls.maxZoom = 6;
        controls.target.set(0, 0, 0);

        let mCanvas = document.createElement("canvas");
        mCanvas.width = W;
        mCanvas.height = H;
        let mCtx = mCanvas.getContext("2d");

        let tex = new THREE.CanvasTexture(mCanvas);
        tex.minFilter = THREE.NearestFilter;
        tex.magFilter = THREE.NearestFilter;
        if (THREE.sRGBEncoding) tex.encoding = THREE.sRGBEncoding;

        let geo = new THREE.PlaneGeometry(W, H, pw, ph);
        let pos = geo.attributes.position;
        for (let i = 0; i < pos.count; i++) {
            let u = pos.getX(i) / W + 0.5;
            let v = pos.getY(i) / H + 0.5;
            let px = Math.min(Math.floor(u * pw), pw - 1);
            let py = Math.min(Math.floor((1 - v) * ph), ph - 1);
            let chunk = planet.chunks[Math.floor(px / chunkSize) + "," + Math.floor(py / chunkSize)];
            let e = chunk ? chunk.p[px % chunkSize][py % chunkSize] : 0;
            pos.setZ(i, e);
        }
        geo.computeVertexNormals();

        let normTex = new THREE.CanvasTexture(nmCanvas);
        normTex.minFilter = THREE.LinearFilter;
        normTex.magFilter = THREE.LinearFilter;

        let mat = new THREE.MeshStandardMaterial({
            map: tex,
            normalMap: normTex,
            normalScale: new THREE.Vector2(1.5, 1.5),
            roughness: 0.9,
            metalness: 0.05
        });

        let mesh = new THREE.Mesh(geo, mat);
        mesh.rotation.x = -Math.PI / 2;
        scene.add(mesh);

        let waterGeo = new THREE.PlaneGeometry(W, H, Math.floor(pw/2), Math.floor(ph/2));
        let waterMat = new THREE.MeshStandardMaterial({
            color: 0x3a6ebd,
            transparent: true,
            opacity: 0.70,
            roughness: 0.1,
            metalness: 0.4
        });
        let waterMesh = new THREE.Mesh(waterGeo, waterMat);
        waterMesh.rotation.x = -Math.PI / 2;
        scene.add(waterMesh);

        let cursorGeo = new THREE.BoxGeometry(chunkSize * pz, 1, chunkSize * pz);
        cursorGeo.translate(0, 0.5, 0);
        let cursorMat = new THREE.MeshBasicMaterial({color: 0xffffff, transparent: true, opacity: 0.3, depthWrite: false});
        let cursorMesh = new THREE.Mesh(cursorGeo, cursorMat);
        cursorMesh.visible = false;
        scene.add(cursorMesh);

        let ambient = new THREE.AmbientLight(0xffffff, 0.6);
        scene.add(ambient);
        let dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
        dirLight.position.set(W, W * 1.5, H);
        scene.add(dirLight);

        let spriteGroup = new THREE.Group();
        scene.add(spriteGroup);
        let spriteCache = {};

        function sync3DState() {
            let enabled = window.userSettings.g3d_enabled !== false && window.userSettings.g3d_enabled !== "false";
            renderer.domElement.style.display = enabled ? "block" : "none";
            mapCanvas.style.opacity = enabled ? "0" : "1";
            mapCanvas.style.pointerEvents = enabled ? "none" : "auto";
            
            let isOrtho = window.userSettings.g3d_ortho !== false && window.userSettings.g3d_ortho !== "false";
            let newCamera = isOrtho ? orthoCamera : perspCamera;
            
            if (activeCamera !== newCamera) {
                activeCamera = newCamera;
                controls.dispose();
                controls = new THREE.OrbitControls(activeCamera, renderer.domElement);
                controls.enableDamping = true;
                controls.dampingFactor = 0.05;
                controls.maxPolarAngle = Math.PI / 2.2;
                controls.minZoom = 0.2;
                controls.maxZoom = 6;
                controls.target.set(0, 0, 0);
            }
            
            let scale = (window.userSettings.g3d_scale !== undefined ? window.userSettings.g3d_scale : 100) / 100;
            mesh.scale.set(1, 1, dispScale * scale);
            waterMesh.position.y = dispScale * scale * planet.config.waterLevel;
        }

        function getExecutiveItems() {
            let enabled = window.userSettings.g3d_enabled !== false && window.userSettings.g3d_enabled !== "false";
            let ortho = window.userSettings.g3d_ortho !== false && window.userSettings.g3d_ortho !== "false";
            let scale = window.userSettings.g3d_scale !== undefined ? window.userSettings.g3d_scale : 100;
            
            return [
                {
                    text: `3D View: <span class='settingValue'>${enabled ? "ON" : "OFF"}</span>`,
                    func: () => {
                        window.userSettings.g3d_enabled = !enabled;
                        window.saveSettings();
                        sync3DState();
                        syncSprites();
                        openSettings(); 
                    }
                },
                {
                    text: `Camera Mode: <span class='settingValue'>${ortho ? "Ortho" : "Persp"}</span>`,
                    func: () => {
                        window.userSettings.g3d_ortho = !ortho;
                        window.saveSettings();
                        sync3DState();
                        openSettings(); 
                    }
                },
                {
                    text: `Elevation Scale: <span class='settingValue'>${scale}%</span>`,
                    id: "g3d_scale_custom",
                    func: () => {}
                }
            ];
        }

        function openSettings() {
            window.populateExecutive(getExecutiveItems(), "3D Engine Settings");
            window.currentExecutive = "g3dmod";

            setTimeout(() => {
                let slider = document.getElementById("actionItem-g3d_scale_custom");
                if (slider) {
                    slider.className = "actionItem item clickable actionSetting actionSlider";
                    
                    let min = 0, max = 300, step = 10;
                    let updateGradient = (val) => {
                        let percent = (val - min) / (max - min);
                        slider.style.background = `linear-gradient(to right, rgba(255, 255, 255, 0.2) ${percent * 100}%, transparent ${percent * 100}%)`;
                    };
                    
                    let scaleVal = window.userSettings.g3d_scale !== undefined ? window.userSettings.g3d_scale : 100;
                    updateGradient(scaleVal);

                    let onDrag = (e) => {
                        let rect = slider.getBoundingClientRect();
                        let clientX = e.touches ? e.touches[0].clientX : e.clientX;
                        let percent = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
                        let val = Math.round((percent * (max - min) + min) / step) * step;
                        
                        slider.querySelector(".settingValue").innerText = val + "%";
                        updateGradient(val);
                        window.userSettings.g3d_scale = val;
                        sync3DState();
                        syncSprites();
                    };

                    let onUp = () => {
                        window.removeEventListener("mousemove", onDrag);
                        window.removeEventListener("mouseup", onUp);
                        window.removeEventListener("touchmove", onDrag);
                        window.removeEventListener("touchend", onUp);
                        window.saveSettings();
                    };

                    slider.addEventListener("mousedown", (e) => {
                        e.stopPropagation();
                        onDrag(e);
                        window.addEventListener("mousemove", onDrag);
                        window.addEventListener("mouseup", onUp);
                    });
                    
                    slider.addEventListener("touchstart", (e) => {
                        e.stopPropagation();
                        onDrag(e);
                        window.addEventListener("touchmove", onDrag);
                        window.addEventListener("touchend", onUp);
                    });
                }
            }, 10);
        }

        let origInitExec = window.initExecutive;
        window.initExecutive = function() {
            if (origInitExec) origInitExec.apply(this, arguments);
            let list = document.getElementById("actionMainList");
            if (list && !document.getElementById("actionItem-g3dmod")) {
                let btn = document.createElement("span");
                btn.id = "actionItem-g3dmod";
                btn.className = "actionItem item clickable";
                btn.innerHTML = "3D Map Engine";
                btn.onclick = () => { openSettings(); };
                list.appendChild(btn);
            }
        };

        if (typeof window.currentExecutive !== "undefined") window.initExecutive();
        sync3DState();

        function createTextSprite(text, fillColor, strokeColor, font, isMarker) {
            let canvas = document.createElement('canvas');
            let ctx = canvas.getContext('2d');
            ctx.font = font;
            let metrics = ctx.measureText(text);
            canvas.width = Math.max(64, metrics.width + 32);
            canvas.height = 96;
            ctx.font = font;
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.lineWidth = isMarker ? pz * 2 : pz * 2.5;
            ctx.strokeStyle = strokeColor;
            ctx.strokeText(text, canvas.width/2, canvas.height/2 + 8);
            ctx.fillStyle = fillColor;
            ctx.fillText(text, canvas.width/2, canvas.height/2 + 8);
            
            let t = new THREE.CanvasTexture(canvas);
            t.minFilter = THREE.NearestFilter;
            t.magFilter = THREE.NearestFilter;
            
            let m = new THREE.SpriteMaterial({map: t, transparent: true, depthTest: false});
            let s = new THREE.Sprite(m);
            s.scale.set(canvas.width * (W * 0.00035), canvas.height * (W * 0.00035), 1);
            return s;
        }

        function getElev(cx, cy) {
            let chunk = window.planet.chunks[cx + "," + cy];
            if(!chunk) return 0;
            return chunk.e;
        }

        function syncSprites() {
            let activeIds = new Set();
            let scale = (window.userSettings.g3d_scale !== undefined ? window.userSettings.g3d_scale : 100) / 100;
            for(let key in window.planet.reg.marker) {
                let m = window.planet.reg.marker[key];
                if(isNaN(m) && !m.end && m.x !== undefined && m.y !== undefined) {
                    let id = "m"+m.id;
                    activeIds.add(id);
                    let sym = m.symbol || "⏺";
                    let col = m.color || [176, 176, 153];
                    let fillColStr = `rgb(${col.join(",")})`;
                    let strokeColStr = `rgb(${window.colorBrightness(col, 0.8).join(",")})`;

                    if(!spriteCache[id] || spriteCache[id].text !== sym || spriteCache[id].color !== fillColStr) {
                        if(spriteCache[id]) {
                            spriteGroup.remove(spriteCache[id].sprite);
                            spriteCache[id].sprite.material.map.dispose();
                            spriteCache[id].sprite.material.dispose();
                        }
                        let sp = createTextSprite(sym, fillColStr, strokeColStr, "64px PublicPixel", true);
                        spriteCache[id] = { text: sym, color: fillColStr, sprite: sp };
                        spriteGroup.add(sp);
                    }
                    let e = getElev(m.x, m.y);
                    let pixelX = (m.x * chunkSize + chunkSize / 2) * pz;
                    let pixelY = (m.y * chunkSize + chunkSize / 2) * pz;
                    spriteCache[id].sprite.position.set(pixelX - W / 2, Math.max(e * dispScale * scale, waterMesh.position.y) + (W * 0.02), pixelY - H / 2);
                }
            }
            for(let key in window.planet.reg.town) {
                let t = window.planet.reg.town[key];
                if(isNaN(t) && t.center && !t.end) {
                    let id = "t"+t.id;
                    activeIds.add(id);
                    let hasIssue = Object.keys(t.issues).length;
                    
                    let txt = hasIssue ? "!".repeat(hasIssue) : t.name;
                    let fillColStr = hasIssue ? "rgb(255, 255, 0)" : `rgb(${t.color.join(",")})`;
                    let strokeColStr = hasIssue ? "rgb(255, 0, 0)" : "rgb(0, 0, 0)";
                    let fontStr = (t.usurp ? "italic " : "") + (hasIssue ? "112px VT323" : "64px VT323");

                    if(!spriteCache[id] || spriteCache[id].text !== txt || spriteCache[id].color !== fillColStr) {
                        if(spriteCache[id]) {
                            spriteGroup.remove(spriteCache[id].sprite);
                            spriteCache[id].sprite.material.map.dispose();
                            spriteCache[id].sprite.material.dispose();
                        }
                        let sp = createTextSprite(txt, fillColStr, strokeColStr, fontStr, false);
                        spriteCache[id] = { text: txt, color: fillColStr, sprite: sp };
                        spriteGroup.add(sp);
                    }
                    let e = getElev(t.center[0], t.center[1]);
                    let pixelX = (t.center[0] * chunkSize + chunkSize / 2) * pz;
                    let pixelY = (t.center[1] * chunkSize + chunkSize / 2) * pz;
                    spriteCache[id].sprite.position.set(pixelX - W / 2, Math.max(e * dispScale * scale, waterMesh.position.y) + (W * 0.035), pixelY - H / 2);
                }
            }
            for(let id in spriteCache) {
                if(!activeIds.has(id)) {
                    spriteGroup.remove(spriteCache[id].sprite);
                    spriteCache[id].sprite.material.map.dispose();
                    spriteCache[id].sprite.material.dispose();
                    delete spriteCache[id];
                }
            }
        }

        let origUpdate = window.updateCanvas;
        window.updateCanvas = function() {
            if (origUpdate) origUpdate();
            mCtx.clearRect(0, 0, W, H);
            if (typeof window.canvasLayersOrder !== "undefined" && typeof window.canvasLayers !== "undefined") {
                for (let i = 0; i < window.canvasLayersOrder.length; i++) {
                    let layer = window.canvasLayersOrder[i];
                    if (layer === "markers") continue; 
                    if (layer === "cursor" && window.userSettings.g3d_enabled !== false && window.userSettings.g3d_enabled !== "false") continue;
                    if (window.canvasLayers[layer]) mCtx.drawImage(window.canvasLayers[layer], 0, 0, W, H);
                }
            }
            tex.needsUpdate = true;
            syncSprites();
        };
        window.updateCanvas();

        let raycaster = new THREE.Raycaster();
        let mouse = new THREE.Vector2();

        function triggerEvent(eventName, e) {
            if (window.userSettings.g3d_enabled === false || window.userSettings.g3d_enabled === "false") return;
            let rRect = renderer.domElement.getBoundingClientRect();
            mouse.x = ((e.clientX - rRect.left) / rRect.width) * 2 - 1;
            mouse.y = -((e.clientY - rRect.top) / rRect.height) * 2 + 1;
            
            raycaster.setFromCamera(mouse, activeCamera);
            let intersects = raycaster.intersectObject(mesh);
            
            if (intersects.length > 0) {
                let uv = intersects[0].uv;
                let cx = Math.floor(uv.x * pw / chunkSize);
                let cy = Math.floor((1 - uv.y) * ph / chunkSize);

                if (cx >= 0 && cx < (pw/chunkSize) && cy >= 0 && cy < (ph/chunkSize)) {
                    let ce = window.chunkAt(cx, cy) ? window.chunkAt(cx, cy).e : 0;
                    let scale = (window.userSettings.g3d_scale !== undefined ? window.userSettings.g3d_scale : 100) / 100;
                    let yPos = Math.max(ce * dispScale * scale, waterMesh.position.y);
                    cursorMesh.position.set((cx * chunkSize + chunkSize/2) * pz - W/2, 0, (cy * chunkSize + chunkSize/2) * pz - H/2);
                    cursorMesh.scale.y = yPos + W * 0.005;
                    cursorMesh.visible = true;

                    let mRect = mapCanvas.getBoundingClientRect();
                    let targetX = mRect.left + (uv.x * mRect.width);
                    let targetY = mRect.top + ((1 - uv.y) * mRect.height);

                    let synthEvent = new MouseEvent(eventName, {
                        clientX: targetX,
                        clientY: targetY,
                        button: e.button !== undefined ? e.button : 0,
                        bubbles: true,
                        cancelable: true
                    });
                    mapCanvas.dispatchEvent(synthEvent);
                }
            } else {
                cursorMesh.visible = false;
                if (eventName === "mousemove") mapCanvas.dispatchEvent(new MouseEvent("mouseout", { bubbles: true }));
            }
        }

        let startX = 0, startY = 0;
        let isDragging = false;

        renderer.domElement.addEventListener('pointerdown', (e) => {
            startX = e.clientX; startY = e.clientY;
            isDragging = false;
        });
        
        renderer.domElement.addEventListener('pointerup', (e) => {
            if (Math.hypot(e.clientX - startX, e.clientY - startY) > 5) isDragging = true;
            if (!isDragging) {
                triggerEvent("mousedown", e);
                triggerEvent("mouseup", e);
            }
        });

        renderer.domElement.addEventListener('pointermove', (e) => {
            if (Math.hypot(e.clientX - startX, e.clientY - startY) > 5) isDragging = true;
            triggerEvent("mousemove", e);
        });

        renderer.domElement.addEventListener('contextmenu', (e) => {
            e.preventDefault();
        });

        window.addEventListener('resize', () => {
            if (!mapDiv || !renderer || !activeCamera) return;
            let aspect = mapDiv.clientWidth / mapDiv.clientHeight;
            orthoCamera.left = frustumSize * aspect / -2;
            orthoCamera.right = frustumSize * aspect / 2;
            orthoCamera.top = frustumSize / 2;
            orthoCamera.bottom = frustumSize / -2;
            orthoCamera.updateProjectionMatrix();
            perspCamera.aspect = aspect;
            perspCamera.updateProjectionMatrix();
            renderer.setSize(mapDiv.clientWidth, mapDiv.clientHeight);
            sync3DState();
        });

        function anim() {
            requestAnimationFrame(anim);
            if (window.userSettings.g3d_enabled !== false && window.userSettings.g3d_enabled !== "false") {
                let time = Date.now() * 0.0008;
                let pos = waterGeo.attributes.position;
                for(let i=0; i<pos.count; i++) {
                    let px = pos.getX(i);
                    let py = pos.getY(i);
                    pos.setZ(i, Math.sin(px*0.05 + time) * Math.cos(py*0.05 + time) * (W*0.0015));
                }
                pos.needsUpdate = true;
                controls.update();
                renderer.render(scene, activeCamera);
            }
        }
        anim();
    }
}
