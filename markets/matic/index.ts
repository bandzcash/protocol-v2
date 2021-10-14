import { IMaticConfiguration } from '../../helpers/types';

import { CommonsConfig } from './commons';
import {
  strategyDAI,
  strategyUSDC,
  strategyUSDT,
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
    WETH: strategyWETH,
    WMATIC: strategyMATIC,
    BANDZ: strategyBANDZ,
  },
  ReserveAssets: {
  },
};

export default MaticConfig;
