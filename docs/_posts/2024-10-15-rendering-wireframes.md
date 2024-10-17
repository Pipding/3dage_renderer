---
layout: post
title: "Bare wire(frame)s"
subtitle: "First stages of implementing the software rendering, week ending 2024-10-15"
date: 2024-10-15 18:00:00
background: '/assets/images/2024_10_15_wireframe_rotate.gif'
author: "Ryan"
---

Two weeks ago I started working with Three.js and used it to render a spinning basketball. In case you need a refresher, here's what that looked like.
<br>
<p style="text-align: center;">
  <img src="{{ "/assets/images/2024_10_01_rendered_basketball.gif" | relative_url }}" alt="An animation of a rotating basketball rendered through three.js" style="max-width: 100%; height: auto;">
</p>

Here's what it looks like now, after two weeks of work:
<br>
<p style="text-align: center;">
  <img src="{{ "/assets/images/2024_10_15_wireframe_rotate.gif" | relative_url }}" alt="An animated gif featuring a rotating wireframe of a sphere." style="max-width: 100%; height: auto;">
</p>

Ok, visually there's been a significant downgrade. But that's because I'm now using my own rendering code instead of using the inbuilt Three.js renderer. Let's dive into everything it took to get from a black screen to this spinning wireframe!

# Getting the vertex data
The first thing we need is data. We can't draw a mesh to the screen if we don't know where all of its vertices are. Immediately we need to make a change from the Three.js implementation. If you've followed the [Three.js "Getting Started" documentation](https://threejs.org/docs/#manual/en/introduction/Loading-3D-models) you may remember that Three.js works nicely with `glTF` and `glb` files. These file formats have their strengths, but neither is particularly useful to me because I can't easily parse vertex data from them. As a result, I need to go back to Blender and re-export the model using a simpler file format, `obj`.
> **Note:** As I write this it occurs to me that I likely could've used the built-in model loading functions of Three.js to pull vertex data out of the `glb` file. I'll have to try this at a later date.

While I had Blender open there was one other change I made. for the beginning of this project, I've been following a tutorial by YouTube user [thebennybox](https://www.youtube.com/@thebennybox) on how to create a software renderer. His tutorial is written in Java, but the fundamentals translate to any language or framework. In the 6th video of his series, [#6 3D Software Rendering Tutorial: Solid Shapes](https://youtu.be/V2vjePWZ1GI?si=g6-Ex7USrLzE4LCP&t=572), thebennybox explains that the triangle (a.k.a. the 2D simplex) is the basis for 3D rendering. That is to say all 3D shapes are rendered as a collection of triangles. There are a number of reasons given for this;
- Triangles have the fewest possible points of any solid shape
- Triangles are completely flat in 3D space
- Any arbitrary 2D shape can be defined using triangles

Now, I'm vaguely aware of a process called triangulation. This is the process whereby each face of a 3D model or mesh is broken up into triangles, usually for the purposes of rendering. At some point I'll need to implement triangulation but for now I'll cheat a bit by triangulating the mesh ahead of time. In Blender, this is as simple as pressing `Ctrl + T` or using the pictured dropdown menu.
<br>
<p style="text-align: center;">
  <img src="{{ "/assets/images/2024_10_15_triangulate_faces.png" | relative_url }}" alt="The Blender interface showing the dropdown menu with the Triangulate Faces option" style="max-width: 100%; height: auto;">
</p>

<br>

With the mesh triangulated and exported as an `obj` file, importing it into Three.js is as simple as importing the `OBJLoader` class like so:<br>
`import { OBJLoader } from 'three/addons/loaders/OBJLoader.js';`

