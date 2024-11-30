import * as THREE from 'three';
import { OBJLoader } from 'three/addons/loaders/OBJLoader.js';

const objLoader = new OBJLoader();

let loadedObject = null;

let diffuseMap = null;
let diffuseMapLoading = false;
let mesh = null;
let geometry = null;
let vertices = null;
let uvs = null; // UV coordinates
let normals = null; // Vertex normals

let depthBuffer = new Float32Array();
let depthBufferEmpty = new Float32Array();

let frameBuffer = new Uint8ClampedArray();
let frameBufferEmpty = new Uint8ClampedArray();

var rotationMatrix = new THREE.Matrix4();

// Variables for measuring framerate
let lastTime = 0;
let frameCount = 0;
let fps = 0;

// Variables for user control
let leftKeyDown = false;
let rightKeyDown = false;
let upKeyDown = false;
let downKeyDown = false;
let spaceKeyDown = false;
let mouseDown = false;
let modelRotationSpeed = new THREE.Vector2;
let inputLastTime = 0; // Used to calculate deltaTime for user inputs
let wireframeMode = true;
let uvCheckerMode = false;
let modelIndex = 0;

// Ref to next animation frame, used to cancel rendering while switching models
let nextAnimFrame = null;

const modelLibrary = {
    basketball: {
        name: "Basketball",
        obj: "models/basketball.obj",
        diffuse: "models/basketball_d.png"
    },
    ducky: {
        name: "Ducky",
        obj: "models/ducky.obj",
        diffuse: "models/ducky_d.png"
    },
    ufo: {
        name: "UFO",
        obj: "models/ufo.obj",
        diffuse: "models/ufo_d.png"
    },
    powerup: {
        name: "Powerup",
        obj: "models/powerup.obj",
        diffuse: "models/powerup_d.png"
    },
    health: {
        name: "Health",
        obj: "models/health.obj",
        diffuse: "models/health_d.png"
    },
    missile: {
        name: "Missile",
        obj: "models/missile.obj",
        diffuse: "models/missile_d.png"
    }
};

const modelList = Object.values(modelLibrary);

// Keeps track of the number of frames which have passed each second
function updateFrameRate(currentTime) {
    frameCount++;
    if (currentTime - lastTime >= 1000) {
        fps = frameCount;
        frameCount = 0;
        lastTime = currentTime;
    }
}

// This clamp function came from here: https://www.js-craft.io/blog/clamp-numbers-in-javascript/
const clamp = (val, min, max) => Math.min(Math.max(val, min), max)

function handleUserInput(currentTime) {

    const rotationAccelerationFactor = 5;
    const rotationDecayFactor = 3;

    const zoomInAccelerationFactor = 3;
    const zoomOutAccelerationFactor = 5;

    const deltaTime = (currentTime - inputLastTime) / 1000;
    if (!deltaTime) return; // DeltaTime is NaN for first frame or two

    // Handle model rotation first
    if (leftKeyDown) {
        modelRotationSpeed.y += (rotationAccelerationFactor * deltaTime);
    }
    if (rightKeyDown) {
        modelRotationSpeed.y -= (rotationAccelerationFactor * deltaTime);
    }

    if (upKeyDown) {
        modelRotationSpeed.x -= (rotationAccelerationFactor * deltaTime);
    }
    if (downKeyDown) {
        modelRotationSpeed.x += (rotationAccelerationFactor * deltaTime);
    }

    modelRotationSpeed.x = clamp(modelRotationSpeed.x, -10, 10);
    modelRotationSpeed.y = clamp(modelRotationSpeed.y, -10, 10);

    // Decay speed if buttons aren't pressed
    if (!leftKeyDown && !rightKeyDown && Math.abs(modelRotationSpeed.y) > 0) {
        modelRotationSpeed.y -= modelRotationSpeed.y * (rotationDecayFactor * deltaTime);
        if (Math.abs(modelRotationSpeed.y) <= 0.05) {
            modelRotationSpeed.y = 0;
        }
    }

    if (!upKeyDown && !downKeyDown && Math.abs(modelRotationSpeed.x) > 0) {
        modelRotationSpeed.x -= modelRotationSpeed.x * (rotationDecayFactor * deltaTime);
        if (Math.abs(modelRotationSpeed.x) <= 0.05) {
            modelRotationSpeed.x = 0;
        }
    }

    doRotateWorldSpace(modelRotationSpeed.x, modelRotationSpeed.y, 0);

    // Handle zooming in and out
    if(mouseDown) {
        camera.position.z += (zoomInAccelerationFactor * deltaTime);
    } else {
        camera.position.z -= (zoomOutAccelerationFactor * deltaTime);
    }
    camera.position.z = clamp(camera.position.z, -10, -6)

    inputLastTime = currentTime;
}

