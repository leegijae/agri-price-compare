export type AuctionPriceRow = {
  rowNum: number;
  tradeDate: string;      
  bidTime?: string;         
  marketCode?: string;     
  marketName: string;       
  corpCode?: string;      
  corpName?: string;     
  categoryCode?: string;   
  categoryName?: string;   
  productCode?: string;    
  productName: string;     
  speciesCode?: string;
  speciesName?: string;     
  unitName?: string;        
  qualityName?: string;    
  bidPrice: number;         
  quantity?: number;        
  originAreaName?: string;  
};

export type SearchParams = {
  date: string;         
  marketName: string;   
  productName?: string;
  startIndex?: number;
  endIndex?: number;
};

export type VolatileItemPoint = {
  productKey: string;
  productName: string;
  speciesName?: string;
  firstAvgPrice: number;
  latestAvgPrice: number;
  changeRate: number;
  changeAmount: number;
};

export type PeriodOption = '7D' | '30D';

export type VolatilitySeriesPoint = {
  date: string;
  price: number;
  changeRate: number;
};

export type VolatilitySeries = {
  productKey: string;
  productName: string;
  speciesName?: string;
  latestChangeRate: number;
  points: VolatilitySeriesPoint[];
};