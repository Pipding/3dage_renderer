#!/bin/bash

# Step 1: Run Jekyll build
echo "Running Jekyll build..."
bundle exec jekyll build

# Step 2: Check if Jekyll build was successful
if [ $? -ne 0 ]; then
    echo "Jekyll build failed. Exiting script."
    exit 1
fi

# Step 3: Check if _site directory exists
if [ ! -d "_site" ]; then
    echo "_site directory does not exist. Something went wrong with the Jekyll build."
    exit 1
fi

# Step 4: Move into the _site directory
cd _site

# Step 5: Check if .git exists, initialize if it doesn't
if [ ! -d ".git" ]; then
    echo "Initializing Git repository..."
    git init
    git remote add origin https://github.com/Pipding/3dage_renderer.git
fi

# Step 6: Add and commit changes
echo "Adding and committing changes..."
git add .
git commit -m "Deploy built site"

# Step 7: Push to gh-pages branch with force
echo "Pushing to gh-pages branch..."
git push --set-upstream origin gh-pages --force

echo "Deployment complete!"
