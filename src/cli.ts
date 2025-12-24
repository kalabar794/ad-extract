#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import { getExtractor, getAvailablePlatforms } from './extractors';
import { analyzeCompetitor, categorizeAds } from './analyzers';
import { generateReports } from './reporters';
import { closeBrowser } from './utils/browser';
import { defaultConfig, AppConfig, Platform, OutputConfig, Ad } from './types';
import { createLogger } from './utils/logger';

const logger = createLogger('cli');

const program = new Command();

program
  .name('ad-extractor')
  .description('Competitive advertising intelligence extraction tool')
  .version('1.0.0');

// Extract command
program
  .command('extract')
  .description('Extract ads from ad libraries')
  .requiredOption('-c, --competitor <name>', 'Competitor name or page ID')
  .option('-p, --platforms <platforms>', 'Platforms to extract from (comma-separated)', 'meta')
  .option('-m, --max <number>', 'Maximum ads to extract per platform', '50')
  .option('-o, --output <directory>', 'Output directory', './output')
  .option('--country <code>', 'Country code for ad library', 'US')
  .option('--screenshots', 'Capture ad screenshots', false)
  .option('--landing-pages', 'Analyze landing pages', false)
  .option('--include-inactive', 'Include inactive ads', false)
  .option('--formats <formats>', 'Report formats (comma-separated)', 'json,markdown')
  .option('--headless', 'Run browser in headless mode', true)
  .option('--no-headless', 'Run browser with visible window')
  .action(async (options) => {
    console.log(chalk.blue.bold('\n🔍 Competitive Ads Extractor\n'));

    const platforms = options.platforms.split(',').map((p: string) => p.trim().toLowerCase());
    const availablePlatforms = getAvailablePlatforms();

    // Validate platforms
    for (const platform of platforms) {
      if (!availablePlatforms.includes(platform as Platform)) {
        console.log(chalk.yellow(`⚠️  Platform "${platform}" not yet implemented. Available: ${availablePlatforms.join(', ')}`));
        platforms.splice(platforms.indexOf(platform), 1);
      }
    }

    if (platforms.length === 0) {
      console.log(chalk.red('❌ No valid platforms specified'));
      process.exit(1);
    }

    // Build config
    const config: Partial<AppConfig> = {
      browser: {
        ...defaultConfig.browser,
        headless: options.headless
      },
      extraction: {
        ...defaultConfig.extraction,
        screenshots: options.screenshots,
        landingPageAnalysis: options.landingPages
      },
      output: {
        ...defaultConfig.output,
        directory: options.output,
        formats: options.formats.split(',') as OutputConfig['formats']
      }
    };

    console.log(chalk.gray(`Competitor: ${options.competitor}`));
    console.log(chalk.gray(`Platforms: ${platforms.join(', ')}`));
    console.log(chalk.gray(`Max ads per platform: ${options.max}`));
    console.log(chalk.gray(`Output: ${options.output}`));
    console.log();

    const allAds: Ad[] = [];
    const startTime = Date.now();

    try {
      // Extract from each platform
      for (const platform of platforms) {
        console.log(chalk.cyan(`\n📱 Extracting from ${platform.toUpperCase()}...`));

        const extractor = getExtractor(platform as Platform, config, {
          onProgress: (message, progress) => {
            process.stdout.write(`\r  ${chalk.gray(message.padEnd(50))} ${chalk.blue(`${progress.toFixed(0)}%`)}`);
          },
          onAdFound: (ad) => {
            // Silent - we show count at end
          },
          onError: (error) => {
            console.log(chalk.red(`\n  ❌ Error: ${error.message}`));
          }
        });

        const result = await extractor.extract({
          competitor: options.competitor,
          country: options.country,
          maxAds: parseInt(options.max),
          includeInactive: options.includeInactive,
          captureScreenshots: options.screenshots,
          analyzeLandingPages: options.landingPages
        });

        console.log(); // New line after progress

        if (result.errors?.length) {
          console.log(chalk.yellow(`  ⚠️  Warnings: ${result.errors.join(', ')}`));
        }

        if (result.usedFallback) {
          console.log(chalk.yellow('  ℹ️  Used API fallback'));
        }

        console.log(chalk.green(`  ✓ Found ${result.ads.length} ads (${result.duration}ms)`));
        allAds.push(...result.ads);
      }

      if (allAds.length === 0) {
        console.log(chalk.yellow('\n⚠️  No ads found. Check the competitor name and try again.'));
        await closeBrowser();
        process.exit(0);
      }

      // Categorize ads
      console.log(chalk.cyan('\n📊 Categorizing ads...'));
      const categorizedAds = categorizeAds(allAds);

      // Analyze
      console.log(chalk.cyan('📈 Analyzing competitor...'));
      const analysis = analyzeCompetitor(options.competitor, categorizedAds);

      // Generate reports
      console.log(chalk.cyan('📄 Generating reports...'));
      const reports = await generateReports(
        options.competitor,
        categorizedAds,
        analysis,
        config.output!
      );

      // Summary
      const totalTime = ((Date.now() - startTime) / 1000).toFixed(1);
      console.log(chalk.green.bold(`\n✅ Complete! (${totalTime}s)\n`));

      console.log(chalk.white('Summary:'));
      console.log(chalk.gray(`  • Total ads: ${allAds.length}`));
      console.log(chalk.gray(`  • Platforms: ${platforms.join(', ')}`));
      console.log(chalk.gray(`  • Reports generated: ${reports.length}`));

      if (reports.length > 0) {
        console.log(chalk.white('\nReports:'));
        for (const report of reports) {
          console.log(chalk.gray(`  • ${report.format}: ${report.path}`));
        }
      }

      console.log();
    } catch (error) {
      console.log(chalk.red(`\n❌ Extraction failed: ${(error as Error).message}`));
      logger.error('Extraction failed', error);
      process.exit(1);
    } finally {
      await closeBrowser();
    }
  });

