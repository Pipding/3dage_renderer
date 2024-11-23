---
layout: post
title: "A Boost in Performance"
subtitle: "Refusing to deal with such a low framerate, week ending 2024-11-05"
date: 2024-11-05 18:00:00
background: '/assets/images/2024_11_05_post_optimisation_render.gif'
author: "Ryan"
---
Time to come clean. Some of the images I showed in my previous blog post weren't 100% accurate. When I presented this...
<br>
<p style="text-align: center;">
  <img src="{{ "/assets/images/2024_10_29_rasterized_basketball.gif" | relative_url }}" alt="An animated image showing a rendered ball rotating at roughly 20fps." style="max-width: 100%; height: auto;">
</p>

... I was engaging in a bit of a lie by omission. What I didn't mention is that the recording was sped-up. In reality, the performance of my renderer varies significantly depending on the resolution of the render target (i.e. the web browser). At 500x500 pixels we can get a respectable 60 FPS.
<br>
<p style="text-align: center;">
  <img src="{{ "/assets/images/2024_11_05_pre_opt_small_render.gif" | relative_url }}" alt="An animated image showing a basketball rendered in a 500 x 500 pixel window at 60 frames per second" style="max-width: 100%; height: auto;">
</p>

But when we get to a resolution like 1920x1080, the framerate drops to single-digits.
<br>
<p style="text-align: center;">
  <img src="{{ "/assets/images/2024_11_05_pre_opt_big_render.gif" | relative_url }}" alt="An animated image showing a basketball rendered in a 1920 x 1080 pixel window at roughly 8 frames per second" style="max-width: 100%; height: auto;">
</p>

This is a bit of a killer for a few reasons. For one, I'd like other people to be able to play and interact with this renderer, so such a low framerate creates a bad user experience. It also indicates that the renderer is using a lot of resources, which will limit its performance even further on lower-spec hardware. Additionally, dealing with such a low framerate makes it more difficult for me to develop the renderer. I want to see my changes reflected quickly and smoothly, not in this super-low framerate with my CPU fan working overtime. So this week I'm going to try some optimisations.

# How I decide what to optimise
There's a lot going on in the rendering code and it can be difficult to know what to optimise first. That's why we use profiling tools. Mozilla Firefox provides a very handy profiling interface. With this I'm able to quickly see where my code is spending its time.
<br>
<p style="text-align: center;">
  <img src="{{ "/assets/images/2024_11_05_firefox_profiler_start.PNG" | relative_url }}" alt="A screenshot of the Profiler window in Firefox, showing that the renderPixel function is using a lot of resources" style="max-width: 100%; height: auto;">
</p>

If the image above is utterly confusing, don't worry - it isn't as complicated as it looks. Basically, along the left side we see a bunch of percentages. This roughly shows how much time each thing takes - and the things are nested. So at the top we have `RefreshDriverTick`, which takes 100% of the processing power available. That's because it's the "parent" of all the other tasks inside it. We can look down the list and see which of its "child" processes are using significant chunks of processing power. So, within `RefreshDriverTick`, `renderWithTexture` takes 98% of the processing power. Within `renderWithTexture`, `rasterizeTriangle` takes up the majority of the time (86%) and so on. This way we can identify which parts of the code to optimise. I just look for things that are using a lot of power, and I try to improve them. The first optimisation target I see is the `renderPixel` function, which takes up a whopping 40% of each frame.

# Adding a Frame Buffer
One of the reasons the `renderPixel` function takes up 40% of each frame is because it's called once for each pixel. That's a lot of draw calls, and it's very wasteful. Drawing something on the screen has a cost, so we want to do it as infrequently as possible. One way to do this is to use something called a frame buffer. A frame buffer is really just an array where we store data about pixels. Currently when we rasterize an image we run calculations to determine what colour each pixel should be. As soon as we've run this calculation we draw the pixel. What we're going to do instead is save that information to an array. Then, when we've calculated all the pixel information for the frame, we'll draw it all at once. This will reduce the number of draw calls per frame to 1, which should speed things up. In practice, the code change we make looks something like this. 

