window.onload = () => {
    const canvas = document.getElementById("glcanvas");
    const gl = canvas.getContext("webgl");
    if (!gl) {
        alert("WebGL wird nicht unterstützt");
        return;
    }
    gl.clearColor(0.1, 0.6, 0.8, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT);
};
