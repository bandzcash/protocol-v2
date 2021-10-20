import {
  AaveProtocolDataProviderFactory,
  ATokenFactory,
  ATokensAndRatesHelperFactory,
  AaveOracleFactory,
  DefaultReserveInterestRateStrategyFactory,
  GenericLogicFactory,
  InitializableAdminUpgradeabilityProxyFactory,
  LendingPoolAddressesProviderFactory,
  LendingPoolAddressesProviderRegistryFactory,
  LendingPoolCollateralManagerFactory,
  LendingPoolConfiguratorFactory,
  LendingPoolFactory,
  LendingRateOracleFactory,
  MintableERC20Factory,
  MockATokenFactory,
  MockFlashLoanReceiverFactory,
  MockStableDebtTokenFactory,
  MockVariableDebtTokenFactory,
  MockUniswapV2Router02Factory,
  MockParaSwapAugustusFactory,
  MockParaSwapAugustusRegistryFactory,
  ParaSwapLiquiditySwapAdapterFactory,
  PriceOracleFactory,
  ReserveLogicFactory,
  SelfdestructTransferFactory,
  StableAndVariableTokensHelperFactory,
  StableDebtTokenFactory,
  UniswapLiquiditySwapAdapterFactory,
  UniswapRepayAdapterFactory,
  VariableDebtTokenFactory,
  WalletBalanceProviderFactory,
  WETH9MockedFactory,
  WETHGatewayFactory,
  FlashLiquidationAdapterFactory,
} from '../types';
import { IERC20DetailedFactory } from '../types/IERC20DetailedFactory';
import { getEthersSigners, MockTokenMap } from './contracts-helpers';
import { DRE, getDb, notFalsyOrZeroAddress, omit } from './misc-utils';
import { eContractid, PoolConfiguration, tSmartBCHAddress, TokenContractId } from './types';

export const getFirstSigner = async () => (await getEthersSigners())[0];

export const getLendingPoolAddressesProvider = async (address?: tSmartBCHAddress) => {
  return await LendingPoolAddressesProviderFactory.connect(
    address ||
      (
        await getDb().get(`${eContractid.LendingPoolAddressesProvider}.${DRE.network.name}`).value()
      ).address,
    await getFirstSigner()
  );
};
export const getLendingPoolConfiguratorProxy = async (address?: tSmartBCHAddress) => {
  return await LendingPoolConfiguratorFactory.connect(
    address ||
      (
        await getDb().get(`${eContractid.LendingPoolConfigurator}.${DRE.network.name}`).value()
      ).address,
    await getFirstSigner()
  );
};

export const getLendingPool = async (address?: tSmartBCHAddress) =>
  await LendingPoolFactory.connect(
    address ||
      (
        await getDb().get(`${eContractid.LendingPool}.${DRE.network.name}`).value()
      ).address,
    await getFirstSigner()
  );

export const getPriceOracle = async (address?: tSmartBCHAddress) =>
  await PriceOracleFactory.connect(
    address ||
      (
        await getDb().get(`${eContractid.PriceOracle}.${DRE.network.name}`).value()
      ).address,
    await getFirstSigner()
  );

export const getAToken = async (address?: tSmartBCHAddress) =>
  await ATokenFactory.connect(
    address || (await getDb().get(`${eContractid.AToken}.${DRE.network.name}`).value()).address,
    await getFirstSigner()
  );

export const getStableDebtToken = async (address?: tSmartBCHAddress) =>
  await StableDebtTokenFactory.connect(
    address ||
      (
        await getDb().get(`${eContractid.StableDebtToken}.${DRE.network.name}`).value()
      ).address,
    await getFirstSigner()
  );

export const getVariableDebtToken = async (address?: tSmartBCHAddress) =>
  await VariableDebtTokenFactory.connect(
    address ||
      (
        await getDb().get(`${eContractid.VariableDebtToken}.${DRE.network.name}`).value()
      ).address,
    await getFirstSigner()
  );

export const getMintableERC20 = async (address: tSmartBCHAddress) =>
  await MintableERC20Factory.connect(
    address ||
      (
        await getDb().get(`${eContractid.MintableERC20}.${DRE.network.name}`).value()
      ).address,
    await getFirstSigner()
  );

