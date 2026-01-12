#!/usr/bin/env python3
"""
Image Generation Script for Snowbridge Landing Page

Uses Google's Genai API with gemini-2.5-flash-image model to generate
snow-themed images for the landing page.

Usage:
    pip install google-genai pillow
    export GOOGLE_API_KEY=your_api_key
    python scripts/generate-images.py

Or pass the API key directly:
    python scripts/generate-images.py --api-key your_api_key
"""

import os
import sys
import argparse
from pathlib import Path

try:
    from google import genai
    from PIL import Image
except ImportError:
    print("Error: Required packages not installed.")
    print("Run: pip install google-genai pillow")
    sys.exit(1)


# Output directory for generated images
OUTPUT_DIR = Path(__file__).parent.parent / "public" / "images" / "home"

# Image prompts for the snow-themed landing page
IMAGE_PROMPTS = [
    {
        "filename": "hero-illustration.png",
        "prompt": """Create a beautiful ethereal winter illustration with:
- Soft blue and pink gradient background
- Elegant snowflakes and ice crystals floating
- A magical bridge made of light connecting two floating islands
- One island has warm orange/coral tones (representing Ethereum)
- Other island has cool purple/blue tones (representing Polkadot)
- Dreamy, modern, minimalist tech aesthetic
- Suitable for a cryptocurrency bridge website hero section
- Clean, professional, high quality digital art""",
    },
    {
        "filename": "snow-crystal-hero.png",
        "prompt": """Create a stunning 3D rendered snowflake crystal:
- Large, detailed geometric snowflake design
- Soft gradient from coral pink to lavender to light blue
- Glass-like transparency with light refraction effects
- Floating in a soft gradient background
- Modern minimal design suitable for tech branding
- Clean edges, high quality render
- Elegant and sophisticated feel""",
    },
    {
        "filename": "abstract-winter-bg.png",
        "prompt": """Create an abstract winter-themed background:
- Flowing organic shapes with frosted glass effect
- Color palette: soft blues, white, hints of pink and lavender
- Subtle crystalline patterns
- Bokeh light effects like sunlight on snow
- Modern minimalist style
- Suitable as a website section background
- Dreamy, ethereal atmosphere""",
    },
    {
        "filename": "trust-illustration.png",
        "prompt": """Create an illustration representing trust and security:
- Abstract shield or protective dome made of crystalline ice
- Soft blue and teal color palette
- Light particles flowing around showing data/transactions
- Modern, clean tech aesthetic
- Conveys safety and protection
- Minimalist style suitable for a fintech website""",
    },
    {
        "filename": "bridge-tokens.png",
        "prompt": """Create an illustration of tokens crossing a bridge:
- Glowing circular tokens/coins flowing across a light bridge
- Ethereal, magical atmosphere
- Gradient from warm coral/orange on one side to cool purple/blue on other
- Particles of light trailing behind tokens
- Modern tech aesthetic
- Clean minimalist design
- Suitable for a cryptocurrency bridge website""",
    },
]


def generate_image(client, prompt: str, filename: str) -> bool:
    """Generate a single image using Google Genai API."""
    try:
        print(f"\n🔄 Generating: {filename}")
        print(f"   Prompt: \"{prompt[:60]}...\"")

        response = client.models.generate_content(
            model="gemini-2.5-flash-image",
            contents=[prompt],
        )

        # Process response parts
        for part in response.parts:
            if part.text is not None:
                print(f"   📝 Model response: {part.text[:100]}...")
            elif part.inline_data is not None:
                # Save the generated image
                image = part.as_image()
                output_path = OUTPUT_DIR / filename
                image.save(output_path)
                print(f"   ✅ Saved: {output_path}")
                return True

        print("   ⚠️ No image generated in response")
        return False

    except Exception as e:
        print(f"   ❌ Error: {e}")
        return False


def main():
    parser = argparse.ArgumentParser(
        description="Generate snow-themed images for Snowbridge landing page"
    )
    parser.add_argument(
        "--api-key",
        help="Google API key (or set GOOGLE_API_KEY env var)",
        default=os.environ.get("GOOGLE_API_KEY"),
    )
    parser.add_argument(
        "--single",
        help="Generate only a specific image by filename",
        default=None,
    )
    args = parser.parse_args()

    print("🎨 Snowbridge Image Generator")
    print("=" * 40)

    # Check for API key
    api_key = args.api_key
    if not api_key:
        print("\n❌ Error: No API key provided")
        print("\nUsage:")
        print("  export GOOGLE_API_KEY=your_api_key")
        print("  python scripts/generate-images.py")
        print("\nOr:")
        print("  python scripts/generate-images.py --api-key your_api_key")
        sys.exit(1)

    # Create output directory
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    print(f"\n📁 Output directory: {OUTPUT_DIR}")

    # Initialize Genai client
    client = genai.Client(api_key=api_key)

    # Filter prompts if single image requested
    prompts = IMAGE_PROMPTS
    if args.single:
        prompts = [p for p in IMAGE_PROMPTS if p["filename"] == args.single]
        if not prompts:
            print(f"\n❌ Error: Unknown image filename: {args.single}")
            print("\nAvailable images:")
            for p in IMAGE_PROMPTS:
                print(f"  - {p['filename']}")
            sys.exit(1)

    print(f"🖼️  Images to generate: {len(prompts)}")

    # Generate images
    success_count = 0
    for image_config in prompts:
        if generate_image(client, image_config["prompt"], image_config["filename"]):
            success_count += 1

    print("\n" + "=" * 40)
    print(f"🎉 Complete! Generated {success_count}/{len(prompts)} images")

    if success_count < len(prompts):
        print("⚠️  Some images failed to generate. Check the errors above.")
        sys.exit(1)


if __name__ == "__main__":
    main()
