# c things

compilers:

- gcc
- clang
- g++
- clang++

## external libraries

flags:

- I: "Add the specified directory to the search path for include files." when
  using #include
- L: "Add directory to library search path". where to look for `.a` files
- l: which `.a` should be linked, e.g. `-lxyz` links with `libxyz.a`

when working with single header file libraries, L and l options are not needed.

## make

1. create `makefile`:

```makefile
default:
  echo "Hello"
```

2. run `make`

the `make` command will look for a `makefile` and run the first command by
default. if we add a target after, like `make xyz` it runs the `xyz` command
specified in the makefile.

## cmake

1. touch `CMakeLists.txt`
2. mkdir `build`
3. `cmake -S . -B build` or `cd build && cmake`

cmake generates a `makefile`

other useful `cmake` commands:

- `cmake --version` -> 3.27.6
- `make help` -> list all targets in the Makefile

### some useful snippets

```cmake
install(TARGETS blabla DESTINATION bin)
```

this adds the `install` target to the makefile, allowing you to run
`sudo make install`, which will build the binary and copy it to the user `bin`
folder, so you can run the binary, in this case `dubi` from anywhere!
