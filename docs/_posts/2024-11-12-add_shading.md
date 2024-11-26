---
layout: post
title: "Shady Business"
subtitle: "Implementing Lambertian illumination, week ending 2024-11-12"
date: 2024-11-12 18:00:00
background: '/assets/images/2024-11-12_shaded_render_small.gif'
author: "Ryan"
---
Shading has been one of the more daunting features because it's kind of make-or-break. If I couldn't get shading working with decent performance, the 'impressiveness' of the project would be severely diminished. I'm going to spoil the ending of this post; here's a shaded basketball rendering at ~45 FPS;
<br>
<p style="text-align: center;">
  <img src="{{ "/assets/images/2024-11-12_shaded_render_small_cropped.gif" | relative_url }}" alt="An animated gif of a 3D render of a spinning basketball" style="max-width: 100%; height: auto;">
</p>

# Deciding on a Shading Model
Implementing shading turns out not to be so complex, but figuring out how to do it is. It's very difficult to find relevant resources because the majority of tutorials and blogs discussing shading are written with shaders in mind. Shaders are tiny programs which run on the GPU - i.e. they're not something I can use in a software renderer. Consequently, while a lot of the principles being discussed in those videos & posts might apply to my project, the implementations do not.
Here's an example of what I mean. This video (you don't have to watch it) talks about the principles and maths behind Lambertian illumination. That's useful to me, that's the type of illumination I use. But when he gets to the practical examples, he's writing shader code and that's not something I can use. Maybe if I understood how shaders work I could translate it, but I don't so I can't.
<iframe width="560" height="315" src="https://www.youtube.com/embed/CxKZJbO3p50?si=GiAhY2A8bbtqk8z-&amp;start=158" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>

Figuring out what kind of shading to implement was a task in and of itself. Information for my specific use-case is similarly hard to come by but I eventually found there are a few key names in the shading realm;
- Lambertian Shading
- Phong Shading
- Gouraud Shading

You've probably heard some of these names before. Phong, in particular, is one that I seem to recall from textbooks but I've never really understood what any of these things are. In my defence I've found that the same names are used to refer to different things and it's easy to get confused. "Phong" can be a shading model, but also an interpolation method. "Lambert" can be a shading model too, but it can also be an illumination model. I'll try to be as specific as I can to avoid contributing to this confusion. Here's a quick rundown of the three. In the end I decided on using Phong shading.

**Lambertian Shading**<br>
As I understand it, Lambertian shading is used for flat shading. That would mean polygons do not appear curved at all with Lambertian shading. This page on [scratchapixel.com](https://www.scratchapixel.com/lessons/3d-basic-rendering/introduction-to-shading/diffuse-lambertian-shading.html) gave me a decent rundown of how it works. Based on this, I decided I didn't want to implement Lambertian shading but (**and here's the confusing bit**) Lambertian illumination would be used if I were to implement Phong shading.

**Phong Shading**<br>
[Phong shading](https://en.wikipedia.org/wiki/Phong_shading) has been around since the mid 70s so it sort of can't be resource intensive by modern standards. It's a time-tested method for shading and provides reasonably realistic results.

**Gouraud Shading**<br>
I've read varying things about [Gouraud shading](https://en.wikipedia.org/wiki/Gouraud_shading). [Wikipedia says](https://en.wikipedia.org/wiki/Gouraud_shading#:~:text=Gouraud%20shading%20is%20considered%20superior%20to%20flat%20shading%20and%20requires%20significantly%20less%20processing%20than%20Phong%20shading%2C%20but%20usually%20results%20in%20a%20faceted%20look) it requires fewer resources than Phong shading and produces a more faceted look. I think I've also read that it produces a more realistic result but is more resource intensive. I heard the latter first, and it put me off using it.

# Implementing Phong Shading
**Caveat**: My implementation of Phong shading is so simplified that I'm not certain it still qualifies as Phong shading, but that's what I'm going to call it.

It's surprisingly easy to implement a simplified form of Phong shading. The renderer draws triangles using a function called `rasterizeTriangle`. This function calculates the colour for each pixel in the triangle, so we're going to update this function to take lighting data into account. We need to update `rasterizeTriangle` so it can;
- Determine the normal vector of each pixel by interpolating between the normals of each vertex in the triangle
    - This can be done using barycentric coordinates, which are already calculated in `rasterizeTriangle` because they're used to interpolate texture data
- Calculate a "diffuse factor", i.e. how much each pixel in the triangle is affected by a diffuse light source
- Multiply the colour of the pixel (determined by the texture) by the diffuse factor

**Determining normal vector for each pixel**<br>
This is easy enough because we only need 2 things;
- The normal vector of each vertex in the triangle
- The barycentric coordinates of the pixel we're operating on

As previously mentioned, barycentric coordinates are already available because we were using them to get texture data. The normal vector for the vertices is also available because it's stored in the `.obj` file. We just need to read the data from the file and pass it into the `rasterizeTriangle` function. Glossing over all the plumbing of reading normal data from the file and passing it into the function, the new code looks something like this:
```
const lightDirection = new THREE.Vector3(0, -10, -10).normalize();
const lightColour = new THREE.Color(0, 0, 0); // White light

const interpolatedNormal = new THREE.Vector3(
    (u * normal0.x + v * normal1.x + w * normal2.x),
    (u * normal0.y + v * normal1.y + w * normal2.y),
    (u * normal0.z + v * normal1.z + w * normal2.z)
);

const diffuseFactor = Math.max(interpolatedNormal.dot(lightDirection), 0);

const finalColour = {
    r: lightColour.r + textureColour.r * diffuseFactor,
    g: lightColour.g + textureColour.g * diffuseFactor,
    b: lightColour.b + textureColour.b * diffuseFactor
}
```

**On the simplicity of this shading model**<br>
Specular highlighting is ignored here, which is why I hesitate to call this Phong shading. Phong shading would include specular highlights. There's also some simplification in the illumination model because I'm only dealing with a single light source with a single intensity.

# Where did the performance improvement come from?
This post has been light on images but the one I did include showed a marked improvement in framerate. Unlike the previous blog post where I came clean about speeding up the animations, this time the animated gifs are actually slower than the real thing because the website I use to turn `.mp4` files into `.gifs` can only export at 30 FPS. Here's an uncropped version where you can see the FPS counter just so you know I'm not lying.
<br>
<p style="text-align: center;">
  <img src="{{ "/assets/images/2024-11-12_shaded_render_small.gif" | relative_url }}" alt="An animated gif of a 3D render of a spinning basketball" style="max-width: 100%; height: auto;">
</p>

So where did the performance improvements come from? There are 2 answers;

**Chrome**<br>
For whatever reason, the renderer runs roughly 10 FPS higher in Chrome than in Firefox. This is likely down to how the browsers optimise JavaScript under the hood.

**Code improvements**<br>
After last week's optimisations I had my eyes open for further optimisation opportunities. Rather than include the code changes I'll link to the Git commits, as I think Github provides a nicer UI for comparing old to new.

- [Instead of creating new arrays for vertices, uvs and normals inside the rendering loop, create one array for each outside the loop and save the values once](https://github.com/Pipding/3dage_renderer/commit/5d44ddebf9ead4a7b0efc91eb0210bcdb8a57815)
- [Precalculate transformed and projected vertices before rasterizing the triangle, and reference the values inside the rasterizeTriangle function instead of calculating them inside rasterizeTriangle](https://github.com/Pipding/3dage_renderer/commit/5d44ddebf9ead4a7b0efc91eb0210bcdb8a57815)