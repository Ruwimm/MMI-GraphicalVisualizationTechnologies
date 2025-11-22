var app = ( function() {

	var gl;

	// The shader program object is also used to
	// store attribute and uniform locations.
	var prog;

	// Array of model objects.
	var models = [];

	// Model that is target for user input.
	var interactiveModel;

	var camera = {
		// Initial position of the camera.
		eye : [0, 1, 4],
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
        yaw : 0,
        pitch : 0,
	};

    function getForward() {
        var cy = Math.cos(camera.yaw), sy = Math.sin(camera.yaw);
        var cp = Math.cos(camera.pitch), sp = Math.sin(camera.pitch);
        return [ sy*cp, sp, -cy*cp ];
    }
    function getRight(forward) {
        var r = vec3.create();
        vec3.cross(r, forward, [0,1,0]); // Welt-Up
        vec3.normalize(r, r);
        return r;
    }
    function getUp(forward, right) {
        var u = vec3.create();
        vec3.cross(u, right, forward);
        vec3.normalize(u, u);
        return u;
    }
    function updateCameraBasis() {
        var f = getForward();
        var r = getRight(f);
        var u = getUp(f, r);
        camera.up = u;
        camera.center = [ camera.eye[0]+f[0], camera.eye[1]+f[1], camera.eye[2]+f[2] ];
    }

    var sceneRotation = { yaw: 0, pitch: 0 };


	function start() {
		init();
		render();
	}

	function init() {
		initWebGL();
		initShaderProgram();
		initUniforms();
		initModels();
		initEventHandler();
		initPipline();
	}

	function initWebGL() {
		// Get canvas and WebGL context.
		canvas = document.getElementById('canvas');
		gl = canvas.getContext('experimental-webgl');
		gl.viewportWidth = canvas.width;
		gl.viewportHeight = canvas.height;
	}

	/**
	 * Init pipeline parmters that will not change again.
	 * If projection or viewport change,
	 * thier setup must be in render function.
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
			console.log(SourceTagId + ": " + gl.getShaderInfoLog(shader));
			return null;
		}
		return shader;
	}

	function initUniforms() {
		// Projection Matrix.
		prog.pMatrixUniform = gl.getUniformLocation(prog, "uPMatrix");

		// Model-View-Matrix.
		prog.mvMatrixUniform = gl.getUniformLocation(prog, "uMVMatrix");

		// Normal Matrix.
		prog.nMatrixUniform = gl.getUniformLocation(prog, "uNMatrix");

		// Color.
		prog.colorUniform = gl.getUniformLocation(prog, "uColor");

        prog.dispAmpUniform = gl.getUniformLocation(prog, "uDispAmp");
        prog.dispFreqUniform = gl.getUniformLocation(prog, "uDispFreq");

    }

	function initModels() {
		// fillstyle
		var fs = "fill";
		createModel("plane", fs, [1, 1, 1, 1], [0, 0, 0], [0, 0, 0], [1, 1, 1]);


        createModel("sphere", fs, [1, 1, 1, 1], [1.1, 0.5, 1.5], [0, 0, 0], [0.5, 0.5, 0.5]);


        createModel("sphere", fs, [1, 1, 1, 1], [-1, 0.3, 1], [0, 0, 0], [0.3, 0.3, 0.3]);


        createModel("torus", fs, [1, 1, 1, 1], [0.2, 0.2, 2.2], [Math.PI/2, 0, 0], [1, 1, 1]);


        createModel("torus", fs, [1, 1, 1, 1], [-0.9, 0.3, -2], [Math.PI/2, 0, 0], [3, 3, 3]);



		// Select one model that can be manipulated interactively by user.
		interactiveModel = models[0];
	}

	/**
	 * Create model object, fill it and push it in models array.
	 * @parameter geometryname: string with name of geometry.
	 * @parameter fillstyle: wireframe, fill, fillwireframe.
	 */
	function createModel(geometryname, fillstyle, color, translate, rotate, scale) {
		var model = {};
		model.fillstyle = fillstyle;
		model.color = color;
        model.name = geometryname;
		initDataAndBuffers(model, geometryname);
		initTransformations(model, translate, rotate, scale);

		models.push(model);
	}

	/**
	 * Set scale, rotation and transformation for model.
	 */
	function initTransformations(model, translate, rotate, scale) {
		// Store transformation vectors.
		model.translate = translate;
		model.rotate = rotate;
		model.scale = scale;

		// Create and initialize Model-Matrix.
		model.mMatrix = mat4.create();

		// Create and initialize Model-View-Matrix.
		model.mvMatrix = mat4.create();

		// Create and initialize Normal Matrix.
		model.nMatrix = mat3.create();
	}

	/**
	 * Init data and buffers for model object.
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
		gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, model.indicesLines, gl.STATIC_DRAW);
		model.iboLines.numberOfElements = model.indicesLines.length;
		gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);

		// Setup triangle index buffer object.
		model.iboTris = gl.createBuffer();
		gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, model.iboTris);
		gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, model.indicesTris, gl.STATIC_DRAW);
		model.iboTris.numberOfElements = model.indicesTris.length;
		gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);
	}

    function initEventHandler() {
        var deltaRotate = Math.PI / 36; // 5°
        var deltaMove = 0.1;
        var maxPitch = Math.PI/2 - 0.1;

        window.onkeydown = function(evt) {
            const key = evt.key; // moderner als keyCode/which

            // Pfeiltasten: Kamera drehen
            if (key === 'ArrowRight') {
                camera.yaw += deltaRotate;
                evt.preventDefault();
                render();
                return;
            }
            if (key === 'ArrowLeft') {
                camera.yaw -= deltaRotate;
                evt.preventDefault();
                render();
                return;
            }
            if (key === 'ArrowUp') {
                camera.pitch = Math.min(maxPitch, camera.pitch + deltaRotate);
                evt.preventDefault();
                render();
                return;
            }
            if (key === 'ArrowDown') {
                camera.pitch = Math.max(-maxPitch, camera.pitch - deltaRotate);
                evt.preventDefault();
                render();
                return;
            }

            // WASD: Panning relativ zur Kamera (rechts/links, oben/unten)
            const f = getForward();
            const r = getRight(f);
            const u = getUp(f, r);

            function move(vec, s) {
                camera.eye[0] += vec[0] * s;
                camera.eye[1] += vec[1] * s;
                camera.eye[2] += vec[2] * s;
                camera.center = [ camera.eye[0] + f[0],
                    camera.eye[1] + f[1],
                    camera.eye[2] + f[2] ];
            }

            switch (key) {
                case 'a': case 'A': move(r, -deltaMove); break; // links
                case 'd': case 'D': move(r, +deltaMove); break; // rechts
                case 'w': case 'W': move(u, +deltaMove); break; // oben
                case 's': case 'S': move(u, -deltaMove); break; // unten
                default: break;
            }

            render();
        };
    }

	/**
	 * Run the rendering pipeline.
	 */
    function render() {
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        setProjection();

        // Kamera aus yaw/pitch ableiten
        updateCameraBasis();
        mat4.lookAt(camera.vMatrix, camera.eye, camera.center, camera.up);

        for (var i = 0; i < models.length; i++) {
            updateTransformations(models[i]);
            // mv = view * model
            mat4.multiply(models[i].mvMatrix, camera.vMatrix, models[i].mMatrix);
            mat3.normalFromMat4(models[i].nMatrix, models[i].mvMatrix);

            gl.uniform4fv(prog.colorUniform, models[i].color);
            gl.uniformMatrix4fv(prog.mvMatrixUniform, false, models[i].mvMatrix);
            gl.uniformMatrix3fv(prog.nMatrixUniform, false, models[i].nMatrix);

            var isPlane = (models[i].name === "plane");
            gl.uniform1f(prog.dispAmpUniform, isPlane ? 0.1 : 0.0);
            gl.uniform1f(prog.dispFreqUniform, 1.0);

            draw(models[i]);
        }
    }


    function calculateCameraOrbit() {
		// Calculate x,z position/eye of camera orbiting the center.
		var x = 0, z = 2;
		camera.eye[x] = camera.center[x];
		camera.eye[z] = camera.center[z];
		camera.eye[x] += camera.distance * Math.sin(camera.zAngle);
		camera.eye[z] += camera.distance * Math.cos(camera.zAngle);
	}

	function setProjection() {
		// Set projection Matrix.
		switch(camera.projectionType) {
			case("ortho"):
				var v = camera.lrtb;
				mat4.ortho(camera.pMatrix, -v, v, -v, v, -10, 10);
				break;
			case("frustum"):
				var v = camera.lrtb;
				mat4.frustum(camera.pMatrix, -v/2, v/2, -v/2, v/2, 1, 10);
				break;
			case("perspective"):
				mat4.perspective(camera.pMatrix, camera.fovy, camera.aspect, 1, 10);
				break;
		}
		// Set projection uniform.
		gl.uniformMatrix4fv(prog.pMatrixUniform, false, camera.pMatrix);
	}

	/**
	 * Update model-view matrix for model.
	 */
    function updateTransformations(model) {
        var mMatrix = model.mMatrix;
        var mvMatrix = model.mvMatrix;

        mat4.identity(mMatrix);
        mat4.identity(mvMatrix);

        // Nur: model-Transform (translate, rotate, scale)
        mat4.translate(mMatrix, mMatrix, model.translate);
        mat4.rotateX(mMatrix, mMatrix, model.rotate[0]);
        mat4.rotateY(mMatrix, mMatrix, model.rotate[1]);
        mat4.rotateZ(mMatrix, mMatrix, model.rotate[2]);
        mat4.scale(mMatrix, mMatrix, model.scale);

        // mvMatrix wird in render() berechnet: view * scene * model
    }

	function draw(model) {
		// Setup position VBO.
		gl.bindBuffer(gl.ARRAY_BUFFER, model.vboPos);
		gl.vertexAttribPointer(prog.positionAttrib, 3, gl.FLOAT, false, 0, 0);

		// Setup normal VBO.
		gl.bindBuffer(gl.ARRAY_BUFFER, model.vboNormal);
		gl.vertexAttribPointer(prog.normalAttrib, 3, gl.FLOAT, false, 0, 0);

		// Setup rendering tris.
		var fill = (model.fillstyle.search(/fill/) != -1);
		if(fill) {
			gl.enableVertexAttribArray(prog.normalAttrib);
			gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, model.iboTris);
			gl.drawElements(gl.TRIANGLES, model.iboTris.numberOfElements, gl.UNSIGNED_SHORT, 0);
		}

		// Setup rendering lines.
		var wireframe = (model.fillstyle.search(/wireframe/) != -1);
		if(wireframe) {
			gl.uniform4fv(prog.colorUniform, [0.,0.,0.,1.]);
			gl.disableVertexAttribArray(prog.normalAttrib);
			gl.vertexAttrib3f(prog.normalAttrib, 0, 0, 0);
			gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, model.iboLines);
			gl.drawElements(gl.LINES, model.iboLines.numberOfElements, gl.UNSIGNED_SHORT, 0);
		}
	}

	// App interface.
	return {
		start : start
	};

}());
