# Logo Image Setup

## Instructions

1. **Place your logo file here:**
   - Save the FRANQUICIA BOOST logo as `franquicia-boost-logo.png` in this folder
   - The logo should ideally have a transparent background (PNG with alpha channel)
   - If you only have a logo with white background, we'll try to remove it with CSS

2. **Recommended formats:**
   - **PNG with transparency** (best option) - `.png` file with transparent background
   - **SVG** (if available) - Vector format that scales perfectly
   - **PNG with white background** - We'll try CSS filters to remove it

3. **File naming:**
   - The file should be named exactly: `franquicia-boost-logo.png`
   - Place it in: `assets/images/franquicia-boost-logo.png`

4. **If you have a logo with white background:**
   - The CSS will attempt to blend/remove the white background
   - For best results, use an image editor to remove the background before uploading
   - Tools like: Remove.bg, GIMP, Photoshop, or online PNG background removers

5. **Fallback:**
   - If the logo image fails to load, the chatbot will show the robot emoji (🤖) as a fallback

## Current Setup

The chatbot is configured to use the logo in these locations:
- Header icon (top left of chat window)
- Message avatars (bot messages)
- Disclaimer banner icon
- Typing indicator

All locations have fallback emoji icons if the logo image is not found.

