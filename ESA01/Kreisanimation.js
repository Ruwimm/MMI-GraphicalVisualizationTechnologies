window.onload = function() {
    const canvas = document.getElementById("glcanvas");
    const gl = canvas.getContext("webgl");
    if (!gl) {
        alert("WebGL wird nicht unterstützt");
        return;
    }

    // Hintergrundfarbe
    gl.clearColor(0.8, 1, 1, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    // Bildanimation
    const imgElement = document.getElementById("meinKreis");
    let count = 1;
    let playing = true;
    let intervalId = null;

    function updateImage() {
        count++;
        if (count > 24) count = 1;
        imgElement.src = `Shuriken/Shuriken${count}.png`;
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
            case "i":
                stopAnimation();
                count++;
                if (count > 24) count = 1;
                imgElement.src = `Shuriken/Shuriken${count}.png`;
                break;
            case "r":
                stopAnimation();
                count--;
                if (count < 1) count = 24;
                imgElement.src = `Shuriken/Shuriken${count}.png`;
                break;
        }
    });

    // Buttonsteuerung
    const btnStopStart = document.getElementById("btnStopStart");
    const btnPrev = document.getElementById("btnPrev");
    const btnNext = document.getElementById("btnNext");

    btnStopStart.addEventListener("click", () => {
        if (playing) stopAnimation();
        else startAnimation();
    });

    btnPrev.addEventListener("click", () => {
        stopAnimation();
        count--;
        if (count < 1) count = 24;
        imgElement.src = `Shuriken/Shuriken${count}.png`;
    });

    btnNext.addEventListener("click", () => {
        stopAnimation();
        count++;
        if (count > 24) count = 1;
        imgElement.src = `Shuriken/Shuriken${count}.png`;
    });
};
