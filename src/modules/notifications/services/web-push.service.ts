import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import * as webpush from 'web-push';
import {
  WebPushSubscription,
  WebPushSubscriptionDocument,
} from '../schemas/web-push-subscription.schema';
import { WebPushSubscribeDto } from '../dto/web-push-subscription.dto';

export interface WebPushPayload {
  title: string;
  body: string;
  url?: string;
  data?: Record<string, any>;
}

@Injectable()
export class WebPushService {
  private readonly logger = new Logger(WebPushService.name);
  private publicKey: string;
  private isConfigured = false;

  constructor(
    private readonly configService: ConfigService,
    @InjectModel(WebPushSubscription.name)
    private readonly subscriptionModel: Model<WebPushSubscriptionDocument>,
  ) {
    this.initVapid();
  }

  private initVapid(): void {
    const publicKey = this.configService.get<string>('BUDGET_API_VAPID_PUBLIC_KEY');
    const privateKey = this.configService.get<string>('BUDGET_API_VAPID_PRIVATE_KEY');
    const subject =
      this.configService.get<string>('BUDGET_API_VAPID_SUBJECT') || 'mailto:budget@jonmb.com';

    if (publicKey && privateKey) {
      try {
        webpush.setVapidDetails(subject, publicKey, privateKey);
        this.publicKey = publicKey;
        this.isConfigured = true;
        this.logger.log('WebPush VAPID configured successfully');
      } catch (err: any) {
        this.logger.warn(`Failed to configure VAPID details: ${err.message}`);
        this.fallbackKeys();
      }
    } else {
      this.logger.warn(
        'VAPID keys not configured in environment. Using generated ephemeral VAPID keys for development/testing.',
      );
      this.fallbackKeys();
    }
  }

  private fallbackKeys(): void {
    try {
      const generated = webpush.generateVAPIDKeys();
      webpush.setVapidDetails(
        'mailto:dev@budget.jonmb.com',
        generated.publicKey,
        generated.privateKey,
      );
      this.publicKey = generated.publicKey;
      this.isConfigured = true;
    } catch {
      this.publicKey = 'fallback_dummy_public_key';
    }
  }

  getPublicKey(): string {
    return this.publicKey;
  }

  async subscribe(userId: string, dto: WebPushSubscribeDto): Promise<WebPushSubscriptionDocument> {
    const filter = {
      userId: new Types.ObjectId(userId),
      endpoint: dto.endpoint,
    };

    const update = {
      ...dto,
      userId: new Types.ObjectId(userId),
      isActive: true,
    };

    const sub = await this.subscriptionModel
      .findOneAndUpdate(filter, { $set: update }, { new: true, upsert: true, runValidators: true })
      .exec();

    this.logger.log(`User ${userId} subscribed to Web Push (device: ${dto.device || 'unknown'})`);
    return sub!;
  }

  async unsubscribe(
    userId: string,
    endpoint: string,
  ): Promise<{ success: boolean; message: string }> {
    await this.subscriptionModel
      .findOneAndUpdate(
        {
          userId: new Types.ObjectId(userId),
          endpoint,
        },
        { $set: { isActive: false } },
      )
      .exec();

    return {
      success: true,
      message: 'Subscription successfully removed',
    };
  }

  async sendPushToUser(
    userId: string,
    payload: WebPushPayload,
  ): Promise<{ sent: number; failed: number; endpoints: string[] }> {
    const subscriptions = await this.subscriptionModel
      .find({
        userId: new Types.ObjectId(userId),
        isActive: true,
      })
      .exec();

    let sent = 0;
    let failed = 0;
    const endpoints: string[] = [];

    const stringifiedPayload = JSON.stringify({
      title: payload.title,
      body: payload.body,
      url: payload.url || '/',
      data: payload.data || {},
    });

    for (const sub of subscriptions) {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: {
              p256dh: sub.keys.p256dh,
              auth: sub.keys.auth,
            },
          },
          stringifiedPayload,
        );
        sent++;
        endpoints.push(sub.endpoint);
      } catch (error: any) {
        failed++;
        this.logger.warn(`Failed to dispatch push notification: ${error.message}`);
        // If subscription is expired or unregistered (HTTP 410 Gone or 404 Not Found), deactivate it
        if (error.statusCode === 410 || error.statusCode === 404) {
          await this.subscriptionModel.findByIdAndUpdate(sub._id, { $set: { isActive: false } });
          this.logger.log(`Deactivated expired subscription: ${sub.endpoint.slice(0, 30)}...`);
        }
      }
    }

    return { sent, failed, endpoints };
  }

  async sendTestPush(
    userId: string,
    title = 'Budget-API Test Alert',
    body = 'Web Push notifications are active and working!',
  ): Promise<{ sent: number; failed: number }> {
    return this.sendPushToUser(userId, { title, body });
  }
}
