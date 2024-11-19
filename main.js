import * as THREE from 'three';
import { OBJLoader } from 'three/addons/loaders/OBJLoader.js';

const FileType = {
    OBJ: 'obj',
    GLTF: 'gltf'
};

const objLoader = new OBJLoader();

let loadedObject = null;
let loadedFileType = null;

let loadedDiffuseMap = null;
let rawImageData = null;

let depthBuffer = [];

let frameBuffer = new Uint8ClampedArray();

function loadImageData(url) {
    const image = new Image();
    image.src = url;

    image.onload = function() {
        // Create an off-screen canvas to extract pixel data
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');

        // Set the canvas size to match the image dimensions
        canvas.width = image.width;
        canvas.height = image.height;

        // Draw the image onto the canvas
        context.drawImage(image, 0, 0, canvas.width, canvas.height);

        // Extract the pixel data (RGBA values)
        const imageData = context.getImageData(0, 0, canvas.width, canvas.height);

        // Call the callback function with the image data
        rawImageData = ({
            data: imageData.data, // Raw pixel data (Uint8ClampedArray)
            width: image.width,
            height: image.height
        });
    };
}

function loadObj(filePath, callback) {
    // Source: https://threejs.org/docs/#examples/en/loaders/OBJLoader
    objLoader.load(filePath,
        // called when resource is loaded
        function ( object ) {
            loadedObject = object;

            if (loadedObject instanceof THREE.Group) {
                console.log("Loaded object is a Group");
            } else if (loadedObject instanceof THREE.Mesh) {
                console.log("Loaded object is a Mesh");
            } else if (loadedObject instanceof THREE.Object3D) {
                console.log("Loaded object is a generic Object3D");
            }

            // Note: THREE.js always lods OBJ files as non-indexed. If you want indexed verts, you
            // need to call BufferGeometryUtils.mergeVertices: https://threejs.org/docs/index.html#examples/en/utils/BufferGeometryUtils.mergeVertices
            loadedFileType = FileType.OBJ;

            callback()
        },
        // called when loading is in progress
        function ( xhr ) {
            console.log( ( xhr.loaded / xhr.total * 100 ) + '% loaded' );
        },
        // called when loading has errors
        function ( error ) {
            console.error('Error loading the OBJ file:', error);
        }
    );
}

function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    frameBuffer = new Uint8ClampedArray(canvas.width * canvas.height * 4);
}

// Create a canvas
const canvas = document.createElement('canvas');
const ctx = canvas.getContext('2d');
document.body.appendChild(canvas);
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

 // Resize canvas initially and on window resize
 window.addEventListener('resize', resizeCanvas);
 resizeCanvas(); 

// Set up a camera
const camera = {
    position: { x: 0, y: 0, z: -10 },
    fov: 45
};

// Function to project 3D vertex into 2D space
function projectVertex(vertex) {
    let aspectRatio = canvas.width / canvas.height;
    let screenHalfWidth = canvas.width / 2;
    let screenHalfHeight = canvas.height / 2;
    let tanHalfFOV =  Math.tan((camera.fov / 2.0) * (Math.PI / 180))

    const translatedVertex = {
        x: vertex.x - camera.position.x,
        y: vertex.y - camera.position.y,
        z: vertex.z - camera.position.z
    };

    return {
        x: (translatedVertex.x/(translatedVertex.z * tanHalfFOV)) * screenHalfWidth + screenHalfWidth,
        y: (translatedVertex.y/(translatedVertex.z * tanHalfFOV)) * screenHalfHeight * aspectRatio + screenHalfHeight,
        z: translatedVertex.z
    };
}

function drawTriangle(ctx, v0, v1, v2) {
    ctx.strokeStyle = 'white';
    ctx.beginPath();
    ctx.moveTo(v0.x, v0.y);
    ctx.lineTo(v1.x, v1.y);
    ctx.lineTo(v2.x, v2.y);
    ctx.closePath();
    ctx.stroke();
}

