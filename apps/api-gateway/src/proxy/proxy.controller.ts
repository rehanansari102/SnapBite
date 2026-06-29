import { All, Controller, Req, Res } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request, Response } from 'express';

const ROUTE_MAP: Record<string, string> = {
  '/api/auth': 'AUTH_SERVICE_URL',
  '/api/users': 'USER_SERVICE_URL',
  '/api/restaurants': 'RESTAURANT_SERVICE_URL',
  '/api/menus': 'MENU_SERVICE_URL',
  '/api/orders': 'ORDER_SERVICE_URL',
  '/api/payments': 'PAYMENT_SERVICE_URL',
  '/api/delivery': 'DELIVERY_SERVICE_URL',
  '/api/track': 'TRACKING_SERVICE_URL',
  '/api/search': 'SEARCH_SERVICE_URL',
  '/api/reviews': 'REVIEW_SERVICE_URL',
  '/api/media': 'MEDIA_SERVICE_URL',
};

@Controller()
export class ProxyController {
  constructor(private configService: ConfigService) {}

  @All('/api/*path')
  async proxy(@Req() req: Request, @Res() res: Response) {
    const matchedPrefix = Object.keys(ROUTE_MAP).find((p) =>
      req.path.startsWith(p),
    );

    if (!matchedPrefix) {
      res.status(404).json({ message: 'Route not found' });
      return;
    }

    const envKey = ROUTE_MAP[matchedPrefix];
    const target = this.configService.get<string>(envKey);
    if (!target) {
      res.status(503).json({ message: 'Service not configured' });
      return;
    }
   
    // Rewrite /api/auth/register → /auth/register
    const downstreamPath = req.path.replace('/api', '');
    const url = `${target}${downstreamPath}${req.url.includes('?') ? '?' + req.url.split('?')[1] : ''}`;

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10_000);
   
      const headers: Record<string, string> = {
        'content-type': req.headers['content-type'] ?? 'application/json',
      };
     
      if (req.headers['authorization']) headers['authorization'] = req.headers['authorization'] as string;
      if (req.headers['cookie']) headers['cookie'] = req.headers['cookie'] as string;

      // Only set these from the verified JWT user — never trust client-supplied values
      const user = (req as Request & { user?: { userId: string; email: string; role: string } }).user;
      if (user?.userId) headers['x-user-id'] = user.userId;
      if (user?.email) headers['x-user-email'] = user.email;
      if (user?.role) headers['x-user-role'] = user.role;
      // Stripe webhook requires the raw body for signature verification
      const isWebhook = req.path.endsWith('/stripe/webhook')
      const rawBuf = (req as Request & { rawBody?: Buffer }).rawBody
      const body = ['GET', 'HEAD'].includes(req.method)
      ? undefined
      : isWebhook && rawBuf
      ? new Uint8Array(rawBuf)
      : JSON.stringify(req.body)
      
      if (isWebhook) {
        const stripeSig = req.headers['stripe-signature']
        if (stripeSig) headers['stripe-signature'] = stripeSig as string
      }
      
      const fetchRes = await fetch(url, {
        method: req.method,
        headers,
        body,
        signal: controller.signal,
      });
      
      clearTimeout(timeout);

      // Forward cookies from downstream response
      const setCookie = fetchRes.headers.get('set-cookie');
      if (setCookie) res.setHeader('set-cookie', setCookie);

      const contentType = fetchRes.headers.get('content-type') ?? 'application/json';
      res.status(fetchRes.status).setHeader('content-type', contentType);

      const text = await fetchRes.text();
      res.send(text);
    } catch (err: unknown) {
      console.error('Proxy error:', err);
      if (err instanceof Error && err.name === 'AbortError') {
        res.status(504).json({ message: 'Service timeout' });
      } else {
        res.status(502).json({ message: 'Service unavailable', error: (err as Error).message });
      }
    }
  }
}
