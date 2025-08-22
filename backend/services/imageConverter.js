const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

class ImageConverter {
  /**
   * Convert any image to JPEG format for Facebook compatibility
   * Facebook prefers JPEG/PNG formats
   */
  static async convertToFacebookFormat(inputPath) {
    try {
      const outputDir = path.dirname(inputPath);
      const baseName = path.basename(inputPath, path.extname(inputPath));
      const outputPath = path.join(outputDir, `${baseName}-fb.jpg`);
      
      // Convert to JPEG with proper settings for Facebook
      // Using 1080x1080 for better compatibility (1:1 ratio)
      await sharp(inputPath)
        .rotate() // Auto-rotate based on EXIF data
        .resize(1080, 1080, {
          fit: 'cover',
          position: 'center'
        })
        .jpeg({
          quality: 90, // Higher quality
          progressive: false,
          mozjpeg: true // Better compression
        })
        .toFile(outputPath);
      
      console.log(`Image converted: ${outputPath}`);
      return outputPath;
    } catch (error) {
      console.error('Image conversion error:', error);
      return inputPath; // Return original if conversion fails
    }
  }
  
  /**
   * Validate and prepare image for Facebook upload
   */
  static async prepareForFacebook(imagePath) {
    try {
      const stats = fs.statSync(imagePath);
      const fileSizeInMB = stats.size / (1024 * 1024);
      
      // Get image metadata
      const metadata = await sharp(imagePath).metadata();
      
      // Always convert to ensure compatibility
      // Facebook is very strict about image formats
      console.log(`Processing image: ${path.basename(imagePath)}`);
      console.log(`Original format: ${metadata.format}, Size: ${fileSizeInMB.toFixed(2)}MB`);
      
      // Always convert to JPEG for maximum compatibility
      return await this.convertToFacebookFormat(imagePath);
      
    } catch (error) {
      console.error('Image preparation error:', error);
      return null;
    }
  }
}

module.exports = ImageConverter;