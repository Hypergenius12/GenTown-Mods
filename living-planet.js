Mod.afterLoad(() => {
    if (typeof constants !== 'undefined') {
        constants.defaultLandColor = 350;
        constants.defaultWaterColor = 355;
        constants.defaultPlanetTemp = 37;
        constants.plantName = "Protein Structure";
        constants.animalName = "Mobile Cell";
        constants.cropName = "Cultivated Protein";
        constants.livestockName = "Domesticated Cell";
        constants.ghostTownName = "Calcified Scab";
    }

    const anatomyMap = [
        { match: ["deep", "trench"], name: "Arterial Trench", color: [66, 1, 1] },
        { match: ["ocean", "water", "sea", "hemolymph"], name: "Hemolymph Pool", color: [122, 2, 2] },
        { match: ["lake"], name: "Synovial Fluid", color: [200, 180, 50] },
        { match: ["river", "stream", "creek"], name: "Arterial Capillary", color: [255, 20, 60] },
        { match: ["beach", "sand", "coast", "shore"], name: "Epidermal Membrane", color: [255, 204, 179] },
        { match: ["rain", "jungle"], name: "Dense Lung Tissue", color: [168, 50, 90] },
        { match: ["forest", "wood", "tree"], name: "Respiratory Follicles", color: [217, 101, 139] },
        { match: ["plain", "grass", "meadow", "field"], name: "Muscle Tissue", color: [200, 90, 90] },
        { match: ["desert", "arid", "dry"], name: "Digestive Tract", color: [196, 181, 71] },
        { match: ["savanna", "shrub"], name: "Bile Ducts", color: [156, 137, 28] },
        { match: ["taiga", "pine"], name: "Cartilage Layer", color: [227, 207, 200] },
        { match: ["tundra", "barren"], name: "Necrotic Flesh", color: [122, 107, 111] },
        { match: ["snow", "ice", "frost", "glacier"], name: "Calcified Bone", color: [242, 240, 240] },
        { match: ["mount", "peak", "hill", "rock", "cliff"], name: "Skeletal Ridges", color: [209, 199, 199] },
        { match: ["swamp", "marsh", "bog"], name: "Lymphatic Node", color: [110, 130, 80] }
    ];

    if (typeof biomes !== 'undefined') {
        for (let key in biomes) {
            let targetString = (key + " " + (biomes[key].name || "")).toLowerCase();
            let matched = false;
            for (let organ of anatomyMap) {
                if (organ.match.some(m => targetString.includes(m))) {
                    biomes[key].name = organ.name;
                    if (biomes[key].color) biomes[key].color = organ.color;
                    matched = true;
                    break;
                }
            }
            if (!matched) {
                biomes[key].name = "Mutated Tissue";
                if (biomes[key].color) biomes[key].color = [179, 66, 90];
            }
        }
    }

    if (typeof resources !== 'undefined') {
        if (resources.wood) resources.wood.name = "Fibrous Tissue";
        if (resources.stone) resources.stone.name = "Bone Fragments";
        if (resources.food) resources.food.name = "Nutrient Plasma";
    }

    if (typeof landmarks !== 'undefined') {
        const fleshyLandmarks = {
            "stadium": "Adrenaline Gland",
            "hospital": "Spore Nursery",
            "bank": "Nutrient Silo",
            "temple": "Neural Node",
            "flagpole": "Sensory Stalk",
            "tower": "Bone Spire",
            "statue": "Parasite Monolith",
            "highway": "Vascular Bypass",
            "prison": "Digestive Sac"
        };
        for (let key in fleshyLandmarks) {
            if (landmarks[key]) {
                landmarks[key].name = fleshyLandmarks[key];
            }
        }
    }

    if (typeof unlocks !== 'undefined') {
        const fleshyUnlocks = {
            "farming": "Enzyme Secretion",
            "mining": "Bone Boring",
            "husbandry": "Plasmid Domestication",
            "stoneworking": "Calcification Control",
            "travel": "Arterial Flow",
            "astronomy": "Extra-Sensory Perception",
            "laws": "Hive-Mind Synchronization",
            "education": "Genetic Memory Transfer",
            "projectiles": "Acidic Excretion",
            "medicine": "Mutation Control",
            "currency": "Lipid Exchange"
        };
        for (let key in fleshyUnlocks) {
            if (unlocks[key]) {
                unlocks[key].name = fleshyUnlocks[key];
            }
        }
    }

    if (typeof Mod !== 'undefined' && Mod.event) {
        Mod.event("immuneResponse", {
            random: true,
            subject: { reg: "town", random: true },
            check: (subject) => subject.population > 500, 
            message: (subject) => `The infection {{regname:town|${subject.id}}} is boring deeply into your tissues. Trigger an immune response (Fever)?`,
            func: (subject) => {
                subject.population = Math.floor(subject.population * 0.8);
                if (typeof addInfluence === 'function') addInfluence(-10, subject, "disease");
            },
            funcNo: (subject) => {
                if (typeof addInfluence === 'function') addInfluence(5, subject, "happy"); 
            },
            weight: 10 
        });

        Mod.event("nervePain", {
            random: true,
            subject: { reg: "town", random: true },
            check: (subject) => {
                if (!subject.territory || !window.chunks) return false;
                return subject.territory.some(c => biomes[window.chunks[c].biome] && biomes[window.chunks[c].biome].name === "Skeletal Ridges");
            },
            message: (subject) => `The cyst {{regname:town|${subject.id}}} is compressing a major nerve cluster. Secrete endorphins to soothe the pain? (Costs 500 ATP)`,
            func: (subject) => {
                if (subject.cash >= 500) {
                    subject.cash -= 500;
                    if (typeof addInfluence === 'function') addInfluence(5, subject, "happy");
                }
            },
            funcNo: (subject) => {
                if (typeof addInfluence === 'function') addInfluence(-10, subject, "sad");
            },
            weight: 20
        });

        Mod.event("viralPayload", {
            random: true,
            subject: { reg: "town", random: true },
            target: { reg: "town", random: true },
            check: (subject, target) => subject.id !== target.id && subject.population > 100 && target.population > 100,
            message: (subject, target) => `{{regname:town|${subject.id}}} is preparing to launch a Viral Payload at {{regname:town|${target.id}}}. Allow cross-infection to absorb their Stored Lipids?`,
            func: (subject, target) => {
                let stolen = Math.floor((target.cash || 0) * 0.25);
                if (stolen > 0) {
                    target.cash -= stolen;
                    subject.cash = (subject.cash || 0) + stolen;
                }
                target.population = Math.floor(target.population * 0.8);
                if (typeof addInfluence === 'function') addInfluence(-8, target, "disease");
            },
            funcNo: (subject, target) => {
                if (typeof addInfluence === 'function') addInfluence(-3, subject, "sad");
            },
            weight: 15
        });

        Mod.event("bodyNoise", {
            daily: true,
            target: { reg: "player", id: 1 },
            func: () => {
                if (Math.random() < 0.15 && typeof logMessage === 'function') {
                    const noises = [
                        "A low, subsonic rumble echoes through your skeletal ridges.",
                        "You feel a sharp, stinging sensation in your Northern Lungs.",
                        "The rhythmic thrum of your core accelerates as ATP levels rise.",
                        "Viscous fluids churn loudly within your Hemolymph Pools.",
                        "A sudden muscle spasm tears across your Epidermal Membrane."
                    ];
                    logMessage(noises[Math.floor(Math.random() * noises.length)]);
                }
            }
        });
    }

    const terminologyDictionary = {
        "Start new planet": "Incubate New Organism",
        "Next Day": "Heartbeat",
        "Free Play mode": "In Vitro Mode",
        "Free Play": "In Vitro",
        "Customize tab": "Genetic Alteration tab",
        "Customize": "Genetic Alteration",
        "Edit properties": "Inject Catalysts",
        "Delete": "Exscind",
        "Create": "Synthesize",
        "Discover": "Sequence",
        "Discovered": "Sequenced",
        "Traits": "Genetic Markers",
        "Water Level": "Hemolymph Volume",
        "Water level": "Hemolymph volume",
        "Temperature": "Core Temp",
        "Temp": "Core Temp",
        "Elevation": "Tissue Density",
        "Chunk size": "Cell Cluster Size",
        "Chunk Size": "Cell Cluster Size",
        "Tune X": "Nerve Alignment X",
        "Tune Y": "Nerve Alignment Y",
        "Crime": "Rogue Mitosis",
        "Hunger": "Nutrient Starvation",
        "Travel": "Arterial Flow",
        "Faith": "Neural Compliance",
        "Autonomy": "Rogue Mutation",
        "Influence": "Hormone Level",
        "Influences": "Hormone Levels",
        "Happiness": "Endorphin Synthesis",
        "Happy": "Endorphin-rich",
        "Sad": "Cortisol-heavy",
        "Wildfires": "Localized Inflammations",
        "Wildfire": "Localized Inflammation",
        "Hurricanes": "Gastric Spasms",
        "Hurricane": "Gastric Spasm",
        "Earthquakes": "Muscle Contractions",
        "Earthquake": "Muscle Contraction",
        "Disasters": "Hormonal Surges",
        "Disaster": "Hormonal Surge",
        "Star system": "Incubator View",
        "Star System": "Incubator View",
        "Neighboring planets": "Uninfected Samples",
        "Neighboring planet": "Uninfected Sample",
        "Moons": "Dormant Spores",
        "Moon": "Dormant Spore",
        "Stars": "Primary Cultures",
        "Star": "Primary Culture",
        "Telescopes": "Membrane Scanners",
        "Telescope": "Membrane Scanner",
        "Astronomy": "Extra-Sensory Perception",
        "Uninhabited Planet": "Dormant Organism",
        "Inhabited Planet": "Infected Host Organism",
        "Planet": "Organism",
        "Planets": "Organisms",
        "Orbits": "Gravitational Tether",
        "Orbited by": "Parasitic Satellites",
        "Formed": "Gestation Began",
        "Circumference": "Membrane Girth",
        "Land volume": "Tissue Mass",
        "Total volume": "Cellular Volume",
        "Continents": "Major Organs",
        "Land": "Exposed Tissue",
        "Age": "Days Alive",
        "construction of": "mutation of",
        "Microtowns": "Micro-Infections",
        "Microtown": "Micro-Infection",
        "Colonies": "Viral Clusters",
        "Colony": "Viral Cluster",
        "Towns": "Festering Cysts",
        "Town": "Festering Cyst",
        "Cities": "Malignant Tumors",
        "City": "Malignant Tumor",
        "Metropolis": "Necrotic Lesion",
        "Nations": "Systemic Plagues",
        "Nation": "Systemic Plague",
        "Empires": "Terminal Metastases",
        "Empire": "Terminal Metastasis",
        "Ghost Towns": "Calcified Scabs",
        "Ghost Town": "Calcified Scab",
        "Population": "Viral Load",
        "Residents": "Parasites",
        "Resident": "Parasite",
        "People": "Parasites",
        "Adults": "Mature Parasites",
        "Citizens": "Parasites",
        "Inhabitants": "Parasites",
        "Inhabitant": "Parasite",
        "Births": "Cellular Divisions",
        "Deaths": "Cellular Decay",
        "Lifespan": "Cellular Stability",
        "Disease": "Auto-Immune Rejection", 
        "Animals": "Mobile Cells",
        "Animal": "Mobile Cell",
        "Plants": "Protein Structures",
        "Plant": "Protein Structure",
        "Crops": "Cultivated Proteins",
        "Crop": "Cultivated Protein",
        "Livestock": "Domesticated Cells",
        "Species": "Cellular Strain",
        "Trees": "Keratin Pillars",
        "Tree": "Keratin Pillar",
        "Algae": "Toxic Bio-film",
        "Fungi": "Mycelial Networks",
        "Fungus": "Mycelial Network",
        "Aquatic plants": "Gastric Flora",
        "Jobs": "Cellular Functions",
        "Farmers": "Nutrient Harvesters",
        "Farmer": "Nutrient Harvester",
        "Miners": "Marrow Extractors",
        "Miner": "Marrow Extractor",
        "Soldiers": "Antibody Hunters",
        "Soldier": "Antibody Hunter",
        "Smiths": "Cartilage Weavers",
        "Smith": "Cartilage Weaver",
        "Unemployed": "Dormant Cells",
        "Revolutions": "Cytokine Storms",
        "Revolution": "Cytokine Storm",
        "Taxation": "Nutrient Siphoning",
        "Taxes": "Nutrients Siphoned",
        "Cash": "ATP",
        "Wealth": "Stored Lipids",
        "Score": "Toxicity Level",
        "Diplomatic advice": "Symbiotic Feedback",
        "Wars": "Cross-Infections",
        "War": "Cross-Infection",
        "won": "absorbed",
        "Usurp": "Auto-Immune Purge",
        "Territory": "Biomass",
        "Map": "Organ Scan"
    };

    const sortedKeys = Object.keys(terminologyDictionary).sort((a, b) => b.length - a.length);

    const replaceTextInNode = (node) => {
        let text = node.nodeValue;
        let changed = false;
        
        for (let word of sortedKeys) {
            let regex = new RegExp("\\b" + word + "\\b", "gi");
            if (regex.test(text)) {
                text = text.replace(regex, (match) => {
                    let repl = terminologyDictionary[word];
                    if (match.charAt(0) === match.charAt(0).toUpperCase() && repl.charAt(0) !== repl.charAt(0).toUpperCase()) {
                        repl = repl.charAt(0).toUpperCase() + repl.slice(1);
                    }
                    return repl;
                });
                changed = true;
            }
        }
        if (changed) {
            node.nodeValue = text;
        }
    };

    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            if (mutation.type === 'childList' || mutation.type === 'characterData') {
                const traverseAndReplace = (node) => {
                    if (node.nodeType === Node.TEXT_NODE) {
                        replaceTextInNode(node);
                    } else if (node.nodeType === Node.ELEMENT_NODE) {
                        if (node.tagName !== "SCRIPT" && node.tagName !== "STYLE") {
                            node.childNodes.forEach(traverseAndReplace);
                        }
                    }
                };
                mutation.addedNodes.forEach(traverseAndReplace);
            }
        });
    });

    if (typeof document !== 'undefined') {
        const fleshOverlay = document.createElement('div');
        fleshOverlay.style.cssText = "position:fixed;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:99999;box-shadow:inset 0 0 0px rgba(255,0,0,0);transition:box-shadow 0.15s ease-out;";
        document.body.appendChild(fleshOverlay);

        const triggerBeat = () => {
            fleshOverlay.style.boxShadow = "inset 0 0 180px rgba(220, 0, 0, 0.6)";
            setTimeout(() => {
                fleshOverlay.style.boxShadow = "inset 0 0 0px rgba(255, 0, 0, 0)";
            }, 180);
        };

        document.addEventListener('click', (e) => {
            if (e.target && (e.target.id === "nextDay" || e.target.innerText === "Heartbeat" || e.target.innerText === "Next Day")) {
                triggerBeat();
            }
        });

        document.addEventListener('keydown', (e) => {
            if (e.code === 'Space' || e.key === 'Enter') {
                triggerBeat();
            }
        });

        observer.observe(document.body, { childList: true, subtree: true, characterData: true });
        
        const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null, false);
        let node;
        while (node = walker.nextNode()) {
            if (node.parentElement && node.parentElement.tagName !== "SCRIPT" && node.parentElement.tagName !== "STYLE") {
                replaceTextInNode(node);
            }
        }
    }
});
