import $bml, { AbstractMod } from "./better_mod_loader.mjs";

export class InterplanetaryExpansion extends AbstractMod {
    constructor() {
        super("interplanetary_expansion", "Interplanetary Expansion", 0, [], true);
    }

    initialize() {
        window.cachedPlanets = window.cachedPlanets || [planet];
        window.activePlanetIndex = window.activePlanetIndex || 0;

        if (!planet._biomes) planet._biomes = JSON.parse(JSON.stringify(window.biomes));

        window.applyPlanetColors = () => {
            if (planet.config.landColor !== $c.defaultLandColor) {
                let hue = (planet.config.landColor - $c.defaultLandColor) / 360;
                for (let biome in window.biomes) {
                    let hsl = RGBtoHSL(window.biomes[biome].color);
                    hsl[0] += hue;
                    window.biomes[biome].colorOverride = HSLtoRGB(hsl);
                }
            } else {
                for (let biome in window.biomes) {
                    delete window.biomes[biome].colorOverride;
                }
            }
            if (planet.config.waterColor !== $c.defaultWaterColor) {
                let hue = ($c.defaultWaterColor - planet.config.waterColor) / 360;
                let hsl = RGBtoHSL(window.biomes.water.color);
                hsl[0] += hue;
                window.biomes.water.colorOverride = HSLtoRGB(hsl);
                window.waterColors = [...window.waterColorsOld];
                for (let i = 0; i < window.waterColors.length; i++) {
                    let hsl = RGBtoHSL(window.waterColors[i]);
                    hsl[0] += hue;
                    window.waterColors[i] = HSLtoRGB(hsl);
                }
            } else {
                window.waterColors = [...window.waterColorsOld];
            }
        };

        let cycleBtn = document.getElementById("cyclePlanetBtn");
        if (!cycleBtn) {
            cycleBtn = document.createElement("button");
            cycleBtn.id = "cyclePlanetBtn";
            cycleBtn.className = "actionItem";
            cycleBtn.style.padding = "4px 8px";
            cycleBtn.style.marginLeft = "10px";
            cycleBtn.style.background = "transparent";
            cycleBtn.style.color = "#fff";
            cycleBtn.style.border = "1px solid #fff";
            cycleBtn.style.cursor = "pointer";
            cycleBtn.style.fontFamily = "'VT323', 'PublicPixel', monospace";
            cycleBtn.style.display = "none";
            let viewBtn = document.getElementById("viewButton");
            if (viewBtn) viewBtn.parentNode.insertBefore(cycleBtn, viewBtn.nextSibling);

            cycleBtn.onclick = () => {
                if (window.cachedPlanets.length <= 1) return;
                window.cachedPlanets[window.activePlanetIndex]._logs = document.getElementById("logMessages").innerHTML;
                window.activePlanetIndex = (window.activePlanetIndex + 1) % window.cachedPlanets.length;
                planet = window.cachedPlanets[window.activePlanetIndex];
                reg = planet.reg;
                window.biomes = planet._biomes;
                document.getElementById("logMessages").innerHTML = planet._logs || "";
                window.applyPlanetColors();
                updateBiomes();
                renderMap();
                renderHighlight();
                updateCanvas();
                updateStats();
                document.getElementById("planetName").innerHTML = parseText("{{planet}}");
                window.updateCycleBtn();
            };
        }

        window.updateCycleBtn = () => {
            let btn = document.getElementById("cyclePlanetBtn");
            if (btn) {
                if (window.cachedPlanets.length > 1) {
                    btn.style.display = "inline-flex";
                    btn.style.alignItems = "center";
                    let nextIndex = (window.activePlanetIndex + 1) % window.cachedPlanets.length;
                    btn.innerHTML = `<img src="https://raw.githubusercontent.com/Hypergenius12/test1/refs/heads/main/planet.png" style="width:32px;height:32px;margin-right:6px;image-rendering:pixelated;" alt="planet"> To ${window.cachedPlanets[nextIndex].name}`;
                } else {
                    btn.style.display = "none";
                }
            }
        };

        if (window.unlockTree && window.unlockTree.astronomy && window.unlockTree.astronomy.levels.length === 2) {
            window.unlockTree.astronomy.levels.push({
                level: 30,
                name: "Aerospace",
                message: "{{people}} look to the stars not just to observe, but to visit. {{should}}",
                messageDone: "Aerospace engineering paves the way for orbital launches.",
                influences: { education: 2 },
                needsUnlock: { smith: 40 }
            });
            window.unlockTree.astronomy.levels.push({
                level: 40,
                name: "Deep Space Telemetry",
                message: "Scientists want to establish advanced communication networks across the stars. {{should}}",
                messageDone: "Deep space telemetry arrays now monitor planetary sectors.",
                influences: { education: 2 },
                needsUnlock: { astronomy: 30 }
            });
        }
        
        if (window.unlockTree && window.unlockTree.trade && window.unlockTree.trade.levels.length === 3) {
            window.unlockTree.trade.levels.push({
                level: 40,
                name: "Interplanetary Trade",
                message: "{{people}} want to establish logistics routes between planets. {{should}}",
                messageDone: "Interplanetary freighters now transport goods across the void.",
                influences: { trade: 2 },
                needsUnlock: { astronomy: 30 }
            });
        }

        actionables.process._projectSubtypes["spaceport"] = {
            symbol: "",
            color: [200, 200, 200],
            influences: { travel: 5 },
            needsUnlock: { astronomy: 30, smith: 40 },
            nameTemplate: "$ Spaceport"
        };

        if (!window.oldFinishMod) {
            window.oldFinishMod = actionables.process.asTarget.Finish;
            actionables.process.asTarget.Finish = function(subject, target, args) {
                let result = window.oldFinishMod(subject, target, args);
                if (target && target.type === "project" && target.subtype === "spaceport" && target.town && !target.marker) {
                    let townChunks = filterChunks(c => c.v.s === target.town && !c.v.m);
                    let chunk = choose(townChunks);
                    if (chunk) {
                        let landmark = happen("Create", target, null, {
                            named: false,
                            type: "landmark",
                            subtype: target.subtype,
                            x: chunk.x,
                            y: chunk.y,
                            symbol: "",
                            color: target.color || [200, 200, 200]
                        }, "marker");
                        target.marker = landmark.id;
                        landmark.process = target.id;
                        chunk.v.m = landmark.id;
                    }
                }
                return result;
            };
        }

        let spaceportImg = new Image();
        spaceportImg.crossOrigin = "anonymous";
        spaceportImg.src = "https://raw.githubusercontent.com/Hypergenius12/test1/refs/heads/main/rocket%20(1).png";

        if (!window.originalRenderMarkersMod) {
            window.originalRenderMarkersMod = renderMarkers;
            window.renderMarkers = function() {
                if (!viewData[currentView].showMarkers) return;

                let ctx = canvasLayersCtx.markers;
                ctx.clearRect(0, 0, canvasLayers.markers.width, canvasLayers.markers.height);
                const _chunkSize = planet.config.chunkSize * planet.config.pixelSize * $c.markerResolution;

                if (ctx.textAlign !== "center") {
                    ctx.textBaseline = "middle";
                    ctx.textAlign = "center";
                }
                ctx.font = (_chunkSize) + "px PublicPixel";

                let markers = regToArray("marker");
                if (userSettings.markers === false) markers = [];
                for (let i = 0; i < markers.length; i++) {
                    const marker = markers[i];
                    if (marker.subtype === "spaceport") continue;
                    const x = marker.x;
                    const y = marker.y;
                    const symbol = marker.symbol || "⏺";
                    let color = marker.color || [176, 176, 153];
                    if (x === undefined || y === undefined) continue;

                    let highlight = currentHighlight && currentHighlight[1] === marker.id && currentHighlight[0] === "marker";
                    if (highlight) {
                        color = colorBrightness(color, 1.2);
                        ctx.font = (_chunkSize * 1.5) + "px PublicPixel";
                    }

                    ctx.strokeStyle = "rgb(" + colorBrightness(color, 0.8) + ")";
                    ctx.lineWidth = planet.config.pixelSize * 2;
                    ctx.strokeText(symbol, x * _chunkSize + _chunkSize / 2 + planet.config.pixelSize / 1.5, y * _chunkSize + _chunkSize / 2 - planet.config.pixelSize / 1.5);

                    ctx.fillStyle = "rgb(" + color.join(",") + ")";
                    ctx.fillText(symbol, x * _chunkSize + _chunkSize / 2 + planet.config.pixelSize / 1.5, y * _chunkSize + _chunkSize / 2 - planet.config.pixelSize / 1.5);

                    if (highlight) ctx.font = (_chunkSize) + "px PublicPixel";
                }

                ctx.strokeStyle = "rgb(0,0,0)";
                regToArray("town").forEach((town) => {
                    if (!town.center) happen("UpdateCenter", null, town);
                    let hasIssue = Object.values(town.issues).length;

                    let x = town.center[0];
                    let y = town.center[1];

                    if ((userSettings.townNames && !controlState.shift) || (controlState.shift && !userSettings.townNames)) {
                        let name = town.name;

                        if (hasIssue) {
                            ctx.strokeStyle = "rgb(255, 0, 0)";
                            ctx.fillStyle = "rgb(255, 255, 0)";
                        } else {
                            ctx.strokeStyle = "rgb(0,0,0)";
                            ctx.fillStyle = "rgb(" + town.color.join(",") + ")";
                        }
                        
                        ctx.font = (town.usurp ? "italic " : "") + Math.max(64, Math.round(Math.min(town.size, 100) / 100 * 96)) + "px VT323";

                        ctx.lineWidth = planet.config.pixelSize * 2.5;
                        ctx.strokeText(name, x * _chunkSize + _chunkSize / 2 + planet.config.pixelSize / 1.5, y * _chunkSize + _chunkSize / 2 - planet.config.pixelSize / 1.5);
                        ctx.fillText(name, x * _chunkSize + _chunkSize / 2 + planet.config.pixelSize / 1.5, y * _chunkSize + _chunkSize / 2 - planet.config.pixelSize / 1.5);
                    } else if (hasIssue && userSettings.markers !== false) {
                        ctx.lineWidth = planet.config.pixelSize * 3;
                        
                        ctx.strokeStyle = "rgb(255, 0, 0)";
                        ctx.fillStyle = "rgb(255, 255, 0)";

                        ctx.font = (town.usurp ? "italic " : "") + Math.max(112, Math.round(Math.min(town.size, 128) / 100 * 96)) + "px VT323";
                        ctx.strokeText("!".repeat(hasIssue), x * _chunkSize + _chunkSize / 2 + planet.config.pixelSize / 1.5, y * _chunkSize + _chunkSize / 2 - planet.config.pixelSize / 1.5);
                        ctx.fillText("!".repeat(hasIssue), x * _chunkSize + _chunkSize / 2 + planet.config.pixelSize / 1.5, y * _chunkSize + _chunkSize / 2 - planet.config.pixelSize / 1.5);
                    }
                });

                const _baseSize = planet.config.chunkSize * planet.config.pixelSize * $c.markerResolution;
                const _renderSize = _baseSize * 2;

                for (let i = 0; i < markers.length; i++) {
                    const marker = markers[i];
                    if (marker.subtype === "spaceport" && marker.x !== undefined && marker.y !== undefined && spaceportImg.complete && spaceportImg.naturalWidth > 0) {
                        let x = marker.x * _baseSize - (_renderSize - _baseSize) / 2;
                        let y = marker.y * _baseSize - (_renderSize - _baseSize) / 2;
                        ctx.clearRect(marker.x * _baseSize, marker.y * _baseSize, _baseSize, _baseSize);
                        ctx.drawImage(spaceportImg, x, y, _renderSize, _renderSize);
                    }
                }
            };
        }

        window.handleSpaceportExplosion = function(launchPlanet, launchTown, rocketType) {
            let prevActive = window.activePlanetIndex;
            window.activePlanetIndex = window.cachedPlanets.indexOf(launchPlanet);
            planet = launchPlanet;
            reg = launchPlanet.reg;
            window.biomes = launchPlanet._biomes;

            logMessage(`Catastrophic failure! The ${rocketType} exploded on the launchpad.`, "error");
            happen("Influence", null, launchTown, {happy: -5, temp: true});
            let spaceport = Object.values(launchPlanet.reg.marker).find(m => !m.end && m.subtype === "spaceport" && m.town === launchTown.id);
            if (spaceport) happen("End", null, spaceport);

            doPrompt({
                type: "confirm",
                message: `Rebuild the destroyed spaceport in ${launchTown.name}?`,
                func: (r) => {
                    if (!r) return;
                    let prevActiveInside = window.activePlanetIndex;
                    window.activePlanetIndex = window.cachedPlanets.indexOf(launchPlanet);
                    planet = launchPlanet;
                    reg = launchPlanet.reg;
                    window.biomes = launchPlanet._biomes;

                    happen("Create", launchTown, null, {
                        type: "project",
                        subtype: "spaceport",
                        cost: Math.max(20, Math.round(launchTown.pop))
                    }, "process");
                    logMessage(`Rebuilding of the spaceport has begun in ${launchTown.name}.`);

                    window.activePlanetIndex = prevActiveInside;
                    planet = window.cachedPlanets[prevActiveInside];
                    reg = planet.reg;
                    window.biomes = planet._biomes;
                    updateStats();
                    renderHighlight();
                    updateCanvas();
                }
            });

            window.activePlanetIndex = prevActive;
            planet = window.cachedPlanets[prevActive];
            reg = planet.reg;
            window.biomes = planet._biomes;
        };

        window.handleRocketArrival = function(subject, launchPlanet) {
            let hw = window.cachedPlanets[0];
            let targetBody = hw.reg.body[subject.destination];

            let alien = window.cachedPlanets.find(p => p.body === subject.destination);
            if (!alien) {
                let alienConfig = JSON.parse(JSON.stringify(hw.config));
                alienConfig.seed = Math.random();
                alienConfig.temp = Math.random() * 0.6 - 0.3;
                alienConfig.moisture = Math.random() * 0.6 - 0.3;
                alienConfig.elevation = Math.random() * 0.4 - 0.2;
                alienConfig.biomeSize = randRange(25, 45);
                alienConfig.landColor = Math.floor(Math.random() * 360);
                alienConfig.waterColor = Math.floor(Math.random() * 360);
                
                let tempP = planet;
                planet = generatePlanet(alienConfig);
                alien = planet;
                
                alien.reg.system = JSON.parse(JSON.stringify(hw.reg.system));
                alien.reg.body = JSON.parse(JSON.stringify(hw.reg.body));
                
                alien.name = targetBody ? targetBody.name : (generateWord(3, true) + " Prime");
                alien.body = subject.destination;
                alien._isAlien = true;
                alien._logs = "";
                
                alien._biomes = { water: JSON.parse(JSON.stringify(hw._biomes.water)), mountain: JSON.parse(JSON.stringify(hw._biomes.mountain)) };
                alien._biomes.water.plant = []; alien._biomes.water.animal = [];
                alien._biomes.mountain.plant = []; alien._biomes.mountain.animal = [];

                let pfx = ["Crysta","Magma","Toxic","Spore","Void"];
                let numBiomes = randRange(3, 5);
                let selectedPfx = [];
                while (selectedPfx.length < numBiomes) {
                    let p = choose(pfx);
                    if (!selectedPfx.includes(p)) selectedPfx.push(p);
                }

                selectedPfx.forEach((p, i) => {
                    alien._biomes["alien" + i] = {
                        color: [Math.floor(Math.random()*255), Math.floor(Math.random()*255), Math.floor(Math.random()*255)],
                        elevation: Math.random(),
                        moisture: Math.random(),
                        temp: Math.random(),
                        name: p.toLowerCase() + " wastes",
                        hasLumber: Math.random() > 0.5,
                        plant: [], animal: []
                    };
                });

                window.biomes = alien._biomes;
                
                for (let biome in window.biomes) {
                    for (let i = 0; i < 2; i++) {
                        if (window.biomes[biome].plant !== null) happen("Create",null,null,{ type:"plant", biome:biome, named:false },"species");
                        if (window.biomes[biome].animal !== null) happen("Create",null,null,{ type:"animal", biome:biome, named:false },"species");
                    }
                }
                
                window.applyPlanetColors();
                updateBiomes();
                calculateLandmasses();
                window.cachedPlanets.push(alien);
                
                planet = tempP;
                window.biomes = planet._biomes;
                window.applyPlanetColors();
            }

            window.cachedPlanets[window.activePlanetIndex]._logs = document.getElementById("logMessages").innerHTML;
            window.activePlanetIndex = window.cachedPlanets.indexOf(alien);
            planet = alien;
            reg = planet.reg;
            window.biomes = planet._biomes;

            let emptyChunks = Object.values(alien.chunks).filter(c => c.b !== "water" && c.b !== "mountain" && c.v.s === undefined);
            
            if (emptyChunks.length > 0) {
                document.getElementById("logMessages").innerHTML = "";
                logMessage(`Orbiting ${alien.name}. Tap on the map to land the Genesis Pod!`, "tip");
                
                window.onMapClick = function(e) {
                    let chunk = alien.chunks[mousePos.chunkX+","+mousePos.chunkY];
                    if (chunk && chunk.b !== "water" && chunk.b !== "mountain" && chunk.v.s === undefined) {
                        let pReg = regAdd("player", {});
                        let newTown = happen("Create", pReg, null, {x:chunk.x, y:chunk.y, pop:15}, "town");
                        if(newTown) {
                            newTown.name = "Genesis Pod " + generateWord(1, true);
                            newTown.type = "colony";
                            newTown.body = alien.body;
                        }
                        let existingTowns = Object.values(alien.reg.town).filter(t => !t.end && !isNaN(t.pop));
                        if (existingTowns.length > 1) {
                            logMessage(`Genesis Pod landed! The local colonies of ${alien.name} hold a grand welcome ceremony for the new arrivals!`);
                        } else {
                            logMessage(`Genesis Pod landed on ${alien.name}!`);
                        }
                        window.onMapClick = null;
                        window.updateCycleBtn();
                        renderMap();
                        renderHighlight();
                        updateCanvas();
                    }
                };
            } else {
                doPrompt({
                    type: "choose",
                    message: `Orbiting ${alien.name}, but it is completely fully settled! There is no room to land the pod.`,
                    choices: ["Abort Mission", "Nuke Planet"],
                    func: (r) => {
                        if (r === "Abort Mission") {
                            logMessage("The colony ship aborted its landing and returned to the void.", "warning");
                        } else if (r === "Nuke Planet") {
                            let alienTowns = Object.values(alien.reg.town).filter(t => !t.end && !isNaN(t.pop));
                            alienTowns.forEach(t => happen("End", null, t));
                            logMessage(`Nuclear bombardment has cleared ${alien.name} for settlement. Tap to land.`, "warning");
                            window.onMapClick = function(e) {
                                let chunk = alien.chunks[mousePos.chunkX+","+mousePos.chunkY];
                                if (chunk && chunk.b !== "water" && chunk.b !== "mountain" && chunk.v.s === undefined) {
                                    let pReg = regAdd("player", {});
                                    let newTown = happen("Create", pReg, null, {x:chunk.x, y:chunk.y, pop:15}, "town");
                                    if(newTown) {
                                        newTown.name = "Genesis Pod " + generateWord(1, true);
                                        newTown.type = "colony";
                                        newTown.body = alien.body;
                                    }
                                    logMessage(`Genesis Pod landed on the irradiated remains of ${alien.name}!`);
                                    window.onMapClick = null;
                                    window.updateCycleBtn();
                                    renderMap();
                                    renderHighlight();
                                    updateCanvas();
                                }
                            };
                        }
                        window.updateCycleBtn();
                    }
                });
            }
            
            window.applyPlanetColors();
            renderMap();
            renderHighlight();
            updateCanvas();
            updateStats();
            document.getElementById("planetName").innerHTML = parseText("{{planet}}");
            window.updateCycleBtn();
        };

        if (!window.oldOnNextDayMod) {
            window.oldOnNextDayMod = onNextDay;
            window.onNextDay = function() {
                if (window.oldOnNextDayMod) window.oldOnNextDayMod();
                
                window.cachedPlanets.forEach(p => {
                    Object.values(p.reg.process).forEach(proc => {
                        if (!isNaN(proc.id) && proc.type === "rocket_journey" && !proc.done && !proc.end) {
                            proc.duration--;
                            if (proc.duration === Math.floor(proc.totalDuration / 2)) {
                                let launchTown = p.reg.town[proc.town];
                                let targetBody = window.cachedPlanets[0].reg.body[proc.destination];
                                let tName = launchTown ? launchTown.name : "Unknown";
                                let bName = targetBody ? targetBody.name : "Unknown";
                                logMessage(`The colony ship from ${tName} is halfway to ${bName}!`);
                            }
                            if (proc.duration <= 0) {
                                proc.done = p.day;
                                window.handleRocketArrival(proc, p);
                            }
                        }

                        if (!isNaN(proc.id) && proc.type === "transport_rocket" && !proc.done && !proc.end) {
                            proc.duration--;
                            if (proc.duration <= 0) {
                                proc.done = p.day;
                                let targetP = window.cachedPlanets.find(pl => pl.body === proc.destinationPlanet);
                                if (targetP) {
                                    let validTowns = Object.values(targetP.reg.town).filter(t => !t.end && !isNaN(t.pop));
                                    if (validTowns.length > 0) {
                                        let t2 = choose(validTowns);
                                        let r1 = choose(["cash", "crop", "rock", "metal", "lumber"]);
                                        let amt1 = Math.floor(Math.random() * 100) + 50;
                                        if (!t2.resources) t2.resources = {};
                                        t2.resources[r1] = (t2.resources[r1] || 0) + amt1;
                                        
                                        let launchTown = p.reg.town[proc.town];
                                        if (launchTown) {
                                            let r2 = choose(["cash", "crop", "rock", "metal", "lumber"]);
                                            let amt2 = Math.floor(Math.random() * 100) + 50;
                                            if (!launchTown.resources) launchTown.resources = {};
                                            launchTown.resources[r2] = (launchTown.resources[r2] || 0) + amt2;
                                            
                                            let prevActiveInside = window.activePlanetIndex;
                                            window.activePlanetIndex = window.cachedPlanets.indexOf(p);
                                            let tempP = planet;
                                            let tempR = reg;
                                            let tempB = window.biomes;
                                            planet = p;
                                            reg = p.reg;
                                            window.biomes = p._biomes;
                                            
                                            logMessage(`Interplanetary transport arrived! ${launchTown.name} traded with ${t2.name} on ${targetP.name}.`);
                                            
                                            window.activePlanetIndex = prevActiveInside;
                                            planet = tempP;
                                            reg = tempR;
                                            window.biomes = tempB;
                                        }
                                    }
                                }
                            }
                        }

                        if (!isNaN(proc.id) && proc.type === "satellite_launch" && !proc.done && !proc.end) {
                            proc.duration--;
                            if (proc.duration <= 0) {
                                proc.done = p.day;
                                let launchTown = p.reg.town[proc.town];
                                if (launchTown) {
                                    let prevActiveInside = window.activePlanetIndex;
                                    window.activePlanetIndex = window.cachedPlanets.indexOf(p);
                                    let tempP = planet;
                                    let tempR = reg;
                                    let tempB = window.biomes;
                                    planet = p;
                                    reg = p.reg;
                                    window.biomes = p._biomes;
                                    
                                    happen("Influence", null, launchTown, {education: 2, happy: 1});
                                    logMessage(`Satellite from ${launchTown.name} successfully entered orbit!`);
                                    
                                    window.activePlanetIndex = prevActiveInside;
                                    planet = tempP;
                                    reg = tempR;
                                    window.biomes = tempB;
                                }
                            }
                        }
                    });
                });

                let currentActive = window.activePlanetIndex;
                window.cachedPlanets.forEach((p, idx) => {
                    if (idx !== currentActive) {
                        let tempP = planet;
                        let tempR = reg;
                        let tempB = window.biomes;
                        planet = p;
                        reg = p.reg;
                        window.biomes = p._biomes;
                        
                        let towns = regToArray("town");
                        towns.forEach(t => {
                            if (t.pop > 0 && !t.end) {
                                let birthRate = addInfluence($c.baseBirthRate, t, "birth");
                                let popChange = Math.floor(t.pop * birthRate);
                                if (popChange > 0) happen("AddPop", null, t, {count: popChange});
                                
                                let deathRate = $c.deathRate(t);
                                let deaths = Math.floor(t.pop * deathRate);
                                if (deaths > 0) happen("RemovePop", null, t, {count: deaths});
                            }
                        });
                        p.day++;
                        
                        planet = tempP;
                        reg = tempR;
                        window.biomes = tempB;
                    }
                });
            };
        }

        Mod.event("homePlanetAskName", {
            random: true,
            subject: {
                reg: "player", id: 1
            },
            target: {
                reg: "body", single: (b) => b.type === "planet" && b.home === true
            },
            value: {
                ask: true,
                preview: (text) => `Welcome to Planet {{b:${titleCase(text)}}}.`,
                default: (_, target) => (target && target.name) ? target.name : planet.name
            },
            check: (subject, target) => {
                let homeBody = target || (planet.body ? regGet("body", planet.body) : null);
                return homeBody && !homeBody.renamed && planet.day <= 5;
            },
            func: (subject, target, args) => {
                if (!args.value) return false;
                let homeBody = target || regGet("body", planet.body);
                let newName = titleCase(args.value).replace(/^the /i, "");
                if (homeBody) {
                    homeBody.name = newName;
                    homeBody.renamed = true;
                    unhideEntity(homeBody);
                }
                planet.name = newName;
                document.getElementById("planetName").innerHTML = parseText("{{planet}}");
                if (window.updateCycleBtn) window.updateCycleBtn();
            },
            message: () => `{{people}} want to officially name their home planet.`,
            messageDone: (_, target) => `The planet is now officially known as {{planet}}.`,
            weight: 100
        });

        Mod.event("speciesDiscover", Object.assign({}, randomEvents["speciesDiscover"], {
            check: (subject, target, args) => {
                let chunk = randomChunk((c) => c.v.s === target.id);
                if (!chunk) return false;
                let choices = [];
                if (window.biomes[chunk.b] && window.biomes[chunk.b].plant) choices = choices.concat(window.biomes[chunk.b].plant);
                if (window.biomes[chunk.b] && window.biomes[chunk.b].animal) choices = choices.concat(window.biomes[chunk.b].animal);
                if (chunk.e < planet.config.waterLevel + 1.5) {
                    if (window.biomes.water && window.biomes.water.plant) choices = choices.concat(window.biomes.water.plant);
                    if (window.biomes.water && window.biomes.water.animal) choices = choices.concat(window.biomes.water.animal);
                }
                choices = choices.filter(id => {
                    let sp = regGet("species", id);
                    return sp && sp.named === false;
                });
                if (!choices.length) return false;
                args.speciesID = choose(choices);
                let selectedSpecies = regGet("species", args.speciesID);
                if (!selectedSpecies) return false;
                args.biome = selectedSpecies.biome;
                happen("PopulateTraits", subject, selectedSpecies);
                return true;
            }
        }));

        const originalProjectValue = randomEvents["townProjectStart"].value;
        randomEvents["townProjectStart"].value = (subject, target, args) => {
            let choice = originalProjectValue(subject, target, args);
            if (planet.unlocks.astronomy >= 30 && planet.unlocks.smith >= 40) {
                let hasSpaceportGlobally = false;
                window.cachedPlanets.forEach(p => {
                    if (Object.values(p.reg.marker).some(m => !m.end && !isNaN(m.id) && m.subtype === "spaceport")) {
                        hasSpaceportGlobally = true;
                    }
                });
                let localHasSpaceport = regExists("marker", m => !m.end && m.subtype === "spaceport" && m.town === target.id);
                if (!hasSpaceportGlobally && !localHasSpaceport && Math.random() < 0.50) {
                    return "spaceport";
                }
            }
            return choice;
        };

        Mod.event("spaceportAction", {
            random: true,
            subject: { reg: "town", random: true },
            check: (subject) => {
                let hasSpaceport = regExists("marker", m => !m.end && m.subtype === "spaceport" && m.town === subject.id);
                if (!hasSpaceport) return false;
                if (planet.unlocks.trade < 40 && planet.unlocks.astronomy < 40) return false;
                if (regExists("process", p => !p.done && !p.end && (p.type === "transport_rocket" || p.type === "satellite_launch") && p.town === subject.id)) return false;
                return true;
            },
            value: (subject) => {
                let options = [];
                if (planet.unlocks.astronomy >= 40) options.push("satellite");
                if (planet.unlocks.trade >= 40) {
                    let validTargets = window.cachedPlanets.filter(p => p !== planet && p.unlocks && p.unlocks.trade >= 40 && Object.values(p.reg.marker).some(m => !m.end && m.subtype === "spaceport"));
                    if (validTargets.length > 0) options.push("transport");
                }
                return options.length > 0 ? choose(options) : null;
            },
            message: (subject, target, args) => {
                if (args.value === "satellite") return `Scientists in {{regname:town|${subject.id}}} want to launch a deep space telemetry satellite.`;
                return `Merchants in {{regname:town|${subject.id}}} want to launch a transport rocket to trade with other worlds.`;
            },
            buttonYes: "Launch",
            func: (subject, target, args) => {
                if (Math.random() < 0.10) {
                    window.handleSpaceportExplosion(planet, subject, args.value);
                } else {
                    let duration = randRange(3, 7);
                    if (args.value === "satellite") {
                        let process = happen("Create", subject, null, {
                            type: "satellite_launch",
                            duration: duration
                        }, "process");
                        if (process) process.totalDuration = duration;
                        logMessage(`Satellite launch sequence started in ${subject.name}.`);
                    } else {
                        let validTargets = window.cachedPlanets.filter(p => p !== planet && p.unlocks && p.unlocks.trade >= 40 && Object.values(p.reg.marker).some(m => !m.end && m.subtype === "spaceport"));
                        let targetP = choose(validTargets);
                        if (targetP) {
                            let process = happen("Create", subject, null, {
                                type: "transport_rocket",
                                duration: duration
                            }, "process");
                            if (process) {
                                process.totalDuration = duration;
                                process.originPlanet = planet.body;
                                process.destinationPlanet = targetP.body;
                            }
                            logMessage(`Transport rocket launched from ${subject.name} to ${targetP.name}.`);
                        }
                    }
                    autosave();
                }
            },
            buttonNo: "Scrap",
            weight: 3
        });

        Mod.event("globalLaunchManager", {
            daily: true,
            subject: { reg: "nature", id: 1 },
            func: () => {
                let hw = window.cachedPlanets[0];
                let allSpaceports = [];
                window.cachedPlanets.forEach(p => {
                    Object.values(p.reg.marker).forEach(m => {
                        if (!m.end && !isNaN(m.id) && m.subtype === "spaceport") allSpaceports.push({planet: p, marker: m});
                    });
                });
                if (allSpaceports.length === 0) return;
                
                if (!hw.stats.spBuilt) hw.stats.spBuilt = hw.day;
                if (!hw.stats.nextL) hw.stats.nextL = hw.day + randRange(10, 30);
                
                if (hw.day >= hw.stats.nextL) {
                    hw.stats.nextL = hw.day + randRange(125, 200);
                    let isFirst = !hw.stats.hadFirstL;
                    hw.stats.hadFirstL = true;
                    
                    if (!isFirst && Math.random() > 0.70) return;
                    
                    let chosen = choose(allSpaceports);
                    let launchPlanet = chosen.planet;
                    let launchTown = launchPlanet.reg.town[chosen.marker.town];
                    if (!launchTown) return;
                    
                    let bodies = Object.values(hw.reg.body).filter(b => b.type === "planet" && b.named !== false && !b.home);
                    if (!bodies.length) return;
                    let targetBody = choose(bodies);
                    
                    logMessage(`Residents of ${launchTown.name} on ${launchPlanet.name} wonder what it would be like to live on ${targetBody.name}. Launch a colony ship?`, undefined, {
                        buttons: [
                            {
                                name: "Launch",
                                func: () => {
                                    if (Math.random() < 0.15) {
                                        window.handleSpaceportExplosion(launchPlanet, launchTown, "colony ship");
                                    } else {
                                        let duration = randRange(5, 10);
                                        
                                        let prevActiveInside = window.activePlanetIndex;
                                        window.activePlanetIndex = window.cachedPlanets.indexOf(launchPlanet);
                                        let tempP = planet;
                                        let tempR = reg;
                                        let tempB = window.biomes;
                                        planet = launchPlanet;
                                        reg = launchPlanet.reg;
                                        window.biomes = launchPlanet._biomes;
                                        
                                        let process = happen("Create", launchTown, null, {
                                            type: "rocket_journey",
                                            duration: duration
                                        }, "process");
                                        
                                        if (process) {
                                            process.totalDuration = duration;
                                            process.destination = targetBody.id;
                                        }
                                        
                                        window.activePlanetIndex = prevActiveInside;
                                        planet = tempP;
                                        reg = tempR;
                                        window.biomes = tempB;
                                        
                                        logMessage(`Colony ship launched from ${launchTown.name} to ${targetBody.name}!`);
                                    }
                                    autosave();
                                }
                            },
                            {
                                name: "Stay",
                                func: () => {}
                            }
                        ]
                    });
                }
            }
        });

        Mod.event("globalSpaceTrade", {
            daily: true,
            subject: { reg: "nature", id: 1 },
            func: () => {
                let validPlanets = window.cachedPlanets.filter(p => p.unlocks && p.unlocks.trade >= 40 && Object.values(p.reg.marker).some(m => !m.end && !isNaN(m.id) && m.subtype === "spaceport"));
                if (validPlanets.length < 2) return;
                
                if (Math.random() > 0.05) return;
                
                let p1 = choose(validPlanets);
                let p2 = choose(validPlanets.filter(p => p !== p1));
                if (!p1 || !p2) return;
                
                let validTowns1 = Object.values(p1.reg.town).filter(t => !t.end && !isNaN(t.pop));
                let validTowns2 = Object.values(p2.reg.town).filter(t => !t.end && !isNaN(t.pop));
                if (!validTowns1.length || !validTowns2.length) return;
                
                let t1 = choose(validTowns1);
                let t2 = choose(validTowns2);
                let r1 = choose(["cash", "crop", "rock", "metal", "lumber"]);
                let r2 = choose(["cash", "crop", "rock", "metal", "lumber"]);
                
                let amt1 = Math.floor(Math.random() * 50) + 10;
                let amt2 = Math.floor(Math.random() * 50) + 10;
                
                if (t1.resources && t1.resources[r1]) t1.resources[r1] = Math.max(0, t1.resources[r1] - amt1);
                if (!t2.resources) t2.resources = {};
                t2.resources[r1] = (t2.resources[r1] || 0) + amt1;
                
                if (t2.resources && t2.resources[r2]) t2.resources[r2] = Math.max(0, t2.resources[r2] - amt2);
                if (!t1.resources) t1.resources = {};
                t1.resources[r2] = (t1.resources[r2] || 0) + amt2;
                
                logMessage(`Interplanetary freighters arrived! ${t1.name} exchanged ${r1} with ${t2.name} for ${r2}.`, "tip");
            }
        });

        Mod.event("alienArtifact", {
            random: true,
            subject: { reg: "town", random: true },
            check: (subject, target, args) => planet._isAlien === true && subject && !subject.end && Math.random() < 0.05,
            message: (subject, target, args) => `Miners in {{regname:town|${subject.id}}} uncovered a buried xeno-artifact. What should they do?`,
            buttonYes: "Study",
            func: (subject, target, args) => {
                if(Math.random() < 0.6) {
                    logMessage(`Studying the artifact yielded advanced alien metals!`);
                    happen("AddResource", null, subject, {type:"metal", count:150});
                    happen("Influence", null, subject, {education: 2});
                } else {
                    logMessage(`The artifact leaked radiation, causing casualties in {{regname:town|${subject.id}}}.`, "error");
                    happen("Death", null, subject, {count: Math.floor(subject.pop * 0.15) + 2});
                }
            },
            buttonNo: "Dismantle",
            funcNo: (subject, target, args) => {
                logMessage(`The artifact was safely dismantled for scrap.`);
                happen("AddResource", null, subject, {type:"rock", count:75});
                happen("AddResource", null, subject, {type:"metal", count:25});
            },
            weight: 1
        });

        Mod.event("homesickness", {
    random: true,
    subject: { reg: "town", random: true },
    check: (subject, target, args) => planet._isAlien === true && subject && subject.influences && subject.influences.happy < 0,
    message: (subject, target, args) => `Colonists in {{regname:town|${subject.id}}} are deeply homesick. Build a comms relay to the homeworld?`,
    buttonYes: "Build",
    func: (subject, target, args) => {
        happen("Influence", null, subject, {happy: 3});
        logMessage(`Comms relay built! Morale in {{regname:town|${subject.id}}} has skyrocketed.`);
    },
    buttonNo: "Ignore",
    funcNo: (subject, target, args) => {
        happen("Influence", null, subject, {happy: -2});
    },
    weight: 8
});
        Mod.event("xenoDisease", {
            random: true,
            subject: { reg: "town", random: true },
            check: (subject, target, args) => planet._isAlien === true && subject && !subject.end,
            func: (subject, target, args) => {
                logMessage(`An unstudied alien pathogen sweeps through {{regname:town|${subject.id}}}.`, "warning");
                happen("Influence", null, subject, {disease: 3, happy: -2, temp: true});
                happen("Death", null, subject, {count: Math.floor(subject.pop * 0.05) + 1});
            },
            weight: 3
        });

        Mod.event("asteroidStrike", {
            random: true,
            subject: { reg: "nature", id: 1 },
            check: () => planet._isAlien === true,
            func: (subject, target, args) => {
                let chunk = randomChunk((c) => c.b !== "water");
                if(!chunk) return false;
                logMessage(`A massive asteroid strikes {{regname:landmass|${chunk.v.g}}}! The impact kicks up a dust cloud.`, "warning");
                let towns = regToArray("town");
                towns.forEach(t => {
                    happen("Influence", null, t, {happy: -1, temp: true});
                });
            },
            weight: 2
        });
        
        window.updateCycleBtn();
    }
}
