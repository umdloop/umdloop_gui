
#!/bin/bash

# Create build directory
mkdir -p build
cd build

# Run cmake
cmake ..

# Build the project
make

# Run the application
./LoopGui
