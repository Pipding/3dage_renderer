import * as THREE from 'three';
import { OBJLoader } from 'three/addons/loaders/OBJLoader.js';

// TODO: Make the ball rotate in the same way as the three.js version

// Create .obj loader & load file
const objLoader = new OBJLoader();
let loadedObject = null;

// Source: https://threejs.org/docs/#examples/en/loaders/OBJLoader
objLoader.load('models/basketball_triangulated.obj',
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

        renderWireframe(); // Start rendering once the object is loaded
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

function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
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
        y: (translatedVertex.y/(translatedVertex.z * tanHalfFOV)) * screenHalfHeight * aspectRatio + screenHalfHeight
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
            child.rotation.x += 0.1;
            const geometry = child.geometry;
            // console.log(child) // Debug
            const vertices = geometry.attributes.position.array;

            // Loop through the vertices
            for (let i = 0; i < vertices.length; i += 9) { // 9 because there are 3 vertices per triangle, each with 3 components (x, y, z)
                const v0 = projectVertex(new THREE.Vector3(vertices[i], vertices[i + 1], vertices[i + 2]));
                const v1 = projectVertex(new THREE.Vector3(vertices[i + 3], vertices[i + 4], vertices[i + 5]));
                const v2 = projectVertex(new THREE.Vector3(vertices[i + 6], vertices[i + 7], vertices[i + 8]));

                drawTriangle(ctx, v0, v1, v2)
            }
        }
    });

    // Continue the animation loop
    requestAnimationFrame(renderWireframe);
}

renderWireframe();
