import { Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';

@Injectable()
export class ThrottlerByEmailGuard extends ThrottlerGuard {
  // Rastreia por e-mail (quando presente no body) em vez de por IP: o limite
  // por conta sobrevive a proxies/rewrites e a um X-Forwarded-For forjado,
  // que tornariam o throttling por IP inútil ou fácil de burlar.
  protected async getTracker(req: Record<string, any>): Promise<string> {
    if (typeof req.body?.email === 'string') {
      return `email:${req.body.email.trim().toLowerCase()}`;
    }
    return req.ip;
  }
}
