// taken from https://lucasklassmann.com/blog/2019-02-02-embedding-lua-in-c/
// install lua from lua-5.4.8 folder: "make && sudo make install"
// gcc lua_file.c -o lua_file -llua -lm && ./lua_file

#include <lauxlib.h>
#include <lua.h>
#include <lualib.h>

int main(int argc, char **argv) {
  lua_State *L = luaL_newstate();
  luaL_openlibs(L);

  if (luaL_dofile(L, "script.lua") == LUA_OK) {
    lua_pop(L, lua_gettop(L));
  }

  lua_close(L);
  return 0;
}
