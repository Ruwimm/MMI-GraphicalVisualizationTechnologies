window.onload = function(){

    const canvas = document.getElementById("glcanvas");
    const gl = canvas.getContext("webgl");
    if (!gl) {
        alert("WebGL wird nicht unterstützt");
        return;
    }

    // // Schwarz:
    // gl.clearColor(0.0, 0.0, 0.0, 1.0);

    // // Dunkelgrau:
    // gl.clearColor(0.2, 0.2, 0.2, 1.0);

    // // Lila:
    // gl.clearColor(0.5, 0.0, 0.5, 1.0);
    //
    // // Dunkelgrün:
    // gl.clearColor(0.0, 0.3, 0.0, 1.0);
    //
    // // Orange:
    // gl.clearColor(1.0, 0.5, 0.0, 1.0);

    //Farbe
    gl.clearColor(0.8, 1, 1, 1.0);


    gl.clear(gl.COLOR_BUFFER_BIT);



    let imgElemet = document.getElementById("meinKreis");
    let angle = 0;

    function nextImage() {
        angle += 15;

        if(angle >= 360){
            angle = 0;
        }

        imgElemet.src ="RefreshCircle-Sprites/RefreshCircle_" + angle +".png";
        console.log(angle);
        console.log(imgElemet);
    }

    setInterval(nextImage, 100);
}


