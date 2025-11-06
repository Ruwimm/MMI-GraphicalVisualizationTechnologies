var sphere = ( function() {

    function createVertexData() {
        var n = 64;  // Umfangsaufteilung (Longitude)
        var m = 64;  // Vertikalaufteilung (Latitude)
        var R = 0.5; // Kugelradius

        var numVerts = (n + 1) * (m + 1);

        // Arrays anlegen
        this.vertices     = new Float32Array(3 * numVerts);
        this.normals      = new Float32Array(3 * numVerts);
        this.indicesLines = new Uint16Array(2 * 2 * n * m);
        this.indicesTris  = new Uint16Array(3 * 2 * n * m);

        var dt = 2 * Math.PI / n;   // Longitude Schritt
        var dv = Math.PI / m;       // Latitude Schritt

        var iLines = 0, iTris = 0;

        // t: 0..2π (um Y-Achse), v: 0..π (von Nordpol nach Südpol)
        for (var i = 0, t = 0; i <= n; ++i, t += dt) {
            for (var j = 0, v = 0; j <= m; ++j, v += dv) {
                var idx = i * (m + 1) + j;

                // Richtungseinheitsvektor
                var nx = Math.sin(v) * Math.cos(t);
                var ny = Math.cos(v);
                var nz = Math.sin(v) * Math.sin(t);

                // Position auf Radius R
                this.vertices[3 * idx + 0] = R * nx;
                this.vertices[3 * idx + 1] = R * ny;
                this.vertices[3 * idx + 2] = R * nz;

                // Normale = Richtung (Einheitsvektor nach außen)
                this.normals[3 * idx + 0] = nx;
                this.normals[3 * idx + 1] = ny;
                this.normals[3 * idx + 2] = nz;

                // Indizes erst setzen, wenn es links/oben Nachbarn gibt
                if (j > 0 && i > 0) {
                    // Linien (Gitter)
                    this.indicesLines[iLines++] = idx - 1;
                    this.indicesLines[iLines++] = idx;
                    this.indicesLines[iLines++] = idx - (m + 1);
                    this.indicesLines[iLines++] = idx;

                    // Dreiecke (2 pro Zelle)
                    // Tri 1
                    this.indicesTris[iTris++] = idx;
                    this.indicesTris[iTris++] = idx - 1;
                    this.indicesTris[iTris++] = idx - (m + 1);
                    // Tri 2
                    this.indicesTris[iTris++] = idx - 1;
                    this.indicesTris[iTris++] = idx - (m + 1) - 1;
                    this.indicesTris[iTris++] = idx - (m + 1);
                }
            }
        }
    }

    return {
        createVertexData: createVertexData
    };

}());
