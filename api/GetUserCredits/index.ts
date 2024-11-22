import { HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { CreditService } from "../shared/services/creditService";
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
  
        const creditService = new CreditService();
        const credits = await creditService.getUserCredits(userId);
  
        return {
            status: 200,
            jsonBody: { credits }
        };
    } catch (error) {
        context.error('Error in GetUserCredits:', error);
        return {
            status: 500,
            jsonBody: { error: error instanceof Error ? error.message : 'Failed to retrieve user credits' }
        };
    }
  }