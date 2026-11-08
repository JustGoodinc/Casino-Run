// Local save: settings + top-10 cash-outs at sdmc:/3ds/casino-run/save.dat.
// Versioned with a checksum; written to a temp file then renamed, so a power cut never leaves a
// half-written save. A missing or corrupt file falls back to defaults.
#include <stddef.h>
#include <stdio.h>
#include <string.h>
#include <sys/stat.h>
#include "app.h"

#define SAVE_DIR "sdmc:/3ds/casino-run"
#define SAVE_PATH SAVE_DIR "/save.dat"
#define SAVE_TMP SAVE_DIR "/save.tmp"
#define MAGIC 0x56535243u /* "CRSV" */
#define VERSION 1u

typedef struct {
  u32 magic, version;
  u8 music, sfx, reduced, count;
  score_t scores[MAX_SCORES];
  u32 sum;
} save_file;

static u32 checksum(const save_file *f) {
  const u8 *p = (const u8 *)f;
  u32 s = 2166136261u;
  for (size_t i = 0; i < offsetof(save_file, sum); i++) s = (s ^ p[i]) * 16777619u; // FNV-1a
  return s;
}

void saveLoad(void) {
  A.music = 80; A.sfx = 100; A.reduced = 0; A.scoreCount = 0;
  FILE *fp = fopen(SAVE_PATH, "rb");
  if (!fp) fp = fopen(SAVE_TMP, "rb"); // interrupted between remove and rename: the temp copy is complete
  if (!fp) return;
  save_file f;
  size_t got = fread(&f, 1, sizeof f, fp);
  fclose(fp);
  if (got != sizeof f || f.magic != MAGIC || f.version != VERSION || f.sum != checksum(&f) || f.count > MAX_SCORES) return;
  A.music = f.music <= 100 ? f.music : 80;
  A.sfx = f.sfx <= 100 ? f.sfx : 100;
  A.reduced = f.reduced ? 1 : 0;
  A.scoreCount = f.count;
  memcpy(A.scores, f.scores, sizeof f.scores);
}

// Returns 1 only when the new file is fully written and in place.
int saveWrite(void) {
  save_file f;
  memset(&f, 0, sizeof f);
  f.magic = MAGIC; f.version = VERSION;
  f.music = A.music; f.sfx = A.sfx; f.reduced = A.reduced; f.count = A.scoreCount;
  memcpy(f.scores, A.scores, sizeof f.scores);
  f.sum = checksum(&f);
  mkdir("sdmc:/3ds", 0777);
  mkdir(SAVE_DIR, 0777);
  FILE *fp = fopen(SAVE_TMP, "wb");
  if (!fp) return 0;
  int ok = fwrite(&f, 1, sizeof f, fp) == sizeof f;
  ok = (fflush(fp) == 0) && ok;
  ok = (fclose(fp) == 0) && ok;
  if (!ok) { remove(SAVE_TMP); return 0; }
  remove(SAVE_PATH); // FAT rename does not replace an existing file
  if (rename(SAVE_TMP, SAVE_PATH) != 0) return 0;
  return 1;
}
