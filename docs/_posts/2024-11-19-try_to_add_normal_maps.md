---
layout: post
title: "An Attempt at Normality"
subtitle: "Trying to implement normal maps, week ending 2024-11-19"
date: 2024-11-19 18:00:00
author: "Ryan"
---
In contrast to last week's post, which was celebratory of the successful implementation of shading, this week's post is basically the opposite. Following from the success of last week, I wanted to build on the shading by adding normal maps. While the implementation of shading went surprisingly smoothly (haha), normal mapping went, well...
<br>
<p style="text-align: center;">
  <img src="{{ "/assets/images/2024-11-19_bad_normal_map.gif" | relative_url }}" alt="An animated gif of a rotating basketball with a very glitchy appearance." style="max-width: 100%; height: auto;">
</p>

# Implementing normal maps
Early in this project I'd assumed that implementing normal maps would be the most difficult part, but after the ease of implementing shading last week I started to think it might be easier than I expected. It wasn't, I was right the first time. Normal maps are hard. And it's all maths, who'd have guessed. It's hard to summarise how normal maps work in a technical sense, especially when I don't fully understand it myself, but I'll give it a go;

When we're drawing a triangle on the screen, we're doing so pixel-by-pixel. We can think of pixels in 2 ways. Obviously in reality it's a 2-dimensional element on a screen, but it also represents a point in 3D space on the surface of whatever mesh we're rendering. That 3D point 'faces' a certain direction in 3D space. That direction is called its normal vector, or just "normal" for short.

When we use normal maps, we're sort of offsetting that "normal" with data we pull from a normal map. Normal maps are just images where the pixel data aren't being used to encode colour data, they're being used to encode vectors. This means there's information contained within each pixel of the normal map which corresponds to points on our mesh.

The complexity of implementing normal mapping comes from the fact that we can't simply take the vector data out of the normal map and apply it to the mesh in the same way we do with a diffuse map. We need to interpret the vector data - translating it into what's called "world space". This is because the data is relative to the surface of each polygon, and each polygon has its own orientation in "world space" so we need to account for that.

In order to translate a pixel's normal map data into world space, we need to construct a matrix using 3 vectors;
- The normal vector
- The tangent vector
- The bitangent vector

We construct a matrix from these 3 and use it to apply a transformation to the data from the normal maps and voila. What the hell are tangent and bitangent vectors, you ask? Well, have you ever seen that image of how cartesian spaces can be defined using three fingers; index, middle and thumb? Something like this one I found on [StackOverflow](https://stackoverflow.com/a/34068511):
<br>
<p style="text-align: center;">
  <img src="{{ "/assets/images/2024-11-19_right_hand_rule.png" | relative_url }}" alt="An illustration of a hand with the index finger, middle finger and thumb extended, all in orthogonal directions." style="max-width: 100%; height: auto;">
</p>

That 3-finger array is basically a normal, tangent and bitangent vector. The index finger is the normal vector, the middle finger (the tangent vector) is perpendicular with it (and parallel to the plane defined by the normal) and the thumb (the bitangent) is orthogonal (perpendicular) to both. The twist is that the tangent needs to be pointing in the direction of increasing U coordinates and the bitangent, I think, should be in the direction of increasing V.
I understand what I just said right now, but give it a month and I'll be as confused as you probably are. 

If all of that went completely over your head, don't worry. It's a lot to take in and I obviously haven't totally internalised it, hence the state of my render. Let's see that again.
<br>
<p style="text-align: center;">
  <img src="{{ "/assets/images/2024-11-19_bad_normal_map.gif" | relative_url }}" alt="An animated gif of a rotating basketball with a very glitchy appearance." style="max-width: 100%; height: auto;">
</p>
Oof.

# What went wrong?
I obviously haven't implemented normal mapping correctly or else it'd look good, but to be honest I don't know what's wrong with it. It could be something related to how I'm calculating tangent and bitangent vectors, it might be the fact that I only half-implemented Phong shading last week. Basically I need more time to stew on the problem to figure out what's wrong but unfortunately time is something I'm running out of. With only a few weeks left and several other deadlines approaching, I think I'll need to park normal mapping here and leave it incomplete.

# Where to go from here?
I stated a while ago that if it came down to the line and I had to cut a feature from this project, I'd cut user interactivity before I cut normal maps. I think I'm going to renege on that. I think at this stage I'd need a lot more time to get normal mapping working than I'd need to implement user controls to rotate and zoom in the model. I'd still like to understand normal mapping some day, so I hope I'll come back to it eventually, probably using another programming language.

# Resources
Normally I like to intersperse my blog posts with links to the resources I've used but that's contingent on my being able to weave them into a coherent story. In this case I haven't been able to fully implement normal mapping so I haven't done that. Instead I'm going to dump a list of useful resources at the end, both for the reader and my future self. Hopefully when (if) I revisit normal mapping, these will prove useful.
- [StackOverflow answer explaining normal, tangent and bitangent vectors](https://gamedev.stackexchange.com/a/51402)
- [A blog post explaining how to compute tangent space basis vectors](https://terathon.com/blog/tangent-space.html)
- [Another StackOverflow answer explaining how to calculate TBN matrices](https://stackoverflow.com/a/5257471)
- [Reddit post where someone was seeing similar clearly-defined polygons when using a normal map in Blender as I saw in my renderer](https://www.reddit.com/r/blenderhelp/comments/y2001x/when_i_put_a_normal_map_on_my_mesh_i_get_these/?rdt=40154)