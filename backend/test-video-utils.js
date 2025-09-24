const VideoUtils = require('./utils/videoUtils');
const path = require('path');
const fs = require('fs');

async function testVideoUtils() {
  console.log('\n🧪 Testing VideoUtils class...\n');

  // Test placeholder detection
  console.log('1️⃣ Testing placeholder detection:');
  const testUrls = [
    'https://static.xx.fbcdn.net/rsrc.php/v4/yN/r/AAqMW82PqGg.gif',
    'https://graph.facebook.com/123456/thumbnail',
    'https://example.com/video.jpg',
    'https://static.ak.fbcdn.net/placeholder.gif'
  ];

  testUrls.forEach(url => {
    const isPlaceholder = VideoUtils.isPlaceholderThumbnail(url);
    console.log(`   ${isPlaceholder ? '❌' : '✅'} ${url}`);
  });

  // Test with a sample video if available
  const testVideoPath = path.join(__dirname, 'uploads', 'test-video.mp4');
  if (fs.existsSync(testVideoPath)) {
    console.log('\n2️⃣ Testing video metadata extraction:');
    try {
      const metadata = await VideoUtils.getVideoMetadata(testVideoPath);
      console.log('   Video metadata:', metadata);
    } catch (error) {
      console.log('   ⚠️ Could not get metadata:', error.message);
    }

    console.log('\n3️⃣ Testing frame extraction:');
    try {
      const framePath = await VideoUtils.extractFirstFrame(testVideoPath);
      console.log(`   ✅ Frame extracted to: ${framePath}`);

      // Check file exists
      if (fs.existsSync(framePath)) {
        const stats = fs.statSync(framePath);
        console.log(`   📊 Frame size: ${(stats.size / 1024).toFixed(2)} KB`);

        // Clean up
        fs.unlinkSync(framePath);
        console.log('   🗑️ Test frame cleaned up');
      }
    } catch (error) {
      console.log('   ⚠️ Could not extract frame:', error.message);
    }
  } else {
    console.log('\n⚠️ No test video found at:', testVideoPath);
    console.log('   Place a test video there to test extraction');
  }

  console.log('\n✅ VideoUtils tests complete!\n');
}

testVideoUtils().catch(console.error);