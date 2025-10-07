window.onload = function() {
    const canvas = document.getElementById("glcanvas");
    const gl = canvas.getContext("webgl");
    if (!gl) {
        alert("WebGL wird nicht unterstützt");
        return;
    }


    //Spritesheet variablen
    let currentAnimation =1; //1= Shuriken, 2= Spritesheet
    const spritesheetCanvas = document.getElementById("spritesheetCanvas");
    const spritesheetCtx = spritesheetCanvas.getContext("2d");
    const spritesheetImage = new Image();
    spritesheetImage.src = "Ball/JumpingBall-spritesheet.png";


    function drawSpriteFrame(frameNumber){
        const cols =4;
        const rows = 6;
        const frameWidth = 521.5;
        const frameHeight = 520.83;

        const col = (frameNumber -1) % cols;
        const row = Math.floor((frameNumber - 1) / cols);

        const srcX = col * frameWidth;
        const srcY = row * frameHeight;

        spritesheetCtx.clearRect(0, 0, spritesheetCanvas.width, spritesheetCanvas.height);
        spritesheetCtx.drawImage(
            spritesheetImage,
            srcX, srcY, frameWidth, frameHeight,
            0, 0, 300, 300
        );
    }


    // Bildanimation
    const imgElement = document.getElementById("meinKreis");
    let count = 1;
    let playing = true;
    let intervalId = null;

    function updateImage() {
        count++;
        if (count > 24) count = 1;

        if(currentAnimation === 1){
            imgElement.src = `Shuriken/Shuriken${count}.png`;
        } else {
            drawSpriteFrame(count);
        }

    }

    function startAnimation() {
        if (!intervalId) {
            intervalId = setInterval(updateImage, 100);
            playing = true;
        }
    }

    function stopAnimation() {
        clearInterval(intervalId);
        intervalId = null;
        playing = false;
    }

    // automatisch starten
    startAnimation();

    // Tastatursteuerung
    document.addEventListener("keydown", (event) => {
        switch (event.key) {
            case "a":
                if (playing) stopAnimation();
                else startAnimation();
                break;
            case "l":
                stopAnimation();
                count++;
                if (count > 24) count = 1;
                if (currentAnimation === 1) {
                    imgElement.src = `Shuriken/Shuriken${count}.png`;
                } else {
                    drawSpriteFrame(count);
                }
                break;
            case "r":
                stopAnimation();
                count--;
                if (count < 1) count = 24;
                if (currentAnimation === 1) {
                    imgElement.src = `Shuriken/Shuriken${count}.png`;
                } else {
                    drawSpriteFrame(count);
                }
                break;
        }
    });

    // Buttonsteuerung
    const btnStopStart = document.getElementById("btnStopStart");
    const btnPrev = document.getElementById("btnPrev");
    const btnNext = document.getElementById("btnNext");
    const btnSwitch = document.getElementById("btnSwitchAnimation");

    btnStopStart.addEventListener("click", () => {
        if (playing) stopAnimation();
        else startAnimation();
    });

    btnPrev.addEventListener("click", () => {
        stopAnimation();
        count--;
        if (count < 1) count = 24;
        if (currentAnimation === 1) {
            imgElement.src = `Shuriken/Shuriken${count}.png`;
        } else {
            drawSpriteFrame(count);
        }
    });

    btnNext.addEventListener("click", () => {
        stopAnimation();
        count++;
        if (count > 24) count = 1;
        if (currentAnimation === 1) {
            imgElement.src = `Shuriken/Shuriken${count}.png`;
        } else {
            drawSpriteFrame(count);
        }
    });

    btnSwitch.addEventListener("click", () => {
        if(currentAnimation === 1){
            currentAnimation = 2;
            imgElement.style.display = "none";
            spritesheetCanvas.style.display = "block";
            drawSpriteFrame(count);
        }else{
            currentAnimation = 1;
            spritesheetCanvas.style.display = "none";
            imgElement.style.display = "block";
            imgElement.src = `Shuriken/Shuriken${count}.png`;
        }
    })
};
