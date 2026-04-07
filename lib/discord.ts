import axios from 'axios';
import type { NewsItem } from './news-scraper';

export class DiscordWebhook {
  private webhookUrl: string | undefined;

  constructor() {
    this.webhookUrl = process.env.DISCORD_WEBHOOK_URL;
  }

  isConfigured(): boolean {
    return !!this.webhookUrl;
  }

  /**
   * Post the daily GPU news report to Discord.
   * 3 sections: Price/Deal news, Industry news, AI/Datacenter news.
   */
  async sendDailyNews(news: NewsItem[]) {
    if (!this.webhookUrl || !news.length) return 'skipped';

    const now = new Date();
    const dateStr = now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
    const timeStr = now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });

    try {
      // Categorize news
      const priceNews: NewsItem[] = [];
      const industryNews: NewsItem[] = [];
      const aiNews: NewsItem[] = [];

      for (const n of news) {
        const h = n.headline.toLowerCase();
        if (h.includes('price') || h.includes('drop') || h.includes('deal') || h.includes('sale') || h.includes('discount') || h.includes('msrp') || h.includes('cheap') || h.includes('restock') || h.includes('stock') || h.includes('availability')) {
          priceNews.push(n);
        } else if (h.includes('ai ') || h.includes('datacenter') || h.includes('data center') || h.includes('cloud') || h.includes('h100') || h.includes('h200') || h.includes('b200') || h.includes('inference') || h.includes('training')) {
          aiNews.push(n);
        } else {
          industryNews.push(n);
        }
      }

      // ── HEADER ──
      let msg = `🖥️ **GPU News — ${dateStr}**\n`;
      msg += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;

      // ── SECTION 1: Price & Deal News ──
      if (priceNews.length > 0) {
        msg += `💰 **GPU Prices & Deals**\n\n`;
        for (const n of priceNews.slice(0, 4)) {
          const time = n.time ? ` · _${n.time}_` : '';
          msg += `▸ [**${n.headline}**](${n.link})\n`;
          msg += `  ${n.source}${time}\n\n`;
        }
      }

      // ── SECTION 2: Industry News ──
      if (industryNews.length > 0) {
        msg += `📰 **Industry & Launches**\n\n`;
        for (const n of industryNews.slice(0, 4)) {
          const time = n.time ? ` · _${n.time}_` : '';
          msg += `▸ [**${n.headline}**](${n.link})\n`;
          msg += `  ${n.source}${time}\n\n`;
        }
      }

      // ── SECTION 3: AI & Datacenter ──
      if (aiNews.length > 0) {
        msg += `🤖 **AI & Datacenter**\n\n`;
        for (const n of aiNews.slice(0, 4)) {
          const time = n.time ? ` · _${n.time}_` : '';
          msg += `▸ [**${n.headline}**](${n.link})\n`;
          msg += `  ${n.source}${time}\n\n`;
        }
      }

      // If none categorized, just dump all
      if (priceNews.length === 0 && industryNews.length === 0 && aiNews.length === 0) {
        msg += `📰 **Today's Headlines**\n\n`;
        for (const n of news.slice(0, 8)) {
          const time = n.time ? ` · _${n.time}_` : '';
          msg += `▸ [**${n.headline}**](${n.link})\n`;
          msg += `  ${n.source}${time}\n\n`;
        }
      }

      msg += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
      msg += `🕐 ${timeStr} · ${news.length} headlines scraped from Google News\n`;
      msg += `_Next report: tomorrow at noon_`;

      // Discord limit is 2000 chars — split if needed
      if (msg.length <= 2000) {
        await this.post({ content: msg });
      } else {
        // Split into 2 messages
        const midpoint = msg.lastIndexOf('\n\n', 1800);
        const part1 = msg.slice(0, midpoint);
        const part2 = msg.slice(midpoint + 2);
        await this.post({ content: part1 });
        await this.wait();
        await this.post({ content: part2 });
      }

      return 'sent';
    } catch (err) {
      console.error('Discord news error:', err);
      return 'error';
    }
  }

  /**
   * Heartbeat — when no news found.
   */
  async sendHeartbeat() {
    if (!this.webhookUrl) return 'skipped';
    const timeStr = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    try {
      await this.post({
        content: `\`${timeStr}\` · No GPU news found this cycle. Will retry next run.`,
      });
      return 'sent';
    } catch { return 'error'; }
  }

  private async post(payload: Record<string, unknown>) {
    await axios.post(this.webhookUrl!, payload);
  }

  private wait(ms = 1500) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
