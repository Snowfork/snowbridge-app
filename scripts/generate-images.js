#!/usr/bin/env node

/**
 * Image Generation Script for Snowbridge Landing Page
 *
 * Uses Google's Gemini API to generate snow-themed images for the landing page.
 *
 * Usage:
 *   GEMINI_API_KEY=your_api_key node scripts/generate-images.js
 *
 * Or generate a single image:
 *   GEMINI_API_KEY=your_api_key node scripts/generate-images.js --single hero-illustration.png
 */

const fs = require("fs");
const path = require("path");
const https = require("https");

// Configuration
const CONFIG = {
  apiKey: process.env.GEMINI_API_KEY,
  apiEndpoint:
    "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent",
  outputDir: path.join(__dirname, "../public/images/home"),
};

// Image prompts for the snow-themed landing page
const IMAGE_PROMPTS = [
  {
    filename: "hero-illustration.png",
    prompt: `Create a beautiful ethereal winter illustration with:
- Soft blue and pink gradient background
- Elegant snowflakes and ice crystals floating
- A magical bridge made of light connecting two floating islands
- One island has warm orange/coral tones (representing Ethereum)
- Other island has cool purple/blue tones (representing Polkadot)
- Dreamy, modern, minimalist tech aesthetic
- Suitable for a cryptocurrency bridge website hero section
- Clean, professional, high quality digital art`,
  },
  {
    filename: "snow-crystal-hero.png",
    prompt: `Create a stunning 3D rendered snowflake crystal:
- Large, detailed geometric snowflake design
- Soft gradient from coral pink to lavender to light blue
- Glass-like transparency with light refraction effects
- Floating in a soft gradient background
- Modern minimal design suitable for tech branding
- Clean edges, high quality render
- Elegant and sophisticated feel`,
  },
  {
    filename: "abstract-winter-bg.png",
    prompt: `Create an abstract winter-themed background:
- Flowing organic shapes with frosted glass effect
- Color palette: soft blues, white, hints of pink and lavender
- Subtle crystalline patterns
- Bokeh light effects like sunlight on snow
- Modern minimalist style
- Suitable as a website section background
- Dreamy, ethereal atmosphere`,
  },
  {
    filename: "trust-illustration.png",
    prompt: `Create an illustration representing trust and security:
- Abstract shield or protective dome made of crystalline ice
- Soft blue and teal color palette
- Light particles flowing around showing data/transactions
- Modern, clean tech aesthetic
- Conveys safety and protection
- Minimalist style suitable for a fintech website`,
  },
  {
    filename: "bridge-tokens.png",
    prompt: `Create an illustration of tokens crossing a bridge:
- Glowing circular tokens/coins flowing across a light bridge
- Ethereal, magical atmosphere
- Gradient from warm coral/orange on one side to cool purple/blue on other
- Particles of light trailing behind tokens
- Modern tech aesthetic
- Clean minimalist design
- Suitable for a cryptocurrency bridge website`,
  },
  {
    filename: "snow-mountain-bg.png",
    prompt: `Digital illustration of a cute fantasy winter wonderland scene:
- Kawaii/cute style illustration with soft rounded shapes
- Fluffy stylized clouds in pastel pink and lavender colors
- Cute rounded snow-covered hills and mountains
- Magical sparkles and glowing orbs floating in the air
- Soft gradient sky from pink to purple to light blue
- Style similar to: Dribbble illustrations, Behance digital art, modern app illustrations
- Flat design with subtle gradients, NO photorealism
- Dreamy, magical, fantasy atmosphere
- Very high quality, 4K resolution, crisp clean lines
- Wide banner format 1920x600 pixels
- Light and airy feel, lots of white space in the sky area`,
  },
];

/**
 * Generate an image using Google's Gemini API
 */
async function generateImage(prompt) {
  return new Promise((resolve, reject) => {
    const url = new URL(CONFIG.apiEndpoint);

    const requestBody = JSON.stringify({
      contents: [
        {
          parts: [{ text: prompt }],
        },
      ],
    });

    const options = {
      hostname: url.hostname,
      port: 443,
      path: `${url.pathname}?key=${CONFIG.apiKey}`,
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(requestBody),
      },
    };

    const req = https.request(options, (res) => {
      const chunks = [];

      res.on("data", (chunk) => {
        chunks.push(chunk);
      });

      res.on("end", () => {
        const data = Buffer.concat(chunks).toString();

        try {
          const response = JSON.parse(data);

          if (res.statusCode !== 200) {
            reject(
              new Error(
                `API error (${res.statusCode}): ${response.error?.message || data}`,
              ),
            );
            return;
          }

          resolve(response);
        } catch (e) {
          reject(new Error(`Failed to parse response: ${e.message}`));
        }
      });
    });

    req.on("error", (e) => {
      reject(new Error(`Request failed: ${e.message}`));
    });

    req.write(requestBody);
    req.end();
  });
}

