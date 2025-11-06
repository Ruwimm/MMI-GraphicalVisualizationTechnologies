var renderMode = {
    drawFill: true,
    drawWireframe: true
};


var app = ( function() {

	var gl;

	// The shader program object is also used to
	// store attribute and uniform locations.
	var prog;

	// Array of model objects.
	var models = [];

	var camera = {
		// Initial position of the camera.
		eye : [0, 3, 4],
		// Point to look at.
		center : [0, 0, 0],
		// Roll and pitch of the camera.
		up : [0, 1, 0],
		// Opening angle given in radian.
		// radian = degree*2*PI/360.
		fovy : 60.0 * Math.PI / 180,
		// Camera near plane dimensions:
		// value for left right top bottom in projection.
		lrtb : 2.0,
		// View matrix.
		vMatrix : mat4.create(),
		// Projection matrix.
		pMatrix : mat4.create(),
		// Projection types: ortho, perspective, frustum.
		projectionType : "perspective",
		// Angle to Z-Axis for camera when orbiting the center
		// given in radian.
		zAngle : 0,
		// Distance in XZ-Plane from center when orbiting.
		distance : 4,
	};

	function start() {
		init();
		render();
	}

	function init() {
		initWebGL();
		initShaderProgram();
		initUniforms()
		initModels();
		initEventHandler();
		initPipline();
        initSubdivisionButtons();
        initWireframeUI();
	}

	function initWebGL() {
		// Get canvas and WebGL context.
		canvas = document.getElementById('canvas');
		gl = canvas.getContext('experimental-webgl');
		gl.viewportWidth = canvas.width;
		gl.viewportHeight = canvas.height;
	}

	/**
	 * Init pipeline parameters that will not change again.
	 * If projection or viewport change, their setup must
	 * be in render function.
	 */
	function initPipline() {
		gl.clearColor(.95, .95, .95, 1);

		// Backface culling.
		gl.frontFace(gl.CCW);
		gl.enable(gl.CULL_FACE);
		gl.cullFace(gl.BACK);

		// Depth(Z)-Buffer.
		gl.enable(gl.DEPTH_TEST);

		// Polygon offset of rastered Fragments.
		gl.enable(gl.POLYGON_OFFSET_FILL);
		gl.polygonOffset(0.5, 0);

		// Set viewport.
		gl.viewport(0, 0, gl.viewportWidth, gl.viewportHeight);

		// Init camera.
		// Set projection aspect ratio.
		camera.aspect = gl.viewportWidth / gl.viewportHeight;
	}

	function initShaderProgram() {
		// Init vertex shader.
		var vs = initShader(gl.VERTEX_SHADER, "vertexshader");
		// Init fragment shader.
		var fs = initShader(gl.FRAGMENT_SHADER, "fragmentshader");
		// Link shader into a shader program.
		prog = gl.createProgram();
		gl.attachShader(prog, vs);
		gl.attachShader(prog, fs);
		gl.bindAttribLocation(prog, 0, "aPosition");
		gl.linkProgram(prog);
		gl.useProgram(prog);
	}

	/**
	 * Create and init shader from source.
	 * 
	 * @parameter shaderType: openGL shader type.
	 * @parameter SourceTagId: Id of HTML Tag with shader source.
	 * @returns shader object.
	 */
	function initShader(shaderType, SourceTagId) {
		var shader = gl.createShader(shaderType);
		var shaderSource = document.getElementById(SourceTagId).text;
		gl.shaderSource(shader, shaderSource);
		gl.compileShader(shader);
		if(!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
			console.log(SourceTagId+": "+gl.getShaderInfoLog(shader));
			return null;
		}
		return shader;
	}

	function initUniforms() {
		// Projection Matrix.
		prog.pMatrixUniform = gl.getUniformLocation(prog, "uPMatrix");

		// Model-View-Matrix.
		prog.mvMatrixUniform = gl.getUniformLocation(prog, "uMVMatrix");
	}

	function initModels() {
		// fill-style
		var fs = "fillwireframe";

		//createModel("torus", fs);

        createModel("plane", "fillwireframe", {
            //rotateX: -Math.PI / 2,
            scale: [8, 8, 8],
            translate: [0,-0.01,0]
        });

        createModel("torus", "fillwireframe", {
            rotateX: -Math.PI / 2,
            translate: [0, 0.5, 0]
        });

        createModel("sphere", "fillwireframe", {
            //rotateX: -Math.PI / 2,
            scale: [2,2,2],
            translate: [1.5, 1, 1],

        });

        createModel("icosphere", "fillwireframe", {
            //scale: [2, 2, 2],
            translate: [-1.5, 1, -1]
        }, {
            level: 2,
            radius: 1

        });
	}

	/**
	 * Create model object, fill it and push it in models array.
	 * 
	 * @parameter geometryname: string with name of geometry.
	 * @parameter fillstyle: wireframe, fill, fillwireframe.
	 */
    function createModel(geometryname, fillstyle, transform, params) {
        var model = {};
        model.name      = geometryname;
        model.fillstyle = fillstyle || "fillwireframe";
        model.transform = transform || {};
        model.params    = params    || {};

        // Parameter in 'this' verfügbar machen
        model.level  = (model.params.level  != null ? model.params.level  : 0);
        model.radius = (model.params.radius != null ? model.params.radius : 0.5);

        initDataAndBuffers(model, geometryname);

        model.mMatrix = mat4.create();
        applyTransform(model.mMatrix, model.transform);

        model.mvMatrix = mat4.create();
        models.push(model);
    }

    function applyTransform(m, t) {
        if (!t) return;
        // Scale zuerst
        if (t.scale)   mat4.scale(m, m, t.scale);
        // dann Rotationen
        if (t.rotateX) mat4.rotateX(m, m, t.rotateX);
        if (t.rotateY) mat4.rotateY(m, m, t.rotateY);
        if (t.rotateZ) mat4.rotateZ(m, m, t.rotateZ);
        if (t.rotate && t.rotate.axis && typeof t.rotate.angle === "number") {
            mat4.rotate(m, m, t.rotate.angle, t.rotate.axis);
        }
        // zuletzt Translate
        if (t.translate) mat4.translate(m, m, t.translate);
    }

    // Hilfsfunktion: Modell mit Name finden
    function findModelByName(name) {
        for (var i = 0; i < models.length; ++i) {
            if (models[i].name === name) return models[i];
        }
        return null;
    }

    function updateModelGeometry(model, geometryname) {
        // erzeugt neue this.vertices/normals/indices...
        window[geometryname].createVertexData.apply(model);

        // in vorhandene Buffer laden
        gl.bindBuffer(gl.ARRAY_BUFFER, model.vboPos);
        gl.bufferData(gl.ARRAY_BUFFER, model.vertices, gl.STATIC_DRAW);

        gl.bindBuffer(gl.ARRAY_BUFFER, model.vboNormal);
        gl.bufferData(gl.ARRAY_BUFFER, model.normals, gl.STATIC_DRAW);

        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, model.iboTris);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, model.indicesTris, gl.STATIC_DRAW);
        model.iboTris.numberOfElements = model.indicesTris.length;

        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, model.iboLines);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, model.indicesLines, gl.STATIC_DRAW);
        model.iboLines.numberOfElements = model.indicesLines.length;

        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);
    }

    function initSubdivisionButtons() {
        var maxLevel = 6; // wegen Uint16-Index-Limit
        var btnDec = document.getElementById('btnSubDivDec');
        var btnInc = document.getElementById('btnSubDivInc');
        var info   = document.getElementById('subdivInfo');

        function updateInfo(level) {
            if (info) info.textContent = "Level: " + level;
        }

        function changeLevel(delta) {
            var model = findModelByName("icosphere");
            if (!model) return;
            var newLevel = Math.max(0, Math.min(maxLevel, (model.level|0) + delta));
            if (newLevel === model.level) return;
            model.level = newLevel; // landet als this.level in createVertexData
            updateModelGeometry(model, "icosphere");
            updateInfo(model.level);
            render();
        }

        if (btnDec) btnDec.onclick = function(){ changeLevel(-1); };
        if (btnInc) btnInc.onclick = function(){ changeLevel(+1); };

        // initialen Wert anzeigen
        var ico = findModelByName("icosphere");
        if (ico) updateInfo(ico.level|0);
    }

    function initWireframeUI() {
        var btnWire = document.getElementById('btnToggleWire');
        if (btnWire) {
            btnWire.onclick = function () {
                renderMode.drawWireframe = !renderMode.drawWireframe;
                btnWire.textContent = "Wireframe: " + (renderMode.drawWireframe ? "an" : "aus");
                render();
            };
            btnWire.textContent = "Wireframe: " + (renderMode.drawWireframe ? "an" : "aus");
        }
    }
    /**
	 * Init data and buffers for model object.
	 * 
	 * @parameter model: a model object to augment with data.
	 * @parameter geometryname: string with name of geometry.
	 */
	function initDataAndBuffers(model, geometryname) {
		// Provide model object with vertex data arrays.
		// Fill data arrays for Vertex-Positions, Normals, Index data:
		// vertices, normals, indicesLines, indicesTris;
		// Pointer this refers to the window.
		this[geometryname]['createVertexData'].apply(model);

		// Setup position vertex buffer object.
		model.vboPos = gl.createBuffer();
		gl.bindBuffer(gl.ARRAY_BUFFER, model.vboPos);
		gl.bufferData(gl.ARRAY_BUFFER, model.vertices, gl.STATIC_DRAW);
		// Bind vertex buffer to attribute variable.
		prog.positionAttrib = gl.getAttribLocation(prog, 'aPosition');
		gl.enableVertexAttribArray(prog.positionAttrib);

		// Setup normal vertex buffer object.
		model.vboNormal = gl.createBuffer();
		gl.bindBuffer(gl.ARRAY_BUFFER, model.vboNormal);
		gl.bufferData(gl.ARRAY_BUFFER, model.normals, gl.STATIC_DRAW);
		// Bind buffer to attribute variable.
		prog.normalAttrib = gl.getAttribLocation(prog, 'aNormal');
		gl.enableVertexAttribArray(prog.normalAttrib);

		// Setup lines index buffer object.
		model.iboLines = gl.createBuffer();
		gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, model.iboLines);
		gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, model.indicesLines,
			gl.STATIC_DRAW);
		model.iboLines.numberOfElements = model.indicesLines.length;
		gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);

		// Setup triangle index buffer object.
		model.iboTris = gl.createBuffer();
		gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, model.iboTris);
		gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, model.indicesTris,
			gl.STATIC_DRAW);
		model.iboTris.numberOfElements = model.indicesTris.length;
		gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);
	}

	function initEventHandler() {
        // Rotation step.
        var deltaRotate = Math.PI / 36;
        var deltaTranslate = 0.05;

		window.onkeydown = function(evt) {
			var key = evt.which ? evt.which : evt.keyCode;
			var c = String.fromCharCode(key);
			// console.log(evt);

            // Use shift key to change sign.
            var sign = evt.shiftKey ? -1 : 1;

            //Pfeiltasten
            if (key === 37) {           // Pfeil links
                camera.zAngle += deltaRotate;
            } else if (key === 39) {    // Pfeil rechts
                camera.zAngle -= deltaRotate;
            } else {
                // Radius der Kreisbahn mit 'N' (Shift-N invertiert Vorzeichen)
                var c = String.fromCharCode(key).toUpperCase();
                if (c === 'N') {
                    camera.distance += sign * deltaTranslate;
                    //Begrenzen, damit die Kamera nicht in die Szene "hineinfällt"
                    camera.distance = Math.max(0.2, Math.min(camera.distance, 40.0));
                } else {
                    return; // Andere Tasten ignorieren
                }
            }

			// // Change projection of scene.
			// switch(c) {
			// 	case('O'):
			// 		camera.projectionType = "ortho";
			// 		camera.lrtb = 2;
			// 		break;
            //     case('C'):
            //         // Orbit camera.
            //         camera.zAngle += sign * deltaRotate;
            //         break;
            //     case('F'):
            //         camera.projectionType = "frustum";
            //         camera.lrtb = 1.2;
            //         break;
            //     case('P'):
            //         camera.projectionType = "perspective";
            //         break;
            //     case('H'):
            //         // Move camera up and down.
            //         camera.eye[1] += sign * deltaTranslate;
            //         break;
            //     case('D'):
            //         // Camera distance to center.
            //         camera.distance += sign * deltaTranslate;
            //         break;
            //     case('V'):
            //         // Camera fovy in radian.
            //         camera.fovy += sign * 5 * Math.PI / 180;
            //         break;
            //     case('B'):
            //         // Camera near plane dimensions.
            //         camera.lrtb += sign * 0.1;
            //         break;
			// }
			// Render the scene again on any key pressed.
			render();
		};
	}

    function calculateCameraOrbit() {
        // Calculate x,z position/eye of camera orbiting the center.
        var x = 0, z = 2;
        camera.eye[x] = camera.center[x];
        camera.eye[z] = camera.center[z];
        camera.eye[x] += camera.distance * Math.sin(camera.zAngle);
        camera.eye[z] += camera.distance * Math.cos(camera.zAngle);
    }

	/**
	 * Run the rendering pipeline.
	 */
	function render() {
		// Clear framebuffer and depth-/z-buffer.
		gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

		setProjection();

		// mat4.identity(camera.vMatrix);
        // mat4.rotate(camera.vMatrix, camera.vMatrix,
        //     Math.PI*1/4 ,[1, 0, 0]);
        calculateCameraOrbit();

        // Set view matrix depending on camera.
        mat4.lookAt(camera.vMatrix, camera.eye, camera.center, camera.up);

		// Loop over models.
		for(var i = 0; i < models.length; i++) {
			// Update modelview for model.
			//mat4.copy(models[i].mvMatrix, camera.vMatrix);
            mat4.multiply(models[i].mvMatrix, camera.vMatrix, models[i].mMatrix);

            //4applyTransform(models[i].mvMatrix, models[i].transform);

            // Set uniforms for model.
			gl.uniformMatrix4fv(prog.mvMatrixUniform, false,
				models[i].mvMatrix);
			
			draw(models[i]);
		}
	}

	function setProjection() {
		// Set projection Matrix.
		switch(camera.projectionType) {
            case "ortho":
                var v = camera.lrtb;
                mat4.ortho(camera.pMatrix, -v, v, -v, v, -10, 50);
                break;
            case "frustum":
                var v = camera.lrtb;
                mat4.frustum(camera.pMatrix, -v/2, v/2, -v/2, v/2, 0.1, 50);
                break;
            case "perspective":
            default:
                mat4.perspective(camera.pMatrix, camera.fovy, camera.aspect, 0.1, 50);
                break;
		}
		// Set projection uniform.
		gl.uniformMatrix4fv(prog.pMatrixUniform, false, camera.pMatrix);
	}

	function draw(model) {
		// Setup position VBO.
		gl.bindBuffer(gl.ARRAY_BUFFER, model.vboPos);
		gl.vertexAttribPointer(prog.positionAttrib,3,gl.FLOAT,false,0,0);

		// Setup normal VBO.
		gl.bindBuffer(gl.ARRAY_BUFFER, model.vboNormal);
		gl.vertexAttribPointer(prog.normalAttrib,3,gl.FLOAT,false,0,0);

		// Setup rendering tris.
        var fill = renderMode.drawFill && (model.fillstyle.search(/fill/) != -1);
        if (fill) {
            gl.enableVertexAttribArray(prog.normalAttrib);
            gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, model.iboTris);
            gl.drawElements(gl.TRIANGLES, model.iboTris.numberOfElements, gl.UNSIGNED_SHORT, 0);
        }

		// Setup rendering lines.
        var wireframe = renderMode.drawWireframe && (model.fillstyle.search(/wireframe/) != -1);
        if (wireframe) {
            gl.disableVertexAttribArray(prog.normalAttrib);
            gl.vertexAttrib3f(prog.normalAttrib, 0, 0, 0);
            gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, model.iboLines);
            gl.drawElements(gl.LINES, model.iboLines.numberOfElements, gl.UNSIGNED_SHORT, 0);
        }
	}

	// App interface.
	return {
		start : start
	}

}());