// Analyze command (for existing data)
program
  .command('analyze')
  .description('Analyze previously extracted ads from JSON file')
  .requiredOption('-f, --file <path>', 'Path to JSON file with ads')
  .option('-o, --output <directory>', 'Output directory', './output')
  .option('--formats <formats>', 'Report formats (comma-separated)', 'json,markdown')
  .action(async (options) => {
    const fs = await import('fs');

    if (!fs.existsSync(options.file)) {
      console.log(chalk.red(`❌ File not found: ${options.file}`));
      process.exit(1);
    }

    try {
      const data = JSON.parse(fs.readFileSync(options.file, 'utf-8'));
      const ads = data.ads || data;

      if (!Array.isArray(ads)) {
        console.log(chalk.red('❌ Invalid file format - expected array of ads'));
        process.exit(1);
      }

      console.log(chalk.blue.bold('\n📊 Analyzing Ads\n'));
      console.log(chalk.gray(`File: ${options.file}`));
      console.log(chalk.gray(`Ads: ${ads.length}`));

      const competitor = data.metadata?.competitor || 'Unknown';
      const categorizedAds = categorizeAds(ads);
      const analysis = analyzeCompetitor(competitor, categorizedAds);

      const config: Partial<AppConfig> = {
        output: {
          ...defaultConfig.output,
          directory: options.output,
          formats: options.formats.split(',') as OutputConfig['formats']
        }
      };

      const reports = await generateReports(
        competitor,
        categorizedAds,
        analysis,
        config.output!
      );

      console.log(chalk.green.bold('\n✅ Analysis complete!\n'));
      for (const report of reports) {
        console.log(chalk.gray(`  • ${report.format}: ${report.path}`));
      }
      console.log();
    } catch (error) {
      console.log(chalk.red(`❌ Analysis failed: ${(error as Error).message}`));
      process.exit(1);
    }
  });

// Platforms command
program
  .command('platforms')
  .description('List available platforms')
  .action(() => {
    console.log(chalk.blue.bold('\n📱 Available Platforms\n'));

    const available = getAvailablePlatforms();
    const all: Platform[] = ['meta', 'tiktok', 'google', 'linkedin'];

    for (const platform of all) {
      if (available.includes(platform)) {
        console.log(chalk.green(`  ✓ ${platform}`));
      } else {
        console.log(chalk.gray(`  ○ ${platform} (coming soon)`));
      }
    }
    console.log();
  });

// Serve command (for GUI)
program
  .command('serve')
  .description('Start web GUI server')
  .option('-p, --port <number>', 'Port number', '3000')
  .option('-h, --host <host>', 'Host to bind', 'localhost')
  .action(async (options) => {
    console.log(chalk.blue.bold('\n🌐 Starting Web GUI...\n'));

    try {
      // Dynamic import to avoid loading server code unless needed
      const { startServer } = await import('./server');
      await startServer({
        port: parseInt(options.port),
        host: options.host
      });
    } catch (error) {
      console.log(chalk.red(`❌ Failed to start server: ${(error as Error).message}`));
      process.exit(1);
    }
  });

// Handle unknown commands
program.on('command:*', () => {
  console.log(chalk.red(`\n❌ Unknown command: ${program.args.join(' ')}`));
  console.log(chalk.gray('Run "ad-extractor --help" for available commands\n'));
  process.exit(1);
});

// Parse arguments
program.parse();

// Show help if no command provided
if (!process.argv.slice(2).length) {
  program.outputHelp();
}
