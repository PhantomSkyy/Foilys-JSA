const EquipmentSlot = Java.loadClass('net.minecraft.world.entity.EquipmentSlot');
let nabuCooldowns = {};

ServerEvents.tick(event => {
    // Run every half-second (10 ticks)
    if (event.server.tickCount % 10 !== 0) return;

    let serverTicks = event.server.tickCount;

    event.server.players.forEach(player => {
        let uuid = player.uuid.toString();
        
        // 1. Check Superpower Status
        let isChosen = false;
        try {
            isChosen = superpowerUtil.hasSuperpower(player, 'fs_jsa:nabu_chosen');
        } catch (e) {}

        // 2. Check Helmet Status
        let headItem = player.getItemBySlot(EquipmentSlot.HEAD);
        let wearingHelm = headItem && headItem.id === 'fs_jsa:doctor_fate_helmet';

        // 3. Persistent Check: Has the player already worn the helm?
        let persistentData = player.persistentData;
        let hasAnsweredCall = persistentData.getBoolean('nabu_has_worn_helm');

        // If they are wearing it right now, mark their destiny as fulfilled forever
        if (wearingHelm && !hasAnsweredCall) {
            persistentData.putBoolean('nabu_has_worn_helm', true);
            hasAnsweredCall = true;
        }

        // 4. Handle Binding Logic (Eject if not chosen)
        if (!isChosen) {
            // Eject from Head Slot
            if (wearingHelm) {
                player.drop(headItem.copy(), true);
                player.setItemSlot(EquipmentSlot.HEAD, Item.empty);
            }
        } 
        // 5. Whispers ONLY for Chosen Players who have NEVER worn the Helm yet
        else if (!wearingHelm && !hasAnsweredCall) {
            if (serverTicks % 40 === 0) {
                if (!nabuCooldowns[uuid] || serverTicks > nabuCooldowns[uuid]) {
                    player.sendData('trigger_nabu_hud', {});
                    
                    // Delay before next whisper (~40-80 seconds)
                    let randomDelay = Math.floor(Math.random() * 800) + 800;
                    nabuCooldowns[uuid] = serverTicks + randomDelay;
                }
            }
        }
    });
});