# Step 1: Clean up any previous build folders
if (Test-Path "dist") {
    Write-Host "Deleting build folder left from previous build"
    Remove-Item -Recurse -Force .\dist
}

# Step 2: Create a build with npm
Write-Host "Running npm build"
npm run build

# Step 3: Check if dist directory exists
if (-Not (Test-Path "dist")) {
    Write-Host "dist directory does not exist. Something went wrong with the npm build."
    Exit 1
}

# Step 4: Wipe the renderer from the blog directory
if (Test-Path ".\docs\renderer") {
    Write-Host "Deleting old renderer build from blog directory"
    Remove-Item -Recurse -Force .\docs\renderer
}

# Step 5: Copy the content of the dist folder into the blog directory
Copy-Item -Path .\dist\ -Destination .\docs\renderer -Recurse

# Step 6: Copy models into the blog directory
Copy-Item -Recurse .\models .\docs\renderer

# Step 7: Make sure index.html and the assets folder exist in the blog directory
if (-Not (Test-Path ".\docs\renderer\index.html")) {
    Write-Host "index.html not found in the blog renderer directory. Something went wrong"
    Exit 1
}

if (-Not (Test-Path ".\docs\renderer\assets")) {
    Write-Host "assets folder not found in the blog renderer directory. Something went wrong"
    Exit 1
}

# Step 8: Make sure the models folder exists in the blog directory
if (-Not (Test-Path ".\docs\renderer\models")) {
    Write-Host "models folder not found in the blog renderer directory. Something went wrong"
    Exit 1
}

Write-Host "Deployment complete!"
