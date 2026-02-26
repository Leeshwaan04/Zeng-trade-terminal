// Simple synth for UI sounds using Web Audio API

class AudioManager {
    private ctx: AudioContext | null = null;
    private gainNode: GainNode | null = null;

    private init() {
        if (!this.ctx) {
            this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
            this.gainNode = this.ctx.createGain();
            this.gainNode.connect(this.ctx.destination);
        }
    }

    private playTone(freq: number, type: OscillatorType, duration: number, startTime: number) {
        if (!this.ctx || !this.gainNode) return;

        const osc = this.ctx.createOscillator();
        osc.type = type;
        osc.frequency.setValueAtTime(freq, startTime);
        osc.connect(this.gainNode);
        osc.start(startTime);
        osc.stop(startTime + duration);
    }

    public playSuccess() {
        try {
            this.init();
            if (!this.ctx || !this.gainNode) return;

            const now = this.ctx.currentTime;

            // "Cha-ching" / Arcade Coin sound
            // High C -> E -> G ascending
            this.gainNode.gain.cancelScheduledValues(now);
            this.gainNode.gain.setValueAtTime(0.1, now);
            this.gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.4);

            this.playTone(880, 'sine', 0.1, now);       // A5
            this.playTone(1108, 'sine', 0.1, now + 0.1); // C#6

        } catch (e) {
            console.error("Audio Playback Failed", e);
        }
    }

    public playError() {
        try {
            this.init();
            if (!this.ctx || !this.gainNode) return;

            const now = this.ctx.currentTime;

            // Low buzz
            this.gainNode.gain.cancelScheduledValues(now);
            this.gainNode.gain.setValueAtTime(0.1, now);
            this.gainNode.gain.linearRampToValueAtTime(0.01, now + 0.3);

            this.playTone(150, 'sawtooth', 0.2, now);
            this.playTone(120, 'sawtooth', 0.2, now + 0.1);

        } catch (e) {
            console.error("Audio Playback Failed", e);
        }
    }
}

export const audioManager = new AudioManager();