From there, the Three.js documentation [helpfully provides a sample usage](https://threejs.org/docs/#examples/en/loaders/OBJLoader) so it's straightforward to get the model data loaded... but what next?

# Rendering something
Now we have a triangulated mesh loaded into our application. What do we do with that? A lot, as it turns out. It's difficult to know where to start with rendering so I'll start with our end goal. Our end goal is to render a mesh to the screen. The mesh is made up of triangles, so what we really want to do is render a lot of triangles to the screen. Since drawing triangles is going to be fairly important, we can create a function to do that;
<br>

```
function drawTriangle(ctx, v0, v1, v2) {
    ctx.strokeStyle = 'white'; // Line colour
    ctx.beginPath();
    ctx.moveTo(v0.x, v0.y);
    ctx.lineTo(v1.x, v1.y);
    ctx.lineTo(v2.x, v2.y);
    ctx.closePath();
    ctx.stroke();
}
```

Ok, so we can draw a triangle. How do we draw dozens or hundreds of them? Well, we simply iterate through all the vertices in the mesh, taking 3 at a time, and drawing triangles. It sounds simple and, for now, it is. When we simply iterate through all the vertices and draw them to the screen, we get a relatively convincing result.
<br>
<p style="text-align: center;">
  <img src="{{ "/assets/images/2024_10_15_just_draw_triangles.png" | relative_url }}" alt="A simple wireframe rendering of a sphere." style="max-width: 100%; height: auto;">
</p>

We're of course not done yet. See, when we render using the raw vertex data like this, we can only render the model from one angle and one perspective - the angle and perspective with which it was exported from Blender. There's also something not quite right with the vertices at the rear of the object; they're not aligned as they should be. This is because we're not accounting for perspective, we're basically doing an orthographic projection of the mesh. Let's address that next.

## Adding perspective
I implemented a `projectVertex` function. This function takes a 3D point and projects it onto a 2D plane (the screen). This function is printed in full below, and is based on the example in video 5 the software rendering video series by thebennybox on YouTube titled [#5 3D Software Rendering Tutorial: The "Magic" of Perspective](https://www.youtube.com/watch?v=D3IhkRulkFE&list=PLEETnX-uPtBUbVOok816vTl1K9vV1GgH5&index=6). This video gives a very thorough explanation of why we use the tangent of half of the camera's FOV to calculate perspective. In short, as things get closer to our eyes they appear to move closer to the centre of our vision and, conversely, as they move away they move towards the periphery of our vision. By using `tanHalfFOV` we approximate something like this shift in perspective.

It's also worth mentioning that this projection function had a number of iterations. The first iteration didn't take into account `tanHalfFOV` and simply divided by the z-value of each vertex. This can produce a decent 3D effect in certain circumstances but didn't work here. Early iterations also didn't take aspect ration into account, meaning the rendered image would squash and stretch with the window.

```
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
```

What you may notice in this function is several references to a `camera` object. We use its `position` and `fov`. That is, in fact, all we need out of a camera. Here's the entire thing:
<br>
```
const camera = {
    position: { x: 0, y: 0, z: -10 },
    fov: 45
};
```

With just 4 numbers and some maths, we're able to create a convincing 3D perspective effect. With a little extra work, we'd also be able to move the camera around and change the FOV.
<br>
With perspective added, here's the rendered mesh.
<p style="text-align: center;">
  <img src="{{ "/assets/images/2024_10_15_triangles_with_perspective.png" | relative_url }}" alt="A simple wireframe rendering of a sphere with perspective applied." style="max-width: 100%; height: auto;">
</p>

Marginally better.

## Rotation!
I wanted to make the gif for this blog post roughly similar to the one from week one, so I needed the mesh to spin. Thankfully, this wasn't too complicated. When I load the model from the `obj` file, Three.js loads it as a `Group` object. `Group` is a subclass of [Object3D](https://threejs.org/docs/index.html#api/en/core/Object3D) which means it has a field called [rotation](https://threejs.org/docs/#api/en/core/Object3D.rotation) which contains, you guessed it, data about the rotation. Specifically it contains an Euler representation of a rotation. We don't need to know what that means right now. What we need to know is that Euler rotations can be used to create a [Matrix4](https://threejs.org/docs/#api/en/math/Matrix4) (a.k.a. a 4-dimensional matrix) and that a `Matrix4` can be used to rotate vertices in 3D space.
I glossed over quite a bit there, and to some extent its because I don't have a firm grasp on the mathematics involved. But suffice it to say that a `Matrix4` can be used to apply a transformation to a vertex. That transform can, as I understand, mean position, scale or rotation. We only care about rotation right now and fortunately, Three.js abides. Creating a `Matrix4` in Three.js, assuming we have an Euler representation of the rotation, is as simple as:
<br>
```
rotationMatrix.makeRotationFromEuler(eulerRotation);
```

So in order to make the wireframe spin, I simply adjust the rotation a little bit each frame and apply the new rotation, like so;
<br>
```
mesh.rotation.x += 0.05;
mesh.rotation.y += 0.02;

var rotationMatrix = new THREE.Matrix4();
rotationMatrix.makeRotationFromEuler(child.rotation);

// Loop through the vertices
for (let i = 0; i < vertices.length; i += 9) { // 9 because there are 3 vertices per triangle, each with 3 components (x, y, z)
    let v0 = ...
    let v1 = ...
    let v2 = ...

    v0.applyMatrix4(rotationMatrix);
    v1.applyMatrix4(rotationMatrix);
    v2.applyMatrix4(rotationMatrix);

    v0 = projectVertex(v0);
    v1 = projectVertex(v1);
    v2 = projectVertex(v2);

    drawTriangle(ctx, v0, v1, v2)
}
```

And the result is...
<br>
<p style="text-align: center;">
  <img src="{{ "/assets/images/2024_10_15_wireframe_rotate.gif" | relative_url }}" alt="An animated gif featuring a rotating wireframe of a sphere." style="max-width: 100%; height: auto;">
</p>

# Summary
We've come a long way from a black screen, but there's still a long way to go. Before my software renderer is comparable to Three.js, I'll need to implement rasterization so I can add texture maps and lighting. I'll also need to implement triangulation if I want to be able to handle meshes with non-triangular geometry. But for one week I'm fairly happy with this progress.