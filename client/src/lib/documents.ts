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
    
    // Render realistic signature based on signature data
    this.renderRealisticSignature(ctx, doc.data.signature as string, x + 15, y + 55, width - 30, 20);
    
    // Highlight errors
    if (!doc.isValid) {
      ctx.strokeStyle = '#ff0000';
      ctx.lineWidth = 3;
      ctx.strokeRect(x - 2, y - 2, width + 4, height + 4);
    }
  }

  private renderRealisticSignature(ctx: CanvasRenderingContext2D, signatureData: string, x: number, y: number, width: number, height: number): void {
    const parts = signatureData.split('|');
    const signatureName = parts[0] || signatureData;
    const styleMarkers = parts[1] ? parts[1].split('_') : [];
    const signatureType = parts[2] || 'legitimate';
    
    // Base signature style
    ctx.strokeStyle = '#00ff00';
    ctx.fillStyle = '#00ff00';
    
    // Determine visual characteristics from style markers
    let lineWidth = 2;
    let opacity = 1.0;
    let shaky = false;
    let rushed = false;
    let large = false;
    let small = false;
    let italic = false;
    
    if (styleMarkers.includes('bold')) lineWidth = 3;
    if (styleMarkers.includes('faint')) { lineWidth = 1; opacity = 0.6; }
    if (styleMarkers.includes('shaky')) shaky = true;
    if (styleMarkers.includes('rushed')) rushed = true;
    if (styleMarkers.includes('large')) large = true;
    if (styleMarkers.includes('small')) small = true;
    if (styleMarkers.includes('italic')) italic = true;
    
    // Apply opacity for faint signatures
    ctx.globalAlpha = opacity;
    ctx.lineWidth = lineWidth;
    
    // Parse name for signature rendering
    const nameParts = signatureName.split(' ');
    const firstName = nameParts[0] || '';
    const lastName = nameParts[nameParts.length - 1] || '';
    
    ctx.beginPath();
    
    // Calculate signature dimensions
    const sigHeight = large ? height * 0.8 : small ? height * 0.4 : height * 0.6;
    const centerY = y + height / 2;
    const startX = x + 5;
    
    // Render first name
    this.renderNamePart(ctx, firstName, startX, centerY, sigHeight, {
      shaky, rushed, italic, signatureType
    });
    
    // Space between names
    const firstNameWidth = firstName.length * (large ? 12 : small ? 6 : 9);
    
    // Render last name
    this.renderNamePart(ctx, lastName, startX + firstNameWidth + 10, centerY, sigHeight, {
      shaky, rushed, italic, signatureType
    });
    
    ctx.stroke();
    ctx.globalAlpha = 1.0; // Reset opacity
  }
  
  private renderNamePart(ctx: CanvasRenderingContext2D, namePart: string, startX: number, centerY: number, height: number, options: any): void {
    if (!namePart) return;
    
    const { shaky, rushed, italic, signatureType } = options;
    let currentX = startX;
    
    // Render each letter with realistic signature characteristics
    for (let i = 0; i < namePart.length; i++) {
      const char = namePart[i].toLowerCase();
      const letterWidth = height * 0.7;
      
      // Add shakiness for forgeries
      const shakeX = shaky ? (Math.random() - 0.5) * 3 : 0;
      const shakeY = shaky ? (Math.random() - 0.5) * 3 : 0;
      
      // Add italic slant
      const slantOffset = italic ? height * 0.2 : 0;
      
      // Rushed signatures have simpler strokes
      const complexity = rushed ? 0.5 : 1.0;
      
      this.renderSignatureLetter(ctx, char, currentX + shakeX, centerY + shakeY, letterWidth, height, slantOffset, complexity, signatureType);
      
      currentX += letterWidth * 0.8; // Letter spacing
    }
  }
  
  private renderSignatureLetter(ctx: CanvasRenderingContext2D, char: string, x: number, y: number, width: number, height: number, slant: number, complexity: number, signatureType: string): void {
    const halfHeight = height / 2;
    
    // Different rendering for fraudulent vs legitimate signatures
    if (signatureType.includes('different_name') || signatureType.includes('wrong_')) {
      // Fraudulent signatures - slightly different letter shapes
      this.renderFraudulentLetter(ctx, char, x, y, width, height, slant);
    } else if (signatureType.includes('trembling') || signatureType.includes('shaky')) {
      // Trembling forgery - add multiple small line segments
      this.renderTremblingLetter(ctx, char, x, y, width, height, slant);
    } else {
      // Legitimate signature - smooth curves
      this.renderLegitimeLetter(ctx, char, x, y, width, height, slant, complexity);
    }
  }
  
  private renderLegitimeLetter(ctx: CanvasRenderingContext2D, char: string, x: number, y: number, width: number, height: number, slant: number, complexity: number): void {
    const halfHeight = height / 2;
    
    switch (char) {
      case 'a': case 'o': case 'e':
        // Oval letters
        ctx.ellipse(x + width/2 + slant, y, width * 0.6, halfHeight * 0.8, 0, 0, Math.PI * 2);
        break;
      case 'i': case 'l': case 't':
        // Vertical letters
        ctx.moveTo(x + slant, y - halfHeight);
        ctx.lineTo(x + slant/2, y + halfHeight);
        break;
      case 'r': case 'n': case 'm':
        // Curved letters
        ctx.moveTo(x + slant, y + halfHeight);
        ctx.quadraticCurveTo(x + width/2 + slant, y - halfHeight * complexity, x + width + slant/2, y + halfHeight);
        break;
      case 's': case 'c':
        // S-curve letters
        ctx.moveTo(x + width + slant, y - halfHeight);
        ctx.bezierCurveTo(x + slant, y - halfHeight, x + slant, y + halfHeight, x + width + slant/2, y + halfHeight);
        break;
      default:
        // Generic letter shape
        ctx.moveTo(x + slant, y);
        ctx.quadraticCurveTo(x + width/2 + slant, y - halfHeight * complexity, x + width + slant/2, y);
    }
  }
  
  private renderFraudulentLetter(ctx: CanvasRenderingContext2D, char: string, x: number, y: number, width: number, height: number, slant: number): void {
    // Slightly different letter shapes to indicate forgery
    const halfHeight = height / 2;
    const offset = 2; // Small offset to make letters look "off"
    
    switch (char) {
      case 'a': case 'o': case 'e':
        ctx.ellipse(x + width/2 + slant + offset, y + offset, width * 0.5, halfHeight * 0.7, 0, 0, Math.PI * 2);
        break;
      case 'i': case 'l': case 't':
        ctx.moveTo(x + slant + offset, y - halfHeight + offset);
        ctx.lineTo(x + slant/2 + offset, y + halfHeight + offset);
        break;
      default:
        ctx.moveTo(x + slant + offset, y + offset);
        ctx.quadraticCurveTo(x + width/2 + slant + offset, y - halfHeight * 0.8 + offset, x + width + slant/2 + offset, y + offset);
    }
  }
  
  private renderTremblingLetter(ctx: CanvasRenderingContext2D, char: string, x: number, y: number, width: number, height: number, slant: number): void {
    // Trembling forgery - multiple small segments with random variations
    const halfHeight = height / 2;
    const segments = 8; // Number of small segments per letter
    
    for (let i = 0; i < segments; i++) {
      const segX = x + (width * i / segments) + slant;
      const segY = y + (Math.random() - 0.5) * 4; // Random trembling
      
      if (i === 0) {
        ctx.moveTo(segX, segY);
      } else {
        ctx.lineTo(segX + (Math.random() - 0.5) * 2, segY);
      }
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
