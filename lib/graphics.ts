export class RetroGraphics {
  private ctx: CanvasRenderingContext2D;
  
  constructor(ctx: CanvasRenderingContext2D) {
    this.ctx = ctx;
  }
  
  // Draw retro computer terminal
  drawTerminal(x: number, y: number, width: number, height: number): void {
    const ctx = this.ctx;
    
    // Terminal case
    ctx.fillStyle = '#2a2a2a';
    ctx.fillRect(x, y, width, height);
    
    // Screen bezel
    const screenMargin = 20;
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(x + screenMargin, y + screenMargin, width - screenMargin * 2, height - screenMargin * 3);
    
    // Screen
    const screenX = x + screenMargin + 10;
    const screenY = y + screenMargin + 10;
    const screenW = width - screenMargin * 2 - 20;
    const screenH = height - screenMargin * 3 - 20;
    
    ctx.fillStyle = '#001100';
    ctx.fillRect(screenX, screenY, screenW, screenH);
    
    // Screen glow effect
    const gradient = ctx.createRadialGradient(
      screenX + screenW/2, screenY + screenH/2, 0,
      screenX + screenW/2, screenY + screenH/2, Math.max(screenW, screenH)/2
    );
    gradient.addColorStop(0, 'rgba(0, 255, 0, 0.1)');
    gradient.addColorStop(1, 'rgba(0, 255, 0, 0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(screenX, screenY, screenW, screenH);
  }
  
  // Draw customer sprite
  drawCustomer(x: number, y: number, customerSprite: string, patience: number): void {
    const ctx = this.ctx;
    
    // Simple pixel art customer
    const headSize = 30;
    const bodyWidth = 40;
    const bodyHeight = 60;
    
    // Body
    ctx.fillStyle = patience > 50 ? '#0066cc' : '#cc6600';
    ctx.fillRect(x, y + headSize, bodyWidth, bodyHeight);
    
    // Head
    ctx.fillStyle = '#ffcc99';
    ctx.fillRect(x + 5, y, headSize, headSize);
    
    // Eyes
    ctx.fillStyle = '#000000';
    ctx.fillRect(x + 10, y + 8, 4, 4);
    ctx.fillRect(x + 20, y + 8, 4, 4);
    
    // Mouth - happy or upset based on patience
    ctx.fillStyle = '#000000';
    if (patience > 70) {
      // Happy mouth
      ctx.fillRect(x + 12, y + 18, 10, 2);
      ctx.fillRect(x + 10, y + 20, 2, 2);
      ctx.fillRect(x + 22, y + 20, 2, 2);
    } else if (patience > 30) {
      // Neutral mouth
      ctx.fillRect(x + 12, y + 18, 8, 2);
    } else {
      // Upset mouth
      ctx.fillRect(x + 10, y + 22, 2, 2);
      ctx.fillRect(x + 22, y + 22, 2, 2);
      ctx.fillRect(x + 12, y + 20, 10, 2);
    }
    
    // Patience indicator
    const barWidth = 40;
    const barHeight = 4;
    const barY = y + headSize + bodyHeight + 10;
    
    ctx.fillStyle = '#333333';
    ctx.fillRect(x, barY, barWidth, barHeight);
    
    const patienceWidth = (patience / 100) * barWidth;
    ctx.fillStyle = patience > 50 ? '#00ff00' : patience > 25 ? '#ffff00' : '#ff0000';
    ctx.fillRect(x, barY, patienceWidth, barHeight);
  }
  
  // Draw teller desk
  drawTellerDesk(x: number, y: number, width: number, height: number): void {
    const ctx = this.ctx;
    
    // Desk surface
    ctx.fillStyle = '#8B4513';
    ctx.fillRect(x, y, width, height);
    
    // Desk edge
    ctx.fillStyle = '#654321';
    ctx.fillRect(x, y + height - 10, width, 10);
    
    // Drawer handles
    const drawerY = y + height - 8;
    for (let i = 0; i < 3; i++) {
      const handleX = x + 50 + (i * 100);
      ctx.fillStyle = '#333333';
      ctx.fillRect(handleX, drawerY, 20, 4);
    }
  }
  
  // Draw window barrier
  drawWindow(x: number, y: number, width: number, height: number): void {
    const ctx = this.ctx;
    
    // Window frame
    ctx.fillStyle = '#444444';
    ctx.fillRect(x, y, width, 20);
    
    // Glass
    ctx.fillStyle = 'rgba(200, 255, 200, 0.1)';
    ctx.fillRect(x + 5, y + 20, width - 10, height - 40);
    
    // Bottom frame
    ctx.fillStyle = '#444444';
    ctx.fillRect(x, y + height - 20, width, 20);
  }
  
  // Draw retro text with glow effect
  drawRetroText(text: string, x: number, y: number, size: number = 16, color: string = '#00ff00'): void {
    const ctx = this.ctx;
    
    // Text glow
    ctx.shadowColor = color;
    ctx.shadowBlur = 10;
    ctx.fillStyle = color;
    ctx.font = `${size}px "Share Tech Mono"`;
    ctx.fillText(text, x, y);
    
    // Reset shadow
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
  }
  
  // Draw button with retro styling
  drawButton(x: number, y: number, width: number, height: number, text: string, isHovered: boolean = false): void {
    const ctx = this.ctx;
    
    // Button background
    ctx.fillStyle = isHovered ? '#004400' : '#002200';
    ctx.fillRect(x, y, width, height);
    
    // Button border
    ctx.strokeStyle = '#00ff00';
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, width, height);
    
    // Button text
    ctx.fillStyle = '#00ff00';
    ctx.font = '14px "Share Tech Mono"';
    const textWidth = ctx.measureText(text).width;
    ctx.fillText(text, x + (width - textWidth) / 2, y + height / 2 + 5);
  }
  
  // Draw progress bar
  drawProgressBar(x: number, y: number, width: number, height: number, progress: number, color: string = '#00ff00'): void {
    const ctx = this.ctx;
    
    // Background
    ctx.fillStyle = '#001100';
    ctx.fillRect(x, y, width, height);
    
    // Border
    ctx.strokeStyle = color;
    ctx.lineWidth = 1;
    ctx.strokeRect(x, y, width, height);
    
    // Progress fill
    const fillWidth = (progress / 100) * (width - 4);
    ctx.fillStyle = color;
    ctx.fillRect(x + 2, y + 2, fillWidth, height - 4);
  }
  
  // Add scanline effect
  addScanlines(): void {
    const ctx = this.ctx;
    const canvas = ctx.canvas;
    
    ctx.globalCompositeOperation = 'overlay';
    for (let y = 0; y < canvas.height; y += 4) {
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.1)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(canvas.width, y);
      ctx.stroke();
    }
    ctx.globalCompositeOperation = 'source-over';
  }
}
