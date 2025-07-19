// gcc bytebeat.c -o bytebeat
// ./bytebeat | sox -t raw -r 8000 -e unsigned -b 8 -c 1 - -d
#include <stdio.h>

int main(void) {
  unsigned int t = 0;
  for (;; t++) {
    putchar(((int)(t / 1e7 * t * t + t) / 127 | t >> 4 | t >> 5 |
             t % 127 + (t >> 16) | t) &
            0xFF);
  }
  return 0;
}
