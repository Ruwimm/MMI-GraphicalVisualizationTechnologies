var icosphere = (function() {
    function createVertexData() {
        var level  = (this.level  != null ? this.level  : 2)|0;  // Rekursionstiefe
        var radius = (this.radius != null ? this.radius : 0.5);  // Kugelradius

        // Icosaeder-Basis
        var t = (1 + Math.sqrt(5)) / 2;
        var baseVerts = [
            [-1,  t,  0], [ 1,  t,  0], [-1, -t,  0], [ 1, -t,  0],
            [ 0, -1,  t], [ 0,  1,  t], [ 0, -1, -t], [ 0,  1, -t],
            [ t,  0, -1], [ t,  0,  1], [-t,  0, -1], [-t,  0,  1]
        ];
        // Normalisieren auf Einheitskugel
        baseVerts = baseVerts.map(function(v){
            var len = Math.hypot(v[0], v[1], v[2]);
            return [v[0]/len, v[1]/len, v[2]/len];
        });
        // 20 Dreiecke eines Ikosaeders (Indizes in baseVerts)
        var faces = [
            [0,11,5], [0,5,1], [0,1,7], [0,7,10], [0,10,11],
            [1,5,9], [5,11,4], [11,10,2], [10,7,6], [7,1,8],
            [3,9,4], [3,4,2], [3,2,6], [3,6,8], [3,8,9],
            [4,9,5], [2,4,11], [6,2,10], [8,6,7], [9,8,1]
        ];

        // Arbeits-Arrays (dynamisch), Einheitssphäre-Koordinaten
        var verts = baseVerts.slice(); // Array von [x,y,z]
        var tris  = faces.slice();

        // Midpoint-Cache zur Vermeidung doppelter Mittelpunkte
        var edgeMid = new Map(); // key = "min|max" -> index

        function getMidpoint(i1, i2) {
            var a = Math.min(i1, i2), b = Math.max(i1, i2);
            var key = a + "|" + b;
            var idx = edgeMid.get(key);
            if (idx !== undefined) return idx;
            var v1 = verts[a], v2 = verts[b];
            var mx = (v1[0] + v2[0]) * 0.5;
            var my = (v1[1] + v2[1]) * 0.5;
            var mz = (v1[2] + v2[2]) * 0.5;
            // auf Einheitskugel projizieren
            var len = Math.hypot(mx, my, mz);
            mx /= len; my /= len; mz /= len;
            idx = verts.length;
            verts.push([mx, my, mz]);
            edgeMid.set(key, idx);
            return idx;
        }

        // Rekursive Unterteilung
        for (var k = 0; k < level; ++k) {
            var newTris = [];
            edgeMid.clear();
            for (var f = 0; f < tris.length; ++f) {
                var i0 = tris[f][0], i1 = tris[f][1], i2 = tris[f][2];
                var m01 = getMidpoint(i0, i1);
                var m12 = getMidpoint(i1, i2);
                var m20 = getMidpoint(i2, i0);
                newTris.push([i0, m01, m20],
                    [i1, m12, m01],
                    [i2, m20, m12],
                    [m01, m12, m20]);
            }
            tris = newTris;
        }

        // In finale Typed Arrays konvertieren, Position = radius * normal
        var numVerts = verts.length;
        var vertices = new Float32Array(3 * numVerts);
        var normals  = new Float32Array(3 * numVerts);
        for (var i = 0; i < numVerts; ++i) {
            var v = verts[i];
            normals[3*i+0] = v[0];
            normals[3*i+1] = v[1];
            normals[3*i+2] = v[2];
            vertices[3*i+0] = radius * v[0];
            vertices[3*i+1] = radius * v[1];
            vertices[3*i+2] = radius * v[2];
        }

        // Triangles
        var indicesTris = new Uint16Array(3 * tris.length);
        for (var tIdx = 0; tIdx < tris.length; ++tIdx) {
            indicesTris[3*tIdx+0] = tris[tIdx][0];
            indicesTris[3*tIdx+1] = tris[tIdx][1];
            indicesTris[3*tIdx+2] = tris[tIdx][2];
        }

        // Lines (duplikate Kanten sind ok)
        var indicesLines = new Uint16Array(2 * 3 * tris.length);
        var iL = 0;
        for (var tt = 0; tt < tris.length; ++tt) {
            var a = tris[tt][0], b = tris[tt][1], c = tris[tt][2];
            indicesLines[iL++] = a; indicesLines[iL++] = b;
            indicesLines[iL++] = b; indicesLines[iL++] = c;
            indicesLines[iL++] = c; indicesLines[iL++] = a;
        }

        // an this binden (Framework erwartet diese Felder)
        this.vertices     = vertices;
        this.normals      = normals;
        this.indicesTris  = indicesTris;
        this.indicesLines = indicesLines;
    }

    return { createVertexData: createVertexData };
}());
