/* Casino Run audio engine + settings. See docs/audio/AUDIO_BIBLE.md.
   Graph: sources -> sfx / music bus -> master (mute) -> limiter -> speakers.
   Platform layer note (3DS): this file is the only place that touches WebAudio; the port swaps
   it for an ndsp backend with the same play(name, {rate, gain}) / music(name) surface. */
window.CR = window.CR || {};

CR.settings = (() => {
  const KEY = "casinoRun.settings";
  const defaults = {
    sfx: 0.8,
    music: 0.35,
    mute: false,
    fx: "high", // high | low | off
    reducedMotion: !!(window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches),
  };
  let saved = {};
  try {
    saved = JSON.parse(localStorage.getItem(KEY) || "{}") || {};
  } catch (error) {
    saved = {}; // Corrupt or blocked storage: fall back to defaults, never crash.
  }
  const s = { ...defaults, ...saved };
  s.save = () => {
    try {
      const { save, ...data } = s;
      localStorage.setItem(KEY, JSON.stringify(data));
    } catch (error) {
      /* storage unavailable: settings last for this session only */
    }
  };
  return s;
})();

CR.audio = (() => {
  const MAX_VOICES = 24, MAX_PER_SOUND = 4;
  let ctx = null, master, sfxBus, musicBus;
  const buffers = {}, voices = [];
  let current = null, wantedMusic = null, loading = null, manifestAudio = [];
  const pendingMusic = {};

  function init() {
    if (ctx) return ctx;
    try {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
    } catch (error) {
      return null; // No audio available: every play() becomes a silent no-op.
    }
    const limiter = ctx.createDynamicsCompressor();
    limiter.threshold.value = -12;
    limiter.knee.value = 6;
    limiter.ratio.value = 8;
    limiter.attack.value = 0.003;
    limiter.release.value = 0.12;
    master = ctx.createGain();
    sfxBus = ctx.createGain();
    musicBus = ctx.createGain();
    sfxBus.connect(master);
    musicBus.connect(master);
    master.connect(limiter);
    limiter.connect(ctx.destination);
    applyVolumes();
    load();
    return ctx;
  }

  async function decode(entry) {
    const data = await (await fetch("assets/" + entry.file)).arrayBuffer();
    buffers[entry.id] = await ctx.decodeAudioData(data);
    return buffers[entry.id];
  }

  // SFX load eagerly (small). Music tracks (~0.6 MB each) load only when first requested.
  function load() {
    if (loading) return loading;
    loading = fetch("assets/manifest.json")
      .then((r) => r.json())
      .then((m) => {
        manifestAudio = m.audio || [];
        if (wantedMusic) music(wantedMusic);
        return Promise.allSettled(manifestAudio.filter((a) => a.category !== "music").map(decode));
      })
      .catch(() => { /* offline or missing manifest: synth fallbacks still play */ });
    return loading;
  }

  function loadMusic(name) {
    if (buffers[name]) return Promise.resolve(buffers[name]);
    const entry = manifestAudio.find((a) => a.id === name);
    if (!entry) return Promise.resolve(null); // manifest not loaded yet; load() retries wantedMusic
    return (pendingMusic[name] ||= decode(entry).catch(() => null));
  }

  function applyVolumes() {
    if (!ctx) return;
    master.gain.value = CR.settings.mute ? 0 : 1;
    sfxBus.gain.value = CR.settings.sfx;
    musicBus.gain.value = CR.settings.music;
  }

  // Returns true if a generated sample played; false lets callers fall back to synthesis.
  function play(name, { rate = 1, gain = 1, when = 0 } = {}) {
    const c = init();
    if (!c || !buffers[name]) return false;
    if (c.state === "suspended") c.resume();
    const same = voices.filter((v) => v.name === name);
    if (same.length >= MAX_PER_SOUND) stop(same[0]);
    if (voices.length >= MAX_VOICES) stop(voices[0]);
    const src = c.createBufferSource(), g = c.createGain();
    src.buffer = buffers[name];
    src.playbackRate.value = rate;
    g.gain.value = gain;
    src.connect(g);
    g.connect(sfxBus);
    const voice = { name, src };
    voices.push(voice);
    src.onended = () => {
      const i = voices.indexOf(voice);
      if (i >= 0) voices.splice(i, 1);
      g.disconnect();
    };
    src.start(c.currentTime + when);
    return true;
  }

  function stop(voice) {
    try { voice.src.stop(); } catch (error) { /* already stopped */ }
    const i = voices.indexOf(voice);
    if (i >= 0) voices.splice(i, 1);
  }

  // Switches the looping track with a ~0.4 s crossfade. Same name again = no restart.
  function music(name) {
    wantedMusic = name;
    const c = init();
    if (!c) return;
    if (current && current.name === name) return;
    if (current) {
      const old = current;
      current = null;
      old.gain.gain.setTargetAtTime(0, c.currentTime, 0.12);
      setTimeout(() => { try { old.src.stop(); } catch (error) { /* already stopped */ } old.gain.disconnect(); }, 700);
    }
    if (!name) return;
    loadMusic(name).then((buffer) => {
      if (!buffer || wantedMusic !== name || (current && current.name === name)) return;
      if (c.state === "suspended") c.resume();
      const src = c.createBufferSource(), gain = c.createGain();
      src.buffer = buffer;
      src.loop = true;
      gain.gain.value = 0;
      gain.gain.setTargetAtTime(1, c.currentTime, 0.15);
      src.connect(gain);
      gain.connect(musicBus);
      src.start();
      current = { name, src, gain };
    });
  }

  return {
    init,
    play,
    music,
    applyVolumes,
    get ctx() { return ctx; },
    get sfxInput() { init(); return sfxBus; },
    stopAll() { voices.slice().forEach(stop); },
    debug: () => ({ voices: voices.length, loaded: Object.keys(buffers).length, music: wantedMusic, playing: current && current.name, state: ctx && ctx.state }),
  };
})();
