# DefyGravity

DefyGravity is a premium, highly-customizable UI mod for the Antigravity desktop AI coding assistant. It injects a lush, responsive glassmorphic aesthetic with fully configurable, animated ambient light orbs directly into the Antigravity workspace.

## Features

- **Ambient Light Orbs:** Fully volumetric, constantly animated glowing orbs that drift around your interface. 
- **Ultimate Control:** Configure the size, spread, opacity, duration, and individual colors of up to 10 distinct orbs.
- **Glassmorphism:** A sleek, deep frosted glass aesthetic applies to the sidebar, topbar, and dialogs.
- **Banding Nullifier:** Employs an ultra-fine, mathematically-driven SVG noise pass (dithering) that completely eliminates color banding across 8-bit displays.
- **Persistent Settings:** Your personalized settings save locally to your profile and persist flawlessly across app restarts.
- **Global Theme Support:** Custom base backgrounds, scrobble styling, and more.

## Installation

DefyGravity is distributed as a pre-compiled `app.asar` file. To install it, you simply replace the original `app.asar` in your Antigravity installation folder.

1. **Close Antigravity:** Ensure the Antigravity app is completely closed.
2. **Locate your Antigravity Installation:** 
   Navigate to the resources folder of your Antigravity app. On Windows, this is typically located at:
   `C:\Users\USER\AppData\Local\Programs\Antigravity\resources\`
3. **Backup the Original:** Rename the existing `app.asar` to `app.asar.backup` (just in case you ever want to revert).
4. **Install DefyGravity:** Copy the modded `app.asar` from this repository and paste it into the `resources` directory.
5. **Launch & Enjoy:** Open Antigravity. Open the DefyGravity UI settings panel and start customizing!

## Source Code

The raw, uncompiled source code is available in the `app_unpacked` folder.

To compile it yourself:
\`\`\`bash
npx asar pack app_unpacked app.asar
\`\`\`