// Draws framerate and resolution information on teh screen
function drawInfo() {
    const text = `Canvas: ${canvas.width}x${canvas.height}, FPS: ${fps}`;
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)'; // Semi-transparent background
    ctx.fillRect(canvas.width - 260, 10, 250, 30); // Background rectangle for the text

    ctx.fillStyle = 'white';
    ctx.font = '16px Arial';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'top';
    ctx.fillText(text, canvas.width - 10, 15); // Position of the text
}

function drawControls() {
    const rotationControlText = `Rotate model: Arrow keys or WASD`;
    const zoomControlText = `Zoom: Mouse Click`;
    const wireframeControlText = `Toggle wireframe: Q`;
    const uvCheckerControlText = `Toggle UV checker material: E`;
    const toggleModelControlText = `Change model to ${modelList[(modelIndex + 1) % modelList.length].name}: Spacebar`;
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)'; // Semi-transparent background
    ctx.fillRect(canvas.width - 300, canvas.height - 60, 500, 60); // Background rectangle for the text

    ctx.fillStyle = 'white';
    ctx.font = '16px Arial';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'top';
    ctx.fillText(wireframeControlText, canvas.width - 30, canvas.height - 150); // Position of the text
    ctx.fillText(uvCheckerControlText, canvas.width - 30, canvas.height - 120); // Position of the text
    ctx.fillText(zoomControlText, canvas.width - 30, canvas.height - 90); // Position of the text
    ctx.fillText(rotationControlText, canvas.width - 30, canvas.height - 60); // Position of the text
    ctx.fillText(toggleModelControlText, canvas.width - 30, canvas.height - 30); // Position of the text
}

function drawModelName() {
    const modelNameText = `${modelList[(modelIndex) % modelList.length].name}`;
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)'; // Semi-transparent background
    ctx.fillRect(0, 10, 250, 30); // Background rectangle for the text

    ctx.fillStyle = 'white';
    ctx.font = '16px Arial';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(modelNameText, 10, 10); // Position of the text
}

// Loads a diffuse map
function loadDiffuseMap(url) {
    diffuseMapLoading = true;
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
        diffuseMap = ({
            data: imageData.data, // Raw pixel data (Uint8ClampedArray)
            width: image.width,
            height: image.height
        });

        diffuseMapLoading = false;
    };
}

