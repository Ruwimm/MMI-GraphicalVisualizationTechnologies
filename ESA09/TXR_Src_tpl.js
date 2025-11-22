var app = (function() {

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


    var illumination = {
        ambientLight : [ .5, .5, .5 ],
        light : [ {
            isOn : true,
            position : [ 3., 3., 5. ],
            color : [ 1., 1., 1. ]
        }, ]
    };


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

        // Light.
        prog.ambientLightUniform = gl.getUniformLocation(prog,
            "ambientLight");
        // Array for light sources uniforms.
        prog.lightUniform = [];
        // Loop over light sources.
        for (var j = 0; j < illumination.light.length; j++) {
            var lightNb = "light[" + j + "]";
            // Store one object for every light source.
            var l = {};
            l.isOn = gl.getUniformLocation(prog, lightNb + ".isOn");
            l.position = gl.getUniformLocation(prog, lightNb + ".position");
            l.color = gl.getUniformLocation(prog, lightNb + ".color");
            prog.lightUniform[j] = l;
        }

        // Material.
        prog.materialKaUniform = gl.getUniformLocation(prog, "material.ka");
        prog.materialKdUniform = gl.getUniformLocation(prog, "material.kd");
        prog.materialKsUniform = gl.getUniformLocation(prog, "material.ks");
        prog.materialKeUniform = gl.getUniformLocation(prog, "material.ke");

        // Voronoi-Uniforms
        prog.modeUniform        = gl.getUniformLocation(prog, "uMode");
        prog.voroScaleXUniform  = gl.getUniformLocation(prog, "uVoronoiScaleX");
        prog.voroScaleYUniform  = gl.getUniformLocation(prog, "uVoronoiScaleY");
        prog.voroEdgeUniform    = gl.getUniformLocation(prog, "uVoronoiEdge");
        prog.tileCountXUniform  = gl.getUniformLocation(prog, "uTileCountX");
        prog.tileCountYUniform  = gl.getUniformLocation(prog, "uTileCountY");
        prog.cellColorUniform = gl.getUniformLocation(prog, "uCellColor");
        prog.lineColorUniform = gl.getUniformLocation(prog, "uLineColor");

        // Texture.
        prog.textureUniform = gl.getUniformLocation(prog, "uTexture");
    }

    /**
     * Load the texture image file.
     */
    function initTexture(model, filename) {
        var texture = gl.createTexture();
        model.texture = texture;
        texture.loaded = false;
        texture.image = new Image();
        texture.image.onload = function() {
            onloadTextureImage(texture);
        };
        texture.image.src = filename;
    }

    function initProceduralTexture(model, spec) {
        spec = spec || {};
        var w = spec.width  || 256;  // POT
        var h = spec.height || 256;  // POT
        var tilesX = spec.tilesX || 8;
        var tilesY = spec.tilesY || 16;
        var colors = spec.colors || [
            [180, 120, 80, 255],   // braun
            [230, 200, 160, 255]   // hellbraun
        ];

        // Daten erzeugen
        var data = generateChecker(w, h, tilesX, tilesY, colors);

        // Texture anlegen und laden
        var texture = gl.createTexture();
        model.texture = texture;
        texture.loaded = true;

        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, data);

        // Parameter: REPEAT + Mipmaps (POT)
        gl.generateMipmap(gl.TEXTURE_2D);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);

        gl.bindTexture(gl.TEXTURE_2D, null);
    }

    function generateChecker(w, h, tilesX, tilesY, colors) {
        var data = new Uint8Array(w * h * 4);
        for (var y = 0; y < h; ++y) {
            for (var x = 0; x < w; ++x) {
                var cx = Math.floor(x / (w / tilesX));
                var cy = Math.floor(y / (h / tilesY));
                var c  = ((cx + cy) & 1) ? colors[0] : colors[1];
                var idx = (y * w + x) * 4;
                data[idx + 0] = c[0];
                data[idx + 1] = c[1];
                data[idx + 2] = c[2];
                data[idx + 3] = c[3];
            }
        }
        return data;
    }

    function onloadTextureImage(texture) {

        texture.loaded = true;

        // Use texture object.
        gl.bindTexture(gl.TEXTURE_2D, texture);

        // Assigen image data.
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE,
            texture.image);

        const w = texture.image.width, h = texture.image.height;
        const isPOT = (w & (w - 1)) === 0 && (h & (h - 1)) === 0;

        if (isPOT) {
            // POT: Mipmaps erlaubt
            gl.generateMipmap(gl.TEXTURE_2D);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
            // Wrap kann REPEAT sein
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
        } else {
            // NPOT: keine Mipmaps, Clamp-To-Edge und LINEAR/NEAREST
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        }

        // Release texture object.
        gl.bindTexture(gl.TEXTURE_2D, null);

        // Update the scene.
        render();
    }

    function createPhongMaterial(material) {
        material = material || {};
        // Set some default values,
        // if not defined in material paramter.
        material.ka = material.ka || [ 0.3, 0.3, 0.3 ];
        material.kd = material.kd || [ 0.6, 0.6, 0.6 ];
        material.ks = material.ks || [ 0.8, 0.8, 0.8 ];
        material.ke = material.ke || 10.;

        return material;
    }

	function initModels() {
		// fillstyle
		var fs = "fill";

        // Create some materials.
        var mDefault = createPhongMaterial();
        var mRed = createPhongMaterial({
            kd : [ 1., 0., 0. ]
        });
        var mGreen = createPhongMaterial({
            kd : [ 0., 1., 0. ]
        });
        var mBlue = createPhongMaterial({
            kd : [ 0., 0., 1. ]
        });
        var mGrey = createPhongMaterial({
            ka : [ 1., 1., 1. ],
            kd : [ .5, .5, .5 ],
            ks : [ 0., 0., 0. ]
        });
        var mWhite = createPhongMaterial({
            ka : [ 0.8, 0.8, 0.8 ],
            kd : [ 1, 1, 1 ],
            ks : [ 0, 0, 0 ]
        });

		createModel("plane", fs, [1, 1, 1, 1], [0, 0, 0, 0], [0, 0, 0, 0], [1, 1, 1, 1],
            mWhite,"textures/Floor.jpg");


        createModel("torus", fs, [1, 1, 1, 1], [0.2, 0.2, 2.2,0], [Math.PI/2, 0, 0,0], [1, 1, 1,1],mWhite,"textures/Wood-Stylized.png");


        var t2 = createModel("torus", fs, [1, 1, 1, 1], [-0.9, 0.4, -2, 0], [Math.PI/2, 0, 0, 0], [3, 3, 3, 3],mWhite);
        initProceduralTexture(t2,{ width: 256, height: 256, tilesX: 12, tilesY: 24 });
        t2.useVoronoi     = true;
        t2.voronoiScaleX  = 12.0;
        t2.voronoiScaleY  = 24.0;
        t2.voronoiEdge    = 0.03;
        t2.tileCountX     = 12.0;
        t2.tileCountY     = 24.0;
        t2.cellColor = [1.0, 0.2, 0.0];
        t2.lineColor = [1.0, 0.85, 0.0];


		interactiveModel = models[0];
	}

	/**
	 * Create model object, fill it and push it in models array.
	 * @parameter geometryname: string with name of geometry.
	 * @parameter fillstyle: wireframe, fill, fillwireframe.
	 */
    function createModel(geometryname, fillstyle, color, translate, rotate,
                         scale, material, textureFilename) {
        var model = {};
        model.fillstyle = fillstyle;
        model.color = color;
        initDataAndBuffers(model, geometryname);
        initTransformations(model, translate, rotate, scale);

        if (textureFilename) {
            initTexture(model, textureFilename);
        }
        model.material = material;

        models.push(model);
        return model;
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

        // Setup texture coordinate vertex buffer object.
        model.vboTextureCoord = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, model.vboTextureCoord);
        gl.bufferData(gl.ARRAY_BUFFER, model.textureCoord, gl.STATIC_DRAW);
        // Bind buffer to attribute variable.
        prog.textureCoordAttrib = gl
            .getAttribLocation(prog, 'aTextureCoord');
        gl.enableVertexAttribArray(prog.textureCoordAttrib);

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

        // Kamera yaw/pitch und eye
        updateCameraBasis();
        mat4.lookAt(camera.vMatrix, camera.eye, camera.center, camera.up);

        gl.uniform3fv(prog.ambientLightUniform, illumination.ambientLight);
        for (var j = 0; j < illumination.light.length; j++) {
            gl.uniform1i(prog.lightUniform[j].isOn, illumination.light[j].isOn);
            var lightPos = [].concat(illumination.light[j].position);
            lightPos.push(1.0);
            vec4.transformMat4(lightPos, lightPos, camera.vMatrix);
            lightPos.pop();
            gl.uniform3fv(prog.lightUniform[j].position, lightPos);
            gl.uniform3fv(prog.lightUniform[j].color, illumination.light[j].color);
        }

        for (var i = 0; i < models.length; i++) {
            // Voronoi-Uniforms setzen (Textur bleibt gebunden, wird aber bei uMode==1 ignoriert)
            gl.uniform1i(prog.modeUniform, models[i].useVoronoi ? 1 : 0);
            gl.uniform1f(prog.voroScaleXUniform, models[i].voronoiScaleX || 12.0);
            gl.uniform1f(prog.voroScaleYUniform, models[i].voronoiScaleY || 24.0);
            gl.uniform1f(prog.voroEdgeUniform,   models[i].voronoiEdge   || 0.03);
            gl.uniform1f(prog.tileCountXUniform, models[i].tileCountX    || 12.0);
            gl.uniform1f(prog.tileCountYUniform, models[i].tileCountY    || 24.0);
            gl.uniform3fv(prog.cellColorUniform, models[i].cellColor || [1.0, 0.2, 0.0]);
            gl.uniform3fv(prog.lineColorUniform, models[i].lineColor || [1.0, 0.85, 0.0]);

            if (models[i].texture && !models[i].texture.loaded) continue;

            updateTransformations(models[i]);

            // mv = view * model
            mat4.multiply(models[i].mvMatrix, camera.vMatrix, models[i].mMatrix);

            mat3.normalFromMat4(models[i].nMatrix, models[i].mvMatrix);

            gl.uniform4fv(prog.colorUniform, models[i].color);
            gl.uniform3fv(prog.materialKaUniform, models[i].material.ka);
            gl.uniform3fv(prog.materialKdUniform, models[i].material.kd);
            gl.uniform3fv(prog.materialKsUniform, models[i].material.ks);
            gl.uniform1f (prog.materialKeUniform, models[i].material.ke);

            gl.uniformMatrix4fv(prog.mvMatrixUniform, false, models[i].mvMatrix);
            gl.uniformMatrix3fv(prog.nMatrixUniform, false, models[i].nMatrix);

            gl.activeTexture(gl.TEXTURE0);
            gl.bindTexture(gl.TEXTURE_2D, models[i].texture);
            gl.uniform1i(prog.textureUniform, 0);

            draw(models[i]);
        }
    }

	// function calculateCameraOrbit() {
	// 	// Calculate x,z position/eye of camera orbiting the center.
	// 	var x = 0, z = 2;
	// 	camera.eye[x] = camera.center[x];
	// 	camera.eye[z] = camera.center[z];
	// 	camera.eye[x] += camera.distance * Math.sin(camera.zAngle);
	// 	camera.eye[z] += camera.distance * Math.cos(camera.zAngle);
	// }

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

        // Setup texture VBO.
        gl.bindBuffer(gl.ARRAY_BUFFER, model.vboTextureCoord);
        gl.vertexAttribPointer(prog.textureCoordAttrib, 2, gl.FLOAT, false,
            0, 0);


        // Setup rendering tris.
		var fill = (model.fillstyle.search(/fill/) != -1);
		if(fill) {
			gl.enableVertexAttribArray(prog.normalAttrib);
            gl.enableVertexAttribArray(prog.textureCoordAttrib);
			gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, model.iboTris);
			gl.drawElements(gl.TRIANGLES, model.iboTris.numberOfElements, gl.UNSIGNED_SHORT, 0);
		}

		// Setup rendering lines.
		var wireframe = (model.fillstyle.search(/wireframe/) != -1);
		if(wireframe) {
			gl.uniform4fv(prog.colorUniform, [0.,0.,0.,1.]);
			gl.disableVertexAttribArray(prog.normalAttrib);
            gl.disableVertexAttribArray(prog.textureCoordAttrib);

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
