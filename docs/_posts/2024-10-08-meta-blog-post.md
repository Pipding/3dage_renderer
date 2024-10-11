---
layout: post
title: "A very meta blog post"
subtitle: "A blog post about setting up a blog, week ending 2024-10-08"
date: 2024-10-08 18:00:00
background: '/assets/images/missing_texture.png'
author: "Ryan"
---

This is a meta blog post because the bulk of my work on this project in the past week has been in setting up the blog you're currently reading.
As you can probably tell, the blog is hosted using Github pages. Despite being a long-time Github user I hadn't used Github pages before, though
I had heard that it's remarkably simple to setup. This, along with the fact that I could write blog posts using [markdown](https://en.wikipedia.org/wiki/Markdown) 
were enough to sell me on it. Having now set up a blog using Github pages I've learned that my assumptions were only half true. I can use markdown for blog posts
but the site was far from simple to set up.

# Getting started with Github Pages
The initial setup of the site is, to be fair, very straightforward. The [instructions on the Github website](https://docs.github.com/en/pages/getting-started-with-github-pages/creating-a-github-pages-site) enabled me to quickly configure my repo. I was optimistic at this stage, and wanted to add a theme. There's [official documentation on how to do this](https://docs.github.com/en/pages/setting-up-a-github-pages-site-with-jekyll/adding-a-theme-to-your-github-pages-site-using-jekyll) but there's a [short list of supported themes](https://pages.github.com/themes/) and I wanted to use a custom one - something more blog-like. The theme I settled on is called *startbootstrap-clean-blog-jekyll* and it has a [sample site](https://startbootstrap.github.io/startbootstrap-clean-blog-jekyll/), along with a public [github repo](https://github.com/StartBootstrap/startbootstrap-clean-blog-jekyll?tab=readme-ov-file).

# Adding a theme
Since *startbootstrap-clean-blog-jekyll* is not an officially-supported theme, I had to figure out how to implement it myself. The way Github pages typically works is that when you push a change, an automated task (a "Github Action") is triggered, which runs a tool called `Jekyll` to build your site. To add a custom theme, I needed to bypass this build process which can be done by [adding an empty file called .nojekyll to the root of the repository](https://github.com/Pipding/3dage_renderer/commit/a8147584c11e8b70274b5e1bca818153bf39e518). 
Next, since Github would no longer be building the site for me automatically, I needed to build it on my own machine and push the built site to Github. This was a bit of an arduous process, partly because I was wrestling with both the *startbootstrap-clean-blog-jekyll* theme and Github pages at the same time. The theme expected a certain file structure, had a few bugs and outdated dependencies and was overall not the most user-friendly experience but I eventually got it working.
<br>
<p style="text-align: center;">
  <img src="{{ "/assets/images/2024_10_08_blog_working.PNG" | relative_url }}" alt="A screenshot of the homepage of this blog." style="max-width: 100%; height: auto;">
</p>
One nice thing about the theme I chose is it's responsive, so the layout dynamically adjusts to mobile screens too.
<br>
<p style="text-align: center;">
  <img src="{{ "/assets/images/2024_10_08_blog_responsive.PNG" | relative_url }}" alt="A screenshot of the homepage of this blog on a phone, demonstrating its responsive design." style="max-width: 100%; height: auto;">
</p>

# Building and hosting the site
To host the blog I created a new branch in my repo called `gh-pages`. This branch hosts _only_ the built blog, so it's totally separate from the `main` branch where I'll be working on my renderer. 
<br>
<p style="text-align: center;">
  <img src="{{ "/assets/images/2024_10_08_blog_branches.PNG" | relative_url }}" alt="A screenshot of Github showing the contents of the gh-pages branch." style="max-width: 100%; height: auto;">
</p>

Updating the blog is a process unto itself where I need to run Jekyll locally to build the site, then navigate to the `_site` folder (the build output directory for Jekyll) to push changes to the `gh-pages` branch. It's a bit of a chore but fortunately I work as a build engineer for my day job, so automating build processes is my bread & butter. I created a [bash script](https://github.com/Pipding/3dage_renderer/blob/277a20a4f7c8d58624a0e711e3cecf15be0d2fb9/build_and_deploy_blog.sh) to automatically build & deploy the site et voila. This blog post is the first proper test of that whole process - previous tests included only small changes, like adding a favicon.
<br><br>

As I said, bit of a meta post this week, not really focused on the research project. In addition to setting up the blog there were a number of other assignments due which took up a lot of time but I'm looking forward to getting back into the renderer in the coming week.