function loadObj(filePath, callback) {
    // Note: THREE.js always lods OBJ files as non-indexed. If you want indexed verts, you
    // need to call BufferGeometryUtils.mergeVertices: https://threejs.org/docs/index.html#examples/en/utils/BufferGeometryUtils.mergeVertices

    cancelAnimationFrame(nextAnimFrame);

    console.log(`Loading ${filePath}`);

    // Source for the loading code: https://threejs.org/docs/#examples/en/loaders/OBJLoader
    objLoader.load(filePath,
        // called when resource is loaded
        function ( object ) {
            loadedObject = object;
            callback()
        },
        // called when loading is in progress
        function ( xhr ) {
            console.log('OBJ file ' + ( xhr.loaded / xhr.total * 100 ) + '% loaded' );
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
    frameBufferEmpty = new Uint8ClampedArray(canvas.width * canvas.height * 4);
    // Fill the empty frame buffer with black pixels
    for (let i = 0; i < frameBufferEmpty.length; i += 4) {
        frameBufferEmpty[i] = 0;
        frameBufferEmpty[i + 1] = 0;
        frameBufferEmpty[i + 2] = 0;
        frameBufferEmpty[i + 3] = 255;
    }

    depthBuffer = new Float32Array(canvas.width * canvas.height);
    depthBufferEmpty = new Float32Array(canvas.width * canvas.height);
    depthBufferEmpty.fill(Infinity)
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

// Set up a light
const lightDirection = new THREE.Vector3(0, -10, -10).normalize();
const lightColour = new THREE.Color(0, 0, 0);

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

function render(currentTime) {
    if (wireframeMode) {
        renderWireframe(currentTime);
    } else {
        renderWithTexture(currentTime);
    }
}

// Function to render the wireframe
function renderWireframe(currentTime) {
    if (!loadedObject) return;
    if (!mesh) {
        loadedObject.traverse((child) => {
            if (child.isMesh) {
                mesh = child;
                geometry = mesh.geometry;
                vertices = geometry.attributes.position.array;
                uvs = geometry.attributes.uv.array; // UV coordinates
                normals = geometry.attributes.normal.array; // Vertex normals
            }
        });
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "black";
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    updateFrameRate(currentTime);
    handleUserInput(currentTime);

    if (mesh.rotationNeedsUpdate) {
        rotationMatrix.makeRotationFromEuler(mesh.rotation);
        mesh.rotationNeedsUpdate = false;
    }

    // Transform and project all vertices
    const transformedVertices = [];
    const transformedNormals = [];
    const projectedVertices = [];
    let tempV0 = new THREE.Vector3;
    for (let i = 0; i < vertices.length; i += 3) {
        tempV0.set(vertices[i], vertices[i + 1], vertices[i + 2]).applyMatrix4(rotationMatrix);
        transformedVertices[i / 3] = tempV0.clone();
        projectedVertices[i / 3] = projectVertex(tempV0);
        tempV0.set(normals[i], normals[i + 1], normals[i + 2]).applyMatrix4(rotationMatrix);
        transformedNormals[i / 3] = tempV0.clone();
    }

    // Loop through the vertices
    for (let i = 0; i < vertices.length; i += 9) { // 9 because there are 3 vertices per triangle, each with 3 components (x, y, z)
        let v0 = projectedVertices[(i/3)];
        let v1 = projectedVertices[(i/3) + 1];
        let v2 = projectedVertices[(i/3) + 2];

        drawTriangle(ctx, v0, v1, v2);
    }

    drawInfo();
    drawControls();
    drawModelName();

    // Stop drawing if the loaded object is null
    if (!loadedObject) return;

    // Continue the animation loop
    if (wireframeMode) {
        nextAnimFrame = requestAnimationFrame(renderWireframe);
    } else {
        nextAnimFrame = requestAnimationFrame(renderWithTexture);
    }
}

/**
 * Renders the loaded mesh with the loaded texture applied
 * @param currentTime Timestamp provided by requestAnimationFrame use to calculate elapsed time between frames
 * @returns 
 */
function renderWithTexture(currentTime) {
    if (!loadedObject || !diffuseMap) return;
    if (!mesh) {
        loadedObject.traverse((child) => {
            if (child.isMesh) {
                mesh = child;
                geometry = mesh.geometry;
                vertices = geometry.attributes.position.array;
                uvs = geometry.attributes.uv.array; // UV coordinates
                normals = geometry.attributes.normal.array; // Vertex normals
            }
        });
    }

    // Clear the canvas to black
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "black";
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    updateFrameRate(currentTime);
    handleUserInput(currentTime);

    if (mesh.rotationNeedsUpdate) {
        rotationMatrix.makeRotationFromEuler(mesh.rotation);
        mesh.rotationNeedsUpdate = false;
    }

    // Transform and project all vertices
    const transformedVertices = [];
    const transformedNormals = [];
    const projectedVertices = [];
    let tempV0 = new THREE.Vector3;
    for (let i = 0; i < vertices.length; i += 3) {
        tempV0.set(vertices[i], vertices[i + 1], vertices[i + 2]).applyMatrix4(rotationMatrix);
        transformedVertices[i / 3] = tempV0.clone();
        projectedVertices[i / 3] = projectVertex(tempV0);
        tempV0.set(normals[i], normals[i + 1], normals[i + 2]).applyMatrix4(rotationMatrix);
        transformedNormals[i / 3] = tempV0.clone();
    }

    depthBuffer.set(depthBufferEmpty);
    frameBuffer.set(frameBufferEmpty);

    // Draw triangles
    for (let i = 0; i < vertices.length; i += 9) { // 9 because there are 3 vertices per triangle, each with 3 components (x, y, z)
        let v0 = transformedVertices[(i/3)];
        let v1 = transformedVertices[(i/3) + 1];
        let v2 = transformedVertices[(i/3) + 2];

        // Dividing by 3 and multiplying by 2 in UV lookup because UVs have only 2 elements
        const uv0 = { x: uvs[i/3 * 2], y: uvs[i/3 * 2 + 1] };
        const uv1 = { x: uvs[(i/3 + 1) * 2], y: uvs[(i/3 + 1) * 2 + 1] };
        const uv2 = { x: uvs[(i/3 + 2) * 2], y: uvs[(i/3 + 2) * 2 + 1] };

        // https://en.wikipedia.org/wiki/Back-face_culling
        // Backface culling... can we get away without drawing this triangle?
        // The answer is yes if:
        // The dot product of the surace normal of this triangle and the camera-to-triangle vector is 0 or more
        // the surface normal of a triangle is the same as the normal of any of its verts (I think)
        let triangleSurfaceNormal = new THREE.Vector3(normals[i], normals[i + 1], normals[i + 2]).applyMatrix4(rotationMatrix);

        let cameraToTriangle = v0.sub(camera.position).dot(triangleSurfaceNormal);
        if (cameraToTriangle >= 1) {
            continue;
        }

        rasterizeTriangle(
            projectedVertices[i/3], projectedVertices[(i/3) + 1], projectedVertices[(i/3) + 2], // Vertices
            uv0, uv1, uv2, // UVs
            transformedNormals[i/3], transformedNormals[(i/3) + 1], transformedNormals[(i/3) + 2]// Normals
        );
    }

    if (!diffuseMapLoading) {
        renderFrameBuffer(ctx)
    }

    drawInfo();
    drawControls();
    drawModelName();

    // Stop drawing if the loaded object is null 
    if (!loadedObject) return;

    // Continue the animation loop
    if (wireframeMode) {
        nextAnimFrame = requestAnimationFrame(renderWireframe);
    } else {
        nextAnimFrame = requestAnimationFrame(renderWithTexture);
    }
}

function rasterizeTriangle(v0, v1, v2, uv0, uv1, uv2, normal0, normal1, normal2) {
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
            // u, v and w are basically scalar values. When dealing with vertex-specific
            // data, we can multiple v0 by u, v1 by v and v2 by w to get interpolated 
            // values for the pixel we're currently dealing with
            const { u, v, w } = barycentric({x, y}, v0, v1, v2)

            // Skip this pixel if it is not inside the triangle
            if ( u < 0 || v < 0 || w < 0) {
                continue;
            }

            // Calculate the depth of this pixel by weighting each of the vertices using 
            // u, v and w and then adding the results together.
            const depth = (u * v0.z) + (v * v1.z) + (w * v2.z);
            const depthBufferIndex = (x * canvas.height) + y;

            if (depth < depthBuffer[depthBufferIndex]) {
                depthBuffer[depthBufferIndex] = depth;

                // Interpolate the UV coordinates using the barycentric weights
                const interpolatedUV = new THREE.Vector2(
                    (u * uv0.x + v * uv1.x + w * uv2.x), // TODO: This is inverted...?
                    1 - (u * uv0.y + v * uv1.y + w * uv2.y) // No, this is inverted...
                );

                // Sample the texture using the interpolated UV coordinates
                const textureColour = sampleTexture(diffuseMap, diffuseMap.width, diffuseMap.height, interpolatedUV);

                const interpolatedNormal = new THREE.Vector3(
                    (u * normal0.x + v * normal1.x + w * normal2.x),
                    (u * normal0.y + v * normal1.y + w * normal2.y),
                    (u * normal0.z + v * normal1.z + w * normal2.z)
                );

                // Here we compute the diffuse factor, i.e. how much light this pixel reflects. This is a simplified version 
                // of the formula found here: https://www.scratchapixel.com/lessons/3d-basic-rendering/introduction-to-shading/diffuse-lambertian-shading.html
                // that being "Diffuse Surface Color = Incident Light Energy . N . L."
                // In this simplification we're ignoring light intensity because the light has uniform intensity. This leaves just N (the interpolated surface normal)
                // and L (the normalized light direction)
                const diffuse = Math.max(interpolatedNormal.dot(lightDirection), 0);

                // We're basically only implementing the Lambertian illumination model, not Phong shading, because we ignore the specular element.
                // We are assuming ambient is a constant though, so it's like 2/3 Phong? https://stackoverflow.com/a/15802920

                // As ever, inlining this calculation improves performance over calculating things separately
                const finalColour = {
                    r: lightColour.r + textureColour.r * diffuse,
                    g: lightColour.g + textureColour.g * diffuse,
                    b: lightColour.b + textureColour.b * diffuse
                }

                let index = (y * canvas.width + x) * 4;
                frameBuffer[index] = finalColour.r;
                frameBuffer[index + 1] = finalColour.g;
                frameBuffer[index + 2] = finalColour.b;
                frameBuffer[index + 3] = 255;
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
    // In previous iterations this was abstracted to a "subtract" function
    // but inlining the subtraction gives a marginal performance boost. Anecdotally
    // in Firefox is seems to increase the average FPS by 1 or 2
    let v0 = {x: b.x - a.x, y: b.y - a.y}
    let v1 = {x: c.x - a.x, y: c.y - a.y}
    let v2 = {x: p.x - a.x, y: p.y - a.y}

    // As with subtractions, this was previously extracted to a helper function
    // but inlining it gives a marginal performance boost
    let d00 = v0.x * v0.x + v0.y * v0.y;
    let d01 = v0.x * v1.x + v0.y * v1.y;
    let d11 = v1.x * v1.x + v1.y * v1.y;
    let d20 = v2.x * v0.x + v2.y * v0.y;
    let d21 = v2.x * v1.x + v2.y * v1.y;

    // Compute barycentric coordinates
    let denom = d00 * d11 - d01 * d01;
    let v = (d11 * d20 - d01 * d21) / denom;
    let w = (d00 * d21 - d01 * d20) / denom;
    let u = 1.0 - v - w;

    return { u, v, w };
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

// The following rotation code is based on the fiddle here:
// https://jsfiddle.net/2whv0e8o/13/
// Which in turn came from StackOverflow:
// https://stackoverflow.com/questions/37903979/set-an-objects-absolute-rotation-around-the-world-axis
function toRadians(angle) {
    return angle * (Math.PI / 180);
};

function doRotateWorldSpace(rotateX, rotateY, rotateZ) {
    const x = toRadians(rotateX);
    const y = toRadians(rotateY);
    const z = toRadians(rotateZ);

    // Create quaternions for world-space rotations. The vectors given here represent
    // the world-space axes and the angles are the angles by which we want to rotate
    const quaternionX = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), x);
    const quaternionY = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), y);
    const quaternionZ = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), z);

    // Combine the rotations
    const worldQuaternion = new THREE.Quaternion()
        .multiply(quaternionX)
        .multiply(quaternionY)
        .multiply(quaternionZ);

    // Apply the quaternion rotation to the mesh in world space and update the world matrix
    mesh.applyQuaternion(worldQuaternion);
    mesh.updateMatrixWorld(true);

    // Mark rotation as dirty so it gets updated next frame
    mesh.rotationNeedsUpdate = true;
}

