// إنشاء نغمات تحذيرية حادة عبر Web Audio API
export const playAlertSound = (type: 'RETURN_TO_WORK' | 'SCHEDULE_VACATION') => {
  if (typeof window === 'undefined') return;
  
  const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.connect(gain);
  gain.connect(ctx.destination);

  if (type === 'RETURN_TO_WORK') {
    // صوت إنذار مزعج مكرر للعودة للعمل
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.3);
    gain.gain.setValueAtTime(1, ctx.currentTime);
    osc.start();
    osc.stop(ctx.currentTime + 1.5);
  } else {
    // صوت تنبيه لجدولة الإجازة
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(587.33, ctx.currentTime);
    gain.gain.setValueAtTime(0.8, ctx.currentTime);
    osc.start();
    osc.stop(ctx.currentTime + 1.0);
  }
};