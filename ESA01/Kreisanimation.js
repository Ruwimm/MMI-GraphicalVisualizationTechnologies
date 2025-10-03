window.onload = function(){

    const canvas = document.getElementById("glcanvas");
    const gl = canvas.getContext("webgl");
    if (!gl) {
        alert("WebGL wird nicht unterstützt");
        return;
    }

    //Hintergrundfarbe
    gl.clearColor(0.8, 1, 1, 1.0);


    gl.clear(gl.COLOR_BUFFER_BIT);




    //Rotierende Kreisanimation Anfang
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
    //Rotierende Kreisanimation Anfang
}