document.addEventListener("keydown", function onEvent(event) {
    if (event.key === "ArrowLeft" || event.key == "a") {
        leftKeyDown = true;
    }
    else if (event.key === "ArrowRight"  || event.key == "d") {
        rightKeyDown = true;
    }
    else if (event.key === "ArrowDown" || event.key == "s") {
        downKeyDown = true;
    }
    else if (event.key === "ArrowUp" || event.key == "w") {
        upKeyDown = true;
    } else if ((event.key === "spacebar" || event.key == " ") && !spaceKeyDown) {
        spaceKeyDown = true;

        modelIndex = (modelIndex + 1) % modelList.length;
        loadedObject = null;
        mesh = null;

        if (uvCheckerMode) {
            loadDiffuseMap("models/uv_checker.jpg")
        } else {
            loadDiffuseMap(modelList[modelIndex].diffuse);
        }
        loadObj(modelList[modelIndex].obj, render);
    }
});

document.addEventListener("keyup", function onEvent(event) {
    if (event.key === "ArrowLeft" || event.key == "a") {
        leftKeyDown = false;
    }
    else if (event.key === "ArrowRight" || event.key == "d") {
        rightKeyDown = false;
    }
    else if (event.key === "ArrowDown" || event.key == "s") {
        downKeyDown = false;
    }
    else if (event.key === "ArrowUp" || event.key == "w") {
        upKeyDown = false;
    } else if (event.key === "spacebar" || event.key == " ") {
        spaceKeyDown = false;
    }
});

document.addEventListener("keypress", function onEvent(event) {
    if (event.key === "q") {
        wireframeMode = !wireframeMode;
    } else if (event.key === "e") {
        uvCheckerMode = !uvCheckerMode;

        if (uvCheckerMode) {
            loadDiffuseMap("models/uv_checker.jpg")
        } else {
            loadDiffuseMap(modelList[modelIndex].diffuse);
        }
    }
});

document.addEventListener("mousedown", function onEvent(event) {
    mouseDown = true;
});

document.addEventListener("mouseup", function onEvent(event) {
    mouseDown = false;
});

loadDiffuseMap(modelList[modelIndex].diffuse);
loadObj(modelList[modelIndex].obj, render);