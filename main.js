import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

// Create a canvas
const canvas = document.createElement('canvas');
const ctx = canvas.getContext('2d');
document.body.appendChild(canvas);
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

// Function to project 3D vertex into 2D space
function projectVertex(vertex) {
    const fov = 1000; // Field of view factor for perspective
    const scale = fov / (fov + vertex.z); // Perspective scaling
    return {
        x: vertex.x * scale + canvas.width / 2,
        y: -vertex.y * scale + canvas.height / 2
    };
}

function drawTriangle(ctx, v0, v1, v2) {
    ctx.beginPath();
    ctx.moveTo(v0.x, v0.y);
    ctx.lineTo(v1.x, v1.y);
    ctx.lineTo(v2.x, v2.y);
    ctx.closePath();
    ctx.stroke();
}

// Define three vertices of the triangle in 3D space
const vertices = [
    { x: -50, y: -50, z: 0 },  // Vertex 1
    { x: 50, y: -50, z: 0 },   // Vertex 2
    { x: 0, y: 50, z: 0 }      // Vertex 3
];

function render() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Project the 3D vertices to 2D
    const projectedVertices = vertices.map(projectVertex);

    // Draw the triangle using the projected vertices
    drawTriangle(ctx, projectedVertices[0], projectedVertices[1], projectedVertices[2]);

    // Continue the animation loop
    requestAnimationFrame(render);
}

render();




// Always seem to need 3 things; renderer, scene and camera

// Renderer
// const renderer = new THREE.WebGLRenderer();
// renderer.setSize( window.innerWidth, window.innerHeight );
// document.body.appendChild( renderer.domElement );

// Camera
// const camera = new THREE.PerspectiveCamera( 75, window.innerWidth / window.innerHeight, 0.1, 1000 );
// camera.position.set( 0, 0, 100 );
// camera.lookAt( 0, 0, 0 );

// Scene
// const scene = new THREE.Scene();

// Create a material for lines
// const material = new THREE.LineBasicMaterial( { color: 0x0000ff } );

// const ambientLight = new THREE.AmbientLight( 0x404040 ); // soft white light
// scene.add( ambientLight );

// const light = new THREE.DirectionalLight( 0xffffff, 1 ); // white light
// light.position.set( 10, 10, 10 ); // position the light
// scene.add( light );


// BASKETBALL
// const loader = new GLTFLoader();

// let basketball

// loader.load( './models/basketball.glb', function ( gltf ) {
//     gltf.scene.scale.set(10, 10, 10); 
//     basketball = gltf.scene
// 	scene.add( basketball );
// }, undefined, function ( error ) {
// 	console.error( error );
// } );

// function animate() {
//     if (basketball) {
//         basketball.rotation.x += 0.07;
// 	    basketball.rotation.y += 0.07;
//     }    

// 	renderer.render( scene, camera );
// }

// renderer.setAnimationLoop( animate );