const Component = Java.loadClass("net.minecraft.network.chat.Component");
const LivingEntity = Java.loadClass("net.minecraft.world.entity.LivingEntity");
const LightLayer = Java.loadClass("net.minecraft.world.level.LightLayer");
const BuiltInRegistries = Java.loadClass("net.minecraft.core.registries.BuiltInRegistries");

const POWER_BLACKLIST = [
    'fs_jsa:doctor_mid-nite_goggles',
];

let cachedOres = [];
let scanTimer = 0;
let lastOresSignature = "";

let powerHoldTickTimer = 0;
let powerIndex = 0;
let lastTargetEntityId = -1;

function formatPowerName(idString) {
    let str = String(idString);
    if (str.includes(":")) {
        str = str.split(":")[1];
    }
    str = str.replace(/_/g, " ");
    
    let words = str.split(" ");
    for (let i = 0; i < words.length; i++) {
        if (words[i].length > 0) {
            words[i] = words[i].charAt(0).toUpperCase() + words[i].slice(1);
        }
    }
    return words.join(" ");
}

function isHoldingPickaxe(player) {
    let mainItem = player.getMainHandItem();
    let offItem = player.getOffhandItem();
    
    let mainIsPick = mainItem && mainItem.id.toString().includes('pickaxe');
    let offIsPick = offItem && offItem.id.toString().includes('pickaxe');
    
    return mainIsPick || offIsPick;
}

ClientEvents.tick(event => {
    let player = event.player;
    if (!player) return;

    powerHoldTickTimer++;

    if (!superpowerUtil.hasSuperpower(player, 'fs_jsa:doctor_mid-nite_goggles') || !isHoldingPickaxe(player)) {
        cachedOres = [];
        lastOresSignature = "";
        return;
    }

    scanTimer++;
    if (scanTimer < 20) return;
    scanTimer = 0;

    let level = player.level;
    let pPos = player.blockPosition();
    if (!pPos) return;

    let radius = 8;
    let foundOres = [];

    for (let x = -radius; x <= radius; x++) {
        for (let y = -radius; y <= radius; y++) {
            for (let z = -radius; z <= radius; z++) {
                let testPos = pPos.offset(Number(x), Number(y), Number(z));
                if (!testPos) continue;

                let state = level.getBlockState(testPos);
                if (state && !state.isAir()) {
                    let blockObj = state.getBlock();
                    if (!blockObj) continue;
                    
                    let idRegistry = blockObj.arch$registryName();
                    if (!idRegistry) continue;
                    
                    let idString = idRegistry.toString();

                    if (idString.includes('ore') && !idString.includes('deepslate_ore_storage')) {
                        let dx = Number(x);
                        let dy = Number(y);
                        let dz = Number(z);
                        let rawDist = Math.sqrt((dx * dx) + (dy * dy) + (dz * dz));
                        let dist = (isNaN(rawDist) || !isFinite(rawDist)) ? 0 : Math.round(rawDist);
                        
                        let regName = blockObj.arch$registryName();
                        let fullName = regName ? formatPowerName(regName.toString()) : "Unknown Ore";
                        
                        let shortName = fullName
                            .replace(/Deepslate /g, "Deep ")
                            .replace(/ Ore/g, "")
                            .trim();

                        foundOres.push({
                            name: shortName,
                            dist: Number(dist)
                        });
                    }
                }
            }
        }
    }

    foundOres.sort((a, b) => a.dist - b.dist);
    let newOres = foundOres.slice(0, 5);
    
    let newSig = newOres.map(o => `${o.name}:${o.dist}`).join("|");
    if (newSig !== lastOresSignature) {
        lastOresSignature = newSig;
        cachedOres = newOres;
    }
});

