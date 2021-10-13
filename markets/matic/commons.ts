import BigNumber from 'bignumber.js';
import {
  oneEther,
  oneRay,
  RAY,
  ZERO_ADDRESS,
  MOCK_CHAINLINK_AGGREGATORS_PRICES,
} from '../../helpers/constants';
import { ICommonConfiguration } from '../../helpers/types';

// ----------------
// PROTOCOL GLOBAL PARAMS
// ----------------

export const CommonsConfig: ICommonConfiguration = {
  MarketId: 'Commons',
  ATokenNamePrefix: 'Bandz Matic Market',
  StableDebtTokenNamePrefix: 'Bandz Matic Market stable debt',
  VariableDebtTokenNamePrefix: 'Bandz Matic Market variable debt',
  SymbolPrefix: 'm',
  ProviderId: 0, // Overriden in index.ts
  OracleQuoteCurrency: 'ETH',
  OracleQuoteUnit: oneEther.toString(),
  ProtocolGlobalParams: {
    TokenDistributorPercentageBase: '10000',
    MockUsdPriceInWei: '5848466240000000',
    UsdAddress: '0x10F7Fc1F91Ba351f9C629c5947AD69bD03C05b96',
    NilAddress: '0x0000000000000000000000000000000000000000',
    OneAddress: '0x0000000000000000000000000000000000000001',
    BandzReferral: '0',
  },

  // ----------------
  // COMMON PROTOCOL PARAMS ACROSS POOLS AND NETWORKS
  // ----------------

  Mocks: {
    AllAssetsInitialPrices: {
      ...MOCK_CHAINLINK_AGGREGATORS_PRICES,
    },
  },
  // TODO: reorg alphabetically, checking the reason of tests failing
  LendingRateOracleRatesCommon: {
    WETH: {
      borrowRate: oneRay.multipliedBy(0.03).toFixed(),
    },
    DAI: {
      borrowRate: oneRay.multipliedBy(0.039).toFixed(),
    },
    USDC: {
      borrowRate: oneRay.multipliedBy(0.039).toFixed(),
    },
    USDT: {
      borrowRate: oneRay.multipliedBy(0.035).toFixed(),
    },
    WBTC: {
      borrowRate: oneRay.multipliedBy(0.03).toFixed(),
    },
    WMATIC: {
      borrowRate: oneRay.multipliedBy(0.05).toFixed(),
    },
    BANDZ: {
      borrowRate: oneRay.multipliedBy(0.03).toFixed(),
    },
  },
  // ----------------
  // COMMON PROTOCOL ADDRESSES ACROSS POOLS
  // ----------------

  // If PoolAdmin/emergencyAdmin is set, will take priority over PoolAdminIndex/emergencyAdminIndex
  PoolAdmin: {
  },
  PoolAdminIndex: 0,
  EmergencyAdminIndex: 0,
  EmergencyAdmin: {
  },
  LendingPool: {
  },
  LendingPoolConfigurator: {
  },
  ProviderRegistry: {
  },
  ProviderRegistryOwner: {
  },
  LendingRateOracle: {
  },
  LendingPoolCollateralManager: {
  },
  TokenDistributor: {
  },
  WethGateway: {
  },
  AaveOracle: {
  },
  FallbackOracle: {
  },
  ChainlinkAggregator: {
  },
  ReserveAssets: {
  },
  ReservesConfig: {},
  ATokenDomainSeparator: {
  },
  WETH: {
  },
  WrappedNativeToken: {
  },
  ReserveFactorTreasuryAddress: {
  },
  IncentivesController: {
  },
};
