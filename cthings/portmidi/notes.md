# portmidi notes

```sh
git clone https://github.com/PortMidi/portmidi.git
cd portmidi
cmake .
make
sudo make install
# portmidi is now in /usr/local/lib
gcc midi_listener.c -o midi_listener -lportmidi -Wl,-rpath,/usr/local/lib
```

