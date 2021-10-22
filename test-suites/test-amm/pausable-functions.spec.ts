import { makeSuite, TestEnv } from './helpers/make-suite';
import { ProtocolErrors, RateMode } from '../../helpers/types';
import { APPROVAL_AMOUNT_LENDING_POOL, oneBch } from '../../helpers/constants';
import { convertToCurrencyDecimals } from '../../helpers/contracts-helpers';
import { parseEther, parseUnits } from 'ethers/lib/utils';
import { BigNumber } from 'bignumber.js';
import { MockFlashLoanReceiver } from '../../types/MockFlashLoanReceiver';
import { getMockFlashLoanReceiver } from '../../helpers/contracts-getters';

const { expect } = require('chai');

makeSuite('Pausable Pool', (testEnv: TestEnv) => {
  let _mockFlashLoanReceiver = {} as MockFlashLoanReceiver;

  const {
    LP_IS_PAUSED,
    INVALID_FROM_BALANCE_AFTER_TRANSFER,
    INVALID_TO_BALANCE_AFTER_TRANSFER,
  } = ProtocolErrors;

  before(async () => {
    _mockFlashLoanReceiver = await getMockFlashLoanReceiver();
  });

  it('User 0 deposits 1000 FLEXUSD. Configurator pauses pool. Transfers to user 1 reverts. Configurator unpauses the network and next transfer succees', async () => {
    const { users, pool, flexUsd, aFlexUsd, configurator } = testEnv;

    const amountFlexUSDtoDeposit = await convertToCurrencyDecimals(flexUsd.address, '1000');

    await flexUsd.connect(users[0].signer).mint(amountFlexUSDtoDeposit);

    // user 0 deposits 1000 FLEXUSD
    await flexUsd.connect(users[0].signer).approve(pool.address, APPROVAL_AMOUNT_LENDING_POOL);
    await pool
      .connect(users[0].signer)
      .deposit(flexUsd.address, amountFlexUSDtoDeposit, users[0].address, '0');

    const user0Balance = await aFlexUsd.balanceOf(users[0].address);
    const user1Balance = await aFlexUsd.balanceOf(users[1].address);

    // Configurator pauses the pool
    await configurator.connect(users[1].signer).setPoolPause(true);

    // User 0 tries the transfer to User 1
    await expect(
      aFlexUsd.connect(users[0].signer).transfer(users[1].address, amountFlexUSDtoDeposit)
    ).to.revertedWith(LP_IS_PAUSED);

    const pausedFromBalance = await aFlexUsd.balanceOf(users[0].address);
    const pausedToBalance = await aFlexUsd.balanceOf(users[1].address);

    expect(pausedFromBalance).to.be.equal(
      user0Balance.toString(),
      INVALID_TO_BALANCE_AFTER_TRANSFER
    );
    expect(pausedToBalance.toString()).to.be.equal(
      user1Balance.toString(),
      INVALID_FROM_BALANCE_AFTER_TRANSFER
    );

    // Configurator unpauses the pool
    await configurator.connect(users[1].signer).setPoolPause(false);

    // User 0 succeeds transfer to User 1
    await aFlexUsd.connect(users[0].signer).transfer(users[1].address, amountFlexUSDtoDeposit);

    const fromBalance = await aFlexUsd.balanceOf(users[0].address);
    const toBalance = await aFlexUsd.balanceOf(users[1].address);

    expect(fromBalance.toString()).to.be.equal(
      user0Balance.sub(amountFlexUSDtoDeposit),
      INVALID_FROM_BALANCE_AFTER_TRANSFER
    );
    expect(toBalance.toString()).to.be.equal(
      user1Balance.add(amountFlexUSDtoDeposit),
      INVALID_TO_BALANCE_AFTER_TRANSFER
    );
  });

  it('Deposit', async () => {
    const { users, pool, flexUsd, aFlexUsd, configurator } = testEnv;

    const amountFlexUSDtoDeposit = await convertToCurrencyDecimals(flexUsd.address, '1000');

    await flexUsd.connect(users[0].signer).mint(amountFlexUSDtoDeposit);

    // user 0 deposits 1000 FLEXUSD
    await flexUsd.connect(users[0].signer).approve(pool.address, APPROVAL_AMOUNT_LENDING_POOL);

    // Configurator pauses the pool
    await configurator.connect(users[1].signer).setPoolPause(true);
    await expect(
      pool.connect(users[0].signer).deposit(flexUsd.address, amountFlexUSDtoDeposit, users[0].address, '0')
    ).to.revertedWith(LP_IS_PAUSED);

    // Configurator unpauses the pool
    await configurator.connect(users[1].signer).setPoolPause(false);
  });

  it('Withdraw', async () => {
    const { users, pool, flexUsd, aFlexUsd, configurator } = testEnv;

    const amountFlexUSDtoDeposit = await convertToCurrencyDecimals(flexUsd.address, '1000');

    await flexUsd.connect(users[0].signer).mint(amountFlexUSDtoDeposit);

    // user 0 deposits 1000 FLEXUSD
    await flexUsd.connect(users[0].signer).approve(pool.address, APPROVAL_AMOUNT_LENDING_POOL);
    await pool
      .connect(users[0].signer)
      .deposit(flexUsd.address, amountFlexUSDtoDeposit, users[0].address, '0');

    // Configurator pauses the pool
    await configurator.connect(users[1].signer).setPoolPause(true);

    // user tries to burn
    await expect(
      pool.connect(users[0].signer).withdraw(flexUsd.address, amountFlexUSDtoDeposit, users[0].address)
    ).to.revertedWith(LP_IS_PAUSED);

    // Configurator unpauses the pool
    await configurator.connect(users[1].signer).setPoolPause(false);
  });

  it('Borrow', async () => {
    const { pool, flexUsd, users, configurator } = testEnv;

    const user = users[1];
    // Pause the pool
    await configurator.connect(users[1].signer).setPoolPause(true);

    // Try to execute liquidation
    await expect(
      pool.connect(user.signer).borrow(flexUsd.address, '1', '2', '0', user.address)
    ).revertedWith(LP_IS_PAUSED);

    // Unpause the pool
    await configurator.connect(users[1].signer).setPoolPause(false);
  });

  it('Repay', async () => {
    const { pool, flexUsd, users, configurator } = testEnv;

    const user = users[1];
    // Pause the pool
    await configurator.connect(users[1].signer).setPoolPause(true);

    // Try to execute liquidation
    await expect(pool.connect(user.signer).repay(flexUsd.address, '1', '2', user.address)).revertedWith(
      LP_IS_PAUSED
    );

    // Unpause the pool
    await configurator.connect(users[1].signer).setPoolPause(false);
  });

  it('Flash loan', async () => {
    const { flexUsd, pool, wbch, users, configurator } = testEnv;

    const caller = users[3];

    const flashAmount = parseEther('0.8');

    await _mockFlashLoanReceiver.setFailExecutionTransfer(true);

    // Pause pool
    await configurator.connect(users[1].signer).setPoolPause(true);

    await expect(
      pool
        .connect(caller.signer)
        .flashLoan(
          _mockFlashLoanReceiver.address,
          [wbch.address],
          [flashAmount],
          [2],
          caller.address,
          '0x10',
          '0'
        )
    ).revertedWith(LP_IS_PAUSED);

    // Unpause pool
    await configurator.connect(users[1].signer).setPoolPause(false);
  });

  // USDC before
  it('Liquidation call', async () => {
    const { users, pool, flexUsd, oracle, wbch, configurator, helpersContract } = testEnv;
    const depositor = users[3];
    const borrower = users[4];

    //mints FLEXUSD to depositor
    await flexUsd
      .connect(depositor.signer)
      .mint(await convertToCurrencyDecimals(flexUsd.address, '1000'));

    //approve protocol to access depositor wallet
    await flexUsd.connect(depositor.signer).approve(pool.address, APPROVAL_AMOUNT_LENDING_POOL);

    //user 3 deposits 1000 FLEXUSD
    const amountFlexUSDtoDeposit = await convertToCurrencyDecimals(flexUsd.address, '1000');

    await pool
      .connect(depositor.signer)
      .deposit(flexUsd.address, amountFlexUSDtoDeposit, depositor.address, '0');

    //user 4 deposits 1 BCH
    const amountETHtoDeposit = await convertToCurrencyDecimals(wbch.address, '1');

    //mints WBCH to borrower
    await wbch.connect(borrower.signer).mint(amountETHtoDeposit);

    //approve protocol to access borrower wallet
    await wbch.connect(borrower.signer).approve(pool.address, APPROVAL_AMOUNT_LENDING_POOL);

    await pool
      .connect(borrower.signer)
      .deposit(wbch.address, amountETHtoDeposit, borrower.address, '0');

    //user 4 borrows
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

    // Drops HF below 1
    await oracle.setAssetPrice(
      flexUsd.address,
      new BigNumber(flexUsdPrice.toString()).multipliedBy(1.2).toFixed(0)
    );

    //mints flexUsd to the liquidator
    await flexUsd.mint(await convertToCurrencyDecimals(flexUsd.address, '1000'));
    await flexUsd.approve(pool.address, APPROVAL_AMOUNT_LENDING_POOL);

    const userReserveDataBefore = await helpersContract.getUserReserveData(
      flexUsd.address,
      borrower.address
    );

    const amountToLiquidate = new BigNumber(userReserveDataBefore.currentVariableDebt.toString())
      .multipliedBy(0.5)
      .toFixed(0);

    // Pause pool
    await configurator.connect(users[1].signer).setPoolPause(true);

    // Do liquidation
    await expect(
      pool.liquidationCall(wbch.address, flexUsd.address, borrower.address, amountToLiquidate, true)
    ).revertedWith(LP_IS_PAUSED);

    // Unpause pool
    await configurator.connect(users[1].signer).setPoolPause(false);
  });

  // USDC before
  it('SwapBorrowRateMode should fail because pool is paused', async () => {
    const { pool, wbch, flexUsd, users, configurator } = testEnv;
    const user = users[1];
    const amountWBCHToDeposit = parseEther('10');
    const amountFlexUSDToDeposit = parseEther('120');
    const amountToBorrow = parseUnits('65', 6);

    await wbch.connect(user.signer).mint(amountWBCHToDeposit);
    await wbch.connect(user.signer).approve(pool.address, APPROVAL_AMOUNT_LENDING_POOL);
    await pool.connect(user.signer).deposit(wbch.address, amountWBCHToDeposit, user.address, '0');

    await flexUsd.connect(user.signer).mint(amountFlexUSDToDeposit);
    await flexUsd.connect(user.signer).approve(pool.address, APPROVAL_AMOUNT_LENDING_POOL);
    await pool.connect(user.signer).deposit(flexUsd.address, amountFlexUSDToDeposit, user.address, '0');

    await pool.connect(user.signer).borrow(flexUsd.address, amountToBorrow, 2, 0, user.address);

    // Pause pool
    await configurator.connect(users[1].signer).setPoolPause(true);

    // Try to repay
    await expect(
      pool.connect(user.signer).swapBorrowRateMode(flexUsd.address, RateMode.Stable)
    ).revertedWith(LP_IS_PAUSED);

    // Unpause pool
    await configurator.connect(users[1].signer).setPoolPause(false);
  });

  it('RebalanceStableBorrowRate should fail because the pool is paused, even if there is no stable borrow', async () => {
    const { pool, flexUsd, users, configurator } = testEnv;
    const user = users[1];
    // Pause pool
    await configurator.connect(users[1].signer).setPoolPause(true);

    await expect(
      pool.connect(user.signer).rebalanceStableBorrowRate(flexUsd.address, user.address)
    ).revertedWith(LP_IS_PAUSED);

    // Unpause pool
    await configurator.connect(users[1].signer).setPoolPause(false);
  });

  it('setUserUseReserveAsCollateral', async () => {
    const { pool, wbch, users, configurator } = testEnv;
    const user = users[1];

    const amountWBCHToDeposit = parseEther('1');
    await wbch.connect(user.signer).mint(amountWBCHToDeposit);
    await wbch.connect(user.signer).approve(pool.address, APPROVAL_AMOUNT_LENDING_POOL);
    await pool.connect(user.signer).deposit(wbch.address, amountWBCHToDeposit, user.address, '0');

    // Pause pool
    await configurator.connect(users[1].signer).setPoolPause(true);

    await expect(
      pool.connect(user.signer).setUserUseReserveAsCollateral(wbch.address, false)
    ).revertedWith(LP_IS_PAUSED);

    // Unpause pool
    await configurator.connect(users[1].signer).setPoolPause(false);
  });
});
