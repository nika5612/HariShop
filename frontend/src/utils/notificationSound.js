// ═══════════════════ B9: Âm thanh thông báo ═══════════════════
// Tự tạo tiếng "ting" bằng Web Audio API — KHÔNG cần file âm thanh (.mp3) riêng,
// tránh phải quản lý thêm asset. Phát 2 nốt nhạc liên tiếp nghe giống thông báo
// Messenger/Discord.

let audioCtx = null

const getAudioContext = () => {
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext
    if (!AudioContextClass) return null
    audioCtx = new AudioContextClass()
  }
  return audioCtx
}

export const playNotificationSound = () => {
  try {
    const ctx = getAudioContext()
    if (!ctx) return

    // Một số trình duyệt tạm "suspend" AudioContext cho tới khi có tương tác người
    // dùng đầu tiên trên trang — thử resume, nếu không được thì bỏ qua lặng lẽ.
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {})
    }

    const now = ctx.currentTime

    const playTone = (freq, start, duration) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'sine'
      osc.frequency.value = freq
      gain.gain.setValueAtTime(0.0001, now + start)
      gain.gain.exponentialRampToValueAtTime(0.18, now + start + 0.01)
      gain.gain.exponentialRampToValueAtTime(0.0001, now + start + duration)
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.start(now + start)
      osc.stop(now + start + duration + 0.05)
    }

    playTone(880, 0, 0.15)       // nốt 1
    playTone(1174.66, 0.12, 0.2) // nốt 2 (cao hơn, hơi chồng lên nốt 1)
  } catch (err) {
    // Trình duyệt chặn/không hỗ trợ Web Audio API — bỏ qua, không quan trọng
  }
}