/**
 * Extract and save image from Gemini response
 */
function saveImageFromResponse(response, filename) {
  const outputPath = path.join(CONFIG.outputDir, filename);

  // Ensure output directory exists
  if (!fs.existsSync(CONFIG.outputDir)) {
    fs.mkdirSync(CONFIG.outputDir, { recursive: true });
  }

  // Navigate through the response structure
  const candidates = response.candidates || [];
  for (const candidate of candidates) {
    const content = candidate.content || {};
    const parts = content.parts || [];

    for (const part of parts) {
      // Check for inline image data
      if (part.inlineData) {
        const { mimeType, data } = part.inlineData;
        const buffer = Buffer.from(data, "base64");
        fs.writeFileSync(outputPath, buffer);
        console.log(`   ✅ Saved: ${outputPath} (${mimeType})`);
        return true;
      }

      // Check for text response (model might describe what it would create)
      if (part.text) {
        console.log(`   📝 Model response: ${part.text.substring(0, 100)}...`);
      }
    }
  }

  return false;
}

/**
 * Main function to generate all images
 */
async function main() {
  console.log("🎨 Snowbridge Image Generator (Gemini API)");
  console.log("==========================================\n");

  // Check for API key
  if (!CONFIG.apiKey) {
    console.error("❌ Error: GEMINI_API_KEY environment variable not set");
    console.log("\nUsage:");
    console.log(
      "  GEMINI_API_KEY=your_api_key node scripts/generate-images.js",
    );
    console.log("\nOr add to .env.local:");
    console.log("  GEMINI_API_KEY=your_api_key");
    process.exit(1);
  }

  // Parse command line arguments
  const args = process.argv.slice(2);
  let prompts = IMAGE_PROMPTS;

  if (args.includes("--single") || args.includes("-s")) {
    const singleIndex =
      args.indexOf("--single") !== -1
        ? args.indexOf("--single")
        : args.indexOf("-s");
    const singleFilename = args[singleIndex + 1];

    if (singleFilename) {
      prompts = IMAGE_PROMPTS.filter((p) => p.filename === singleFilename);
      if (prompts.length === 0) {
        console.error(`❌ Error: Unknown image filename: ${singleFilename}`);
        console.log("\nAvailable images:");
        IMAGE_PROMPTS.forEach((p) => console.log(`  - ${p.filename}`));
        process.exit(1);
      }
    }
  }

  if (args.includes("--list") || args.includes("-l")) {
    console.log("Available images:");
    IMAGE_PROMPTS.forEach((p) => {
      console.log(`  - ${p.filename}`);
      console.log(`    ${p.prompt.split("\n")[0]}`);
    });
    process.exit(0);
  }

  console.log(`📁 Output directory: ${CONFIG.outputDir}`);
  console.log(`🖼️  Images to generate: ${prompts.length}\n`);

  let successCount = 0;

  for (const image of prompts) {
    console.log(`\n🔄 Generating: ${image.filename}`);
    console.log(`   Prompt: "${image.prompt.split("\n")[0]}..."`);

    try {
      const response = await generateImage(image.prompt);

      if (saveImageFromResponse(response, image.filename)) {
        successCount++;
      } else {
        console.log("   ⚠️ No image data in response");
      }
    } catch (error) {
      console.error(`   ❌ Error: ${error.message}`);
    }

    // Add delay between requests to avoid rate limiting
    if (prompts.indexOf(image) < prompts.length - 1) {
      console.log("   ⏳ Waiting 2 seconds before next request...");
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }
  }

  console.log("\n==========================================");
  console.log(
    `🎉 Complete! Generated ${successCount}/${prompts.length} images`,
  );

  if (successCount < prompts.length) {
    console.log("⚠️  Some images failed to generate. Check the errors above.");
    process.exit(1);
  }
}

// Run the script
main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
