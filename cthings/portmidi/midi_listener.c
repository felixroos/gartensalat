#include <stdio.h>
#include <stdlib.h>
#include <portmidi.h>

#define INPUT_BUFFER_SIZE 100

int main(void) {
    PmError result;
    int device_id = -1;

    // Initialize PortMidi
    result = Pm_Initialize();
    if (result != pmNoError) {
        fprintf(stderr, "PortMidi initialization failed: %s\n", Pm_GetErrorText(result));
        return 1;
    }

    // Find the first input device
    int num_devices = Pm_CountDevices();
    for (int i = 0; i < num_devices; i++) {
        const PmDeviceInfo *info = Pm_GetDeviceInfo(i);
        if (info != NULL && info->input) {
            printf("Using input device: %s\n", info->name);
            device_id = i;
            break;
        }
    }

    if (device_id == -1) {
        fprintf(stderr, "No MIDI input device found.\n");
        Pm_Terminate();
        return 1;
    }

    // Open the device
    PortMidiStream *midi_stream;
    result = Pm_OpenInput(&midi_stream, device_id, NULL, INPUT_BUFFER_SIZE, NULL, NULL);
    if (result != pmNoError) {
        fprintf(stderr, "Failed to open input device: %s\n", Pm_GetErrorText(result));
        Pm_Terminate();
        return 1;
    }

    printf("Listening for MIDI Note messages (press Ctrl+C to exit)...\n");

    // Event loop
    while (1) {
        PmEvent event;
        int num_events = Pm_Poll(midi_stream);

        if (num_events) {
            if (Pm_Read(midi_stream, &event, 1) > 0) {
                int status = Pm_MessageStatus(event.message);
                int data1 = Pm_MessageData1(event.message);
                int data2 = Pm_MessageData2(event.message);

                if ((status & 0xF0) == 0x90 && data2 > 0) {
                    printf("Note ON:  Note %d, Velocity %d\n", data1, data2);
                } else if (((status & 0xF0) == 0x80) || ((status & 0xF0) == 0x90 && data2 == 0)) {
                    printf("Note OFF: Note %d, Velocity %d\n", data1, data2);
                }
            }
        }
    }

    // Cleanup (never reached in this infinite loop)
    Pm_Close(midi_stream);
    Pm_Terminate();
    return 0;
}