export const getIErc20Detailed = async (address: tSmartBCHAddress) =>
  await IERC20DetailedFactory.connect(
    address ||
      (
        await getDb().get(`${eContractid.IERC20Detailed}.${DRE.network.name}`).value()
      ).address,
    await getFirstSigner()
  );

export const getAaveProtocolDataProvider = async (address?: tSmartBCHAddress) =>
  await AaveProtocolDataProviderFactory.connect(
    address ||
      (
        await getDb().get(`${eContractid.AaveProtocolDataProvider}.${DRE.network.name}`).value()
      ).address,
    await getFirstSigner()
  );

export const getInterestRateStrategy = async (address?: tSmartBCHAddress) =>
  await DefaultReserveInterestRateStrategyFactory.connect(
    address ||
      (
        await getDb()
          .get(`${eContractid.DefaultReserveInterestRateStrategy}.${DRE.network.name}`)
          .value()
      ).address,
    await getFirstSigner()
  );

export const getMockFlashLoanReceiver = async (address?: tSmartBCHAddress) =>
  await MockFlashLoanReceiverFactory.connect(
    address ||
      (
        await getDb().get(`${eContractid.MockFlashLoanReceiver}.${DRE.network.name}`).value()
      ).address,
    await getFirstSigner()
  );

export const getLendingRateOracle = async (address?: tSmartBCHAddress) =>
  await LendingRateOracleFactory.connect(
    address ||
      (
        await getDb().get(`${eContractid.LendingRateOracle}.${DRE.network.name}`).value()
      ).address,
    await getFirstSigner()
  );

export const getMockedTokens = async (config: PoolConfiguration) => {
  const tokenSymbols = Object.keys(config.ReservesConfig);
  const db = getDb();
  const tokens: MockTokenMap = await tokenSymbols.reduce<Promise<MockTokenMap>>(
    async (acc, tokenSymbol) => {
      const accumulator = await acc;
      const address = db.get(`${tokenSymbol.toUpperCase()}.${DRE.network.name}`).value().address;
      accumulator[tokenSymbol] = await getMintableERC20(address);
      return Promise.resolve(acc);
    },
    Promise.resolve({})
  );
  return tokens;
};

export const getAllMockedTokens = async () => {
  const db = getDb();
  const tokens: MockTokenMap = await Object.keys(TokenContractId).reduce<Promise<MockTokenMap>>(
    async (acc, tokenSymbol) => {
      const accumulator = await acc;
      const address = db.get(`${tokenSymbol.toUpperCase()}.${DRE.network.name}`).value().address;
      accumulator[tokenSymbol] = await getMintableERC20(address);
      return Promise.resolve(acc);
    },
    Promise.resolve({})
  );
  return tokens;
};

export const getQuoteCurrencies = (oracleQuoteCurrency: string): string[] => {
  switch (oracleQuoteCurrency) {
    case 'USD':
      return ['USD'];
    case 'BCH':
    case 'WBCH':
    default:
      return ['BCH', 'WBCH'];
  }
};

export const getPairsTokenAggregator = (
  allAssetsAddresses: {
    [tokenSymbol: string]: tSmartBCHAddress;
  },
  aggregatorsAddresses: { [tokenSymbol: string]: tSmartBCHAddress },
  oracleQuoteCurrency: string
): [string[], string[]] => {
  const assetsWithoutQuoteCurrency = omit(
    allAssetsAddresses,
    getQuoteCurrencies(oracleQuoteCurrency)
  );

  const pairs = Object.entries(assetsWithoutQuoteCurrency).map(([tokenSymbol, tokenAddress]) => {
    //if (true/*tokenSymbol !== 'WBCH' && tokenSymbol !== 'BCH' && tokenSymbol !== 'LpWBCH'*/) {
    const aggregatorAddressIndex = Object.keys(aggregatorsAddresses).findIndex(
      (value) => value === tokenSymbol
    );
    const [, aggregatorAddress] = (
      Object.entries(aggregatorsAddresses) as [string, tSmartBCHAddress][]
    )[aggregatorAddressIndex];
    return [tokenAddress, aggregatorAddress];
    //}
  }) as [string, string][];

  const mappedPairs = pairs.map(([asset]) => asset);
  const mappedAggregators = pairs.map(([, source]) => source);

  return [mappedPairs, mappedAggregators];
};

