import { oneRay, ZERO_ADDRESS } from '../../helpers/constants';
import { IBandzConfiguration, eSmartBCHNetwork } from '../../helpers/types';

import { CommonsConfig } from './commons';
import {
  strategyFlexUSD,
  strategyBANDZ,
  strategyUNI,
  strategyWBCH,
  strategyXMIST,
} from './reservesConfigs';

// ----------------
// POOL--SPECIFIC PARAMS
// ----------------

export const BandzConfig: IBandzConfiguration = {
  ...CommonsConfig,
  MarketId: 'Bandz genesis market',
  ProviderId: 1,
  ReservesConfig: {
    BANDZ: strategyBANDZ,
    FLEXUSD: strategyFlexUSD,
    WBCH: strategyWBCH,
    xMIST: strategyXMIST,
  },
  ReserveAssets: {
    [eSmartBCHNetwork.buidlerevm]: {},
    [eSmartBCHNetwork.hardhat]: {},
    [eSmartBCHNetwork.coverage]: {},
    [eSmartBCHNetwork.amber]: {
      BANDZ: '',
      FLEXUSD: '0xf80A32A835F79D7787E8a8ee5721D0fEaFd78108',
      WBCH: '0x17F4FCF5b6E0A95D4eE331c8529041896A073F9b',
    },
    [eSmartBCHNetwork.main]: {
      BANDZ: '0x9f0F1e5F79Dd17f0297CAde7EfB13ebabF564758',
      FLEXUSD: '0x6B175474E89094C44Da98b954EedeAC495271d0F',
      WBCH: '0x3743eC0673453E5009310C727Ba4eaF7b3a1cc04',
      xMIST: '0xC41C680c60309d4646379eD62020c534eB67b6f4',
    },
  },
};

export default BandzConfig;
