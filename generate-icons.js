const fs = require('fs');
const { createCanvas, loadImage } = require('canvas');

async function generateIcons() {
  const sizes = [16, 48, 128];
  const svgPath = './icons/icon.svg';
  const svgData = fs.readFileSync(svgPath, 'utf8');

  // Create a temporary HTML file to render SVG
  const html = `
    <html>
      <body>
        <img id="svg" src="data:image/svg+xml;base64,${Buffer.from(svgData).toString('base64')}" />
        <canvas id="canvas"></canvas>
      </body>
    </html>
  `;
  fs.writeFileSync('./temp.html', html);

  // Generate icons for each size
  for (const size of sizes) {
    const canvas = createCanvas(size, size);
    const ctx = canvas.getContext('2d');
    
    // Draw a blue background
    ctx.fillStyle = '#4a90e2';
    ctx.fillRect(0, 0, size, size);
    
    // Draw the icon elements
    ctx.strokeStyle = 'white';
    ctx.lineWidth = size / 16;
    
    // Draw rectangles
    const margin = size * 0.2;
    const width = size - (margin * 2);
    
    // Outer rectangle
    ctx.strokeRect(margin, margin, width, width);
    
    // Inner rectangle
    const innerMargin = margin + (size * 0.1);
    const innerWidth = width - (size * 0.2);
    ctx.strokeRect(innerMargin, innerMargin, innerWidth, innerWidth);
    
    // Draw lines
    const lineStart = margin + (size * 0.1);
    const lineEnd = size - margin - (size * 0.1);
    const lineSpacing = width / 3;
    
    for (let i = 0; i < 3; i++) {
      const y = margin + (lineSpacing * (i + 1));
      ctx.beginPath();
      ctx.moveTo(lineStart, y);
      ctx.lineTo(lineEnd, y);
      ctx.stroke();
    }
    
    // Save the PNG
    const buffer = canvas.toBuffer('image/png');
    fs.writeFileSync(`./icons/icon${size}.png`, buffer);
  }

  // Clean up
  fs.unlinkSync('./temp.html');
}

generateIcons().catch(console.error); 