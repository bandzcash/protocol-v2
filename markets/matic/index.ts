import { IMaticConfiguration } from '../../helpers/types';

import { CommonsConfig } from './commons';
import {
  strategyDAI,
  strategyUSDC,
  strategyUSDT,
  strategyWBTC,
  strategyWETH,
  strategyMATIC,
  strategyBANDZ,
} from './reservesConfigs';

// ----------------
// POOL--SPECIFIC PARAMS
// ----------------

export const MaticConfig: IMaticConfiguration = {
  ...CommonsConfig,
  MarketId: 'Matic Market',
  ProviderId: 3,
  ReservesConfig: {
    DAI: strategyDAI,
    USDC: strategyUSDC,
    USDT: strategyUSDT,
    WBTC: strategyWBTC,
    WETH: strategyWETH,
    WMATIC: strategyMATIC,
    BANDZ: strategyBANDZ,
  },
};

export default MaticConfig;
