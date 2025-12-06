import { advisoryLockService } from './advisoryLock';
import { cacheService } from './cache';
import { config } from '../config';

interface Position {
  symbol: string;
  quantity: number;
  averagePrice: number;
  unrealizedPnL: number;
  realizedPnL: number;
}

interface Trade {
  id: string;
  symbol: string;
  side: 'buy' | 'sell';
  quantity: number;
  price: number;
  timestamp: Date;
  status: 'pending' | 'filled' | 'cancelled';
}

export class PaperTradingService {
  private readonly enabled: boolean;

  constructor() {
    this.enabled = config.PAPER_TRADING_ENABLED;
  }

  /**
   * Execute a paper trade with advisory lock protection
   * Prevents concurrent execution conflicts
   */
  public async executeTrade(
    symbol: string,
    side: 'buy' | 'sell',
    quantity: number,
    price: number
  ): Promise<Trade> {
    if (!this.enabled) {
      throw new Error('Paper trading is disabled');
    }

    const lockKey = `paper_trade:${symbol}`;
    const tradeId = this.generateTradeId();

    // Execute trade within advisory lock to prevent concurrent conflicts
    const result = await advisoryLockService.withLock(lockKey, async () => {
        // Get current position from cache or database
        const position = await this.getPosition(symbol);

        // Calculate new position
        const newPosition = this.calculateNewPosition(position, side, quantity, price, symbol);

        // Store updated position
        await this.storePosition(symbol, newPosition);

        // Invalidate cache for this symbol
        await cacheService.invalidatePattern(`position:${symbol}*`);

        const trade: Trade = {
          id: tradeId,
          symbol,
          side,
          quantity,
          price,
          timestamp: new Date(),
          status: 'filled',
        };

        // Store trade record
        await this.storeTrade(trade);

        return trade;
      }
    );

    return result;
  }

  /**
   * Get current position for a symbol
   */
  private async getPosition(symbol: string): Promise<Position | null> {
    const cacheKey = `position:${symbol}`;

    // Try cache first
    const cached = await cacheService.get<Position>(cacheKey);
    if (cached) {
      return cached;
    }

    // In a real implementation, this would query the database
    // For now, return null (no position)
    return null;
  }

  /**
   * Calculate new position after trade
   */
  private calculateNewPosition(
    currentPosition: Position | null,
    side: 'buy' | 'sell',
    quantity: number,
    price: number,
    symbol: string
  ): Position {
    if (!currentPosition) {
      // New position
      return {
        symbol,
        quantity: side === 'buy' ? quantity : -quantity,
        averagePrice: price,
        unrealizedPnL: 0,
        realizedPnL: 0,
      };
    }

    let newQuantity = currentPosition.quantity;
    let newAveragePrice = currentPosition.averagePrice;
    let realizedPnL = currentPosition.realizedPnL;

    if (side === 'buy') {
      // Buying - increase position
      const totalCost =
        currentPosition.quantity * currentPosition.averagePrice + quantity * price;
      newQuantity = currentPosition.quantity + quantity;
      newAveragePrice = totalCost / newQuantity;
    } else {
      // Selling - decrease position
      newQuantity = currentPosition.quantity - quantity;

      if (newQuantity >= 0) {
        // Closing or reducing long position
        realizedPnL += quantity * (price - currentPosition.averagePrice);
      } else {
        // Going short or increasing short position
        const totalCost = Math.abs(newQuantity) * price;
        newAveragePrice = totalCost / Math.abs(newQuantity);
      }
    }

    return {
      symbol: currentPosition.symbol,
      quantity: newQuantity,
      averagePrice: newAveragePrice,
      unrealizedPnL: 0, // Would be calculated based on current market price
      realizedPnL,
    };
  }

  /**
   * Store position in cache and database
   */
  private async storePosition(symbol: string, position: Position): Promise<void> {
    const cacheKey = `position:${symbol}`;
    await cacheService.set(cacheKey, position, 300); // 5 minute TTL
  }

  /**
   * Store trade record
   */
  private async storeTrade(trade: Trade): Promise<void> {
    const cacheKey = `trade:${trade.id}`;
    await cacheService.set(cacheKey, trade, 3600); // 1 hour TTL
  }

  /**
   * Generate unique trade ID
   */
  private generateTradeId(): string {
    return `trade_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
  }

  /**
   * Get all positions
   */
  public async getAllPositions(): Promise<Position[]> {
    // In a real implementation, this would query the database
    // For now, return empty array
    return [];
  }

  /**
   * Get position by symbol
   */
  public async getPositionBySymbol(symbol: string): Promise<Position | null> {
    return this.getPosition(symbol);
  }

  /**
   * Close position for a symbol
   */
  public async closePosition(symbol: string, price: number): Promise<Trade | null> {
    const position = await this.getPosition(symbol);
    if (!position || position.quantity === 0) {
      return null;
    }

    const side = position.quantity > 0 ? 'sell' : 'buy';
    const quantity = Math.abs(position.quantity);

    return this.executeTrade(symbol, side, quantity, price);
  }
}

// Singleton instance
export const paperTradingService = new PaperTradingService();