**Before**
```
function renderPixel(ctx, textureColor, x, y) {
    ctx.fillStyle = "rgba("+textureColor.r+","+textureColor.g+","+textureColor.b+","+(textureColor.a/255)+")";
    ctx.fillRect( x, y, 1, 1 );
}

const textureColor = sampleTexture(rawImageData, rawImageData.width, rawImageData.height, interpolatedUV);
renderPixel(ctx, textureColor, x, y)
```

**After**
```
let frameBuffer = new Uint8ClampedArray(canvas.width * canvas.height * 4); // Multiplied by 4 for (r,g, b, a)

function renderFrameBuffer(ctx) {
    let imageData = ctx.createImageData(canvas.width, canvas.height) // Match the number of pixels in the frame buffer
    imageData.data.set(frameBuffer);
    ctx.putImageData(imageData, 0, 0);
}

// For each pixel
const textureColor = sampleTexture(rawImageData, rawImageData.width, rawImageData.height, interpolatedUV);

let index = (y * canvas.width + x) * 4;
frameBuffer[index] = textureColor.r;
frameBuffer[index + 1] = textureColor.g;
frameBuffer[index + 2] = textureColor.b;
frameBuffer[index + 3] = textureColor.a;

// After all pixels are calculated
renderFrameBuffer(ctx)
```

After making this change, here's the difference we see in the profiler. `renderPixel`, which was using 40% of our resources, is gone and in its place we have `renderFrameBuffer` which uses only 6.2%.
<br>
<p style="text-align: center;">
  <img src="{{ "/assets/images/2024_11_05_firefox_profiler_frame_buffer.PNG" | relative_url }}" alt="A screenshot of the Profiler window in Firefox. The renderPixel function has been replaced with a renderFrameBuffer function which uses 34% less CPU" style="max-width: 100%; height: auto;">
</p>