PalladiumEvents.registerGuiOverlays((event) => {
    event.register(
        'fs_jsa/mid-nite_ui',
        (minecraft, gui, poseStack, partialTick, screenWidth, screenHeight) => {
            const player = minecraft.player;
            if (!player) return;

            if (!superpowerUtil.hasSuperpower(player, 'fs_jsa:doctor_mid-nite_goggles')) {
                return;
            }

            poseStack.pose().pushPose();
            let scaleX = screenWidth / 128;
            let scaleY = screenHeight / 64;
            poseStack.pose().scale(scaleX, scaleY, 1.0);

            poseStack.blit(
                'fs_jsa:textures/ui/mid-nite_goggles.png', 
                0, 0, 0, 0, 
                128.5, 64.5, 
                128, 64
            );
            poseStack.pose().popPose();

            let guiScale = minecraft.options.guiScale().get();
            if (guiScale === 0) guiScale = 4;
            let textScaleFactor = 4.0 / guiScale;

            poseStack.pose().pushPose();
            poseStack.pose().scale(textScaleFactor, textScaleFactor, 1.0);

            let targetWidth = screenWidth / textScaleFactor;
            let targetHeight = screenHeight / textScaleFactor;

            let blockPos = player.blockPosition();
            let rawLight = player.level.getBrightness(LightLayer.BLOCK, blockPos);
            let blockLight = (isNaN(rawLight) || !isFinite(rawLight)) ? 0 : Number(rawLight);
            
            let rawTime = player.level.getDayTime();
            let worldTime = (isNaN(rawTime) || !isFinite(rawTime)) ? 0 : Number(rawTime % 24000);
            let isNightTime = worldTime >= 12000 && worldTime < 23460;

            let envX = 80;
            let envY = targetHeight - 165;

            let lightColor = blockLight < 5 ? 0x55FF55 : 0xFF5555;
            let timeColor = isNightTime ? 0x55FF55 : 0xFF5555;

            guiUtil.drawString(poseStack, Component.literal("ENVIRONMENT:").bold(true), envX + 1, envY + 1, 0x000000);
            guiUtil.drawString(poseStack, Component.literal("ENVIRONMENT:").bold(true), envX, envY, 0x4F7F4F);

            let lightValStr = String(blockLight);
            guiUtil.drawString(poseStack, Component.literal("- Block Light: "), envX + 11, envY + 11, 0x000000);
            guiUtil.drawString(poseStack, Component.literal("- Block Light: "), envX + 10, envY + 10, 0xAAAAAA);
            guiUtil.drawString(poseStack, Component.literal(lightValStr), envX + 79, envY + 11, 0x000000);
            guiUtil.drawString(poseStack, Component.literal(lightValStr), envX + 78, envY + 10, lightColor);

            let timeStr = isNightTime ? "Night" : "Day";
            guiUtil.drawString(poseStack, Component.literal("- Time: "), envX + 11, envY + 21, 0x000000);
            guiUtil.drawString(poseStack, Component.literal("- Time: "), envX + 10, envY + 20, 0xAAAAAA);
            guiUtil.drawString(poseStack, Component.literal(timeStr), envX + 46, envY + 21, 0x000000);
            guiUtil.drawString(poseStack, Component.literal(timeStr), envX + 45, envY + 20, timeColor);

            let hitResult = minecraft.hitResult;
            if (hitResult && hitResult.getType() && hitResult.getType().name() === 'BLOCK') {
                let blockPosHit = hitResult.getBlockPos();
                if (blockPosHit) {
                    let blockState = player.level.getBlockState(blockPosHit);
                    if (blockState && !blockState.isAir()) {
                        let blockObj = blockState.getBlock();
                        let regName = blockObj ? blockObj.arch$registryName() : null;
                        let blockName = regName ? formatPowerName(regName.toString()) : "";
                        if (blockName !== "") {
                            guiUtil.drawString(poseStack, Component.literal("- Block: "), envX + 11, envY + 31, 0x000000);
                            guiUtil.drawString(poseStack, Component.literal("- Block: "), envX + 10, envY + 30, 0xAAAAAA);
                            guiUtil.drawString(poseStack, Component.literal(blockName), envX + 53, envY + 31, 0x000000);
                            guiUtil.drawString(poseStack, Component.literal(blockName), envX + 52, envY + 30, 0x55FF55);
                        }
                    }
                }
            }

            if (isHoldingPickaxe(player) && cachedOres.length > 0) {

                let oreTitleText = "ORE RADAR:";
                guiUtil.drawString(poseStack, Component.literal(oreTitleText).bold(true), envX + 1, envY + 41, 0x000000);
                guiUtil.drawString(poseStack, Component.literal(oreTitleText).bold(true), envX, envY + 40, 0x4F7F4F);

                cachedOres.forEach((ore, index) => {
                    let safeDist = (isNaN(ore.dist) || !isFinite(ore.dist)) ? 0 : Number(ore.dist);
                    let fullText = `- ${ore.name} (${safeDist}m)`;

                    guiUtil.drawString(poseStack, Component.literal(fullText), envX + 11, envY + 51 + (index * 10), 0x000000);
                    guiUtil.drawString(poseStack, Component.literal(fullText), envX + 10, envY + 50 + (index * 10), 0x55FF55);
                });
            }

            if (hitResult && hitResult.getType() && hitResult.getType().name() === 'ENTITY') {
                let entityHit = hitResult.getEntity();
                
                if (entityHit) {
                    let target = entityHit;
                    let currentEntityId = target.getId();
                    
                    if (currentEntityId !== lastTargetEntityId) {
                        lastTargetEntityId = currentEntityId;
                        powerIndex = 0;
                        powerHoldTickTimer = 0;
                    }

                    let rawHealth = typeof target.getHealth === 'function' ? target.getHealth() : 0;
                    let rawMaxHealth = typeof target.getMaxHealth === 'function' ? target.getMaxHealth() : 0;
                    let rawArmor = typeof target.getArmorValue === 'function' ? target.getArmorValue() : 0;

                    let health = (isNaN(rawHealth) || !isFinite(rawHealth)) ? 0 : Number(Math.ceil(rawHealth));
                    let maxHealth = (isNaN(rawMaxHealth) || !isFinite(rawMaxHealth)) ? 0 : Number(Math.ceil(rawMaxHealth));
                    let armor = (isNaN(rawArmor) || !isFinite(rawArmor)) ? 0 : Number(Math.ceil(rawArmor));
                    
                    let entityName = "Unknown Entity";
                    if (typeof target.getName === 'function' && target.getName()) {
                        let customStr = target.getName().getString();
                        if (customStr && customStr !== "") {
                            entityName = customStr;
                        }
                    }
                    if (entityName === "Unknown Entity" && typeof target.getType === 'function' && target.getType()) {
                        let entKey = BuiltInRegistries.ENTITY_TYPE.getKey(target.getType());
                        if (entKey) {
                            entityName = formatPowerName(entKey.toString());
                        }
                    }

                    let hpStr = `- HP: ${health}/${maxHealth}`;
                    let armorStr = `- Armor: ${armor}`;
                    let targetPowerStr = "";

                    try {
                        let powers = palladium.powers.getPowerIds ? palladium.powers.getPowerIds(target) : null;
                        if (!powers && palladium && palladium.powers) {
                            powers = palladium.powers.getPowerIds(target);
                        }
                        
                        if (powers && powers.length > 0) {
                            if (powerHoldTickTimer >= 60) {
                                powerHoldTickTimer = 0;
                                powerIndex = (powerIndex + 1) % powers.length;
                            }

                            let currentPowerKey = powers[powerIndex];
                            if (currentPowerKey) {
                                targetPowerStr = `- Power: ${formatPowerName(currentPowerKey.toString())}`;
                            }
                        }
                    } catch (e) {
                    }

                    let textX = targetWidth / 2 + 15;
                    let textY = targetHeight - 135;

                    guiUtil.drawString(poseStack, Component.literal(entityName).bold(true), textX + 1, textY + 1, 0x000000);
                    guiUtil.drawString(poseStack, Component.literal(entityName).bold(true), textX, textY, 0x4F7F4F);

                    guiUtil.drawString(poseStack, Component.literal(hpStr), textX + 11, textY + 11, 0x000000);
                    guiUtil.drawString(poseStack, Component.literal(hpStr), textX + 10, textY + 10, 0xAAAAAA);

                    guiUtil.drawString(poseStack, Component.literal(armorStr), textX + 11, textY + 21, 0x000000);
                    guiUtil.drawString(poseStack, Component.literal(armorStr), textX + 10, textY + 20, 0xAAAAAA);

                    if (targetPowerStr !== "") {
                        guiUtil.drawString(poseStack, Component.literal(targetPowerStr), textX + 11, textY + 31, 0x000000);
                        guiUtil.drawString(poseStack, Component.literal(targetPowerStr), textX + 10, textY + 30, 0xAAAAAA);
                    }
                }
            } else {
                lastTargetEntityId = -1;
                powerHoldTickTimer = 0;
            }

            poseStack.pose().popPose();
        }
    );
});