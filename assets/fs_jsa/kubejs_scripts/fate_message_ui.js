const NABU_MESSAGES = [
    "{player}, I have chosen you to be my host. Seek me out.",
    "The Lords of Order require a champion, {player}.",
    "Chaos approaches... Seek the Tower of Fate.",
    "Wear the Helm, {player}, and claim your destiny."
];

global.nabuData = global.nabuData || {
    active: false,
    rawText: "",
    displayedText: "",
    textIndex: 0,
    posX: 100,
    posY: 100,
    alpha: 255,
    state: "IDLE",
    lastTick: 0,
    timer: 0
};

global.triggerNabuWhisper = function(playerName) {
    let window = Client.window;

    let sw = window ? window.guiScaledWidth : 400;
    let sh = window ? window.guiScaledHeight : 240;

    let raw = NABU_MESSAGES[Math.floor(Math.random() * NABU_MESSAGES.length)];
    
    global.nabuData.rawText = raw.replace("{player}", playerName || "Player");
    global.nabuData.posX = Math.floor(Math.random() * Math.max(10, sw - 240)) + 30;
    global.nabuData.posY = Math.floor(Math.random() * Math.max(10, sh - 60)) + 30;
    global.nabuData.textIndex = 0;
    global.nabuData.displayedText = "";
    global.nabuData.alpha = 255;
    global.nabuData.state = "TYPING";
    global.nabuData.active = true;
};

NetworkEvents.dataReceived('trigger_nabu_hud', (event) => {
    let player = event.player;
    let playerName = player ? player.getName().getString() : "Player";
    global.triggerNabuWhisper(playerName);
});

PalladiumEvents.registerGuiOverlays((event) => {
    event.register(
        'fs_jsa/nabu_whisper_ui',
        (minecraft, gui, poseStack, partialTick, screenWidth, screenHeight) => {
            let n = global.nabuData;
            if (!n || !n.active) return;

            let player = minecraft.player;
            if (!player) return;

            if (player.tickCount !== n.lastTick) {
                n.lastTick = player.tickCount;

                if (n.state === "TYPING") {
                    if (player.tickCount % 2 === 0) {
                        if (n.textIndex < n.rawText.length) {
                            n.textIndex++;
                            let resolvedPart = n.rawText.substring(0, n.textIndex - 1);
                            let activeChar = n.rawText.charAt(n.textIndex - 1);
                            n.displayedText = `${resolvedPart}§k${activeChar}§r`;
                        } else {
                            n.displayedText = n.rawText;
                            n.state = "HOLD";
                            n.timer = 80;
                        }
                    }
                } else if (n.state === "HOLD") {
                    n.timer--;
                    if (n.timer <= 0) {
                        n.state = "FADE_OUT";
                    }
                } else if (n.state === "FADE_OUT") {
                    n.alpha -= 10;
                    if (n.alpha <= 0) {
                        n.alpha = 0;
                        n.active = false;
                        n.state = "IDLE";
                        return;
                    }
                }
            }

            if (n.alpha <= 0) return;

            poseStack.pose().pushPose();

            let a = Math.max(0, Math.min(255, Math.floor(n.alpha)));
            let color = (a << 24) | 0x00FFDD;
            let shadowColor = (a << 24) | 0x000000;

            let textComp = Component.literal(`§b§o"${n.displayedText}"§r`);
            let shadowComp = Component.literal(`"${n.displayedText}"`);

            guiUtil.drawString(poseStack, shadowComp, n.posX + 1, n.posY + 1, shadowColor);
            guiUtil.drawString(poseStack, textComp, n.posX, n.posY, color);

            poseStack.pose().popPose();
        }
    );
});