# Tackling computeBarycentric
The next resource hog identified by the profiler is the `computeBarycentric` function, which is using up 47% of our resources. It's worth noting that these percentages will change as we make things more efficient. In the first iteration, `renderPixel` was using 40% of our resources so it might seem odd that `computeBarycentric` is using 47% now. But that's because our resource allocation has changed now that `renderPixel` isn't so intensive.
Anyway, back to `computeBarycentric`. This, thankfully, is a question which has been solved for us. A Google search led me to a [post on gamedev.stackexchange.com](https://gamedev.stackexchange.com/questions/23743/whats-the-most-efficient-way-to-find-barycentric-coordinates/23745#23745) where someone has helpfully transcribed a function from Christer Ericson's [Real-Time Collision Detection](http://realtimecollisiondetection.net/). I simply translated this function into Javascript and replaced my own `computeBarycentric` function with the new `barycentric` function.

**Before**
```
function computeBarycentric(x, y, v0, v1, v2) {
    // Calculate the area of the full triangle using a cross product
    const area = edgeFunction(v0, v1, v2);
    // Calculate the sub-area of the triangle formed with the point (x, y) and the triangle's vertices
    const u = edgeFunction({x, y}, v1, v2) / area;  // Area of triangle (P, v1, v2)
    const v = edgeFunction({x, y}, v2, v0) / area;  // Area of triangle (P, v2, v0)
    const w = edgeFunction({x, y}, v0, v1) / area;  // Area of triangle (P, v0, v1)
    return { u, v, w }; // Barycentric coordinates
}
```

**After**
```
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
```

The result is a drop in the resources used to calculate barycentric coordinates from 47% down to 27%.
<br>
<p style="text-align: center;">
  <img src="{{ "/assets/images/2024_11_05_firefox_profiler_compute_barycentric.PNG" | relative_url }}" alt="A screenshot of the Profiler window in Firefox. The computeBarycentric function has been replaced with a function called barycentric which uses 20% fewer resources" style="max-width: 100%; height: auto;">
</p>

# map
The next optimisation is different from the previous two because it isn't a function I've written. This entry called `map` seems to be taking a quarter of the resources. What is that?
<br>
<p style="text-align: center;">
  <img src="{{ "/assets/images/2024_11_05_firefox_profiler_map.PNG" | relative_url }}" alt="A screenshot of the Profiler window in Firefox. An entry called map seems to be using 25% of resources" style="max-width: 100%; height: auto;">
</p>

Well, it's mostly the [depth buffer I implemented a few weeks ago](https://pipding.github.io/3dage_renderer/2024/10/29/fixing-rasterization.html). For humans, it's often convenient to represent pixels on a screen using a nested array, or a map. This is because we can reference specific pixels in an intuitive way, e.g. we can quickly reference the pixel with coordiantes [50, 100] like this: `depthBuffer[50][100]`. While this is intuitive for humans, it isn't efficient for computers. For a computer it's much simpler to have one long array with all the pixel information. Here's how we get rid of the `depthBuffer` map and replace it with a flat array.
<br>
First, when we initialise the depthBuffer we'll make it a flat array

**Before**
```
let depthBuffer = [];
depthBuffer =  Array(canvas.width).fill().map(() => Array(canvas.width).fill(Infinity));
```

**After**
```
let depthBuffer = new Float32Array();
depthBuffer = new Float32Array(canvas.width * canvas.height);
depthBuffer.fill(Infinity);
```

Then, whenever we need to add something to the `depthBuffer` we'll just need to calculate the index ourselves.

**Before**
```
if (depth < depthBuffer[x][y]) {
  depthBuffer[x][y] = depth;
}
```
**After**
```
const depthBufferIndex = (x * canvas.height) + y;

if (depth < depthBuffer[depthBufferIndex]) {
  depthBuffer[depthBufferIndex] = depth;
}
```

After this relatively small change, the `map` calls are gone, freeing up 25% of our resources.
<br>
<p style="text-align: center;">
  <img src="{{ "/assets/images/2024_11_05_firefox_profiler_flat_array.PNG" | relative_url }}" alt="A screenshot of the Profiler window in Firefox. The entry called map is gone." style="max-width: 100%; height: auto;">
</p>

# Backface culling
This last optimisation didn't actually come from the profiler, it came from my girlfriend who [happens to be a 3D artist](https://kamilaskopinska.com/). After seeing the renderer she offhandedly asked if I had implemented backface culling. I hadn't, but it made sense.
If you're not familiar, backface culling basically means "Don't render polygons if they're not facing the camera". For example, if you're rendering an image of the front of a building, you don't need to render the polygons on the back of the building because you can't see them. I normally wouldn't reference Wikipedia, but in this case the [Wikipedia article for backface culling](https://en.wikipedia.org/wiki/Back-face_culling) has a simple method for implementing backface culling. Something along the lines of `(V0 - P) . N >= 0`. What?
<br>
Here's what that means in layman's terms. Draw an imaginary line from the polygon to the camera. Calculate the [dot product](https://en.wikipedia.org/wiki/Dot_product) of that imaginary line with the normal vector of the polygon (you don't need to know what a dot product is, don't worry). If the dot product is greater than or equal to 0, the polygon is facing away from the camera and we can skip drawing it.

You don't need to know what a Dot product is because Three.js provides a method to calculate it for us. But if you have an interest in low-level 3D stuff you'll benefit from at least knowing what a Dot product can do, even if you don't understand the underlying maths. It's one of two very useful operations (the other being the Cross product) that we can perform on vectors. Here's how we use the built-in Three.js function to calculate the magic number Wikipedia told us about:<br>
`let cameraToTriangle = v02.sub(camera.position).dot(triangleSurfaceNormal.normalize());`

If the value of `cameraToTriangle` is greater than 0, we simply don't draw the polygon. To be honest, this is not the best implementation of backface culling. It works, but it's a bit overzealous and so it tends to trim polygons which aren't fully facing away from the camera. This results in a sort of wobbling outline in the render, but I'll address that in a future post.

# Optimisation results
Time for the big payoff. We were already getting 60 FPS when the render target was small, so I won't revisit that. I think the framerate in Firefox is capped 60 FPS anyway. But at 1920x1080, performance is much better. The framerate has gone from a paltry 7-8 to a still-underwhelming but somewhat acceptable 19-20 FPS.
<br>
<p style="text-align: center;">
  <img src="{{ "/assets/images/2024_11_05_post_optimisation_render.gif" | relative_url }}" alt="An animated gif showing a basketball rendered at 1920 x 1080 resolution at roughly 20 FPS" style="max-width: 100%; height: auto;">
</p>

This is pretty decent. There's still lots of room for improvement, don't get me wrong. But for a WIP renderer this should allow me to add more features without frying my CPU or giving up out of frustration.