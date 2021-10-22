import { TestEnv, makeSuite } from './helpers/make-suite';
import { APPROVAL_AMOUNT_LENDING_POOL, RAY } from '../../helpers/constants';
import { convertToCurrencyDecimals } from '../../helpers/contracts-helpers';
import { ProtocolErrors } from '../../helpers/types';
import { strategyWBCH } from '../../markets/amm/reservesConfigs';

const { expect } = require('chai');

makeSuite('LendingPoolConfigurator', (testEnv: TestEnv) => {
  const {
    CALLER_NOT_POOL_ADMIN,
    LPC_RESERVE_LIQUIDITY_NOT_0,
    RC_INVALID_LTV,
    RC_INVALID_LIQ_THRESHOLD,
    RC_INVALID_LIQ_BONUS,
    RC_INVALID_DECIMALS,
    RC_INVALID_RESERVE_FACTOR,
  } = ProtocolErrors;

  it('Reverts trying to set an invalid reserve factor', async () => {
    const { configurator, wbch } = testEnv;

    const invalidReserveFactor = 65536;

    await expect(
      configurator.setReserveFactor(wbch.address, invalidReserveFactor)
    ).to.be.revertedWith(RC_INVALID_RESERVE_FACTOR);
  });

  it('Deactivates the BCH reserve', async () => {
    const { configurator, wbch, helpersContract } = testEnv;
    await configurator.deactivateReserve(wbch.address);
    const { isActive } = await helpersContract.getReserveConfigurationData(wbch.address);
    expect(isActive).to.be.equal(false);
  });

  it('Rectivates the BCH reserve', async () => {
    const { configurator, wbch, helpersContract } = testEnv;
    await configurator.activateReserve(wbch.address);

    const { isActive } = await helpersContract.getReserveConfigurationData(wbch.address);
    expect(isActive).to.be.equal(true);
  });

  it('Check the onlyAaveAdmin on deactivateReserve ', async () => {
    const { configurator, users, wbch } = testEnv;
    await expect(
      configurator.connect(users[2].signer).deactivateReserve(wbch.address),
      CALLER_NOT_POOL_ADMIN
    ).to.be.revertedWith(CALLER_NOT_POOL_ADMIN);
  });

  it('Check the onlyAaveAdmin on activateReserve ', async () => {
    const { configurator, users, wbch } = testEnv;
    await expect(
      configurator.connect(users[2].signer).activateReserve(wbch.address),
      CALLER_NOT_POOL_ADMIN
    ).to.be.revertedWith(CALLER_NOT_POOL_ADMIN);
  });

  it('Freezes the BCH reserve', async () => {
    const { configurator, wbch, helpersContract } = testEnv;

    await configurator.freezeReserve(wbch.address);
    const {
      decimals,
      ltv,
      liquidationBonus,
      liquidationThreshold,
      reserveFactor,
      stableBorrowRateEnabled,
      borrowingEnabled,
      isActive,
      isFrozen,
    } = await helpersContract.getReserveConfigurationData(wbch.address);

    expect(borrowingEnabled).to.be.equal(true);
    expect(isActive).to.be.equal(true);
    expect(isFrozen).to.be.equal(true);
    expect(decimals).to.be.equal(strategyWBCH.reserveDecimals);
    expect(ltv).to.be.equal(strategyWBCH.baseLTVAsCollateral);
    expect(liquidationThreshold).to.be.equal(strategyWBCH.liquidationThreshold);
    expect(liquidationBonus).to.be.equal(strategyWBCH.liquidationBonus);
    expect(stableBorrowRateEnabled).to.be.equal(strategyWBCH.stableBorrowRateEnabled);
    expect(reserveFactor).to.be.equal(strategyWBCH.reserveFactor);
  });

  it('Unfreezes the BCH reserve', async () => {
    const { configurator, helpersContract, wbch } = testEnv;
    await configurator.unfreezeReserve(wbch.address);

    const {
      decimals,
      ltv,
      liquidationBonus,
      liquidationThreshold,
      reserveFactor,
      stableBorrowRateEnabled,
      borrowingEnabled,
      isActive,
      isFrozen,
    } = await helpersContract.getReserveConfigurationData(wbch.address);

    expect(borrowingEnabled).to.be.equal(true);
    expect(isActive).to.be.equal(true);
    expect(isFrozen).to.be.equal(false);
    expect(decimals).to.be.equal(strategyWBCH.reserveDecimals);
    expect(ltv).to.be.equal(strategyWBCH.baseLTVAsCollateral);
    expect(liquidationThreshold).to.be.equal(strategyWBCH.liquidationThreshold);
    expect(liquidationBonus).to.be.equal(strategyWBCH.liquidationBonus);
    expect(stableBorrowRateEnabled).to.be.equal(strategyWBCH.stableBorrowRateEnabled);
    expect(reserveFactor).to.be.equal(strategyWBCH.reserveFactor);
  });

  it('Check the onlyAaveAdmin on freezeReserve ', async () => {
    const { configurator, users, wbch } = testEnv;
    await expect(
      configurator.connect(users[2].signer).freezeReserve(wbch.address),
      CALLER_NOT_POOL_ADMIN
    ).to.be.revertedWith(CALLER_NOT_POOL_ADMIN);
  });

  it('Check the onlyAaveAdmin on unfreezeReserve ', async () => {
    const { configurator, users, wbch } = testEnv;
    await expect(
      configurator.connect(users[2].signer).unfreezeReserve(wbch.address),
      CALLER_NOT_POOL_ADMIN
    ).to.be.revertedWith(CALLER_NOT_POOL_ADMIN);
  });

  it('Deactivates the BCH reserve for borrowing', async () => {
    const { configurator, helpersContract, wbch } = testEnv;
    await configurator.disableBorrowingOnReserve(wbch.address);
    const {
      decimals,
      ltv,
      liquidationBonus,
      liquidationThreshold,
      reserveFactor,
      stableBorrowRateEnabled,
      borrowingEnabled,
      isActive,
      isFrozen,
    } = await helpersContract.getReserveConfigurationData(wbch.address);

    expect(borrowingEnabled).to.be.equal(false);
    expect(isActive).to.be.equal(true);
    expect(isFrozen).to.be.equal(false);
    expect(decimals).to.be.equal(strategyWBCH.reserveDecimals);
    expect(ltv).to.be.equal(strategyWBCH.baseLTVAsCollateral);
    expect(liquidationThreshold).to.be.equal(strategyWBCH.liquidationThreshold);
    expect(liquidationBonus).to.be.equal(strategyWBCH.liquidationBonus);
    expect(stableBorrowRateEnabled).to.be.equal(strategyWBCH.stableBorrowRateEnabled);
    expect(reserveFactor).to.be.equal(strategyWBCH.reserveFactor);
  });

  it('Activates the BCH reserve for borrowing', async () => {
    const { configurator, wbch, helpersContract } = testEnv;
    await configurator.enableBorrowingOnReserve(wbch.address, true);
    const { variableBorrowIndex } = await helpersContract.getReserveData(wbch.address);

    const {
      decimals,
      ltv,
      liquidationBonus,
      liquidationThreshold,
      reserveFactor,
      stableBorrowRateEnabled,
      borrowingEnabled,
      isActive,
      isFrozen,
    } = await helpersContract.getReserveConfigurationData(wbch.address);

    expect(borrowingEnabled).to.be.equal(true);
    expect(isActive).to.be.equal(true);
    expect(isFrozen).to.be.equal(false);
    expect(decimals).to.be.equal(strategyWBCH.reserveDecimals);
    expect(ltv).to.be.equal(strategyWBCH.baseLTVAsCollateral);
    expect(liquidationThreshold).to.be.equal(strategyWBCH.liquidationThreshold);
    expect(liquidationBonus).to.be.equal(strategyWBCH.liquidationBonus);
    expect(stableBorrowRateEnabled).to.be.equal(true/*strategyWBCH.stableBorrowRateEnabled*/);
    expect(reserveFactor).to.be.equal(strategyWBCH.reserveFactor);

    expect(variableBorrowIndex.toString()).to.be.equal(RAY);
  });

  it('Check the onlyAaveAdmin on disableBorrowingOnReserve ', async () => {
    const { configurator, users, wbch } = testEnv;
    await expect(
      configurator.connect(users[2].signer).disableBorrowingOnReserve(wbch.address),
      CALLER_NOT_POOL_ADMIN
    ).to.be.revertedWith(CALLER_NOT_POOL_ADMIN);
  });

  it('Check the onlyAaveAdmin on enableBorrowingOnReserve ', async () => {
    const { configurator, users, wbch } = testEnv;
    await expect(
      configurator.connect(users[2].signer).enableBorrowingOnReserve(wbch.address, true),
      CALLER_NOT_POOL_ADMIN
    ).to.be.revertedWith(CALLER_NOT_POOL_ADMIN);
  });

  it('Deactivates the BCH reserve as collateral', async () => {
    const { configurator, helpersContract, wbch } = testEnv;
    await configurator.configureReserveAsCollateral(wbch.address, 0, 0, 0);

    const {
      decimals,
      ltv,
      liquidationBonus,
      liquidationThreshold,
      reserveFactor,
      stableBorrowRateEnabled,
      borrowingEnabled,
      isActive,
      isFrozen,
    } = await helpersContract.getReserveConfigurationData(wbch.address);

    expect(borrowingEnabled).to.be.equal(true);
    expect(isActive).to.be.equal(true);
    expect(isFrozen).to.be.equal(false);
    expect(decimals).to.be.equal(18);
    expect(ltv).to.be.equal(0);
    expect(liquidationThreshold).to.be.equal(0);
    expect(liquidationBonus).to.be.equal(0);
    expect(stableBorrowRateEnabled).to.be.equal(true);
    expect(reserveFactor).to.be.equal(strategyWBCH.reserveFactor);
  });

  it('Activates the BCH reserve as collateral', async () => {
    const { configurator, helpersContract, wbch } = testEnv;
    await configurator.configureReserveAsCollateral(wbch.address, '8000', '8250', '10500');

    const {
      decimals,
      ltv,
      liquidationBonus,
      liquidationThreshold,
      reserveFactor,
      stableBorrowRateEnabled,
      borrowingEnabled,
      isActive,
      isFrozen,
    } = await helpersContract.getReserveConfigurationData(wbch.address);

    expect(borrowingEnabled).to.be.equal(true);
    expect(isActive).to.be.equal(true);
    expect(isFrozen).to.be.equal(false);
    expect(decimals).to.be.equal(strategyWBCH.reserveDecimals);
    expect(ltv).to.be.equal(strategyWBCH.baseLTVAsCollateral);
    expect(liquidationThreshold).to.be.equal(strategyWBCH.liquidationThreshold);
    expect(liquidationBonus).to.be.equal(strategyWBCH.liquidationBonus);
    expect(stableBorrowRateEnabled).to.be.equal(true/*strategyWBCH.stableBorrowRateEnabled*/);
    expect(reserveFactor).to.be.equal(strategyWBCH.reserveFactor);
  });

  it('Check the onlyAaveAdmin on configureReserveAsCollateral ', async () => {
    const { configurator, users, wbch } = testEnv;
    await expect(
      configurator
        .connect(users[2].signer)
        .configureReserveAsCollateral(wbch.address, '7500', '8000', '10500'),
      CALLER_NOT_POOL_ADMIN
    ).to.be.revertedWith(CALLER_NOT_POOL_ADMIN);
  });

  it('Disable stable borrow rate on the BCH reserve', async () => {
    const { configurator, helpersContract, wbch } = testEnv;
    await configurator.disableReserveStableRate(wbch.address);
    const {
      decimals,
      ltv,
      liquidationBonus,
      liquidationThreshold,
      reserveFactor,
      stableBorrowRateEnabled,
      borrowingEnabled,
      isActive,
      isFrozen,
    } = await helpersContract.getReserveConfigurationData(wbch.address);

    expect(borrowingEnabled).to.be.equal(true);
    expect(isActive).to.be.equal(true);
    expect(isFrozen).to.be.equal(false);
    expect(decimals).to.be.equal(strategyWBCH.reserveDecimals);
    expect(ltv).to.be.equal(strategyWBCH.baseLTVAsCollateral);
    expect(liquidationThreshold).to.be.equal(strategyWBCH.liquidationThreshold);
    expect(liquidationBonus).to.be.equal(strategyWBCH.liquidationBonus);
    expect(stableBorrowRateEnabled).to.be.equal(false);
    expect(reserveFactor).to.be.equal(strategyWBCH.reserveFactor);
  });

  it('Enables stable borrow rate on the BCH reserve', async () => {
    const { configurator, helpersContract, wbch } = testEnv;
    await configurator.enableReserveStableRate(wbch.address);
    const {
      decimals,
      ltv,
      liquidationBonus,
      liquidationThreshold,
      reserveFactor,
      stableBorrowRateEnabled,
      borrowingEnabled,
      isActive,
      isFrozen,
    } = await helpersContract.getReserveConfigurationData(wbch.address);

    expect(borrowingEnabled).to.be.equal(true);
    expect(isActive).to.be.equal(true);
    expect(isFrozen).to.be.equal(false);
    expect(decimals).to.be.equal(strategyWBCH.reserveDecimals);
    expect(ltv).to.be.equal(strategyWBCH.baseLTVAsCollateral);
    expect(liquidationThreshold).to.be.equal(strategyWBCH.liquidationThreshold);
    expect(liquidationBonus).to.be.equal(strategyWBCH.liquidationBonus);
    expect(stableBorrowRateEnabled).to.be.equal(true);
    expect(reserveFactor).to.be.equal(strategyWBCH.reserveFactor);
  });

  it('Disable stable borrow rate to return to the original state on the BCH reserve', async () => {
    const { configurator, helpersContract, wbch } = testEnv;
    await configurator.disableReserveStableRate(wbch.address);
    const {
      decimals,
      ltv,
      liquidationBonus,
      liquidationThreshold,
      reserveFactor,
      stableBorrowRateEnabled,
      borrowingEnabled,
      isActive,
      isFrozen,
    } = await helpersContract.getReserveConfigurationData(wbch.address);

    expect(borrowingEnabled).to.be.equal(true);
    expect(isActive).to.be.equal(true);
    expect(isFrozen).to.be.equal(false);
    expect(decimals).to.be.equal(strategyWBCH.reserveDecimals);
    expect(ltv).to.be.equal(strategyWBCH.baseLTVAsCollateral);
    expect(liquidationThreshold).to.be.equal(strategyWBCH.liquidationThreshold);
    expect(liquidationBonus).to.be.equal(strategyWBCH.liquidationBonus);
    expect(stableBorrowRateEnabled).to.be.equal(strategyWBCH.stableBorrowRateEnabled);
    expect(reserveFactor).to.be.equal(strategyWBCH.reserveFactor);
  });

  it('Check the onlyAaveAdmin on disableReserveStableRate', async () => {
    const { configurator, users, wbch } = testEnv;
    await expect(
      configurator.connect(users[2].signer).disableReserveStableRate(wbch.address),
      CALLER_NOT_POOL_ADMIN
    ).to.be.revertedWith(CALLER_NOT_POOL_ADMIN);
  });

  it('Check the onlyAaveAdmin on enableReserveStableRate', async () => {
    const { configurator, users, wbch } = testEnv;
    await expect(
      configurator.connect(users[2].signer).enableReserveStableRate(wbch.address),
      CALLER_NOT_POOL_ADMIN
    ).to.be.revertedWith(CALLER_NOT_POOL_ADMIN);
  });

  it('Changes the reserve factor of WBCH', async () => {
    const { configurator, helpersContract, wbch } = testEnv;
    await configurator.setReserveFactor(wbch.address, '1000');
    const {
      decimals,
      ltv,
      liquidationBonus,
      liquidationThreshold,
      reserveFactor,
      stableBorrowRateEnabled,
      borrowingEnabled,
      isActive,
      isFrozen,
    } = await helpersContract.getReserveConfigurationData(wbch.address);

    expect(borrowingEnabled).to.be.equal(true);
    expect(isActive).to.be.equal(true);
    expect(isFrozen).to.be.equal(false);
    expect(decimals).to.be.equal(strategyWBCH.reserveDecimals);
    expect(ltv).to.be.equal(strategyWBCH.baseLTVAsCollateral);
    expect(liquidationThreshold).to.be.equal(strategyWBCH.liquidationThreshold);
    expect(liquidationBonus).to.be.equal(strategyWBCH.liquidationBonus);
    expect(stableBorrowRateEnabled).to.be.equal(strategyWBCH.stableBorrowRateEnabled);
    expect(reserveFactor).to.be.equal(1000);
  });

  it('Check the onlyLendingPoolManager on setReserveFactor', async () => {
    const { configurator, users, wbch } = testEnv;
    await expect(
      configurator.connect(users[2].signer).setReserveFactor(wbch.address, '2000'),
      CALLER_NOT_POOL_ADMIN
    ).to.be.revertedWith(CALLER_NOT_POOL_ADMIN);
  });

  it('Reverts when trying to disable the FLEXUSD reserve with liquidity on it', async () => {
    const { flexUsd, pool, configurator } = testEnv;
    const userAddress = await pool.signer.getAddress();
    await flexUsd.mint(await convertToCurrencyDecimals(flexUsd.address, '1000'));

    //approve protocol to access depositor wallet
    await flexUsd.approve(pool.address, APPROVAL_AMOUNT_LENDING_POOL);
    const amountFlexUSDtoDeposit = await convertToCurrencyDecimals(flexUsd.address, '1000');

    //user 1 deposits 1000 FLEXUSD
    await pool.deposit(flexUsd.address, amountFlexUSDtoDeposit, userAddress, '0');

    await expect(
      configurator.deactivateReserve(flexUsd.address),
      LPC_RESERVE_LIQUIDITY_NOT_0
    ).to.be.revertedWith(LPC_RESERVE_LIQUIDITY_NOT_0);
  });
});