export const getLendingPoolAddressesProviderRegistry = async (address?: tSmartBCHAddress) =>
  await LendingPoolAddressesProviderRegistryFactory.connect(
    notFalsyOrZeroAddress(address)
      ? address
      : (
          await getDb()
            .get(`${eContractid.LendingPoolAddressesProviderRegistry}.${DRE.network.name}`)
            .value()
        ).address,
    await getFirstSigner()
  );

export const getReserveLogic = async (address?: tSmartBCHAddress) =>
  await ReserveLogicFactory.connect(
    address ||
      (
        await getDb().get(`${eContractid.ReserveLogic}.${DRE.network.name}`).value()
      ).address,
    await getFirstSigner()
  );

export const getGenericLogic = async (address?: tSmartBCHAddress) =>
  await GenericLogicFactory.connect(
    address ||
      (
        await getDb().get(`${eContractid.GenericLogic}.${DRE.network.name}`).value()
      ).address,
    await getFirstSigner()
  );

export const getStableAndVariableTokensHelper = async (address?: tSmartBCHAddress) =>
  await StableAndVariableTokensHelperFactory.connect(
    address ||
      (
        await getDb()
          .get(`${eContractid.StableAndVariableTokensHelper}.${DRE.network.name}`)
          .value()
      ).address,
    await getFirstSigner()
  );

export const getATokensAndRatesHelper = async (address?: tSmartBCHAddress) =>
  await ATokensAndRatesHelperFactory.connect(
    address ||
      (
        await getDb().get(`${eContractid.ATokensAndRatesHelper}.${DRE.network.name}`).value()
      ).address,
    await getFirstSigner()
  );

export const getWETHGateway = async (address?: tSmartBCHAddress) =>
  await WETHGatewayFactory.connect(
    address ||
      (
        await getDb().get(`${eContractid.WETHGateway}.${DRE.network.name}`).value()
      ).address,
    await getFirstSigner()
  );

export const getWETHMocked = async (address?: tSmartBCHAddress) =>
  await WETH9MockedFactory.connect(
    address || (await getDb().get(`${eContractid.WETHMocked}.${DRE.network.name}`).value()).address,
    await getFirstSigner()
  );

export const getMockAToken = async (address?: tSmartBCHAddress) =>
  await MockATokenFactory.connect(
    address || (await getDb().get(`${eContractid.MockAToken}.${DRE.network.name}`).value()).address,
    await getFirstSigner()
  );

export const getMockVariableDebtToken = async (address?: tSmartBCHAddress) =>
  await MockVariableDebtTokenFactory.connect(
    address ||
      (
        await getDb().get(`${eContractid.MockVariableDebtToken}.${DRE.network.name}`).value()
      ).address,
    await getFirstSigner()
  );

export const getMockStableDebtToken = async (address?: tSmartBCHAddress) =>
  await MockStableDebtTokenFactory.connect(
    address ||
      (
        await getDb().get(`${eContractid.MockStableDebtToken}.${DRE.network.name}`).value()
      ).address,
    await getFirstSigner()
  );

export const getSelfdestructTransferMock = async (address?: tSmartBCHAddress) =>
  await SelfdestructTransferFactory.connect(
    address ||
      (
        await getDb().get(`${eContractid.SelfdestructTransferMock}.${DRE.network.name}`).value()
      ).address,
    await getFirstSigner()
  );

export const getProxy = async (address: tSmartBCHAddress) =>
  await InitializableAdminUpgradeabilityProxyFactory.connect(address, await getFirstSigner());

export const getLendingPoolImpl = async (address?: tSmartBCHAddress) =>
  await LendingPoolFactory.connect(
    address ||
      (
        await getDb().get(`${eContractid.LendingPoolImpl}.${DRE.network.name}`).value()
      ).address,
    await getFirstSigner()
  );

