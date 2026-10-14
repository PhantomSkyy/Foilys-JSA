const Component = Java.loadClass("net.minecraft.network.chat.Component");
const LivingEntity = Java.loadClass("net.minecraft.world.entity.LivingEntity");
const LightLayer = Java.loadClass("net.minecraft.world.level.LightLayer");

const POWER_BLACKLIST = [
    'fs_jsa:doctor_mid-nite_goggles',
];

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
                0, 
                0, 
                0, 
                0, 
                128.5, 
                64.5, 
                128, 
                64
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
            let blockLight = player.level.getBrightness(LightLayer.BLOCK, blockPos);
            
            let worldTime = player.level.getDayTime() % 24000;
            let isNightTime = worldTime >= 12000 && worldTime < 23460;
            
            let envX = 80;
            let envY = targetHeight - 135;

            let lightColor = blockLight < 5 ? 0x55FF55 : 0xFF5555;
            let timeColor = isNightTime ? 0x55FF55 : 0xFF5555;

            guiUtil.drawString(poseStack, Component.literal("ENVIRONMENT:").bold(true), envX + 1, envY + 1, 0x000000);
            guiUtil.drawString(poseStack, Component.literal("ENVIRONMENT:").bold(true), envX, envY, 0x4F7F4F);

            guiUtil.drawString(poseStack, Component.literal("- Block Light: "), envX + 11, envY + 11, 0x000000);
            guiUtil.drawString(poseStack, Component.literal("- Block Light: "), envX + 10, envY + 10, 0xAAAAAA);

            guiUtil.drawString(poseStack, Component.literal(String(blockLight)), envX + 79, envY + 11, 0x000000);
            guiUtil.drawString(poseStack, Component.literal(String(blockLight)), envX + 78, envY + 10, lightColor);

            guiUtil.drawString(poseStack, Component.literal(`- Time: `), envX + 11, envY + 21, 0x000000);
            guiUtil.drawString(poseStack, Component.literal(`- Time: `), envX + 10, envY + 20, 0xAAAAAA);
            guiUtil.drawString(poseStack, Component.literal(`${isNightTime ? "Night" : "Day"}`), envX + 46, envY + 21, 0x000000);
            guiUtil.drawString(poseStack, Component.literal(`${isNightTime ? "Night" : "Day"}`), envX + 45, envY + 20, timeColor);

            let hitResult = minecraft.hitResult;
            if (hitResult && hitResult.getType().name() === 'ENTITY') {
                let entityHit = hitResult.getEntity();
                
                if (entityHit instanceof LivingEntity) {
                    let target = entityHit;
                    let health = Math.ceil(target.getHealth());
                    let maxHealth = Math.ceil(target.getMaxHealth());
                    let name = target.getName().getString();
                    let armor = Math.ceil(target.getArmorValue());
                    
                    let textX = targetWidth / 2 + 15;
                    let textY = targetHeight - 135;

                    guiUtil.drawString(poseStack, Component.literal(name).bold(true), textX + 1, textY + 1, 0x000000);
                    guiUtil.drawString(poseStack, Component.literal(name).bold(true), textX, textY, 0x4F7F4F);
                    guiUtil.drawString(poseStack, Component.literal(`- HP: ${health}/${maxHealth}`), textX + 11, textY + 11, 0x000000);
                    guiUtil.drawString(poseStack, Component.literal(`- HP: ${health}/${maxHealth}`), textX + 10, textY + 10, 0xAAAAAA);
                    guiUtil.drawString(poseStack, Component.literal(`- Armor: ${armor}`), textX + 11, textY + 21, 0x000000);
                    guiUtil.drawString(poseStack, Component.literal(`- Armor: ${armor}`), textX + 10, textY + 20, 0xAAAAAA);

                    try {
                        let powers = palladium.powers.getPowerIds(target);
                        if (powers && powers.size() > 0 && !POWER_BLACKLIST.includes(powers.iterator().next().toString())) {
                            let rightX = targetWidth - 135;
                            let rightY = targetHeight - 135;

                            guiUtil.drawString(poseStack, Component.literal("POWERS:").bold(true), rightX + 1, rightY + 1, 0x000000);
                            guiUtil.drawString(poseStack, Component.literal("POWERS:").bold(true), rightX, rightY, 0x4F7F4F);
                            
                            let count = 0;
                            powers.forEach(powerId => {
                                let idString = powerId.toString();
                                
                                if (!POWER_BLACKLIST.includes(idString)) {
                                    let displayName = formatPowerName(idString);
                                    
                                    guiUtil.drawString(poseStack, Component.literal(`- ${displayName}`), rightX + 6, rightY + 13 + (count * 10), 0x000000);
                                    guiUtil.drawString(poseStack, Component.literal(`- ${displayName}`), rightX + 5, rightY + 12 + (count * 10), 0xAAAAAA);
                                    count++;
                                }
                            });
                        }
                    } catch (e) {
                    }
                }
            }

            poseStack.pose().popPose();
        }
    );
});