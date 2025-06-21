import fs from 'fs';
import { createCanvas } from 'canvas';

// Create app icon (1024x1024)
function createIcon() {
  const canvas = createCanvas(1024, 1024);
  const ctx = canvas.getContext('2d');

  // Background
  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, 1024, 1024);

  // CRT Monitor Frame
  ctx.fillStyle = '#2a2a2a';
  ctx.strokeStyle = '#555555';
  ctx.lineWidth = 8;
  roundRect(ctx, 100, 150, 824, 724, 60);
  ctx.fill();
  ctx.stroke();

  // CRT Screen
  ctx.fillStyle = '#001100';
  ctx.strokeStyle = '#00ff00';
  ctx.lineWidth = 4;
  roundRect(ctx, 150, 200, 724, 544, 20);
  ctx.fill();
  ctx.stroke();

  // Screen content
  ctx.fillStyle = '#000000';
  ctx.fillRect(170, 220, 684, 504);

  // Text
  ctx.fillStyle = '#00ff00';
  ctx.font = 'bold 48px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('BANK TELLER', 512, 320);
  
  ctx.font = '32px monospace';
  ctx.fillText('1988', 512, 380);

  // Terminal lines
  ctx.globalAlpha = 0.8;
  ctx.fillRect(200, 420, 600, 3);
  ctx.globalAlpha = 0.6;
  ctx.fillRect(200, 450, 400, 3);
  ctx.fillRect(200, 480, 500, 3);
  ctx.globalAlpha = 1.0;

  // Dollar sign
  ctx.font = '120px monospace';
  ctx.fillText('$', 512, 600);

  // CRT Stand
  ctx.fillStyle = '#2a2a2a';
  roundRect(ctx, 400, 874, 224, 80, 10);
  ctx.fill();
  
  ctx.fillStyle = '#1a1a1a';
  roundRect(ctx, 350, 934, 324, 40, 20);
  ctx.fill();

  return canvas;
}

// Create splash screen (1284x2778 for iPhone 14 Pro)
function createSplash() {
  const canvas = createCanvas(1284, 2778);
  const ctx = canvas.getContext('2d');

  // Background
  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, 1284, 2778);

  // Large CRT monitor
  const centerX = 642;
  const centerY = 1389;
  
  // Monitor frame
  ctx.fillStyle = '#2a2a2a';
  ctx.strokeStyle = '#555555';
  ctx.lineWidth = 10;
  roundRect(ctx, centerX - 500, centerY - 400, 1000, 800, 80);
  ctx.fill();
  ctx.stroke();

  // Screen
  ctx.fillStyle = '#001100';
  ctx.strokeStyle = '#00ff00';
  ctx.lineWidth = 6;
  roundRect(ctx, centerX - 450, centerY - 350, 900, 700, 30);
  ctx.fill();
  ctx.stroke();

  // Screen content
  ctx.fillStyle = '#000000';
  ctx.fillRect(centerX - 430, centerY - 330, 860, 660);

  // Title
  ctx.fillStyle = '#00ff00';
  ctx.font = 'bold 72px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('BANK TELLER', centerX, centerY - 150);
  
  ctx.font = '48px monospace';
  ctx.fillText('1988', centerX, centerY - 80);

  // Subtitle
  ctx.font = '24px monospace';
  ctx.fillStyle = '#88ff88';
  ctx.fillText('Document Verification Simulator', centerX, centerY + 50);

  // Loading indicator
  ctx.fillStyle = '#00ff00';
  ctx.font = '32px monospace';
  ctx.fillText('LOADING...', centerX, centerY + 150);

  // Progress bar
  ctx.strokeStyle = '#00ff00';
  ctx.lineWidth = 3;
  ctx.strokeRect(centerX - 200, centerY + 200, 400, 20);
  ctx.fillStyle = '#00ff00';
  ctx.fillRect(centerX - 195, centerY + 205, 190, 10);

  return canvas;
}

// Helper function for rounded rectangles
function roundRect(ctx, x, y, width, height, radius) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

// Generate assets
try {
  const iconCanvas = createIcon();
  const splashCanvas = createSplash();

  // Save icon
  const iconBuffer = iconCanvas.toBuffer('image/png');
  fs.writeFileSync('./assets/icon.png', iconBuffer);

  // Save splash screen
  const splashBuffer = splashCanvas.toBuffer('image/png');
  fs.writeFileSync('./assets/splash.png', splashBuffer);

  // Create adaptive icon (Android)
  const adaptiveCanvas = createCanvas(1024, 1024);
  const adaptiveCtx = adaptiveCanvas.getContext('2d');
  
  // Simpler design for adaptive icon (foreground only)
  adaptiveCtx.fillStyle = '#00ff00';
  adaptiveCtx.font = 'bold 120px monospace';
  adaptiveCtx.textAlign = 'center';
  adaptiveCtx.fillText('BANK', 512, 400);
  adaptiveCtx.fillText('1988', 512, 550);
  
  // Dollar sign
  adaptiveCtx.font = '200px monospace';
  adaptiveCtx.fillText('$', 512, 700);

  const adaptiveBuffer = adaptiveCanvas.toBuffer('image/png');
  fs.writeFileSync('./assets/adaptive-icon.png', adaptiveBuffer);

  console.log('Assets generated successfully!');
} catch (error) {
  console.error('Error generating assets:', error);
}