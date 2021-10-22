import BigNumber from 'bignumber.js';

import { DRE } from '../../helpers/misc-utils';
import { APPROVAL_AMOUNT_LENDING_POOL, oneBch } from '../../helpers/constants';
import { convertToCurrencyDecimals } from '../../helpers/contracts-helpers';
import { makeSuite } from './helpers/make-suite';
import { ProtocolErrors, RateMode } from '../../helpers/types';
import { calcExpectedVariableDebtTokenBalance } from './helpers/utils/calculations';
import { getUserData, getReserveData } from './helpers/utils/helpers';

const chai = require('chai');
const { expect } = chai;

makeSuite('LendingPool liquidation - liquidator receiving aToken', (testEnv) => {
  const {
    LPCM_HEALTH_FACTOR_NOT_BELOW_THRESHOLD,
    INVALID_HF,
    LPCM_SPECIFIED_CURRENCY_NOT_BORROWED_BY_USER,
    LPCM_COLLATERAL_CANNOT_BE_LIQUIDATED,
    LP_IS_PAUSED,
  } = ProtocolErrors;

  it('Deposits WBCH, borrows FLEXUSD/Check liquidation fails because health factor is above 1', async () => {
    const { flexUsd, wbch, users, pool, oracle } = testEnv;
    const depositor = users[0];
    const borrower = users[1];

    //mints FLEXUSD to depositor
    await flexUsd
      .connect(depositor.signer)
      .mint(await convertToCurrencyDecimals(flexUsd.address, '1000'));

    //approve protocol to access depositor wallet
    await flexUsd.connect(depositor.signer).approve(pool.address, APPROVAL_AMOUNT_LENDING_POOL);

    //user 1 deposits 1000 FLEXUSD
    const amountFlexUSDtoDeposit = await convertToCurrencyDecimals(flexUsd.address, '1000');
    await pool
      .connect(depositor.signer)
      .deposit(flexUsd.address, amountFlexUSDtoDeposit, depositor.address, '0');

    const amountETHtoDeposit = await convertToCurrencyDecimals(wbch.address, '1');

    //mints WBCH to borrower
    await wbch.connect(borrower.signer).mint(amountETHtoDeposit);

    //approve protocol to access borrower wallet
    await wbch.connect(borrower.signer).approve(pool.address, APPROVAL_AMOUNT_LENDING_POOL);

    //user 2 deposits 1 WBCH
    await pool
      .connect(borrower.signer)
      .deposit(wbch.address, amountETHtoDeposit, borrower.address, '0');

    //user 2 borrows
    const userGlobalData = await pool.getUserAccountData(borrower.address);
    const flexUsdPrice = await oracle.getAssetPrice(flexUsd.address);

    const amountFlexUSDToBorrow = await convertToCurrencyDecimals(
      flexUsd.address,
      new BigNumber(userGlobalData.availableBorrowsETH.toString())
        .div(flexUsdPrice.toString())
        .multipliedBy(0.95)
        .toFixed(0)
    );

    await pool
      .connect(borrower.signer)
      .borrow(flexUsd.address, amountFlexUSDToBorrow, RateMode.Variable, '0', borrower.address);

    const userGlobalDataAfter = await pool.getUserAccountData(borrower.address);

    expect(userGlobalDataAfter.currentLiquidationThreshold.toString()).to.be.bignumber.equal(
      '8250',
      'Invalid liquidation threshold'
    );

    //someone tries to liquidate user 2
    await expect(
      pool.liquidationCall(wbch.address, flexUsd.address, borrower.address, 1, true)
    ).to.be.revertedWith(LPCM_HEALTH_FACTOR_NOT_BELOW_THRESHOLD);
  });

  it('Drop the health factor below 1', async () => {
    const { flexUsd, users, pool, oracle } = testEnv;
    const borrower = users[1];

    const flexUsdPrice = await oracle.getAssetPrice(flexUsd.address);

    await oracle.setAssetPrice(
      flexUsd.address,
      new BigNumber(flexUsdPrice.toString()).multipliedBy(1.15).toFixed(0)
    );

    const userGlobalData = await pool.getUserAccountData(borrower.address);

    expect(userGlobalData.healthFactor.toString()).to.be.bignumber.lt(
      oneBch.toString(),
      INVALID_HF
    );
  });

  it('Tries to liquidate a different currency than the loan principal', async () => {
    const { pool, users, wbch } = testEnv;
    const borrower = users[1];
    //user 2 tries to borrow
    await expect(
      pool.liquidationCall(wbch.address, wbch.address, borrower.address, oneBch.toString(), true)
    ).revertedWith(LPCM_SPECIFIED_CURRENCY_NOT_BORROWED_BY_USER);
  });

  it('Tries to liquidate a different collateral than the borrower collateral', async () => {
    const { pool, flexUsd, users } = testEnv;
    const borrower = users[1];

    await expect(
      pool.liquidationCall(
        flexUsd.address,
        flexUsd.address,
        borrower.address,
        oneBch.toString(),
        true
      )
    ).revertedWith(LPCM_COLLATERAL_CANNOT_BE_LIQUIDATED);
  });

  it('Liquidates the borrow', async () => {
    const { pool, flexUsd, wbch, aWBCH, aFlexUsd, users, oracle, helpersContract, deployer } =
      testEnv;
    const borrower = users[1];

    //mints flexUsd to the caller

    await flexUsd.mint(await convertToCurrencyDecimals(flexUsd.address, '1000'));

    //approve protocol to access depositor wallet
    await flexUsd.approve(pool.address, APPROVAL_AMOUNT_LENDING_POOL);

    const flexUsdReserveDataBefore = await getReserveData(helpersContract, flexUsd.address);
    const bchReserveDataBefore = await helpersContract.getReserveData(wbch.address);

    const userReserveDataBefore = await getUserData(
      pool,
      helpersContract,
      flexUsd.address,
      borrower.address
    );

    const amountToLiquidate = new BigNumber(userReserveDataBefore.currentVariableDebt.toString())
      .div(2)
      .toFixed(0);

    const tx = await pool.liquidationCall(
      wbch.address,
      flexUsd.address,
      borrower.address,
      amountToLiquidate,
      true
    );

    const userReserveDataAfter = await helpersContract.getUserReserveData(
      flexUsd.address,
      borrower.address
    );

    const userGlobalDataAfter = await pool.getUserAccountData(borrower.address);

    const flexUsdReserveDataAfter = await helpersContract.getReserveData(flexUsd.address);
    const bchReserveDataAfter = await helpersContract.getReserveData(wbch.address);

    const collateralPrice = (await oracle.getAssetPrice(wbch.address)).toString();
    const principalPrice = (await oracle.getAssetPrice(flexUsd.address)).toString();

    const collateralDecimals = (
      await helpersContract.getReserveConfigurationData(wbch.address)
    ).decimals.toString();
    const principalDecimals = (
      await helpersContract.getReserveConfigurationData(flexUsd.address)
    ).decimals.toString();

    const expectedCollateralLiquidated = new BigNumber(principalPrice)
      .times(new BigNumber(amountToLiquidate).times(105))
      .times(new BigNumber(10).pow(collateralDecimals))
      .div(new BigNumber(collateralPrice).times(new BigNumber(10).pow(principalDecimals)))
      .decimalPlaces(0, BigNumber.ROUND_DOWN);

    if (!tx.blockNumber) {
      expect(false, 'Invalid block number');
      return;
    }

    const txTimestamp = new BigNumber(
      (await DRE.ethers.provider.getBlock(tx.blockNumber)).timestamp
    );

    const variableDebtBeforeTx = calcExpectedVariableDebtTokenBalance(
      flexUsdReserveDataBefore,
      userReserveDataBefore,
      txTimestamp
    );

    expect(userGlobalDataAfter.healthFactor.toString()).to.be.bignumber.gt(
      oneBch.toFixed(0),
      'Invalid health factor'
    );

    expect(userReserveDataAfter.currentVariableDebt.toString()).to.be.bignumber.almostEqual(
      new BigNumber(variableDebtBeforeTx).minus(amountToLiquidate).toFixed(0),
      'Invalid user borrow balance after liquidation'
    );

    expect(flexUsdReserveDataAfter.availableLiquidity.toString()).to.be.bignumber.almostEqual(
      new BigNumber(flexUsdReserveDataBefore.availableLiquidity.toString())
        .plus(amountToLiquidate)
        .toFixed(0),
      'Invalid principal available liquidity'
    );

    //the liquidity index of the principal reserve needs to be bigger than the index before
    expect(flexUsdReserveDataAfter.liquidityIndex.toString()).to.be.bignumber.gte(
      flexUsdReserveDataBefore.liquidityIndex.toString(),
      'Invalid liquidity index'
    );

    //the principal APY after a liquidation needs to be lower than the APY before
    expect(flexUsdReserveDataAfter.liquidityRate.toString()).to.be.bignumber.lt(
      flexUsdReserveDataBefore.liquidityRate.toString(),
      'Invalid liquidity APY'
    );

    expect(bchReserveDataAfter.availableLiquidity.toString()).to.be.bignumber.almostEqual(
      new BigNumber(bchReserveDataBefore.availableLiquidity.toString()).toFixed(0),
      'Invalid collateral available liquidity'
    );

    expect(
      (await helpersContract.getUserReserveData(wbch.address, deployer.address))
        .usageAsCollateralEnabled
    ).to.be.true;
  });

  // TODO - FIXME - USDC before
  // it('User 3 deposits 1000 FLEXUSD, user 4 1 WBCH, user 4 borrows - drops HF, liquidates the borrow', async () => {
  //   const { users, pool, flexUsd, oracle, wbch, helpersContract } = testEnv;
  //   const depositor = users[3];
  //   const borrower = users[4];

  //   //mints FLEXUSD to depositor
  //   await flexUsd
  //     .connect(depositor.signer)
  //     .mint(await convertToCurrencyDecimals(flexUsd.address, '1000'));

  //   //approve protocol to access depositor wallet
  //   await flexUsd.connect(depositor.signer).approve(pool.address, APPROVAL_AMOUNT_LENDING_POOL);

  //   //user 3 deposits 1000 FLEXUSD
  //   const amountFlexUSDtoDeposit = await convertToCurrencyDecimals(flexUsd.address, '1000');

  //   await pool
  //     .connect(depositor.signer)
  //     .deposit(flexUsd.address, amountFlexUSDtoDeposit, depositor.address, '0');

  //   //user 4 deposits 1 BCH
  //   const amountETHtoDeposit = await convertToCurrencyDecimals(wbch.address, '1');

  //   //mints WBCH to borrower
  //   await wbch.connect(borrower.signer).mint(amountETHtoDeposit);

  //   //approve protocol to access borrower wallet
  //   await wbch.connect(borrower.signer).approve(pool.address, APPROVAL_AMOUNT_LENDING_POOL);

  //   await pool
  //     .connect(borrower.signer)
  //     .deposit(wbch.address, amountETHtoDeposit, borrower.address, '0');

  //   //user 4 borrows
  //   const userGlobalData = await pool.getUserAccountData(borrower.address);

  //   const flexUsdPrice = await oracle.getAssetPrice(flexUsd.address);

  //   const amountFlexUSDToBorrow = await convertToCurrencyDecimals(
  //     flexUsd.address,
  //     new BigNumber(userGlobalData.availableBorrowsETH.toString())
  //       .div(flexUsdPrice.toString())
  //       .multipliedBy(0.9502)
  //       .toFixed(0)
  //   );

  //   await pool
  //     .connect(borrower.signer)
  //     .borrow(flexUsd.address, amountFlexUSDToBorrow, RateMode.Stable, '0', borrower.address);

  //   //drops HF below 1

  //   await oracle.setAssetPrice(
  //     flexUsd.address,
  //     new BigNumber(flexUsdPrice.toString()).multipliedBy(1.12).toFixed(0)
  //   );

  //   //mints flexUsd to the liquidator

  //   await flexUsd.mint(await convertToCurrencyDecimals(flexUsd.address, '1000'));

  //   //approve protocol to access depositor wallet
  //   await flexUsd.approve(pool.address, APPROVAL_AMOUNT_LENDING_POOL);

  //   const userReserveDataBefore = await helpersContract.getUserReserveData(
  //     flexUsd.address,
  //     borrower.address
  //   );

  //   const flexUsdReserveDataBefore = await helpersContract.getReserveData(flexUsd.address);
  //   const bchReserveDataBefore = await helpersContract.getReserveData(wbch.address);

  //   const amountToLiquidate = new BigNumber(userReserveDataBefore.currentStableDebt.toString())
  //     .multipliedBy(0.5)
  //     .toFixed(0);

  //   await pool.liquidationCall(
  //     wbch.address,
  //     flexUsd.address,
  //     borrower.address,
  //     amountToLiquidate,
  //     true
  //   );

  //   const userReserveDataAfter = await helpersContract.getUserReserveData(
  //     flexUsd.address,
  //     borrower.address
  //   );

  //   const userGlobalDataAfter = await pool.getUserAccountData(borrower.address);

  //   const flexUsdReserveDataAfter = await helpersContract.getReserveData(flexUsd.address);
  //   const bchReserveDataAfter = await helpersContract.getReserveData(wbch.address);

  //   const collateralPrice = (await oracle.getAssetPrice(wbch.address)).toString();
  //   const principalPrice = (await oracle.getAssetPrice(flexUsd.address)).toString();

  //   const collateralDecimals = (
  //     await helpersContract.getReserveConfigurationData(wbch.address)
  //   ).decimals.toString();
  //   const principalDecimals = (
  //     await helpersContract.getReserveConfigurationData(flexUsd.address)
  //   ).decimals.toString();

  //   const expectedCollateralLiquidated = new BigNumber(principalPrice)
  //     .times(new BigNumber(amountToLiquidate).times(105))
  //     .times(new BigNumber(10).pow(collateralDecimals))
  //     .div(new BigNumber(collateralPrice).times(new BigNumber(10).pow(principalDecimals)))
  //     .decimalPlaces(0, BigNumber.ROUND_DOWN);

  //   expect(userGlobalDataAfter.healthFactor.toString()).to.be.bignumber.gt(
  //     oneBch.toFixed(0),
  //     'Invalid health factor'
  //   );

  //   expect(userReserveDataAfter.currentStableDebt.toString()).to.be.bignumber.almostEqual(
  //     new BigNumber(userReserveDataBefore.currentStableDebt.toString())
  //       .minus(amountToLiquidate)
  //       .toFixed(0),
  //     'Invalid user borrow balance after liquidation'
  //   );

  //   expect(flexUsdReserveDataAfter.availableLiquidity.toString()).to.be.bignumber.almostEqual(
  //     new BigNumber(flexUsdReserveDataBefore.availableLiquidity.toString())
  //       .plus(amountToLiquidate)
  //       .toFixed(0),
  //     'Invalid principal available liquidity'
  //   );

  //   //the liquidity index of the principal reserve needs to be bigger than the index before
  //   expect(flexUsdReserveDataAfter.liquidityIndex.toString()).to.be.bignumber.gte(
  //     flexUsdReserveDataBefore.liquidityIndex.toString(),
  //     'Invalid liquidity index'
  //   );

  //   //the principal APY after a liquidation needs to be lower than the APY before
  //   expect(flexUsdReserveDataAfter.liquidityRate.toString()).to.be.bignumber.lt(
  //     flexUsdReserveDataBefore.liquidityRate.toString(),
  //     'Invalid liquidity APY'
  //   );

  //   expect(bchReserveDataAfter.availableLiquidity.toString()).to.be.bignumber.almostEqual(
  //     new BigNumber(bchReserveDataBefore.availableLiquidity.toString()).toFixed(0),
  //     'Invalid collateral available liquidity'
  //   );
  // });
});
