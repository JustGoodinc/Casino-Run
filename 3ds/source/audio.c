// Audio: the web game's WAVs (22.05 kHz mono PCM16) played through ndsp.
// SFX are loaded once and stay resident (~1.3 MB); one music loop is resident at a time, with a
// second slot only while two tracks crossfade. Without DSP firmware the game simply runs silent.
#include <dirent.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include "app.h"

#define MAX_SFX 80
#define SFX_FIRST 2
#define SFX_LAST 9 /* 8 voices, the asset budget's cap */
#define FADE 30

typedef struct { char name[28]; s16 *data; u32 samples; } snd;
static snd SFX[MAX_SFX];
static int nSfx, ready, nextVoice = SFX_FIRST;
static ndspWaveBuf wave[SFX_LAST + 1];
static struct { char name[28]; s16 *data; u32 samples; float vol; int active, fading; } mus[2];
static int cur = -1;

static s16 *loadWav(const char *path, u32 *samples) {
  FILE *f = fopen(path, "rb");
  if (!f) return NULL;
  u8 head[12];
  s16 *out = NULL;
  if (fread(head, 1, 12, f) == 12 && !memcmp(head, "RIFF", 4) && !memcmp(head + 8, "WAVE", 4)) {
    u8 ch[8];
    while (fread(ch, 1, 8, f) == 8) {
      u32 len = ch[4] | ch[5] << 8 | ch[6] << 16 | (u32)ch[7] << 24;
      if (!memcmp(ch, "data", 4)) {
        out = linearAlloc(len);
        if (out && fread(out, 1, len, f) == len) { *samples = len / 2; DSP_FlushDataCache(out, len); }
        else if (out) { linearFree(out); out = NULL; }
        break;
      }
      fseek(f, (long)(len + (len & 1)), SEEK_CUR);
    }
  }
  fclose(f);
  return out;
}

static void voice(int ch, float vol, float rate) {
  float mix[12] = { 0 };
  mix[0] = mix[1] = vol;
  ndspChnSetMix(ch, mix);
  ndspChnSetRate(ch, rate);
}

void audioInit(void) {
  if (R_FAILED(ndspInit())) return; // no DSP firmware: run silent
  ready = 1;
  ndspSetOutputMode(NDSP_OUTPUT_STEREO);
  for (int ch = 0; ch <= SFX_LAST; ch++) {
    ndspChnReset(ch);
    ndspChnSetInterp(ch, NDSP_INTERP_LINEAR);
    ndspChnSetFormat(ch, NDSP_FORMAT_MONO_PCM16);
    voice(ch, 0, 22050);
  }
  DIR *d = opendir("romfs:/audio");
  if (!d) return;
  struct dirent *e;
  while ((e = readdir(d)) && nSfx < MAX_SFX) {
    size_t n = strlen(e->d_name);
    if (n < 5 || strcmp(e->d_name + n - 4, ".wav") || !strncmp(e->d_name, "music_", 6) || n - 4 >= sizeof SFX[0].name) continue;
    char path[96];
    snprintf(path, sizeof path, "romfs:/audio/%s", e->d_name);
    snd *s = &SFX[nSfx];
    s->data = loadWav(path, &s->samples);
    if (!s->data) continue;
    memcpy(s->name, e->d_name, n - 4);
    s->name[n - 4] = 0;
    nSfx++;
  }
  closedir(d);
}

void audioExit(void) {
  if (!ready) return;
  for (int ch = 0; ch <= SFX_LAST; ch++) ndspChnWaveBufClear(ch);
  for (int i = 0; i < nSfx; i++) linearFree(SFX[i].data);
  for (int i = 0; i < 2; i++) if (mus[i].data) linearFree(mus[i].data);
  ndspExit();
}

void sfxPitch(const char *name, float pitch) {
  if (!ready || A.sfx <= 0) return;
  for (int i = 0; i < nSfx; i++) {
    if (strcmp(SFX[i].name, name)) continue;
    int ch = -1;
    for (int k = SFX_FIRST; k <= SFX_LAST; k++) if (!ndspChnIsPlaying(k)) { ch = k; break; }
    if (ch < 0) { ch = nextVoice; nextVoice = nextVoice == SFX_LAST ? SFX_FIRST : nextVoice + 1; } // steal oldest-ish
    ndspChnWaveBufClear(ch);
    voice(ch, A.sfx / 100.0f * 0.9f, 22050 * pitch);
    memset(&wave[ch], 0, sizeof wave[ch]);
    wave[ch].data_vaddr = SFX[i].data;
    wave[ch].nsamples = SFX[i].samples;
    ndspChnWaveBufAdd(ch, &wave[ch]);
    return;
  }
}
void sfx(const char *name) { sfxPitch(name, 1.0f); }

// Switch music; the old track fades out while the new one fades in (audioTick drives the fade).
void musicPlay(const char *name) {
  if (!ready || (cur >= 0 && !strcmp(mus[cur].name, name))) return;
  int slot = cur == 0 ? 1 : 0;
  if (mus[slot].data) { ndspChnWaveBufClear(slot); linearFree(mus[slot].data); mus[slot].data = NULL; }
  char path[96];
  snprintf(path, sizeof path, "romfs:/audio/%s.wav", name);
  mus[slot].data = loadWav(path, &mus[slot].samples);
  if (!mus[slot].data) return;
  snprintf(mus[slot].name, sizeof mus[slot].name, "%s", name);
  mus[slot].vol = 0;
  mus[slot].active = 1;
  mus[slot].fading = 0;
  if (cur >= 0) mus[cur].fading = 1;
  voice(slot, 0, 22050);
  memset(&wave[slot], 0, sizeof wave[slot]);
  wave[slot].data_vaddr = mus[slot].data;
  wave[slot].nsamples = mus[slot].samples;
  wave[slot].looping = true;
  ndspChnWaveBufAdd(slot, &wave[slot]);
  cur = slot;
}

void audioTick(int duck) {
  if (!ready) return;
  float target = A.music / 100.0f * 0.55f * (duck ? 0.4f : 1.0f);
  for (int i = 0; i < 2; i++) {
    if (!mus[i].active) continue;
    float goal = mus[i].fading ? 0 : target, step = 1.0f / FADE;
    if (mus[i].vol < goal) mus[i].vol = mus[i].vol + step > goal ? goal : mus[i].vol + step;
    else if (mus[i].vol > goal) mus[i].vol = mus[i].vol - step < goal ? goal : mus[i].vol - step;
    float mix[12] = { 0 };
    mix[0] = mix[1] = mus[i].vol;
    ndspChnSetMix(i, mix);
    if (mus[i].fading && mus[i].vol <= 0) {
      ndspChnWaveBufClear(i);
      linearFree(mus[i].data);
      mus[i].data = NULL;
      mus[i].active = 0;
      mus[i].name[0] = 0;
    }
  }
}
