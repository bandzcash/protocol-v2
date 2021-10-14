import {
  oneRay,
  ZERO_ADDRESS,
  MOCK_CHAINLINK_AGGREGATORS_PRICES,
  oneBch,
} from '../../helpers/constants';
import { ICommonConfiguration, eSmartBCHNetwork } from '../../helpers/types';

// ----------------
// PROTOCOL GLOBAL PARAMS
// ----------------

export const CommonsConfig: ICommonConfiguration = {
  MarketId: 'Commons',
  ATokenNamePrefix: 'Bandz interest bearing',
  StableDebtTokenNamePrefix: 'Bandz stable debt bearing',
  VariableDebtTokenNamePrefix: 'Bandz variable debt bearing',
  SymbolPrefix: '',
  ProviderId: 0, // Overriden in index.ts
  OracleQuoteCurrency: 'ETH',
  OracleQuoteUnit: oneBch.toString(),
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
    TUSD: {
      borrowRate: oneRay.multipliedBy(0.035).toFixed(),
    },
    USDC: {
      borrowRate: oneRay.multipliedBy(0.039).toFixed(),
    },
    SUSD: {
      borrowRate: oneRay.multipliedBy(0.035).toFixed(),
    },
    USDT: {
      borrowRate: oneRay.multipliedBy(0.035).toFixed(),
    },
    BANDZ: {
      borrowRate: oneRay.multipliedBy(0.03).toFixed(),
    },
    LINK: {
      borrowRate: oneRay.multipliedBy(0.03).toFixed(),
    },
    MKR: {
      borrowRate: oneRay.multipliedBy(0.03).toFixed(),
    },
    UNI: {
      borrowRate: oneRay.multipliedBy(0.03).toFixed(),
    },
  },
  // ----------------
  // COMMON PROTOCOL ADDRESSES ACROSS POOLS
  // ----------------

  // If PoolAdmin/emergencyAdmin is set, will take priority over PoolAdminIndex/emergencyAdminIndex
  PoolAdmin: {
    [eSmartBCHNetwork.coverage]: undefined,
    [eSmartBCHNetwork.buidlerevm]: undefined,
    [eSmartBCHNetwork.coverage]: undefined,
    [eSmartBCHNetwork.hardhat]: undefined,
    [eSmartBCHNetwork.amber]: undefined,
    [eSmartBCHNetwork.main]: undefined,
  },
  PoolAdminIndex: 0,
  EmergencyAdmin: {
    [eSmartBCHNetwork.hardhat]: undefined,
    [eSmartBCHNetwork.coverage]: undefined,
    [eSmartBCHNetwork.buidlerevm]: undefined,
    [eSmartBCHNetwork.amber]: undefined,
    [eSmartBCHNetwork.main]: undefined,
  },
  EmergencyAdminIndex: 1,
  ProviderRegistry: {
    [eSmartBCHNetwork.amber]: '',
    [eSmartBCHNetwork.main]: '0x52D306e36E3B6B02c153d0266ff0f85d18BCD413',
    [eSmartBCHNetwork.coverage]: '',
    [eSmartBCHNetwork.hardhat]: '',
    [eSmartBCHNetwork.buidlerevm]: '',
  },
  ProviderRegistryOwner: {
    // [eSmartBCHNetwork.kovan]: '0x85e4A467343c0dc4aDAB74Af84448D9c45D8ae6F',
    [eSmartBCHNetwork.amber]: '',
    [eSmartBCHNetwork.main]: '0xB9062896ec3A615a4e4444DF183F0531a77218AE',
    [eSmartBCHNetwork.coverage]: '',
    [eSmartBCHNetwork.hardhat]: '',
    [eSmartBCHNetwork.buidlerevm]: '',
  },
  LendingRateOracle: {
    [eSmartBCHNetwork.coverage]: '',
    [eSmartBCHNetwork.hardhat]: '',
    [eSmartBCHNetwork.buidlerevm]: '',
    [eSmartBCHNetwork.amber]: '0x05dcca805a6562c1bdd0423768754acb6993241b',
    [eSmartBCHNetwork.main]: '', //'0x8A32f49FFbA88aba6EFF96F45D8BD1D4b3f35c7D',
  },
  LendingPoolCollateralManager: {
    [eSmartBCHNetwork.coverage]: '',
    [eSmartBCHNetwork.hardhat]: '',
    [eSmartBCHNetwork.buidlerevm]: '',
    // [eSmartBCHNetwork.kovan]: '0x9269b6453d0d75370c4c85e5a42977a53efdb72a',
    [eSmartBCHNetwork.amber]: '',
    [eSmartBCHNetwork.main]: '0xbd4765210d4167CE2A5b87280D9E8Ee316D5EC7C',
  },
  LendingPoolConfigurator: {
    [eSmartBCHNetwork.coverage]: '',
    [eSmartBCHNetwork.hardhat]: '',
    [eSmartBCHNetwork.buidlerevm]: '',
    [eSmartBCHNetwork.amber]: '',
    [eSmartBCHNetwork.main]: '',
  },
  LendingPool: {
    [eSmartBCHNetwork.coverage]: '',
    [eSmartBCHNetwork.hardhat]: '',
    [eSmartBCHNetwork.buidlerevm]: '',
    [eSmartBCHNetwork.amber]: '',
    [eSmartBCHNetwork.main]: '',
  },
  WethGateway: {
    [eSmartBCHNetwork.coverage]: '',
    [eSmartBCHNetwork.hardhat]: '',
    [eSmartBCHNetwork.buidlerevm]: '',
    [eSmartBCHNetwork.amber]: '',
    [eSmartBCHNetwork.main]: '',
  },
  TokenDistributor: {
    [eSmartBCHNetwork.coverage]: '',
    [eSmartBCHNetwork.buidlerevm]: '',
    [eSmartBCHNetwork.hardhat]: '',
    // [eSmartBCHNetwork.kovan]: '0x971efe90088f21dc6a36f610ffed77fc19710708',
    [eSmartBCHNetwork.amber]: '0xeba2ea67942b8250d870b12750b594696d02fc9c',
    [eSmartBCHNetwork.main]: '0xe3d9988f676457123c5fd01297605efdd0cba1ae',
  },
  AaveOracle: {
    [eSmartBCHNetwork.coverage]: '',
    [eSmartBCHNetwork.hardhat]: '',
    [eSmartBCHNetwork.buidlerevm]: '',
    // [eSmartBCHNetwork.kovan]: '', //'0xB8bE51E6563BB312Cbb2aa26e352516c25c26ac1',
    [eSmartBCHNetwork.amber]: ZERO_ADDRESS,
    [eSmartBCHNetwork.main]: '', //'0xA50ba011c48153De246E5192C8f9258A2ba79Ca9',
  },
  FallbackOracle: {
    [eSmartBCHNetwork.coverage]: '',
    [eSmartBCHNetwork.hardhat]: '',
    [eSmartBCHNetwork.buidlerevm]: '',
    // [eSmartBCHNetwork.kovan]: '0x50913E8E1c650E790F8a1E741FF9B1B1bB251dfe',
    [eSmartBCHNetwork.amber]: '0xAD1a978cdbb8175b2eaeC47B01404f8AEC5f4F0d',
    [eSmartBCHNetwork.main]: ZERO_ADDRESS,
  },
  ChainlinkAggregator: {
    [eSmartBCHNetwork.coverage]: {},
    [eSmartBCHNetwork.hardhat]: {},
    [eSmartBCHNetwork.buidlerevm]: {},
    [eSmartBCHNetwork.amber]: {
      BANDZ: ZERO_ADDRESS,
      DAI: '0x64b8e49baded7bfb2fd5a9235b2440c0ee02971b',
      MKR: '0x811B1f727F8F4aE899774B568d2e72916D91F392',
      SUSD: '0xe054b4aee7ac7645642dd52f1c892ff0128c98f0',
      TUSD: '0x523ac85618df56e940534443125ef16daf785620',
      UNI: ZERO_ADDRESS,
      USDC: '0xe1480303dde539e2c241bdc527649f37c9cbef7d',
      USDT: '0xc08fe0c4d97ccda6b40649c6da621761b628c288',
      USD: '0x8468b2bDCE073A157E560AA4D9CcF6dB1DB98507',
    },
    [eSmartBCHNetwork.main]: {
      BANDZ: '0x6Df09E975c830ECae5bd4eD9d90f3A95a4f88012',
      DAI: '0x773616E4d11A78F511299002da57A0a94577F1f4',
      MKR: '0x24551a8Fb2A7211A25a17B1481f043A8a8adC7f2',
      SUSD: '0x8e0b7e6062272B5eF4524250bFFF8e5Bd3497757',
      TUSD: '0x3886BA987236181D98F2401c507Fb8BeA7871dF2',
      UNI: '0xD6aA3D25116d8dA79Ea0246c4826EB951872e02e',
      USDC: '0x986b5E1e1755e3C2440e960477f25201B0a8bbD4',
      USDT: '0xEe9F2375b4bdF6387aa8265dD4FB8F16512A1d46',
      USD: '0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419',
      xSUSHI: '0x9b26214bEC078E68a394AaEbfbffF406Ce14893F',
    },
  },
  ReserveAssets: {
    [eSmartBCHNetwork.coverage]: {},
    [eSmartBCHNetwork.hardhat]: {},
    [eSmartBCHNetwork.buidlerevm]: {},
    [eSmartBCHNetwork.main]: {},
    [eSmartBCHNetwork.amber]: {},
  },
  ReservesConfig: {},
  ATokenDomainSeparator: {
    [eSmartBCHNetwork.coverage]:
      '0x95b73a72c6ecf4ccbbba5178800023260bad8e75cdccdb8e4827a2977a37c820',
    [eSmartBCHNetwork.hardhat]:
      '0xbae024d959c6a022dc5ed37294cd39c141034b2ae5f02a955cce75c930a81bf5',
    [eSmartBCHNetwork.buidlerevm]:
      '0xbae024d959c6a022dc5ed37294cd39c141034b2ae5f02a955cce75c930a81bf5',
    [eSmartBCHNetwork.amber]: '',
    [eSmartBCHNetwork.main]: '',
  },
  WETH: {
    [eSmartBCHNetwork.coverage]: '', // deployed in local evm
    [eSmartBCHNetwork.hardhat]: '', // deployed in local evm
    [eSmartBCHNetwork.buidlerevm]: '', // deployed in local evm
    // [eSmartBCHNetwork.kovan]: '0xd0a1e359811322d97991e03f863a0c30c2cf029c',
    [eSmartBCHNetwork.amber]: '0xc778417e063141139fce010982780140aa0cd5ab',
    [eSmartBCHNetwork.main]: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
  },
  WrappedNativeToken: {
    [eSmartBCHNetwork.coverage]: '', // deployed in local evm
    [eSmartBCHNetwork.hardhat]: '', // deployed in local evm
    [eSmartBCHNetwork.buidlerevm]: '', // deployed in local evm
    // [eSmartBCHNetwork.kovan]: '0xd0a1e359811322d97991e03f863a0c30c2cf029c',
    [eSmartBCHNetwork.amber]: '0xc778417e063141139fce010982780140aa0cd5ab',
    [eSmartBCHNetwork.main]: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
  },
  ReserveFactorTreasuryAddress: {
    [eSmartBCHNetwork.coverage]: '0x464c71f6c2f760dda6093dcb91c24c39e5d6e18c',
    [eSmartBCHNetwork.hardhat]: '0x464c71f6c2f760dda6093dcb91c24c39e5d6e18c',
    [eSmartBCHNetwork.buidlerevm]: '0x464c71f6c2f760dda6093dcb91c24c39e5d6e18c',
    // [eSmartBCHNetwork.kovan]: '0x464c71f6c2f760dda6093dcb91c24c39e5d6e18c',
    [eSmartBCHNetwork.amber]: '0x464c71f6c2f760dda6093dcb91c24c39e5d6e18c',
    [eSmartBCHNetwork.main]: '0x464c71f6c2f760dda6093dcb91c24c39e5d6e18c',
  },
  IncentivesController: {
    [eSmartBCHNetwork.coverage]: ZERO_ADDRESS,
    [eSmartBCHNetwork.hardhat]: ZERO_ADDRESS,
    [eSmartBCHNetwork.buidlerevm]: ZERO_ADDRESS,
    [eSmartBCHNetwork.amber]: ZERO_ADDRESS,
    [eSmartBCHNetwork.main]: ZERO_ADDRESS,
  },
};
