type Resolve = () => void

export class TokenBucket {
  private tokens: number
  private lastRefill: number
  constructor(private capacity: number, private refillPerSec: number) {
    this.tokens = capacity
    this.lastRefill = Date.now()
  }
  private refill() {
    const now = Date.now()
    const delta = (now - this.lastRefill) / 1000
    const add = delta * this.refillPerSec
    if (add > 0) {
      this.tokens = Math.min(this.capacity, this.tokens + add)
      this.lastRefill = now
    }
  }
  tryRemove(cost = 1): boolean {
    this.refill()
    if (this.tokens >= cost) { this.tokens -= cost; return true }
    return false
  }
  async wait(cost = 1): Promise<void> {
    while (!this.tryRemove(cost)) await new Promise(r => setTimeout(r, 150))
  }
}
