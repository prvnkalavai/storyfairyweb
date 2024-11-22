import { CosmosClient, Container } from '@azure/cosmos';
import { User } from '../models/user';
import { CreditTransaction } from '../models/creditTransaction';

export class CosmosService {
  private client: CosmosClient;
  private database: string;
  private userContainer: Container;
  private transactionContainer: Container;

  constructor() {
      const connectionString = process.env.COSMOS_DB_CONNECTION_STRING as string;
      this.client = new CosmosClient(connectionString);
      this.database = 'StoryFairyDB';

      this.userContainer = this.client
          .database(this.database)
          .container('Users');

      this.transactionContainer = this.client
          .database(this.database)
          .container('CreditTransactions');
  }

  async getUser(userId: string): Promise<User | null> {
      try {
          const { resource } = await this.userContainer
              .item(userId, userId)
              .read();
          return resource as User || null;
      } catch (error) {
          if ((error as any).code === 404) return null;
          throw error;
      }
  }

  async createUser(user: User): Promise<User> {
      const { resource } = await this.userContainer.items.create(user);
      return resource as User;
  }

  async updateUserCredits(userId: string, credits: number): Promise<User> {
      const { resource } = await this.userContainer
          .item(userId, userId)
          .replace({
              id: userId,
              userId,
              credits,
              updatedAt: new Date().toISOString()
          });
      return resource as unknown as User;
  }

  async createTransaction(transaction: CreditTransaction): Promise<CreditTransaction> {
      const { resource } = await this.transactionContainer.items.create(transaction);
      return resource as CreditTransaction;
  }

  async getUserTransactions(userId: string): Promise<CreditTransaction[]> {
      const query = `SELECT * FROM c WHERE c.userId = @userId ORDER BY c.createdAt DESC`;
      const { resources } = await this.transactionContainer.items
          .query({
              query,
              parameters: [{ name: '@userId', value: userId }]
          })
          .fetchAll();
      return resources as CreditTransaction[];
  }
}