// Function to render the wireframe
function renderWireframe() {
    if (!loadedObject) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "black";
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    // Traverse the geometry of the loaded object
    // The object is expected to load in as a THREE.Group (https://threejs.org/docs/#api/en/objects/Group)
    // THREE.Group is a subclass of THREE.Object3D (https://threejs.org/docs/index.html#api/en/core/Object3D)
    // so we can call .traverse() on it to iterate through its elements
    loadedObject.traverse((child) => {
        if (child.isMesh) {
            const geometry = child.geometry;
            // console.log(geometry) // Debug
            child.rotation.x += 0.05;
            child.rotation.y += 0.02;
            const vertices = geometry.attributes.position.array;

            // Before projecting the vertices into 2D space we need to apply rotation. To do this, use THREE.Object3D::applyMatrix4
            // https://threejs.org/docs/#api/en/core/Object3D.applyMatrix4

            var rotationMatrix = new THREE.Matrix4();

            rotationMatrix.makeRotationFromEuler(child.rotation);

            // Loop through the vertices
            for (let i = 0; i < vertices.length; i += 9) { // 9 because there are 3 vertices per triangle, each with 3 components (x, y, z)
                let v0 = new THREE.Vector3(vertices[i], vertices[i + 1], vertices[i + 2]);
                let v1 = new THREE.Vector3(vertices[i + 3], vertices[i + 4], vertices[i + 5]);
                let v2 = new THREE.Vector3(vertices[i + 6], vertices[i + 7], vertices[i + 8]);

                v0.applyMatrix4(rotationMatrix);
                v1.applyMatrix4(rotationMatrix);
                v2.applyMatrix4(rotationMatrix);

                v0 = projectVertex(v0);
                v1 = projectVertex(v1);
                v2 = projectVertex(v2);

                drawTriangle(ctx, v0, v1, v2)
            }
        }
    });

    // Continue the animation loop
    requestAnimationFrame(renderWireframe);
}

// Function to render the wireframe
function renderWithTexture() {
    if (!loadedObject) return;
    if (!rawImageData) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "black";
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    // Traverse the geometry of the loaded object
    // The object is expected to load in as a THREE.Group (https://threejs.org/docs/#api/en/objects/Group)
    // THREE.Group is a subclass of THREE.Object3D (https://threejs.org/docs/index.html#api/en/core/Object3D)
    // so we can call .traverse() on it to iterate through its elements
    loadedObject.traverse((child) => {
        if (child.isMesh) {
            const geometry = child.geometry;
            // console.log(child) // Debug
            child.rotation.x += 0.05;
            child.rotation.y += 0.02;
            const vertices = geometry.attributes.position.array;
            const uvs = geometry.attributes.uv.array; // UV coordinates

            var rotationMatrix = new THREE.Matrix4();

            rotationMatrix.makeRotationFromEuler(child.rotation);

            depthBuffer =  Array(canvas.width).fill().map(() => Array(canvas.width).fill(Infinity));

            // Loop through the vertices
            for (let i = 0; i < vertices.length; i += 9) { // 9 because there are 3 vertices per triangle, each with 3 components (x, y, z)
                let v0 = new THREE.Vector3(vertices[i], vertices[i + 1], vertices[i + 2]);
                let v1 = new THREE.Vector3(vertices[i + 3], vertices[i + 4], vertices[i + 5]);
                let v2 = new THREE.Vector3(vertices[i + 6], vertices[i + 7], vertices[i + 8]);

                v0.applyMatrix4(rotationMatrix);
                v1.applyMatrix4(rotationMatrix);
                v2.applyMatrix4(rotationMatrix);

                // Project vertices into screen space
                v0 = projectVertex(v0);
                v1 = projectVertex(v1);
                v2 = projectVertex(v2);

                // Get the corresponding UVs for the triangle
                let uv0 = new THREE.Vector2(uvs[i / 3 * 2], uvs[i / 3 * 2 + 1]);
                let uv1 = new THREE.Vector2(uvs[(i / 3 + 1) * 2], uvs[(i / 3 + 1) * 2 + 1]);
                let uv2 = new THREE.Vector2(uvs[(i / 3 + 2) * 2], uvs[(i / 3 + 2) * 2 + 1]);

                // Triangle in screen space is defined by v0, v1, v2
                rasterizeTriangle(ctx, v0, v1, v2, uv0, uv1, uv2, loadedDiffuseMap);
                // drawTriangle(ctx, v0, v1, v2) // Enable this to draw wireframe
            }

            renderFrameBuffer(ctx)
        }
    });

    // Continue the animation loop
    requestAnimationFrame(renderWithTexture);
}

