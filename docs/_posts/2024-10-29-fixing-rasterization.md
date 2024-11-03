---
layout: post
title: "Texture and Depth"
subtitle: "Figuring out where I went so wrong with rasterization, week ending 2024-10-29"
date: 2024-10-29 18:00:00
background: '/assets/images/2024_10_22_bad_texture.gif'
author: "Ryan"
---
Let's remind ourselves of the state of my render at the end of last week's blog post.
<br>
<p style="text-align: center;">
  <img src="{{ "/assets/images/2024_10_22_bad_texture.gif" | relative_url }}" alt="An animated image showing a rendered image of a basketball with a very glitchy appearance and half the basketball missing." style="max-width: 100%; height: auto;">
</p>

Oof. Ok, so what was wrong?

# Debugging the rasterization code
I started with basically no idea what was going on. I couldn't formulate any theories about what could be going wrong to mangle the renderer so much, but after staring at it and thinking for a while, I noticed the following symptoms;
1. Lots of triangles are being rendered black when they shouldn't be.
    - This suggests that the mesh is being loaded correctly, because the errors appear to be happening to specific triangles
2. Two large chunks of the basketball are missing on opposite sides
    - This suggests something weird is happening with the texture, rather than the rasterization code itself

So to debug this I made a very simple code change. Instead of sampling colour data from the diffuse map I just set the colour of every pixel to magenta and...
<br>
<p style="text-align: center;">
  <img src="{{ "/assets/images/2024_10_29_magenta_ball.gif" | relative_url }}" alt="An animated image showing a rendered magenta ball with a white wireframe." style="max-width: 100%; height: auto;">
</p>

The ball looks much better. The large chunks on either side are no longer there, so this does indeed suggest there's some sort of problem with sampling the texture. To get some better insight into this, I replaced the basketball texture (`basketball_d.png`) with a test texture. Test textures are a common method of debugging UV issues and I grabbed this one from [Wikipedia](https://en.wikipedia.org/wiki/UV_mapping).
<br>
<p style="text-align: center;">
  <img src="{{ "/assets/images/2024_10_29_uv_test_image.jpg" | relative_url }}" alt="An animated image showing a rendered magenta ball with a white wireframe." style="max-width: 100%; height: auto;">
</p>

When I replaced my texture with this one, here's what I saw.
<br>
<p style="text-align: center;">
  <img src="{{ "/assets/images/2024_10_29_uv_test_overdraw.gif" | relative_url }}" alt="An animated image showing a rendered ball with a test texture applied and significant glitchy visuals." style="max-width: 100%; height: auto;">
</p>

This is what's called [overdraw](https://developer.android.com/topic/performance/rendering/overdraw#:~:text=Overdraw%20refers%20to%20the%20system's,the%20cards%20in%20the%20stack.). The rasterizer is iterating through every triangle in the mesh and drawing its pixels to the screen - even if those pixels are hidden behind something else. In short, it's drawing both the front and the back of the ball at the same time. This is a problem which can be solved by introducing a depth buffer (also called a [z-buffer](https://en.wikipedia.org/wiki/Z-buffering)).

# Adding a depth buffer
Mercifully, adding a depth buffer isn't too complex.<br>
**Note:** At this point I'd like to interrupt myself to point out that the rendering code I'm writing is _very_ naive. It is neither robust nor performant, so when I say "adding a depth buffer isn't complex", I'm only talking about the most basic form of depth buffer.

### What is a depth buffer?
Simply put, whenever we draw a pixel to the screen, we're going to take a note of the distance between that pixel and the camera. This distance will be the "depth" of that pixel. If we ever try to draw something on that pixel again, we'll check the buffer to see if it has been drawn before. If it has been drawn before, we'll check whether the new thing we're trying to draw is closer to the camera than the previous one. If it is, we draw it and update the depth buffer. If not, we simply skip the draw call.

First thing's first, we create the depth buffer. The size of the buffer depends on the size of the screen we're rendering to, as we'll need one entry per pixel. We'll set the initial values to "Infinity", simulating an object drawn infinitely far away (thus anything should be closer). This depth buffer will be cleared at the start of each frame.
```
depthBuffer =  Array(canvas.width).fill().map(() => Array(canvas.width).fill(Infinity));
```
The next change comes inside the `rasterizeTriangle` function. Last week I discussed how we created a bounding box around each triangle in the mesh so we could limit the number of pixels we need to check while rasterizing. This week, we'll make a slight tweak. We'll use the `Floor` and `Ceil` functions to round the coordinates which define those bounds to the nearest whole number. We do this because the bounds will now be used as indices in the depth buffer array.
```
const minX = Math.floor(Math.min(v0.x, v1.x, v2.x));
const maxX = Math.ceil(Math.max(v0.x, v1.x, v2.x));
const minY = Math.floor(Math.min(v0.y, v1.y, v2.y));
const maxY = Math.ceil(Math.max(v0.y, v1.y, v2.y));
```

