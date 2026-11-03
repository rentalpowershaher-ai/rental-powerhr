let ctx: AudioContext | null = null, timer: any
export function unlock() { ctx = ctx || new (window.AudioContext || (window as any).webkitAudioContext)(); ctx.resume() }
function tone(f1: number, f2: number, dur: number, vol: number) {
  if (!ctx) return
  const o = ctx.createOscillator(), g = ctx.createGain(), t = ctx.currentTime
  o.type = 'square'; o.connect(g); g.connect(ctx.destination); g.gain.value = vol
  o.frequency.setValueAtTime(f1, t); o.frequency.linearRampToValueAtTime(f2, t + dur / 2); o.frequency.linearRampToValueAtTime(f1, t + dur)
  o.start(t); o.stop(t + dur)
}
// صفارة مزعجة متكررة لحد ما الموظف يتصرف
export function siren(on: boolean) {
  clearInterval(timer)
  if (!on) return
  const play = () => { tone(700, 1400, 1, 0.6); navigator.vibrate?.([400, 150, 400]) }
  play(); timer = setInterval(play, 1000)
}
export const beep = () => { tone(880, 1320, 0.4, 0.3); navigator.vibrate?.(200) }
