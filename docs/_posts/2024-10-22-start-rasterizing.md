---
layout: post
title: "Putting meat on the bones"
subtitle: "Starting to implement rasterization to draw textures, week ending 2024-10-22"
date: 2024-10-22 18:00:00
background: '/assets/images/2024_10_22_bad_texture.gif'
author: "Ryan"
---
Before I go into a diatribe about the trials and tribulations of implementing rasterization, I'll just mention that this week started on a totally different note. I expected to be shifting the code away from `.obj` files to `.glb` or `.gltf` because I needed texture data. What I quickly realised though is that I didn't need to use a specific file format to get texture data & so I've stuck with `.obj`.
With that out of the way, on to rasterization.

# What is rasterization?
Rasterization is the process of turning data into pixels. Now, in some sense one could argue that I had already implemented this last week with the wireframe view. Technically that might be true, but the wireframe view uses the Canvas [lineTo](https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/lineTo) function, which basically handles the rasterization for me so I'm not counting that. What I need to be able to do is take vertex data from the model, combine that with colour data from the texture and draw the resulting pixels to screen. The process goes something like this;

1. Project the 3D vertex data into 2D screen space (this carries over from the wireframe view)
2. Read the texture data for the 3D vertices and find the corresponding point on the texture map
3. Draw a triangle, interpolating between the points on the texture map we found in step 2 to determine pixel colour

