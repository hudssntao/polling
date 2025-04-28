import { z } from 'zod';
import axios from 'axios';
import * as cron from 'node-cron';
import { format } from 'date-fns';

// Type definitions
export type PollingConfig = {
  url: string;
  interval: number; // minutes
  webhookUrl: string;
};

/**
 * Generic Polling Service
 */
export class PollingService<T> {
  private config: PollingConfig;
  private schema: z.ZodType<T>;
  private templateFn: (data: T, timestamp: string) => unknown;
  private cronJob?: cron.ScheduledTask;

  constructor(
    schema: z.ZodType<T>,
    templateFn: (data: T, timestamp: string) => unknown,
    config: PollingConfig ,
  ) {
    this.config = config;
    this.schema = schema;
    this.templateFn = templateFn;
  }

  /**
   * Fetch data from the configured URL
   */
  async fetchData(): Promise<T | null> {
    try {
      console.log(`Fetching data from: ${this.config.url}`);
      const response = await axios.get(this.config.url);
      
      // Validate response data against schema
      const validationResult = this.schema.safeParse(response.data);
      
      if (!validationResult.success) {
        console.error('Schema validation failed:', validationResult.error);
        await this.sendErrorToDiscord(
          `Schema validation failed: ${validationResult.error.message}`
        );
        return null;
      }
      
      return validationResult.data;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`Error fetching data: ${errorMessage}`);
      
      if (axios.isAxiosError(error) && error.response) {
        console.error(`Status: ${error.response.status}`);
        console.error(`Data: ${JSON.stringify(error.response.data)}`);
      }
      
      await this.sendErrorToDiscord(`Error fetching data: ${errorMessage}`);
      return null;
    }
  }

  /**
   * Send data to Discord using the webhook
   */
  async sendToDiscord(data: T): Promise<void> {
    try {
      const now = new Date();
      const timestamp = format(now, 'yyyy-MM-dd HH:mm:ss');
      
      const payload = this.templateFn(data, timestamp);
      
      await axios.post(this.config.webhookUrl, payload);
      console.log('Data sent to Discord successfully');
    } catch (error) {
      console.error(`Error sending to Discord: ${error}`);
    }
  }

  /**
   * Send error message to Discord
   */
  async sendErrorToDiscord(errorMessage: string): Promise<void> {
    try {
      const now = new Date();
      const timestamp = format(now, 'yyyy-MM-dd HH:mm:ss');
      
      const embed = {
        title: '❌ Polling Error',
        color: 0xFF0000, // Red color
        description: errorMessage,
        footer: {
          text: `Polling • ${timestamp}`
        }
      };

      await axios.post(this.config.webhookUrl, { embeds: [embed] });
      console.log('Error sent to Discord successfully');
    } catch (error) {
      console.error(`Error sending error to Discord: ${error}`);
    }
  }

  /**
   * Run a single polling cycle
   */
  async runPolling(): Promise<void> {
    console.log(`Polling running at ${new Date().toISOString()}`);
    
    const data = await this.fetchData();
    if (data) {
      console.log('Data received:', data);
      await this.sendToDiscord(data);
    } else {
      console.error('Failed to fetch valid data');
    }
  }

  /**
   * Start the polling service
   */
  start(): void {
    // Run immediately on startup
    this.runPolling();

    // Schedule to run at the configured interval
    const cronExpression = `*/${this.config.interval} * * * *`;
    this.cronJob = cron.schedule(cronExpression, () => {
      this.runPolling();
    });

    console.log(`Polling started! Monitoring every ${this.config.interval} minutes...`);
  }

  /**
   * Stop the polling service
   */
  stop(): void {
    if (this.cronJob) {
      this.cronJob.stop();
      console.log('Polling stopped');
    }
  }
} 