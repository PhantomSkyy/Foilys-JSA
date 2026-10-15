const EquipmentSlot = Java.loadClass('net.minecraft.world.entity.EquipmentSlot');
let nabuCooldowns = {};

ServerEvents.tick(event => {
    if (event.server.tickCount % 10 !== 0) return;

    let serverTicks = event.server.tickCount;

    event.server.players.forEach(player => {
        let uuid = player.uuid.toString();
        
        let isChosen = false;
        try {
            isChosen = superpowerUtil.hasSuperpower(player, 'fs_jsa:nabu_chosen');
        } catch (e) {}

        let headItem = player.getItemBySlot(EquipmentSlot.HEAD);
        let wearingHelm = headItem && headItem.id === 'fs_jsa:doctor_fate_helmet';

        let persistentData = player.persistentData;
        let hasAnsweredCall = persistentData.getBoolean('nabu_has_worn_helm');

        if (wearingHelm && !hasAnsweredCall) {
            persistentData.putBoolean('nabu_has_worn_helm', true);
            hasAnsweredCall = true;
        }

        if (!isChosen) {
            if (wearingHelm) {
                player.drop(headItem.copy(), true);
                player.setItemSlot(EquipmentSlot.HEAD, Item.empty);
            }
        } 
        else if (!wearingHelm && !hasAnsweredCall) {
            if (serverTicks % 40 === 0) {
                if (!nabuCooldowns[uuid] || serverTicks > nabuCooldowns[uuid]) {
                    player.sendData('trigger_nabu_hud', {});
                    
                    let randomDelay = Math.floor(Math.random() * 800) + 800;
                    nabuCooldowns[uuid] = serverTicks + randomDelay;
                }
            }
        }
    });
});