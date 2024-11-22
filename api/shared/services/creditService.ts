import { CosmosService } from './cosmosService';
import { User } from '../models/user';
import { CreditTransaction } from '../models/creditTransaction';
import { v4 as uuidv4 } from 'uuid';

export class CreditService {
  private cosmosService: CosmosService;

  constructor() {
      this.cosmosService = new CosmosService();
  }

  async getUserCredits(userId: string): Promise<number> {
      const user = await this.cosmosService.getUser(userId);
      if (!user) {
          // Create new user with initial credits
          const newUser: User = {
              id: userId,
              userId,
              email: '', // Will be updated later
              credits: 15, // Initial free credits
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
          };
          await this.cosmosService.createUser(newUser);
          return newUser.credits;
      }
      return user.credits;
  }

  async deductCredits(userId: string, amount: number, description: string): Promise<number> {
      const user = await this.cosmosService.getUser(userId);
      if (!user) throw new Error('User not found');
      if (user.credits < amount) throw new Error('Insufficient credits');

      const newBalance = user.credits - amount;
      await this.cosmosService.updateUserCredits(userId, newBalance);

      const transaction: CreditTransaction = {
          id: uuidv4(),
          userId,
          amount: -amount,
          type: 'DEDUCTION',
          description,
          createdAt: new Date().toISOString()
      };
      await this.cosmosService.createTransaction(transaction);

      return newBalance;
  }

  async addCredits(userId: string, amount: number, description: string, reference?: string): Promise<number> {
      const user = await this.cosmosService.getUser(userId);
      if (!user) throw new Error('User not found');

      const newBalance = user.credits + amount;
      await this.cosmosService.updateUserCredits(userId, newBalance);

      const transaction: CreditTransaction = {
          id: uuidv4(),
          userId,
          amount,
          type: 'PURCHASE',
          description,
          reference,
          createdAt: new Date().toISOString()
      };
      await this.cosmosService.createTransaction(transaction);

      return newBalance;
  }
}