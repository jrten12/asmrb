import React, { useRef, useEffect } from 'react';
import { GameState } from '../../types/game';
import { RetroGraphics } from '../../lib/graphics';
import { getDocumentRenderer } from '../../lib/documents';

interface GameCanvasProps {
  gameState: GameState;
  onDocumentClick: (documentId: string) => void;
  onProcessClick: () => void;
  onRejectClick: () => void;
}

export function GameCanvas({ gameState, onDocumentClick, onProcessClick, onRejectClick }: GameCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mousePos = useRef({ x: 0, y: 0 });
  
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Set canvas size
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    
    const graphics = new RetroGraphics(ctx);
    
    function render() {
      if (!ctx || !canvas) return;
      
      // Clear canvas
      ctx.fillStyle = '#001100';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      // Draw game scene based on phase
      switch (gameState.phase) {
        case 'intro':
          renderIntroScreen(ctx, graphics, canvas);
          break;
        case 'working':
          renderGameScreen(ctx, graphics, canvas);
          break;
        case 'supervisor':
          renderSupervisorScreen(ctx, graphics, canvas);
          break;
        case 'ended':
          renderEndScreen(ctx, graphics, canvas);
          break;
      }
      
      // Add scanlines for retro effect
      graphics.addScanlines();
    }
    
    function renderIntroScreen(ctx: CanvasRenderingContext2D, graphics: RetroGraphics, canvas: HTMLCanvasElement) {
      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;
      
      // Draw computer terminal background
      graphics.drawTerminal(centerX - 250, centerY - 150, 500, 300);
      
      // Draw title text
      graphics.drawRetroText('TELLER\'S WINDOW', centerX - 150, centerY - 80, 24);
      graphics.drawRetroText('1980s Bank Simulation', centerX - 130, centerY - 40, 14);
      
      // Draw start button area
      graphics.drawButton(centerX - 100, centerY + 10, 200, 40, 'START SHIFT');
      
      // Draw instructions
      graphics.drawRetroText('Click anywhere to begin...', centerX - 100, centerY + 80, 12, '#ffff00');
      
      // Draw blinking cursor
      if (Math.floor(Date.now() / 500) % 2) {
        graphics.drawRetroText('_', centerX + 110, centerY + 80, 12, '#ffff00');
      }
    }
    
    function renderGameScreen(ctx: CanvasRenderingContext2D, graphics: RetroGraphics, canvas: HTMLCanvasElement) {
      // Draw teller desk
      graphics.drawTellerDesk(0, canvas.height - 150, canvas.width, 150);
      
      // Draw computer terminal
      graphics.drawTerminal(canvas.width - 300, canvas.height - 140, 280, 120);
      
      // Draw window barrier
      graphics.drawWindow(0, canvas.height - 400, canvas.width, 100);
      
      // Draw customer if present
      if (gameState.currentCustomer) {
        graphics.drawCustomer(100, canvas.height - 350, gameState.currentCustomer.sprite, gameState.currentCustomer.patience);
        
        // Draw customer speech bubble
        const bubbleX = 200;
        const bubbleY = canvas.height - 450;
        ctx.fillStyle = '#002200';
        ctx.fillRect(bubbleX, bubbleY, 200, 60);
        ctx.strokeStyle = '#00ff00';
        ctx.strokeRect(bubbleX, bubbleY, 200, 60);
        
        graphics.drawRetroText(`${gameState.currentCustomer.transaction.type.toUpperCase()}`, bubbleX + 10, bubbleY + 20, 12);
        graphics.drawRetroText(`$${gameState.currentCustomer.transaction.amount}`, bubbleX + 10, bubbleY + 40, 12);
      }
      
      // Draw documents area
      if (gameState.currentCustomer) {
        const docsStartX = 50;
        const docsStartY = 50;
        const docWidth = 150;
        const docHeight = 100;
        const docSpacing = 170;
        
        gameState.currentCustomer.documents.forEach((doc, index) => {
          const docX = docsStartX + (index * docSpacing);
          const docY = docsStartY;
          
          // Highlight selected document
          if (gameState.selectedDocument?.id === doc.id) {
            ctx.fillStyle = '#004400';
            ctx.fillRect(docX - 5, docY - 5, docWidth + 10, docHeight + 10);
          }
          
          const renderer = getDocumentRenderer(doc.type);
          renderer.render(ctx, doc, docX, docY, docWidth, docHeight);
          
          // Document label
          graphics.drawRetroText(doc.type.toUpperCase(), docX, docY + docHeight + 20, 10);
        });
      }
      
      // Draw action buttons
      const buttonY = canvas.height - 50;
      const buttonWidth = 120;
      const buttonHeight = 30;
      
      if (gameState.processingState === 'idle') {
        graphics.drawButton(canvas.width / 2 - 130, buttonY, buttonWidth, buttonHeight, 'PROCESS');
        graphics.drawButton(canvas.width / 2 + 10, buttonY, buttonWidth, buttonHeight, 'REJECT');
      } else if (gameState.processingState === 'reviewing') {
        graphics.drawRetroText('PROCESSING...', canvas.width / 2 - 60, buttonY + 20, 16, '#ffff00');
      } else if (gameState.processingState === 'complete') {
        graphics.drawRetroText('COMPLETE', canvas.width / 2 - 40, buttonY + 20, 16, '#00ff00');
      }
    }
    
    function renderSupervisorScreen(ctx: CanvasRenderingContext2D, graphics: RetroGraphics, canvas: HTMLCanvasElement) {
      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;
      
      // Draw supervisor character
      graphics.drawCustomer(centerX - 20, centerY - 100, 'supervisor', 100);
      
      // Draw message
      if (gameState.supervisorMessage) {
        const bubbleX = centerX - 200;
        const bubbleY = centerY + 50;
        ctx.fillStyle = '#440000';
        ctx.fillRect(bubbleX, bubbleY, 400, 80);
        ctx.strokeStyle = '#ff0000';
        ctx.strokeRect(bubbleX, bubbleY, 400, 80);
        
        graphics.drawRetroText('SUPERVISOR:', bubbleX + 10, bubbleY + 20, 12, '#ff0000');
        
        // Word wrap the message
        const words = gameState.supervisorMessage.split(' ');
        let line = '';
        let y = bubbleY + 40;
        
        words.forEach(word => {
          const testLine = line + word + ' ';
          const metrics = ctx.measureText(testLine);
          
          if (metrics.width > 380 && line) {
            graphics.drawRetroText(line, bubbleX + 10, y, 10, '#ff0000');
            line = word + ' ';
            y += 15;
          } else {
            line = testLine;
          }
        });
        
        if (line) {
          graphics.drawRetroText(line, bubbleX + 10, y, 10, '#ff0000');
        }
      }
    }
    
    function renderEndScreen(ctx: CanvasRenderingContext2D, graphics: RetroGraphics, canvas: HTMLCanvasElement) {
      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;
      
      graphics.drawRetroText('SHIFT ENDED', centerX - 100, centerY - 100, 24);
      graphics.drawRetroText(`FINAL SCORE: ${gameState.score}`, centerX - 100, centerY - 50, 16);
      graphics.drawRetroText(`TRANSACTIONS: ${gameState.completedTransactions}`, centerX - 100, centerY - 20, 16);
      graphics.drawRetroText(`MISTAKES: ${gameState.mistakes}`, centerX - 100, centerY + 10, 16);
      graphics.drawRetroText(`LEVEL REACHED: ${gameState.level}`, centerX - 100, centerY + 40, 16);
      
      graphics.drawRetroText('Click to start new shift...', centerX - 120, centerY + 100, 14, '#ffff00');
    }
    
    render();
  }, [gameState]);
  
  // Handle touch and mouse events
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    function handleMouseMove(e: MouseEvent) {
      const rect = canvas!.getBoundingClientRect();
      mousePos.current = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      };
    }
    
    function handleTouch(e: TouchEvent) {
      e.preventDefault();
      console.log('Touch detected:', e.type);
      const rect = canvas!.getBoundingClientRect();
      const touch = e.touches[0] || e.changedTouches[0];
      if (touch) {
        const x = touch.clientX - rect.left;
        const y = touch.clientY - rect.top;
        console.log('Touch coordinates:', x, y, 'Game phase:', gameState.phase);
        handleInteraction(x, y);
      }
    }
    
    function handleClick(e: MouseEvent) {
      const rect = canvas!.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      handleInteraction(x, y);
    }
    
    function handleInteraction(x: number, y: number) {
      
      if (gameState.phase === 'intro') {
        // Start game - click anywhere on the intro screen
        window.dispatchEvent(new CustomEvent('startGame'));
      } else if (gameState.phase === 'working' && gameState.currentCustomer) {
        // Check document clicks
        const docsStartX = 50;
        const docsStartY = 50;
        const docWidth = 150;
        const docHeight = 100;
        const docSpacing = 170;
        
        gameState.currentCustomer.documents.forEach((doc, index) => {
          const docX = docsStartX + (index * docSpacing);
          const docY = docsStartY;
          
          if (x >= docX && x <= docX + docWidth && y >= docY && y <= docY + docHeight) {
            onDocumentClick(doc.id);
          }
        });
        
        // Check button clicks
        const buttonY = canvas!.height - 50;
        const buttonWidth = 120;
        const buttonHeight = 30;
        
        if (gameState.processingState === 'idle') {
          // Process button
          if (x >= canvas!.width / 2 - 130 && x <= canvas!.width / 2 - 10 && 
              y >= buttonY && y <= buttonY + buttonHeight) {
            onProcessClick();
          }
          
          // Reject button
          if (x >= canvas!.width / 2 + 10 && x <= canvas!.width / 2 + 130 && 
              y >= buttonY && y <= buttonY + buttonHeight) {
            onRejectClick();
          }
        }
      } else if (gameState.phase === 'ended') {
        // Restart game
        const centerX = canvas!.width / 2;
        const centerY = canvas!.height / 2;
        if (x > centerX - 150 && x < centerX + 150 && y > centerY + 80 && y < centerY + 120) {
          window.dispatchEvent(new CustomEvent('restartGame'));
        }
      }
    }
    
    // Add both mouse and touch events
    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('click', handleClick);
    canvas.addEventListener('touchstart', handleTouch);
    canvas.addEventListener('touchend', handleTouch);
    
    return () => {
      canvas.removeEventListener('mousemove', handleMouseMove);
      canvas.removeEventListener('click', handleClick);
      canvas.removeEventListener('touchstart', handleTouch);
      canvas.removeEventListener('touchend', handleTouch);
    };
  }, [gameState, onDocumentClick, onProcessClick, onRejectClick]);
  
  return (
    <canvas
      ref={canvasRef}
      className="block"
      style={{ 
        cursor: 'none',
        background: '#001100'
      }}
    />
  );
}