function rasterizeTriangle(ctx, v0, v1, v2, uv0, uv1, uv2) {
    // Calculate the bounding box of the triangle
    // The mins and maxes are floored and ceilinged because they're used array indices
    const minX = Math.floor(Math.min(v0.x, v1.x, v2.x));
    const maxX = Math.ceil(Math.max(v0.x, v1.x, v2.x));
    const minY = Math.floor(Math.min(v0.y, v1.y, v2.y));
    const maxY = Math.ceil(Math.max(v0.y, v1.y, v2.y));

    // Loop through all pixels in the bounding box
    for (let y = minY; y <= maxY; y++) {
        for (let x = minX; x <= maxX; x++) {
            // Compute barycentric coordinates for the pixel
            const { u, v, w } = barycentric({x, y}, v0, v1, v2)

            // Check if the pixel is inside the triangle
            if (u >= 0 && v >= 0 && w >= 0) {

                // TODO: This is witchcraft you don't yet understand
                const depth = (u * v0.z) + (v * v1.z) + (w * v2.z);

                if (depth < depthBuffer[x][y]) {
                    depthBuffer[x][y] = depth;

                    // Interpolate the UV coordinates using the barycentric weights
                    const interpolatedUV = new THREE.Vector2(
                        (u * uv0.x + v * uv1.x + w * uv2.x), // TODO: This is inverted...?
                        1 - (u * uv0.y + v * uv1.y + w * uv2.y) // No, this is inverted...
                    );

                    // Sample the texture using the interpolated UV coordinates
                    const textureColor = sampleTexture(rawImageData, rawImageData.width, rawImageData.height, interpolatedUV);

                    let index = (y * canvas.width + x) * 4;
                    frameBuffer[index] = textureColor.r;
                    frameBuffer[index + 1] = textureColor.g;
                    frameBuffer[index + 2] = textureColor.b;
                    frameBuffer[index + 3] = textureColor.a;

                    // renderPixel(ctx, textureColor, x, y)
                }
            }
        }
    }
}

function renderFrameBuffer(ctx) {
    let imageData = ctx.createImageData(canvas.width, canvas.height) // Match the number of pixels in the frame buffer
    imageData.data.set(frameBuffer);
    ctx.putImageData(imageData, 0, 0);
}

// https://gamedev.stackexchange.com/a/23745
function barycentric(p, a, b, c) {
    // Compute vectors
    let v0 = subtract(b, a);
    let v1 = subtract(c, a);
    let v2 = subtract(p, a);

    // Compute dot products
    let d00 = dot(v0, v0);
    let d01 = dot(v0, v1);
    let d11 = dot(v1, v1);
    let d20 = dot(v2, v0);
    let d21 = dot(v2, v1);

    // Compute barycentric coordinates
    let denom = d00 * d11 - d01 * d01;
    let v = (d11 * d20 - d01 * d21) / denom;
    let w = (d00 * d21 - d01 * d20) / denom;
    let u = 1.0 - v - w;

    return { u, v, w };
}

// Helper functions for vector operations
function subtract(v1, v2) {
    return { x: v1.x - v2.x, y: v1.y - v2.y };
}

function dot(v1, v2) {
    return v1.x * v2.x + v1.y * v2.y;
}

function sampleTexture(textureData, texWidth, texHeight, uv) {
    // Convert UV coordinates (0 to 1) into pixel coordinates
    const x = Math.floor(uv.x * texWidth);
    const y = Math.floor(uv.y * texHeight);

    // Clamp the coordinates to ensure they are within bounds (optional)
    const clampedX = Math.max(0, Math.min(texWidth - 1, x));
    const clampedY = Math.max(0, Math.min(texHeight - 1, y));

    // Calculate the index in the pixel array (4 values per pixel: RGBA)
    const index = (clampedY * texWidth + clampedX) * 4;

    // Extract the RGBA values
    const r = textureData.data[index];
    const g = textureData.data[index + 1];
    const b = textureData.data[index + 2];
    const a = textureData.data[index + 3];

    return { r, g, b, a };
}

loadImageData("models/basketball_d.png")
// loadImageData("models/uv_checker.jpg")

// loadObj("models/basketball_triangulated.obj", renderWireframe);
loadObj("models/basketball_triangulated.obj", renderWithTexture);
