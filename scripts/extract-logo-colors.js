// Usage: node scripts/extract-logo-colors.js <path-to-image>
// Example: node scripts/extract-logo-colors.js public/images/puzzle_warz_logo.png
const Vibrant = require('node-vibrant/lib/vibrant');
// ...existing code...
const path = process.argv[2] || 'public/images/puzzle_warz_logo.png';

Vibrant.from(path).getPalette()
  .then((palette) => {
    console.log('Dominant colors from logo:');
    Object.entries(palette).forEach(([name, swatch]) => {
      if (swatch) {
        console.log(`${name}: ${swatch.getHex()} (rgb: ${swatch.getRgb().map(Math.round).join(', ')})`);
      }
    });
  })
  .catch((err) => {
    console.error('Error extracting colors:', err);
  });
