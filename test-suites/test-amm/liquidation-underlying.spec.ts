import BigNumber from 'bignumber.js';

import { DRE, increaseTime } from '../../helpers/misc-utils';
import { APPROVAL_AMOUNT_LENDING_POOL, oneBch } from '../../helpers/constants';
import { convertToCurrencyDecimals } from '../../helpers/contracts-helpers';
import { makeSuite } from './helpers/make-suite';
import { ProtocolErrors, RateMode } from '../../helpers/types';
import { calcExpectedVariableDebtTokenBalance } from './helpers/utils/calculations';
import { getReserveData, getUserData } from './helpers/utils/helpers';
import { CommonsConfig } from '../../markets/amm/commons';

import { parseEther } from 'ethers/lib/utils';

const chai = require('chai');

const { expect } = chai;

makeSuite('LendingPool liquidation - liquidator receiving the underlying asset', (testEnv) => {
  const { INVALID_HF } = ProtocolErrors;

  before('Before LendingPool liquidation: set config', () => {
    BigNumber.config({ DECIMAL_PLACES: 0, ROUNDING_MODE: BigNumber.ROUND_DOWN });
  });

  after('After LendingPool liquidation: reset config', () => {
    BigNumber.config({ DECIMAL_PLACES: 20, ROUNDING_MODE: BigNumber.ROUND_HALF_UP });
  });

  it("It's not possible to liquidate on a non-active collateral or a non active principal", async () => {
    const { configurator, wbch, pool, users, flexUsd } = testEnv;
    const user = users[1];
    await configurator.deactivateReserve(wbch.address);

    await expect(
      pool.liquidationCall(wbch.address, flexUsd.address, user.address, parseEther('1000'), false)
    ).to.be.revertedWith('2');

    await configurator.activateReserve(wbch.address);

    await configurator.deactivateReserve(flexUsd.address);

    await expect(
      pool.liquidationCall(wbch.address, flexUsd.address, user.address, parseEther('1000'), false)
    ).to.be.revertedWith('2');

    await configurator.activateReserve(flexUsd.address);
  });

  it('Deposits WBCH, borrows FLEXUSD', async () => {
    const { flexUsd, wbch, users, pool, oracle } = testEnv;
    const depositor = users[0];
    const borrower = users[1];

    //mints FLEXUSD to depositor
    await flexUsd.connect(depositor.signer).mint(await convertToCurrencyDecimals(flexUsd.address, '1000'));

    //approve protocol to access depositor wallet
    await flexUsd.connect(depositor.signer).approve(pool.address, APPROVAL_AMOUNT_LENDING_POOL);

    //user 1 deposits 1000 FLEXUSD
    const amountFlexUSDtoDeposit = await convertToCurrencyDecimals(flexUsd.address, '1000');

    await pool
      .connect(depositor.signer)
      .deposit(flexUsd.address, amountFlexUSDtoDeposit, depositor.address, '0');
    //user 2 deposits 1 BCH
    const amountETHtoDeposit = await convertToCurrencyDecimals(wbch.address, '1');

    //mints WBCH to borrower
    await wbch.connect(borrower.signer).mint(await convertToCurrencyDecimals(wbch.address, '1000'));

    //approve protocol to access the borrower wallet
    await wbch.connect(borrower.signer).approve(pool.address, APPROVAL_AMOUNT_LENDING_POOL);

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
      INVALID_HF
    );
  });

  it('Drop the health factor below 1', async () => {
    const { flexUsd, wbch, users, pool, oracle } = testEnv;
    const borrower = users[1];

    const flexUsdPrice = await oracle.getAssetPrice(flexUsd.address);

    await oracle.setAssetPrice(
      flexUsd.address,
      new BigNumber(flexUsdPrice.toString()).multipliedBy(1.18).toFixed(0)
    );

    const userGlobalData = await pool.getUserAccountData(borrower.address);

    expect(userGlobalData.healthFactor.toString()).to.be.bignumber.lt(
      oneBch.toFixed(0),
      INVALID_HF
    );
  });

  it('Liquidates the borrow', async () => {
    const { flexUsd, wbch, users, pool, oracle, helpersContract } = testEnv;
    const liquidator = users[3];
    const borrower = users[1];

    //mints flexUsd to the liquidator
    await flexUsd.connect(liquidator.signer).mint(await convertToCurrencyDecimals(flexUsd.address, '1000'));

    //approve protocol to access the liquidator wallet
    await flexUsd.connect(liquidator.signer).approve(pool.address, APPROVAL_AMOUNT_LENDING_POOL);

    const flexUsdReserveBefore = await getReserveData(helpersContract, flexUsd.address);
    const flexUsdReserveDataBefore = await helpersContract.getReserveData(flexUsd.address);
    const bchReserveDataBefore = await helpersContract.getReserveData(wbch.address);

    const userReserveDataBefore = await getUserData(
      pool,
      helpersContract,
      flexUsd.address,
      borrower.address
    );

    const amountToLiquidate = userReserveDataBefore.currentVariableDebt.div(2).toFixed(0);

    await increaseTime(100);

    const tx = await pool
      .connect(liquidator.signer)
      .liquidationCall(wbch.address, flexUsd.address, borrower.address, amountToLiquidate, false);

    const userReserveDataAfter = await getUserData(
      pool,
      helpersContract,
      flexUsd.address,
      borrower.address
    );

    const flexUsdReserveDataAfter = await helpersContract.getReserveData(flexUsd.address);
    const bchReserveDataAfter = await helpersContract.getReserveData(wbch.address);

    const collateralPrice = await oracle.getAssetPrice(wbch.address);
    const principalPrice = await oracle.getAssetPrice(flexUsd.address);

    const collateralDecimals = (
      await helpersContract.getReserveConfigurationData(wbch.address)
    ).decimals.toString();
    const principalDecimals = (
      await helpersContract.getReserveConfigurationData(flexUsd.address)
    ).decimals.toString();

    const expectedCollateralLiquidated = new BigNumber(principalPrice.toString())
      .times(new BigNumber(amountToLiquidate).times(105))
      .times(new BigNumber(10).pow(collateralDecimals))
      .div(
        new BigNumber(collateralPrice.toString()).times(new BigNumber(10).pow(principalDecimals))
      )
      .div(100)
      .decimalPlaces(0, BigNumber.ROUND_DOWN);

    if (!tx.blockNumber) {
      expect(false, 'Invalid block number');
      return;
    }
    const txTimestamp = new BigNumber(
      (await DRE.ethers.provider.getBlock(tx.blockNumber)).timestamp
    );
    const reserve = await getReserveData
    const variableDebtBeforeTx = calcExpectedVariableDebtTokenBalance(
      flexUsdReserveBefore,
      userReserveDataBefore,
      txTimestamp
    );

    expect(userReserveDataAfter.currentVariableDebt.toString()).to.be.bignumber.almostEqual(
      variableDebtBeforeTx.minus(amountToLiquidate).toFixed(0),
      'Invalid user debt after liquidation'
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

    expect(flexUsdReserveDataAfter.availableLiquidity.toString()).to.be.bignumber.almostEqual(
      new BigNumber(flexUsdReserveDataBefore.availableLiquidity.toString())
        .plus(amountToLiquidate)
        .toFixed(0),
      'Invalid principal available liquidity'
    );

    expect(bchReserveDataAfter.availableLiquidity.toString()).to.be.bignumber.almostEqual(
      new BigNumber(bchReserveDataBefore.availableLiquidity.toString())
        .minus(expectedCollateralLiquidated)
        .toFixed(0),
      'Invalid collateral available liquidity'
    );
  });

  // USDC before
  it('User 3 deposits 1000 FLEXUSD, user 4 1 WBCH, user 4 borrows - drops HF, liquidates the borrow', async () => {
    const { flexUsd, users, pool, oracle, wbch, helpersContract } = testEnv;

    const depositor = users[3];
    const borrower = users[4];
    const liquidator = users[5];

    //mints FLEXUSD to depositor
    await flexUsd
      .connect(depositor.signer)
      .mint(await convertToCurrencyDecimals(flexUsd.address, '1000'));

    //approve protocol to access depositor wallet
    await flexUsd.connect(depositor.signer).approve(pool.address, APPROVAL_AMOUNT_LENDING_POOL);

    //depositor deposits 1000 FLEXUSD
    const amountFlexUSDtoDeposit = await convertToCurrencyDecimals(flexUsd.address, '1000');

    await pool
      .connect(depositor.signer)
      .deposit(flexUsd.address, amountFlexUSDtoDeposit, depositor.address, '0');

    //borrower deposits 1 BCH
    const amountETHtoDeposit = await convertToCurrencyDecimals(wbch.address, '1');

    //mints WBCH to borrower
    await wbch.connect(borrower.signer).mint(await convertToCurrencyDecimals(wbch.address, '1000'));

    //approve protocol to access the borrower wallet
    await wbch.connect(borrower.signer).approve(pool.address, APPROVAL_AMOUNT_LENDING_POOL);

    await pool
      .connect(borrower.signer)
      .deposit(wbch.address, amountETHtoDeposit, borrower.address, '0');

    //borrower borrows
    const userGlobalData = await pool.getUserAccountData(borrower.address);

    const flexUsdPrice = await oracle.getAssetPrice(flexUsd.address);

    const amountFlexUSDToBorrow = await convertToCurrencyDecimals(
      flexUsd.address,
      new BigNumber(userGlobalData.availableBorrowsETH.toString())
        .div(flexUsdPrice.toString())
        .multipliedBy(0.9502)
        .toFixed(0)
    );

    await pool
      .connect(borrower.signer)
      .borrow(flexUsd.address, amountFlexUSDToBorrow, RateMode.Variable, '0', borrower.address);

    //drops HF below 1
    await oracle.setAssetPrice(
      flexUsd.address,
      new BigNumber(flexUsdPrice.toString()).multipliedBy(1.12).toFixed(0)
    );

    //mints flexUsd to the liquidator

    await flexUsd
      .connect(liquidator.signer)
      .mint(await convertToCurrencyDecimals(flexUsd.address, '1000'));

    //approve protocol to access depositor wallet
    await flexUsd.connect(liquidator.signer).approve(pool.address, APPROVAL_AMOUNT_LENDING_POOL);

    const userReserveDataBefore = await helpersContract.getUserReserveData(
      flexUsd.address,
      borrower.address
    );

    const flexUsdReserveDataBefore = await helpersContract.getReserveData(flexUsd.address);
    const bchReserveDataBefore = await helpersContract.getReserveData(wbch.address);

    const amountToLiquidate = DRE.ethers.BigNumber.from(
      userReserveDataBefore.currentVariableDebt.toString()
    )
      .div(2)
      .toString();

    await pool
      .connect(liquidator.signer)
      .liquidationCall(wbch.address, flexUsd.address, borrower.address, amountToLiquidate, false);

    const userReserveDataAfter = await helpersContract.getUserReserveData(
      flexUsd.address,
      borrower.address
    );

    const userGlobalDataAfter = await pool.getUserAccountData(borrower.address);

    const flexUsdReserveDataAfter = await helpersContract.getReserveData(flexUsd.address);
    const bchReserveDataAfter = await helpersContract.getReserveData(wbch.address);

    const collateralPrice = await oracle.getAssetPrice(wbch.address);
    const principalPrice = await oracle.getAssetPrice(flexUsd.address);

    const collateralDecimals = (
      await helpersContract.getReserveConfigurationData(wbch.address)
    ).decimals.toString();
    const principalDecimals = (
      await helpersContract.getReserveConfigurationData(flexUsd.address)
    ).decimals.toString();

    const expectedCollateralLiquidated = new BigNumber(principalPrice.toString())
      .times(new BigNumber(amountToLiquidate).times(105))
      .times(new BigNumber(10).pow(collateralDecimals))
      .div(
        new BigNumber(collateralPrice.toString()).times(new BigNumber(10).pow(principalDecimals))
      )
      .div(100)
      .decimalPlaces(0, BigNumber.ROUND_DOWN);

    expect(userGlobalDataAfter.healthFactor.toString()).to.be.bignumber.gt(
      oneBch.toFixed(0),
      'Invalid health factor'
    );

    expect(userReserveDataAfter.currentVariableDebt.toString()).to.be.bignumber.almostEqual(
      new BigNumber(userReserveDataBefore.currentVariableDebt.toString())
        .minus(amountToLiquidate)
        .toFixed(0),
      'Invalid user borrow balance after liquidation'
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

    expect(flexUsdReserveDataAfter.availableLiquidity.toString()).to.be.bignumber.almostEqual(
      new BigNumber(flexUsdReserveDataBefore.availableLiquidity.toString())
        .plus(amountToLiquidate)
        .toFixed(0),
      'Invalid principal available liquidity'
    );

    expect(bchReserveDataAfter.availableLiquidity.toString()).to.be.bignumber.almostEqual(
      new BigNumber(bchReserveDataBefore.availableLiquidity.toString())
        .minus(expectedCollateralLiquidated)
        .toFixed(0),
      'Invalid collateral available liquidity'
    );
  });

  // USDC before
  it('User 4 deposits 10 BANDZ - drops HF, liquidates the BANDZ, which results on a lower amount being liquidated', async () => {
    const { bandz, flexUsd, users, pool, oracle, helpersContract } = testEnv;

    const depositor = users[3];
    const borrower = users[4];
    const liquidator = users[5];

    //mints BANDZ to borrower
    await bandz.connect(borrower.signer).mint(await convertToCurrencyDecimals(bandz.address, '10'));

    //approve protocol to access the borrower wallet
    await bandz.connect(borrower.signer).approve(pool.address, APPROVAL_AMOUNT_LENDING_POOL);

    //borrower deposits 10 BANDZ
    const amountToDeposit = await convertToCurrencyDecimals(bandz.address, '10');

    await pool
      .connect(borrower.signer)
      .deposit(bandz.address, amountToDeposit, borrower.address, '0');
    const flexUsdPrice = await oracle.getAssetPrice(flexUsd.address);

    //drops HF below 1
    await oracle.setAssetPrice(
      flexUsd.address,
      new BigNumber(flexUsdPrice.toString()).multipliedBy(1.14).toFixed(0)
    );

    //mints flexUsd to the liquidator
    await flexUsd
      .connect(liquidator.signer)
      .mint(await convertToCurrencyDecimals(flexUsd.address, '1000'));

    //approve protocol to access depositor wallet
    await flexUsd.connect(liquidator.signer).approve(pool.address, APPROVAL_AMOUNT_LENDING_POOL);

    const userReserveDataBefore = await helpersContract.getUserReserveData(
      flexUsd.address,
      borrower.address
    );

    const flexUsdReserveDataBefore = await helpersContract.getReserveData(flexUsd.address);
    const bandzReserveDataBefore = await helpersContract.getReserveData(bandz.address);

    const amountToLiquidate = new BigNumber(userReserveDataBefore.currentVariableDebt.toString())
      .div(2)
      .decimalPlaces(0, BigNumber.ROUND_DOWN)
      .toFixed(0);

    const collateralPrice = await oracle.getAssetPrice(bandz.address);
    const principalPrice = await oracle.getAssetPrice(flexUsd.address);

    await pool
      .connect(liquidator.signer)
      .liquidationCall(bandz.address, flexUsd.address, borrower.address, amountToLiquidate, false);

    const userReserveDataAfter = await helpersContract.getUserReserveData(
      flexUsd.address,
      borrower.address
    );

    const userGlobalDataAfter = await pool.getUserAccountData(borrower.address);

    const flexUsdReserveDataAfter = await helpersContract.getReserveData(flexUsd.address);
    const bandzReserveDataAfter = await helpersContract.getReserveData(bandz.address);

    const bandzConfiguration = await helpersContract.getReserveConfigurationData(bandz.address);
    const collateralDecimals = bandzConfiguration.decimals.toString();
    const liquidationBonus = bandzConfiguration.liquidationBonus.toString();

    const principalDecimals = (
      await helpersContract.getReserveConfigurationData(flexUsd.address)
    ).decimals.toString();

    const expectedCollateralLiquidated = oneBch.multipliedBy('10');

    const expectedPrincipal = new BigNumber(collateralPrice.toString())
      .times(expectedCollateralLiquidated)
      .times(new BigNumber(10).pow(principalDecimals))
      .div(
        new BigNumber(principalPrice.toString()).times(new BigNumber(10).pow(collateralDecimals))
      )
      .times(10000)
      .div(liquidationBonus.toString())
      .decimalPlaces(0, BigNumber.ROUND_DOWN);

    expect(userGlobalDataAfter.healthFactor.toString()).to.be.bignumber.gt(
      oneBch.toFixed(0),
      'Invalid health factor'
    );

    expect(userReserveDataAfter.currentVariableDebt.toString()).to.be.bignumber.almostEqual(
      new BigNumber(userReserveDataBefore.currentVariableDebt.toString())
        .minus(expectedPrincipal)
        .toFixed(0),
      'Invalid user borrow balance after liquidation'
    );

    expect(flexUsdReserveDataAfter.availableLiquidity.toString()).to.be.bignumber.almostEqual(
      new BigNumber(flexUsdReserveDataBefore.availableLiquidity.toString())
        .plus(expectedPrincipal)
        .toFixed(0),
      'Invalid principal available liquidity'
    );

    expect(bandzReserveDataAfter.availableLiquidity.toString()).to.be.bignumber.almostEqual(
      new BigNumber(bandzReserveDataBefore.availableLiquidity.toString())
        .minus(expectedCollateralLiquidated)
        .toFixed(0),
      'Invalid collateral available liquidity'
    );
  });
});
