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

# Step 6: Get the current timestamp and commit hash from the main repo
timestamp=$(date +"%Y-%m-%d %H:%M:%S")
commit_hash=$(git rev-parse --short HEAD)  # Get the short commit hash from the current branch (main repo)

# Step 7: Add and commit changes with dynamic commit message
echo "Adding and committing changes..."
git add .
git commit -m "Deploy built site at $timestamp (Commit: $commit_hash)"

# Step 8: Push to gh-pages with force
echo "Pushing to gh-pages branch..."
git push --set-upstream origin gh-pages --force

echo "Deployment complete!"
