---
layout: post
title: "A Semblance of Control"
subtitle: "Making the renderer presentable ahead of presentations, week ending 2024-11-26"
date: 2024-11-26 18:00:00
background: '/assets/images/2024-11-26_model_showcase.gif'
author: "Ryan"
---

# [Click here to see the renderer!](https://pipding.github.io/3dage_renderer/renderer/)

The end is approaching and, having given up on my hopes of implementing normal mapping ([as explained last week](https://pipding.github.io/3dage_renderer/2024/11/19/try_to_add_normal_maps.html)) I'm focusing on getting the renderer into a presentable state ahead of the symposium. Here's what I set out to accomplish;
- The user should be able to control the rotation of the model and zoom in
- The user should be able to toggle between wireframe and textured views
- There should be multiple meshes for the user to choose from
- The renderer should be hosted online so people can access it easily

# Adding user controls
The simplest way to add user controls for rotating and zooming in is to map keypresses to actions. Something like this:
```
document.addEventListener("keydown", function onEvent(event) {
    if (event.key === "ArrowLeft") {
        mesh.rotation += 0.05;
    }
});
```

I don't like this approach because it's binary, meaning that as soon as you press a button the object is rotating at max speed. I like motion to be smooth, so I'm using a more complicated setup. Instead of mapping user input directly to actions, I have a set of variables with names like `upKeyDown`, `leftKeyDown`, etc. This allows me to control the movement of the object in a tick function, which in turn allows me to gradually increase its speed. I make the deceleration work similarly, decaying speed on a per-frame basis instead of just stopping abruptly. The result is a smooth acceleration/deceleration.
<br>
<p style="text-align: center;">
  <img src="{{ "/assets/images/2024-11-26_rotation_acceleration.gif" | relative_url }}" alt="An animated gif showing a basketball rotating with gradual acceleration and deceleration" style="max-width: 100%; height: auto;">
</p>

The same principle is applied to the zoom in & zoom out, the only significant difference being that we're adjusting the camera's z coordinate instead of the rotation of the mesh.
<p style="text-align: center;">
  <img src="{{ "/assets/images/2024-11-26_zoom_acceleration.gif" | relative_url }}" alt="An animated gif showing a rendered basketball. The camera smoothly zooms in and out" style="max-width: 100%; height: auto;">
</p>
<br>

# Multiple view modes
Adding multiple view modes was mostly a case of reviving some old code. I'd had separate `renderWireframe` and `renderWithTexture` functions for weeks. `renderWireframe` came first but it broke at some point after I introduced `renderWithTexture`. After fixing it up I added a manager function called `render` and a boolean for controlling which view to use. It looks something like this:
```
function render(currentTime) {
    if (wireframeMode) {
        renderWireframe(currentTime);
    } else {
        renderWithTexture(currentTime);
    }
}
```

Then I simply add a key press event to toggle `wireframeMode` on and off.
<p style="text-align: center;">
  <img src="{{ "/assets/images/2024-11-26_wireframe_toggle.gif" | relative_url }}" alt="An animated gif showing a rendered basketball toggle between wireframe and textured views" style="max-width: 100%; height: auto;">
</p>

The UV check mode is also fairly simple to implement. I created a boolean called `uvCheckerMode` which can be toggled by the user. Whenever the value of that bool changes, we just load in a different diffuse map.

```
if (event.key === "e") {
  uvCheckerMode = !uvCheckerMode;

  if (uvCheckerMode) {
      loadDiffuseMap("models/uv_checker.jpg")
  } else {
      loadDiffuseMap("models/basketball_d.png");
  }
}
```
<p style="text-align: center;">
  <img src="{{ "/assets/images/2024-11-26_uv_checker_toggle.gif" | relative_url }}" alt="An animated gif showing a rendered basketball with its material switching between a debug texture and a normal one" style="max-width: 100%; height: auto;">
</p>

# Adding more meshes
My renderer can only render triangulated meshes. This means I'd need a few low-poly triangulated meshes I could add to demo the renderer. Fortunately we worked with a C++ library called [raylib](https://www.raylib.com/) in our first semester which had the same limitation. That means I was able to re-use the meshes I'd used for a project last year in this renderer. The models I chose to include are;
- basketball.obj (self-made)
- ducky.obj ([CGTrader](https://www.cgtrader.com/free-3d-models/sports/toy/rubber-duck-b31f3585-0347-4532-bd92-7ddea6107d0d))
- health.obj (self-made)
- missile.obj (self-made)
- powerup.obj (self-made)
- ufo.obj ([TurboSquid](https://www.turbosquid.com/3d-models/free-3ds-model-flying-saucer/1081073))

Throughout development I've only been using a single mesh and texture so I had to add some code to swap between assets. To do this I stored information about the assets in a dictionary like this:
```
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
    ...
}
```

Then I create a list from that dictionary which I can iterate through.
```
const modelList = Object.values(modelLibrary);
```

And then whenever the user presses spacebar I iterate through the list and load the new assets.

```
if (event.key === "spacebar") {
    modelIndex = (modelIndex + 1) % modelList.length;
    loadedObject = null;
    mesh = null;

    loadDiffuseMap(modelList[modelIndex].diffuse);
    loadObj(modelList[modelIndex].obj, render);
}
```

There's a little bit more to it than that, simply because I need to check whether it should display the UV checker or the actual material, and I need to stop any ongoing animation loops when the new assets are loaded. But basically we're just loading new files.
<p style="text-align: center;">
  <img src="{{ "/assets/images/2024-11-26_model_showcase.gif" | relative_url }}" alt="An animated image showing a range of rendered 3D models" style="max-width: 100%; height: auto;">
</p>
<br>
# Hosting the renderer online
I wanted the renderer to be available on the internet. After all, what's the point in having it written in Javascript if it isn't online? This turned out to be really easy because I took advantage of this blog and Github pages.
First I had to turn all the renderer code into a `.html` and `.js` file I could distribute. That was as simple as running `npm run build`. Then, I created a new directory in the folder where I store my blog posts called `renderer`. The template for Github pages came with some default links to an `About` and  `Contact` page, but I removed those a few weeks ago. I was able to go back, re-enable the `About` page and simply rename it to `renderer`. I then pointed it to the `renderer` directory I'd created earlier and publish the site. Hey presto, [the renderer is on the internet](https://pipding.github.io/3dage_renderer/renderer/).

To cap it off, I made a [build script](https://github.com/Pipding/3dage_renderer/blob/8cc54f498a5beb0a8f28e1a56ece7bc3649418a2/build_renderer.ps1) which will automatically run `npm run build` and copy the files into the blog, similar to [the one I created to build and post my blog site](https://pipding.github.io/3dage_renderer/2024/10/08/meta-blog-post.html#:~:text=I%20created%20a%20bash%20script).