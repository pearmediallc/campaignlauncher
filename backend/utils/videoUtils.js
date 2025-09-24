const ffmpeg = require('fluent-ffmpeg');
const ffmpegInstaller = require('@ffmpeg-installer/ffmpeg');
const sharp = require('sharp');
const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');

// Set ffmpeg path
ffmpeg.setFfmpegPath(ffmpegInstaller.path);

class VideoUtils {
  /**
   * Extract the first frame from a video file
   * @param {string} videoPath - Path to the video file
   * @param {Object} options - Extraction options
   * @returns {Promise<string>} - Path to the extracted frame
   */
  static async extractFirstFrame(videoPath, options = {}) {
    const {
      outputDir = path.join(__dirname, '../uploads/thumbnails'),
      format = 'jpg',
      quality = 90,
      width = 1920,
      height = 1080
    } = options;

    // Ensure output directory exists
    await fs.mkdir(outputDir, { recursive: true });

    // Generate unique filename for thumbnail
    const hash = crypto.randomBytes(16).toString('hex');
    const thumbnailPath = path.join(outputDir, `thumbnail_${hash}.${format}`);

    return new Promise((resolve, reject) => {
      ffmpeg(videoPath)
        .screenshots({
          timestamps: ['00:00:00.001'], // First frame at 1ms
          filename: path.basename(thumbnailPath),
          folder: outputDir,
          size: `${width}x${height}`
        })
        .on('end', () => {
          console.log(`✓ Thumbnail extracted: ${thumbnailPath}`);
          resolve(thumbnailPath);
        })
        .on('error', (err) => {
          console.error('✗ Error extracting thumbnail:', err);
          reject(err);
        });
    });
  }

  /**
   * Extract frame and optimize for Facebook
   * @param {string} videoPath - Path to the video file
   * @returns {Promise<Buffer>} - Optimized image buffer
   */
  static async extractAndOptimizeFrame(videoPath) {
    try {
      // Extract first frame
      const framePath = await this.extractFirstFrame(videoPath, {
        format: 'png', // Use PNG for better quality during processing
        width: 1920,
        height: 1080
      });

      // Optimize with sharp for Facebook requirements
      const optimizedBuffer = await sharp(framePath)
        .resize(1200, 628, { // Facebook recommended size
          fit: 'cover',
          position: 'center'
        })
        .jpeg({ quality: 85 })
        .toBuffer();

      // Clean up temporary file
      await fs.unlink(framePath).catch(err => {
        console.warn('Could not delete temporary thumbnail:', err.message);
      });

      return optimizedBuffer;
    } catch (error) {
      console.error('Error in extractAndOptimizeFrame:', error);
      throw error;
    }
  }

  /**
   * Check if URL is Facebook's placeholder GIF
   * @param {string} url - URL to check
   * @returns {boolean}
   */
  static isPlaceholderThumbnail(url) {
    if (!url) return true;

    // Known Facebook placeholder patterns
    const placeholderPatterns = [
      'static.xx.fbcdn.net',
      'static.ak.fbcdn.net',
      '/rsrc.php/',
      'AAqMW82PqGg.gif', // Specific placeholder GIF
      'transparent.gif',
      'placeholder'
    ];

    return placeholderPatterns.some(pattern =>
      url.toLowerCase().includes(pattern.toLowerCase())
    );
  }

  /**
   * Get video metadata
   * @param {string} videoPath - Path to the video file
   * @returns {Promise<Object>} - Video metadata
   */
  static async getVideoMetadata(videoPath) {
    return new Promise((resolve, reject) => {
      ffmpeg.ffprobe(videoPath, (err, metadata) => {
        if (err) {
          reject(err);
        } else {
          const videoStream = metadata.streams.find(s => s.codec_type === 'video');
          resolve({
            duration: metadata.format.duration,
            width: videoStream?.width,
            height: videoStream?.height,
            codec: videoStream?.codec_name,
            format: metadata.format.format_name,
            size: metadata.format.size
          });
        }
      });
    });
  }
}

module.exports = VideoUtils;