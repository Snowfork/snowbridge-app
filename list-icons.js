// Script to list all available icons in the lucide-react package
const fs = require("fs");
const path = require("path");

// Path to the node_modules directory
const nodeModulesPath = path.join(__dirname, "node_modules", "lucide-react");

try {
  // Read the index.d.ts file to extract all exported icon names
  const dtsPath = path.join(nodeModulesPath, "dist", "esm", "index.d.ts");

  if (fs.existsSync(dtsPath)) {
    const content = fs.readFileSync(dtsPath, "utf8");

    // Extract all exported component names that start with "Lucide"
    const iconRegex = /export declare const (Lucide\w+):/g;
    let match;
    const icons = [];

    while ((match = iconRegex.exec(content)) !== null) {
      icons.push(match[1]);
    }

    // Filter for bird-related icons
    const birdRelatedKeywords = [
      "bird",
      "canary",
      "duck",
      "eagle",
      "chicken",
      "feather",
      "wing",
      "fly",
    ];
    const birdRelatedIcons = icons.filter((icon) => {
      const iconName = icon.replace("Lucide", "").toLowerCase();
      return birdRelatedKeywords.some((keyword) => iconName.includes(keyword));
    });

    console.log("Bird-related icons:");
    birdRelatedIcons.forEach((icon) => console.log(icon));

    console.log("\nAll available icons:");
    icons.forEach((icon) => console.log(icon));
  } else {
    console.error("Could not find index.d.ts file. Path:", dtsPath);
  }
} catch (error) {
  console.error("Error:", error);
}
