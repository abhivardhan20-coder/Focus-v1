/**
 * Soundscape engine — Web Audio API synthesis (web), stub (native).
 * Generates all ambient sounds programmatically; no audio files needed.
 */

type SoundId = "silence" | "white_noise" | "rain" | "fire" | "cafe" | "deep";

function isWeb(): boolean {
  return typeof window !== "undefined" && typeof AudioContext !== "undefined";
}

// ── Pink-noise coefficients ──────────────────────────────────────────────
function makePinkNoiseBuffer(ctx: AudioContext, seconds = 4): AudioBuffer {
  const len = ctx.sampleRate * seconds;
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const d = buf.getChannelData(0);
  let b0=0,b1=0,b2=0,b3=0,b4=0,b5=0,b6=0;
  for (let i = 0; i < len; i++) {
    const w = Math.random() * 2 - 1;
    b0 = 0.99886*b0 + w*0.0555179; b1 = 0.99332*b1 + w*0.0750759;
    b2 = 0.96900*b2 + w*0.1538520; b3 = 0.86650*b3 + w*0.3104856;
    b4 = 0.55000*b4 + w*0.5329522; b5 = -0.7616*b5 - w*0.0168980;
    d[i] = (b0+b1+b2+b3+b4+b5+b6 + w*0.5362) / 7; b6 = w * 0.115926;
  }
  return buf;
}

function makeWhiteNoiseBuffer(ctx: AudioContext, seconds = 3): AudioBuffer {
  const len = ctx.sampleRate * seconds;
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  return buf;
}

function makeBrownNoiseBuffer(ctx: AudioContext, seconds = 4): AudioBuffer {
  const len = ctx.sampleRate * seconds;
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const d = buf.getChannelData(0);
  let last = 0;
  for (let i = 0; i < len; i++) {
    const w = Math.random() * 2 - 1;
    d[i] = (last + 0.02 * w) / 1.02; last = d[i]; d[i] *= 3.5;
  }
  return buf;
}

class SoundscapeEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private activeNodes: (AudioNode | AudioBufferSourceNode | OscillatorNode)[] = [];
  private currentVolume = 0.45;
  private currentId: SoundId = "silence";

  private getCtx() {
    if (!this.ctx) {
      this.ctx = new AudioContext();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = 0;
      this.masterGain.connect(this.ctx.destination);
    }
    if (this.ctx.state === "suspended") this.ctx.resume();
    return { ctx: this.ctx, master: this.masterGain! };
  }

  private stopNodes() {
    for (const n of this.activeNodes) {
      try {
        (n as AudioBufferSourceNode).stop?.();
        (n as OscillatorNode).stop?.();
        n.disconnect();
      } catch { /* already stopped */ }
    }
    this.activeNodes = [];
  }

  private fadeIn(gain: GainNode, ctx: AudioContext) {
    gain.gain.cancelScheduledValues(ctx.currentTime);
    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(this.currentVolume, ctx.currentTime + 1.8);
  }

  private fadeOut(gain: GainNode, ctx: AudioContext, cb: () => void) {
    gain.gain.cancelScheduledValues(ctx.currentTime);
    gain.gain.setValueAtTime(gain.gain.value, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 1.5);
    setTimeout(cb, 1700);
  }

  private buildWhiteNoise(ctx: AudioContext, dest: AudioNode) {
    const src = ctx.createBufferSource();
    src.buffer = makeWhiteNoiseBuffer(ctx, 4);
    src.loop = true;
    src.connect(dest);
    src.start();
    this.activeNodes.push(src);
  }

  private buildRain(ctx: AudioContext, dest: AudioNode) {
    // Brown (low-frequency rumble) + high-pass spatter
    const brown = ctx.createBufferSource();
    brown.buffer = makeBrownNoiseBuffer(ctx, 5);
    brown.loop = true;
    const lp = ctx.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 900;
    const g = ctx.createGain(); g.gain.value = 1.4;
    brown.connect(lp); lp.connect(g); g.connect(dest);
    brown.start();

    // High-freq spatter layer
    const scat = ctx.createBufferSource();
    scat.buffer = makeWhiteNoiseBuffer(ctx, 3);
    scat.loop = true;
    const hp = ctx.createBiquadFilter(); hp.type = "highpass"; hp.frequency.value = 4000;
    const g2 = ctx.createGain(); g2.gain.value = 0.12;
    scat.connect(hp); hp.connect(g2); g2.connect(dest);
    scat.start();

    this.activeNodes.push(brown, lp, g, scat, hp, g2);
  }

  private buildFire(ctx: AudioContext, dest: AudioNode) {
    // Pink noise through bandpass, amplitude-modulated by sawtooth LFO
    const src = ctx.createBufferSource();
    src.buffer = makePinkNoiseBuffer(ctx, 4);
    src.loop = true;
    const bp = ctx.createBiquadFilter(); bp.type = "bandpass"; bp.frequency.value = 380; bp.Q.value = 0.6;
    const ampGain = ctx.createGain(); ampGain.gain.value = 1.3;
    // Crackle LFO
    const lfo = ctx.createOscillator(); lfo.type = "sawtooth"; lfo.frequency.value = 2.8;
    const lfoG = ctx.createGain(); lfoG.gain.value = 0.45;
    lfo.connect(lfoG); lfoG.connect(ampGain.gain);
    src.connect(bp); bp.connect(ampGain); ampGain.connect(dest);
    src.start(); lfo.start();
    this.activeNodes.push(src, bp, ampGain, lfo, lfoG);

    // Sub-bass embers
    const sub = ctx.createOscillator(); sub.type = "sine"; sub.frequency.value = 55;
    const subG = ctx.createGain(); subG.gain.value = 0.08;
    sub.connect(subG); subG.connect(dest); sub.start();
    this.activeNodes.push(sub, subG);
  }

  private buildCafe(ctx: AudioContext, dest: AudioNode) {
    // Pink noise band-limited to voice/chatter range
    const src = ctx.createBufferSource();
    src.buffer = makePinkNoiseBuffer(ctx, 5);
    src.loop = true;
    const hp = ctx.createBiquadFilter(); hp.type = "highpass"; hp.frequency.value = 260;
    const lp = ctx.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 2200;
    const g = ctx.createGain(); g.gain.value = 0.85;
    src.connect(hp); hp.connect(lp); lp.connect(g); g.connect(dest);
    src.start();

    // Subtle clinking / ambience pulse
    const lfo = ctx.createOscillator(); lfo.type = "sine"; lfo.frequency.value = 0.22;
    const lfoG = ctx.createGain(); lfoG.gain.value = 0.18;
    lfo.connect(lfoG); lfoG.connect(g.gain);
    lfo.start();
    this.activeNodes.push(src, hp, lp, g, lfo, lfoG);
  }

  private buildDeep(ctx: AudioContext, dest: AudioNode) {
    // Binaural beat: two detuned sines (40 Hz + 43 Hz = 3 Hz delta beat)
    const osc1 = ctx.createOscillator(); osc1.type = "sine"; osc1.frequency.value = 40;
    const osc2 = ctx.createOscillator(); osc2.type = "sine"; osc2.frequency.value = 43;
    const g1 = ctx.createGain(); g1.gain.value = 0.35;
    const g2 = ctx.createGain(); g2.gain.value = 0.35;
    osc1.connect(g1); g1.connect(dest);
    osc2.connect(g2); g2.connect(dest);

    // Slow frequency drift
    const lfo = ctx.createOscillator(); lfo.type = "sine"; lfo.frequency.value = 0.07;
    const lfoG = ctx.createGain(); lfoG.gain.value = 2.5;
    lfo.connect(lfoG); lfoG.connect(osc1.frequency);

    osc1.start(); osc2.start(); lfo.start();
    this.activeNodes.push(osc1, osc2, g1, g2, lfo, lfoG);

    // Ambient drone pad on top
    const drone = ctx.createOscillator(); drone.type = "triangle"; drone.frequency.value = 110;
    const droneG = ctx.createGain(); droneG.gain.value = 0.06;
    drone.connect(droneG); droneG.connect(dest); drone.start();
    this.activeNodes.push(drone, droneG);
  }

  play(id: SoundId, volume?: number) {
    if (!isWeb() || id === "silence") {
      this.stop();
      this.currentId = id;
      return;
    }
    if (volume !== undefined) this.currentVolume = volume;
    this.currentId = id;

    const { ctx, master } = this.getCtx();
    this.stopNodes();
    this.fadeIn(master, ctx);

    switch (id) {
      case "white_noise": this.buildWhiteNoise(ctx, master); break;
      case "rain":        this.buildRain(ctx, master);       break;
      case "fire":        this.buildFire(ctx, master);       break;
      case "cafe":        this.buildCafe(ctx, master);       break;
      case "deep":        this.buildDeep(ctx, master);       break;
    }
  }

  stop() {
    if (!isWeb() || !this.ctx || !this.masterGain) return;
    this.fadeOut(this.masterGain, this.ctx, () => this.stopNodes());
  }

  setVolume(v: number) {
    this.currentVolume = v;
    if (!isWeb() || !this.masterGain || !this.ctx) return;
    const t = this.ctx.currentTime;
    this.masterGain.gain.cancelScheduledValues(t);
    this.masterGain.gain.setValueAtTime(this.masterGain.gain.value, t);
    this.masterGain.gain.linearRampToValueAtTime(v, t + 0.4);
  }

  getCurrentId() { return this.currentId; }
}

export const soundscape = new SoundscapeEngine();
