import { HttpRequest } from "@azure/functions";
import * as jwt from 'jsonwebtoken';
import { JwksClient } from 'jwks-rsa';
import { Algorithm } from 'jsonwebtoken';

export class AuthMiddleware {
  private tenant: string;
  private clientId: string;
  private userFlow: string;
  private jwksClient: JwksClient;

  constructor(tenant: string, clientId: string, userFlow: string) {
      this.tenant = tenant;
      this.clientId = clientId;
      this.userFlow = userFlow;
      this.jwksClient = new JwksClient({
          jwksUri: `https://${tenant}.b2clogin.com/${tenant}.onmicrosoft.com/${userFlow}/discovery/v2.0/keys`
      });
  }

  get_token_from_header(req: HttpRequest): string | null {
      const authHeader = req.headers.get('Authorization');
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
          return null;
      }
      return authHeader.substring(7);
  }

  async validate_token(token: string): Promise<any> {
      try {
          const decodedToken = jwt.decode(token, { complete: true });
          if (!decodedToken || !decodedToken.header.kid) {
              throw new Error('Invalid token');
          }

          const key = await this.jwksClient.getSigningKey(decodedToken.header.kid);
          const signingKey = key.getPublicKey();

          const validationOptions: jwt.VerifyOptions = {
              audience: this.clientId,
              issuer: `https://${this.tenant}.b2clogin.com/${this.tenant}.onmicrosoft.com/${this.userFlow}/v2.0/`,
              algorithms: ['RS256' as Algorithm]
          };

          return jwt.verify(token, signingKey, validationOptions);
      } catch (error) {
          throw new Error(`Token validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
  }
}

export default AuthMiddleware;