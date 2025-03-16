import path from 'path';
import fs from 'fs-extra';
import { execa } from 'execa';
import { installDependencies } from './npm.js';
import { DatafaceConfig } from './config.js';

/**
 * Setup Tailwind CSS in the project
 */
export async function setupTailwind(
  config: DatafaceConfig,
  options: {
    cwd?: string;
  } = {}
): Promise<void> {
  const { cwd = process.cwd() } = options;
  
  // Install Tailwind CSS dependencies
  await installDependencies(
    ['tailwindcss', 'postcss', 'autoprefixer'],
    { cwd, dev: true }
  );
  
  // Create Tailwind config file
  const tailwindConfigPath = path.join(cwd, config.tailwind.config);
  
  if (!await fs.pathExists(tailwindConfigPath)) {
    // Initialize Tailwind CSS
    await execa('npx', ['tailwindcss', 'init', '-p'], { cwd });
    
    // Read the generated config
    const tailwindConfig = await fs.readFile(tailwindConfigPath, 'utf8');
    
    // Update the config with Dataface settings
    const updatedConfig = tailwindConfig
      .replace(
        'module.exports = {',
        `module.exports = {
  darkMode: ["class"],`
      )
      .replace(
        'content: [],',
        `content: [
    './pages/**/*.{js,jsx,ts,tsx}',
    './components/**/*.{js,jsx,ts,tsx}',
    './app/**/*.{js,jsx,ts,tsx}',
    './src/**/*.{js,jsx,ts,tsx}',
  ],`
      )
      .replace(
        'theme: {',
        `theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },`
      )
      .replace(
        'extend: {},',
        `extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: 0 },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: 0 },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },`
      );
    
    // Write the updated config
    await fs.writeFile(tailwindConfigPath, updatedConfig);
  }
  
  // Create or update CSS file
  const cssPath = path.join(cwd, config.tailwind.css);
  const cssDir = path.dirname(cssPath);
  
  if (!await fs.pathExists(cssDir)) {
    await fs.mkdirp(cssDir);
  }
  
  if (!await fs.pathExists(cssPath)) {
    // Create CSS file with Dataface styles
    const css = `@tailwind base;
@tailwind components;
@tailwind utilities;
 
${config.tailwind.cssVariables ? `@layer base {
  :root {
    --background: 0 0% 100%;
    --foreground: 222.2 84% 4.9%;

    --card: 0 0% 100%;
    --card-foreground: 222.2 84% 4.9%;
 
    --popover: 0 0% 100%;
    --popover-foreground: 222.2 84% 4.9%;
 
    --primary: 222.2 47.4% 11.2%;
    --primary-foreground: 210 40% 98%;
 
    --secondary: 210 40% 96.1%;
    --secondary-foreground: 222.2 47.4% 11.2%;
 
    --muted: 210 40% 96.1%;
    --muted-foreground: 215.4 16.3% 46.9%;
 
    --accent: 210 40% 96.1%;
    --accent-foreground: 222.2 47.4% 11.2%;
 
    --destructive: 0 84.2% 60.2%;
    --destructive-foreground: 210 40% 98%;

    --border: 214.3 31.8% 91.4%;
    --input: 214.3 31.8% 91.4%;
    --ring: 222.2 84% 4.9%;
 
    --radius: 0.5rem;
  }
 
  .dark {
    --background: 222.2 84% 4.9%;
    --foreground: 210 40% 98%;
 
    --card: 222.2 84% 4.9%;
    --card-foreground: 210 40% 98%;
 
    --popover: 222.2 84% 4.9%;
    --popover-foreground: 210 40% 98%;
 
    --primary: 210 40% 98%;
    --primary-foreground: 222.2 47.4% 11.2%;
 
    --secondary: 217.2 32.6% 17.5%;
    --secondary-foreground: 210 40% 98%;
 
    --muted: 217.2 32.6% 17.5%;
    --muted-foreground: 215 20.2% 65.1%;
 
    --accent: 217.2 32.6% 17.5%;
    --accent-foreground: 210 40% 98%;
 
    --destructive: 0 62.8% 30.6%;
    --destructive-foreground: 210 40% 98%;
 
    --border: 217.2 32.6% 17.5%;
    --input: 217.2 32.6% 17.5%;
    --ring: 212.7 26.8% 83.9%;
  }
}` : ''}
 
@layer base {
  * {
    @apply border-border;
  }
  body {
    @apply bg-background text-foreground;
  }
}`;
    
    await fs.writeFile(cssPath, css);
  }
} 