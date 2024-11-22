import { HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { CreditService } from "../shared/services/creditService";
import { DeductCreditsRequest } from "../shared/types";
import { AuthMiddleware } from "../shared/auth/middleware";

export default async function httpTrigger(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  try {
      // Initialize auth middleware
      const authMiddleware = new AuthMiddleware(
          process.env.B2C_TENANT!,
          process.env.B2C_CLIENT_ID!,
          process.env.B2C_USER_FLOW!
      );

      // Validate token
      const token = authMiddleware.get_token_from_header(request);
      if (!token) {
          return {
              status: 401,
              jsonBody: { error: "No authorization token provided" }
          };
      }

      const claims = await authMiddleware.validate_token(token);
      const userId = claims.sub;

      const body = await request.json() as DeductCreditsRequest;
      if (!body.amount || body.amount <= 0) {
          return {
              status: 400,
              jsonBody: { error: "Invalid amount" }
          };
      }

      const creditService = new CreditService();
      try {
          const newBalance = await creditService.deductCredits(
              userId,
              body.amount,
              body.description || 'Credit deduction'
          );

          return {
              status: 200,
              jsonBody: { credits: newBalance }
          };
      } catch (error) {
          if (error instanceof Error && error.message === 'Insufficient credits') {
              return {
                  status: 402,
                  jsonBody: { error: 'Insufficient credits' }
              };
          }
          throw error;
      }
  } catch (error) {
      context.error('Error in DeductCredits:', error);
      return {
          status: 500,
          jsonBody: { error: error instanceof Error ? error.message : 'Failed to deduct credits' }
      };
  }
}