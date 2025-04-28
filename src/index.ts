import { z } from 'zod';
import { PollingService } from './services/polling.service.js';
import { loadEnvs, type Payload, payloadSchema } from './config.js';

/**
 * Creates a beautifully formatted Discord message with user metrics
 * 
 * @param data - The payload containing user metrics data
 * @param timestamp - The formatted timestamp for the footer
 * @returns A Discord webhook payload with embedded content
 */
function createDiscordMessage(data: Payload, timestamp: string) {
  const thumbnail = process.env.THUMBNAIL;

  const formatNumber = (num: number): string => 
    num.toLocaleString('en-US');
  
  return {
    embeds: [{
      title: "📊 Active User Metrics",
      color: 0x3498DB,
      fields: [
        {
          name: `Daily Active Users`,
          value: `**${formatNumber(data.daily_active_users)}**`,
          inline: true
        },
        {
          name: `Weekly Active Users`,
          value: `**${formatNumber(data.weekly_active_users)}**`,
          inline: true
        },
        {
          name: `Monthly Active Users`,
          value: `**${formatNumber(data.monthly_active_users)}**`,
          inline: true
        }
      ],
      ...(thumbnail && {
        thumbnail: {
          url: thumbnail
        }
      }),
      footer: {
        text: `📡 Metrics updated • ${timestamp}`
      },
      timestamp: new Date().toISOString()
    }]
  };
}

async function main() {
  try {
    const config = loadEnvs();
    
    const pollingService = new PollingService<Payload>(
      payloadSchema,
      createDiscordMessage,
      {
        url: config.POLL_URL,
        interval: config.POLL_INTERVAL,
        webhookUrl: config.DISCORD_WEBHOOK_URL,
      }
    );
    
    // Start polling
    pollingService.start();
    
    // Handle termination signals
    process.on('SIGINT', () => {
      console.log('Stopping polling service...');
      pollingService.stop();
      process.exit(0);
    });
    
    process.on('SIGTERM', () => {
      console.log('Stopping polling service...');
      pollingService.stop();
      process.exit(0);
    });
  } catch (error) {
    console.error('Failed to start polling service:', error);
    console.error('Make sure you have properly configured the environment variables:');
    console.error('- POLL_URL: The URL to poll data from');
    console.error('- POLL_INTERVAL: How often to poll in minutes');
    console.error('- DISCORD_WEBHOOK_URL: Discord webhook URL to send notifications');
    process.exit(1);
  }
}

main();