export const getLendingPoolConfiguratorImpl = async (address?: tSmartBCHAddress) =>
  await LendingPoolConfiguratorFactory.connect(
    address ||
      (
        await getDb().get(`${eContractid.LendingPoolConfiguratorImpl}.${DRE.network.name}`).value()
      ).address,
    await getFirstSigner()
  );

export const getLendingPoolCollateralManagerImpl = async (address?: tSmartBCHAddress) =>
  await LendingPoolCollateralManagerFactory.connect(
    address ||
      (
        await getDb()
          .get(`${eContractid.LendingPoolCollateralManagerImpl}.${DRE.network.name}`)
          .value()
      ).address,
    await getFirstSigner()
  );

export const getWalletProvider = async (address?: tSmartBCHAddress) =>
  await WalletBalanceProviderFactory.connect(
    address ||
      (
        await getDb().get(`${eContractid.WalletBalanceProvider}.${DRE.network.name}`).value()
      ).address,
    await getFirstSigner()
  );

export const getLendingPoolCollateralManager = async (address?: tSmartBCHAddress) =>
  await LendingPoolCollateralManagerFactory.connect(
    address ||
      (
        await getDb().get(`${eContractid.LendingPoolCollateralManager}.${DRE.network.name}`).value()
      ).address,
    await getFirstSigner()
  );

export const getAddressById = async (id: string): Promise<tSmartBCHAddress | undefined> =>
  (await getDb().get(`${id}.${DRE.network.name}`).value())?.address || undefined;

export const getAaveOracle = async (address?: tSmartBCHAddress) =>
  await AaveOracleFactory.connect(
    address || (await getDb().get(`${eContractid.AaveOracle}.${DRE.network.name}`).value()).address,
    await getFirstSigner()
  );

export const getMockUniswapRouter = async (address?: tSmartBCHAddress) =>
  await MockUniswapV2Router02Factory.connect(
    address ||
      (
        await getDb().get(`${eContractid.MockUniswapV2Router02}.${DRE.network.name}`).value()
      ).address,
    await getFirstSigner()
  );

export const getUniswapLiquiditySwapAdapter = async (address?: tSmartBCHAddress) =>
  await UniswapLiquiditySwapAdapterFactory.connect(
    address ||
      (
        await getDb().get(`${eContractid.UniswapLiquiditySwapAdapter}.${DRE.network.name}`).value()
      ).address,
    await getFirstSigner()
  );

export const getUniswapRepayAdapter = async (address?: tSmartBCHAddress) =>
  await UniswapRepayAdapterFactory.connect(
    address ||
      (
        await getDb().get(`${eContractid.UniswapRepayAdapter}.${DRE.network.name}`).value()
      ).address,
    await getFirstSigner()
  );

export const getFlashLiquidationAdapter = async (address?: tSmartBCHAddress) =>
  await FlashLiquidationAdapterFactory.connect(
    address ||
      (
        await getDb().get(`${eContractid.FlashLiquidationAdapter}.${DRE.network.name}`).value()
      ).address,
    await getFirstSigner()
  );

export const getMockParaSwapAugustus = async (address?: tSmartBCHAddress) =>
  await MockParaSwapAugustusFactory.connect(
    address ||
      (
        await getDb().get(`${eContractid.MockParaSwapAugustus}.${DRE.network.name}`).value()
      ).address,
    await getFirstSigner()
  );

export const getMockParaSwapAugustusRegistry = async (address?: tSmartBCHAddress) =>
  await MockParaSwapAugustusRegistryFactory.connect(
    address ||
      (
        await getDb().get(`${eContractid.MockParaSwapAugustusRegistry}.${DRE.network.name}`).value()
      ).address,
    await getFirstSigner()
  );

export const getParaSwapLiquiditySwapAdapter = async (address?: tSmartBCHAddress) =>
  await ParaSwapLiquiditySwapAdapterFactory.connect(
    address ||
      (
        await getDb().get(`${eContractid.ParaSwapLiquiditySwapAdapter}.${DRE.network.name}`).value()
      ).address,
    await getFirstSigner()
  );