# Projecting 3D vertex data into 2D screen space
This is basically the process of turning 3D vertex data into a 2D shape so it can be drawn on a screen. The code used carries over from the wireframe view I implemented last week. The following illustration posted on [math.stackexchange.com](https://math.stackexchange.com/) by user [Nominal Animal](https://math.stackexchange.com/a/2306853) shows how a cube might be projected onto a 2D plane.
<br>
<p style="text-align: center;">
  <img src="{{ "/assets/images/2024_10_22_vertex_projection.png" | relative_url }}" alt="A diagram demonstrating the projection of a 3D shape onto a 2D plane." style="max-width: 100%; height: auto;">
</p>

What we're doing is slightly different because instead of projecting a 3D shape (like a cube) in 3D space onto a 2D plane, we're projecting 2D shapes (triangles) in 3D space onto a 2D plane. From a maths/coding perspective there's no difference, except that we will eventually have to deal with triangles which are facing away from the camera, and therefore are not visible. But that's for another time.

I won't go into how this works again but I will briefly recommend again the YouTube video I used to learn about this - [#5 3D Software Rendering Tutorial: The "Magic" of Perspective by YouTube user 'thebennybox'](https://www.youtube.com/watch?v=D3IhkRulkFE&list=PLEETnX-uPtBUbVOok816vTl1K9vV1GgH5&index=6).

# Step 2 Reading texture data
This is where the new stuff is introduced. At the highest level, the difference is that in the render function we change <br>
`drawTriangle(ctx, v0, v1, v2);` <br>
to <br>
`rasterizeTriangle(ctx, v0, v1, v2, uv0, uv1, uv2, loadedDiffuseMap);` <br>

The difference between these functions is a lot bigger than the signatures let on. `drawTriangle` can simply draw a line (using the aforementioned [lineTo](https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/lineTo) function) between each of the given vertices. `rasterizeTriangle` has to do a lot more.
Instead of just drawing a line between the vertices, `rasterizeTriangle` draws triangles pixel-by-pixel. To do this, it must manually check every pixel in the image to see whether or not the coordinates of each pixel fall within the triangle. Checking all of the pixels on the screen, as you can imagine, would be horribly slow, so we don't actually do that. Instead, we create a box which fully encompasses the triangle and just check the pixels inside that box.
<br>
<p style="text-align: center;">
  <img src="{{ "/assets/images/2024_10_22_triangle_bounding_box.png" | relative_url }}" alt="An image of a triangle inside a square, representing the bounding box of the triangle." style="max-width: 100%; height: auto;">
</p>

The code to determine the bounding box of a triangle given its vertices is pretty straightforward.
```
const minX = Math.min(v0.x, v1.x, v2.x);
const maxX = Math.max(v0.x, v1.x, v2.x);
const minY = Math.min(v0.y, v1.y, v2.y);
const maxY = Math.max(v0.y, v1.y, v2.y);
```

We then look through every pixel inside that bounding box and calculate the barycentric coordinates of the pixels, in relation to the triangle.
### What are barycentric coordinates?
Barycentric coordinates are coordinates which are relative to the vertices of the triangle. If that doesn't make sense, don't worry. First let's look at a coordinate system most people are familiar with - a rectangle, specifically, a screen. We're used to considering the top-left corner of a screen to be (0, 0). The following image from [ntu.edu.sg](https://www3.ntu.edu.sg/home/ehchua/programming/opengl/images/Graphics3D_DisplayCoord.png) demonstrates this.
<br>
<p style="text-align: center;">
  <img src="{{ "/assets/images/2024_10_22_screen_space_coordinates.png" | relative_url }}" alt="A diagram of a screen showing the coordinate 0, 0 at the top left corner." style="max-width: 100%; height: auto;">
</p>

Normally the bottom-left corner of the screen is determined by its width and height but if we normalised the coordinates, we could call the top-left corner is (0, 0) and the bottom-right corner (1, 1).
<br>
<p style="text-align: center;">
  <img src="{{ "/assets/images/2024_10_22_normalized_screen_space_coords.png" | relative_url }}" alt="A diagram of a screen showing the coordinate 0, 0 at the top left corner and 1, 1 at the bottom right." style="max-width: 100%; height: auto;">
</p>

We could then define any point within this rectangle relative to the bounds of the rectangle. This is a barycentric coordinate.
<br>
<p style="text-align: center;">
  <img src="{{ "/assets/images/2024_10_22_barycentric_screen_coordinate.png" | relative_url }}" alt="A diagram of a screen showing the coordinate 0, 0 at the top left corner, 1, 1 at the bottom right and a barycentric coordinate at 0.9, 0.9." style="max-width: 100%; height: auto;">
</p>

This principle can be used in triangles too, to determine coordinates relative to its three points. The following diagram from section 22.8 of Akenine-Moller's Real-Time Rendering Fourth Edition gives an example of how this may look.
<br>
<p style="text-align: center;">
  <img src="{{ "/assets/images/2024_10_22_barycentric_coordinates_triangle.png" | relative_url }}" alt="A diagram showing barycentric coordinates of a triangle." style="max-width: 100%; height: auto;">
</p>

Barycentric coordinates are useful to us because they;
- Tell us whether or not a point is inside a triangle
- Tell us the position of the given pixel relative to the vertices of the triangle, which we'll use to read data from the texture map later

### Using barycentric coordinates to read texture data
The important take-away for barycentric coordinates is that they have 3 elements (`u`, `v`, `w`) and we can use these 3 elements to figure out which pixel(s) of a UV map we should read to determine the colour of a given pixel. So, let's remind ourselves of how UV maps work.

The picture below shows the now-iconic basketball mesh I've been using, alongside its diffuse (texture) map. When we create a UV map, we are essentially creating a link between each of the vertices in the mesh and a pixel in the texture map. This data is going to be baked into the files we export from Blender.
<br>
<p style="text-align: center;">
  <img src="{{ "/assets/images/2024_10_22_basketball_uv_map.png" | relative_url }}" alt="A screenshot of Blender showing a 3D model of a basketball alongside its UV map." style="max-width: 100%; height: auto;">
</p>

So, for example, the selected triangle in the screenshot below is mapped to the highlighted section of the diffuse map. This can be used to determine which colour the pixels at each vertex should be, but not necessarily what colour the rest of the triangle should be. To figure that out, we need to interpolate.
<br>
<p style="text-align: center;">
  <img src="{{ "/assets/images/2024_10_22_basketball_triangle_to_diffuse.png" | relative_url }}" alt="A screenshot of Blender showing a 3D model of a basketball alongside its UV map." style="max-width: 100%; height: auto;">
</p>

# Interpolating pixel colours from a UV map
This is where we tie together everything we've learned so far to generate a fully-rendered 3D image. We're going to create a render loop which will loop through every triangle in the mesh and for each one, it will calculate the following;
- A bounding box around the triangle, limiting the number of pixels we need to check
- Barycentric coordinates for each pixel in the bounding box (any pixels which are not inside the triangle will be ignored)
- UV coordinates for each vertex of the triangle
    - I didn't go into too much detail on this, because the UV coordinates are determined in Blender and baked into the 3D model, so we can read the data using Three.js without much effort

Here's how we do it. First, iterate through all of the pixels in the bounding box.
```
// Loop through all pixels in the bounding box
for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
        // TBD...
    }
}
```

Within that loop, calculate the barycentric coordinates of each pixel and, if the pixel isn't in the triangle, skip it.
```
// Loop through all pixels in the bounding box
for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
        const { u, v, w } = computeBarycentric(x, y, v0, v1, v2);

        // Check if the pixel is inside the triangle
        if (u >= 0 && v >= 0 && w >= 0) {
            // TBD...
        }
    }
}
```

Use the barycentric coordinates to interpolate between the vertices of the UV coordinates and figure out which pixel to sample from the diffuse map.
```
// Loop through all pixels in the bounding box
for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
        const { u, v, w } = computeBarycentric(x, y, v0, v1, v2);

        // Check if the pixel is inside the triangle
        if (u >= 0 && v >= 0 && w >= 0) {
            // Interpolate the UV coordinates using the barycentric weights
            const interpolatedUV = new THREE.Vector2(
                u * uv0.x + v * uv1.x + w * uv2.x, // TODO: This is inverted...?
                1 - (u * uv0.y + v * uv1.y + w * uv2.y) // No, this is inverted...
            );

            // TBD...
        }
    }
}
```

And finally, we read the colour data of the pixel from the diffuse map and draw it to the appropriate pixel on the screen.
```
// Loop through all pixels in the bounding box
for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
        const { u, v, w } = computeBarycentric(x, y, v0, v1, v2);

        // Check if the pixel is inside the triangle
        if (u >= 0 && v >= 0 && w >= 0) {
            // Interpolate the UV coordinates using the barycentric weights
            const interpolatedUV = new THREE.Vector2(
                u * uv0.x + v * uv1.x + w * uv2.x, // TODO: This is inverted...?
                1 - (u * uv0.y + v * uv1.y + w * uv2.y) // No, this is inverted...
            );

            // Sample the texture using the interpolated UV coordinates
            const textureColor = sampleTexture(rawImageData, rawImageData.width, rawImageData.height, interpolatedUV);

            // https://stackoverflow.com/questions/4899799/whats-the-best-way-to-set-a-single-pixel-in-an-html5-canvas
            ctx.fillStyle = "rgba("+textureColor.r+","+textureColor.g+","+textureColor.b+","+(textureColor.a/255)+")";
            ctx.fillRect( x, y, 1, 1 );
        }
    }
}
```
<br>
And that should do it! Let's run this code and see what we get!

# Rasterized image
<br>
<p style="text-align: center;">
  <img src="{{ "/assets/images/2024_10_22_bad_texture.gif" | relative_url }}" alt="An animated image showing a rendered image of a basketball with a very glitchy appearance and half the basketball missing." style="max-width: 100%; height: auto;">
</p>
<br>
Oh...
<br>
Alright, well something appears to be going very wrong, but figuring out what's going on will have to wait until next week.