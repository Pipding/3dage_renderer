import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

// Always seem to need 3 things; renderer, scene and camera

// Renderer
const renderer = new THREE.WebGLRenderer();
renderer.setSize( window.innerWidth, window.innerHeight );
document.body.appendChild( renderer.domElement );

// Camera
const camera = new THREE.PerspectiveCamera( 75, window.innerWidth / window.innerHeight, 0.1, 1000 );
camera.position.set( 0, 0, 100 );
camera.lookAt( 0, 0, 0 );

// Scene
const scene = new THREE.Scene();

// Create a material for lines
const material = new THREE.LineBasicMaterial( { color: 0x0000ff } );

const ambientLight = new THREE.AmbientLight( 0x404040 ); // soft white light
scene.add( ambientLight );

const light = new THREE.DirectionalLight( 0xffffff, 1 ); // white light
light.position.set( 10, 10, 10 ); // position the light
scene.add( light );


// BASKETBALL
const loader = new GLTFLoader();

let basketball

loader.load( './models/basketball.glb', function ( gltf ) {
    gltf.scene.scale.set(10, 10, 10); 
    basketball = gltf.scene
	scene.add( basketball );
}, undefined, function ( error ) {
	console.error( error );
} );

function animate() {
    if (basketball) {
        basketball.rotation.x += 0.07;
	    basketball.rotation.y += 0.07;
    }    

	renderer.render( scene, camera );
}

renderer.setAnimationLoop( animate );