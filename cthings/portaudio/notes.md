# portaudio notes

```sh
git clone https://github.com/PortAudio/portaudio.git
cd portaudio
./configure && make
sudo make install

gcc portaudio_test.c -o portaudio_test -lportaudio && ./portaudio_test
```