Now, to calculate the depth of a given point we'd do something like this.<br>
`const depth = (u * v0.z) + (v * v1.z) + (w * v2.z);`.<br>
<br>
But there's a problem. The triangles we're rasterizing have already been projected into screen space, meaning they're 2-dimensional and therefore don't have a depth (`z`) component! Cauchemar!
<br>
Thankfully there's a simple fix. If we go back to our `projectVertex` function, the X and Y coordinates of the projected triangles were defined like this.

```
function projectVertex(vertex) {
    ...

    const translatedVertex = {
        x: vertex.x - camera.position.x,
        y: vertex.y - camera.position.y
    };

    return {
        x: (translatedVertex.x/(translatedVertex.z * tanHalfFOV)) * screenHalfWidth + screenHalfWidth,
        y: (translatedVertex.y/(translatedVertex.z * tanHalfFOV)) * screenHalfHeight * aspectRatio + screenHalfHeight
    };
}
```
<br>
All we need to do, then, is retain the Z coordinate like this.

```
function projectVertex(vertex) {

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
```
<br>
We don't even need to calculate perspective for the Z coordinate because it doesn't have any impact on the rendered image, it'll only be used for depth calculation. With the z coordinate now included in our projected vertices, we can use it to calculate pixel depth and update the depth buffer.

```
function rasterizeTriangle(ctx, v0, v1, v2, uv0, uv1, uv2) {
    ...

    // Loop through all pixels in the bounding box
    for (let y = minY; y <= maxY; y++) {
        for (let x = minX; x <= maxX; x++) {
            // Calculate the depth of the pixel
            const depth = (u * v0.z) + (v * v1.z) + (w * v2.z);

            // Check if the pixel in 3D space we're trying to draw is 
            // closer to the camera than any previous pixel
            if (depth < depthBuffer[x][y]) {
                depthBuffer[x][y] = depth; // Update the depth buffer
                // ...
            }
        }
    }
}
```

After implementing this simple(-ish) change, here's what we see.
<br>
<p style="text-align: center;">
  <img src="{{ "/assets/images/2024_10_29_rasterized_with_depth.gif" | relative_url }}" alt="An animated image showing a rendered ball with a test texture applied correctly." style="max-width: 100%; height: auto;">
</p>

The framerate is still abysmal but it's a great improvement in terms of UV. So, if we go back to our basketball texture we'll see...
<br>
<p style="text-align: center;">
  <img src="{{ "/assets/images/2024_10_29_basketball_missing_chunks.gif" | relative_url }}" alt="An animated image showing a rendered basketball with squares missing from the texture on two sides." style="max-width: 100%; height: auto;">
</p>
We've solved one of the problems, but there are still chunks of texture missing on either side.

## Investigating the missing chunks
There's a significant clue in the previous stage about what could be going wrong here. As part of debugging all those weird triangles, we changed the texture sampling code to render a solid colour, which resulted in a properly rendered sphere. Then, we applied the test pattern which rendered correctly. This suggests there's a problem with our texture. Actually, though... if we look at the rendered test pattern there's something unusual about it.
<br>
<p style="text-align: center;">
  <img src="{{ "/assets/images/2024_10_29_rasterized_with_depth.gif" | relative_url }}" alt="An animated image showing a rendered ball with a test texture applied correctly." style="max-width: 100%; height: auto;">
</p>
The text is back-to-front and upside-down. This suggests our texture data is somehow being read or applied backwards. Now to be honest, I don't yet understand what's causing this problem - that will be a problem to investigate over the coming week. What I do know though is that we can invert the texture data very easily. UV coordinates are normalised, meaning they're all given in the range 0 -> 1. This means if you want to flip UVs, all you have to do is subtract the UV coordinate from 1. Imagine having a coordinate `(0.2, 0.2)`. What's the opposite of that? `(1  - 0.2, 1 - 0.2)` or `(0.8, 0.8)`. In code, here's how we do it.

```
const interpolatedUV = new THREE.Vector2(
    (u * uv0.x + v * uv1.x + w * uv2.x),
    (u * uv0.y + v * uv1.y + w * uv2.y)
);
```

becomes

```
const interpolatedUV = new THREE.Vector2(
    (u * uv0.x + v * uv1.x + w * uv2.x),
    1 - (u * uv0.y + v * uv1.y + w * uv2.y)
);
```

And with this simple inversion, we're rasterizing correctly.
<br>
<p style="text-align: center;">
  <img src="{{ "/assets/images/2024_10_29_rasterized_basketball.gif" | relative_url }}" alt="An animated image showing a rendered ball with a correctly-applied diffuse map." style="max-width: 100%; height: auto;">
</p>