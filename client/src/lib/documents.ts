import { Document } from '../types/game';

export interface DocumentRenderer {
  render(ctx: CanvasRenderingContext2D, doc: Document, x: number, y: number, width: number, height: number): void;
}

export class IDCardRenderer implements DocumentRenderer {
  render(ctx: CanvasRenderingContext2D, doc: Document, x: number, y: number, width: number, height: number): void {
    // Draw ID card background
    ctx.fillStyle = '#2a4d3a';
    ctx.fillRect(x, y, width, height);
    
    // Draw border
    ctx.strokeStyle = '#00ff00';
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, width, height);
    
    // Draw header
    ctx.fillStyle = '#00ff00';
    ctx.font = '12px "Share Tech Mono"';
    ctx.fillText('IDENTIFICATION CARD', x + 10, y + 20);
    
    // Draw photo placeholder
    ctx.fillStyle = '#1a3d2a';
    ctx.fillRect(x + 10, y + 30, 40, 50);
    ctx.strokeStyle = '#00ff00';
    ctx.strokeRect(x + 10, y + 30, 40, 50);
    
    // Draw info
    ctx.fillStyle = '#00ff00';
    ctx.font = '10px "Share Tech Mono"';
    ctx.fillText('NAME:', x + 60, y + 40);
    ctx.fillText(doc.data.name || 'N/A', x + 60, y + 55);
    ctx.fillText('ID NO:', x + 60, y + 70);
    ctx.fillText(doc.data.idNumber || 'N/A', x + 60, y + 85);
    
    // Highlight errors
    if (!doc.isValid) {
      ctx.strokeStyle = '#ff0000';
      ctx.lineWidth = 3;
      ctx.strokeRect(x - 2, y - 2, width + 4, height + 4);
    }
  }
}

export class TransactionSlipRenderer implements DocumentRenderer {
  render(ctx: CanvasRenderingContext2D, doc: Document, x: number, y: number, width: number, height: number): void {
    // Draw slip background
    ctx.fillStyle = '#1a3d2a';
    ctx.fillRect(x, y, width, height);
    
    // Draw border
    ctx.strokeStyle = '#00ff00';
    ctx.lineWidth = 1;
    ctx.strokeRect(x, y, width, height);
    
    // Draw header
    ctx.fillStyle = '#00ff00';
    ctx.font = '12px "Share Tech Mono"';
    ctx.fillText('TRANSACTION SLIP', x + 10, y + 20);
    
    // Draw transaction details
    ctx.font = '10px "Share Tech Mono"';
    let yPos = y + 40;
    
    ctx.fillText(`TYPE: ${doc.data.type?.toUpperCase()}`, x + 10, yPos);
    yPos += 15;
    ctx.fillText(`NAME: ${doc.data.name}`, x + 10, yPos);
    yPos += 15;
    ctx.fillText(`ACCOUNT: ${doc.data.accountNumber}`, x + 10, yPos);
    yPos += 15;
    ctx.fillText(`AMOUNT: $${doc.data.amount}`, x + 10, yPos);
    
    if (doc.data.targetAccount) {
      yPos += 15;
      ctx.fillText(`TO: ${doc.data.targetAccount}`, x + 10, yPos);
    }
    
    // Highlight errors
    if (!doc.isValid) {
      ctx.strokeStyle = '#ff0000';
      ctx.lineWidth = 3;
      ctx.strokeRect(x - 2, y - 2, width + 4, height + 4);
    }
  }
}

export class BankBookRenderer implements DocumentRenderer {
  render(ctx: CanvasRenderingContext2D, doc: Document, x: number, y: number, width: number, height: number): void {
    // Draw book background
    ctx.fillStyle = '#2a4d3a';
    ctx.fillRect(x, y, width, height);
    
    // Draw binding
    ctx.fillStyle = '#1a3d2a';
    ctx.fillRect(x, y, 10, height);
    
    // Draw border
    ctx.strokeStyle = '#00ff00';
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, width, height);
    
    // Draw header
    ctx.fillStyle = '#00ff00';
    ctx.font = '12px "Share Tech Mono"';
    ctx.fillText('BANK BOOK', x + 20, y + 20);
    
    // Draw account info
    ctx.font = '10px "Share Tech Mono"';
    let yPos = y + 40;
    
    ctx.fillText(`ACCOUNT HOLDER:`, x + 15, yPos);
    yPos += 12;
    ctx.fillText(doc.data.name || 'N/A', x + 15, yPos);
    yPos += 20;
    
    ctx.fillText(`ACCOUNT NO:`, x + 15, yPos);
    yPos += 12;
    ctx.fillText(doc.data.accountNumber || 'N/A', x + 15, yPos);
    yPos += 20;
    
    ctx.fillText(`BALANCE: $${doc.data.balance || 0}`, x + 15, yPos);
    
    // Highlight errors
    if (!doc.isValid) {
      ctx.strokeStyle = '#ff0000';
      ctx.lineWidth = 3;
      ctx.strokeRect(x - 2, y - 2, width + 4, height + 4);
    }
  }
}

export class SignatureRenderer implements DocumentRenderer {
  render(ctx: CanvasRenderingContext2D, doc: Document, x: number, y: number, width: number, height: number): void {
    // Draw signature card background
    ctx.fillStyle = '#1a3d2a';
    ctx.fillRect(x, y, width, height);
    
    // Draw border
    ctx.strokeStyle = '#00ff00';
    ctx.lineWidth = 1;
    ctx.strokeRect(x, y, width, height);
    
    // Draw header
    ctx.fillStyle = '#00ff00';
    ctx.font = '12px "Share Tech Mono"';
    ctx.fillText('SIGNATURE CARD', x + 10, y + 20);
    
    // Draw name
    ctx.font = '10px "Share Tech Mono"';
    ctx.fillText(`NAME: ${doc.data.name}`, x + 10, y + 40);
    
    // Draw signature area
    ctx.strokeStyle = '#00ff00';
    ctx.strokeRect(x + 10, y + 50, width - 20, 30);
    
    // Draw signature (simplified)
    ctx.strokeStyle = '#00ff00';
    ctx.lineWidth = 2;
    ctx.beginPath();
    const centerX = x + width / 2;
    const centerY = y + 65;
    ctx.moveTo(centerX - 30, centerY);
    ctx.quadraticCurveTo(centerX - 10, centerY - 10, centerX + 10, centerY);
    ctx.quadraticCurveTo(centerX + 30, centerY + 10, centerX + 40, centerY - 5);
    ctx.stroke();
    
    // Highlight errors
    if (!doc.isValid) {
      ctx.strokeStyle = '#ff0000';
      ctx.lineWidth = 3;
      ctx.strokeRect(x - 2, y - 2, width + 4, height + 4);
    }
  }
}

export function getDocumentRenderer(type: Document['type']): DocumentRenderer {
  switch (type) {
    case 'id':
      return new IDCardRenderer();
    case 'slip':
      return new TransactionSlipRenderer();
    case 'bank_book':
      return new BankBookRenderer();
    case 'signature':
      return new SignatureRenderer();
    default:
      return new IDCardRenderer();
  }
}
