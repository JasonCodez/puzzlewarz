// Usage: node scripts/extract-logo-colors.mjs <path-to-image>
// Example: node scripts/extract-logo-colors.mjs public/images/puzzle_warz_logo.png
import Vibrant from 'node-vibrant/lib/vibrant';

const vibrantInstance = Vibrant.default || Vibrant;
const path = process.argv[2] || 'public/images/puzzle_warz_logo.png';

vibrantInstance.from(path).getPalette()
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
