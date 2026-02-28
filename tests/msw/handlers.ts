import { http, HttpResponse } from 'msw';
import { wholesaleMarketsSeoul } from '@/tests/fixtures/wholesaleMarkets';
import { auctionPricesBaechuSuccess } from '@/tests/fixtures/auctionPrices';

export const handlers = [
  http.get('http://localhost:4000/api/wholesaleMarkets', () => {
    return HttpResponse.json(wholesaleMarketsSeoul);
  }),

  http.get('http://localhost:4000/api/auctionPrices', () => {
    return HttpResponse.json(auctionPricesBaechuSuccess);
  }),
];