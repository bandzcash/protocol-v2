import BigNumber from 'bignumber.js';

import { TestEnv, makeSuite } from './helpers/make-suite';
import { APPROVAL_AMOUNT_LENDING_POOL, oneRay } from '../../helpers/constants';
import { convertToCurrencyDecimals, getContract } from '../../helpers/contracts-helpers';
import { ethers } from 'ethers';
import { MockFlashLoanReceiver } from '../../types/MockFlashLoanReceiver';
import { ProtocolErrors, eContractid } from '../../helpers/types';
import { VariableDebtToken } from '../../types/VariableDebtToken';
import { StableDebtToken } from '../../types/StableDebtToken';
import {
  getMockFlashLoanReceiver,
  getStableDebtToken,
  getVariableDebtToken,
} from '../../helpers/contracts-getters';

const { expect } = require('chai');

makeSuite('LendingPool FlashLoan function', (testEnv: TestEnv) => {
  let _mockFlashLoanReceiver = {} as MockFlashLoanReceiver;
  const {
    VL_COLLATERAL_BALANCE_IS_0,
    TRANSFER_AMOUNT_EXCEEDS_BALANCE,
    LP_INVALID_FLASHLOAN_MODE,
    VL_STABLE_BORROWING_NOT_ENABLED,
    SAFEERC20_LOWLEVEL_CALL,
    LP_INVALID_FLASH_LOAN_EXECUTOR_RETURN,
    LP_BORROW_ALLOWANCE_NOT_ENOUGH,
  } = ProtocolErrors;

  before(async () => {
    _mockFlashLoanReceiver = await getMockFlashLoanReceiver();
  });

  it('Deposits WBCH into the reserve', async () => {
    const { pool, wbch } = testEnv;
    const userAddress = await pool.signer.getAddress();
    const amountToDeposit = ethers.utils.parseEther('1');

    await wbch.mint(amountToDeposit);

    await wbch.approve(pool.address, APPROVAL_AMOUNT_LENDING_POOL);

    await pool.deposit(wbch.address, amountToDeposit, userAddress, '0');
  });

  it('Takes WBCH flashloan with mode = 0, returns the funds correctly', async () => {
    const { pool, helpersContract, wbch } = testEnv;

    await pool.flashLoan(
      _mockFlashLoanReceiver.address,
      [wbch.address],
      [ethers.utils.parseEther('0.8')],
      [0],
      _mockFlashLoanReceiver.address,
      '0x10',
      '0'
    );

    ethers.utils.parseUnits('10000');

    const reserveData = await helpersContract.getReserveData(wbch.address);

    const currentLiquidityRate = reserveData.liquidityRate;
    const currentLiquidityIndex = reserveData.liquidityIndex;

    const totalLiquidity = new BigNumber(reserveData.availableLiquidity.toString())
      .plus(reserveData.totalStableDebt.toString())
      .plus(reserveData.totalVariableDebt.toString());

    expect(totalLiquidity.toString()).to.be.equal('1000720000000000000');
    expect(currentLiquidityRate.toString()).to.be.equal('0');
    expect(currentLiquidityIndex.toString()).to.be.equal('1000720000000000000000000000');
  });

  it('Takes an BCH flashloan with mode = 0 as big as the available liquidity', async () => {
    const { pool, helpersContract, wbch } = testEnv;

    const reserveDataBefore = await helpersContract.getReserveData(wbch.address);
    const txResult = await pool.flashLoan(
      _mockFlashLoanReceiver.address,
      [wbch.address],
      ['1000720000000000000'],
      [0],
      _mockFlashLoanReceiver.address,
      '0x10',
      '0'
    );

    const reserveData = await helpersContract.getReserveData(wbch.address);

    const currentLiqudityRate = reserveData.liquidityRate;
    const currentLiquidityIndex = reserveData.liquidityIndex;

    const totalLiquidity = new BigNumber(reserveData.availableLiquidity.toString())
      .plus(reserveData.totalStableDebt.toString())
      .plus(reserveData.totalVariableDebt.toString());

    expect(totalLiquidity.toString()).to.be.equal('1001620648000000000');
    expect(currentLiqudityRate.toString()).to.be.equal('0');
    expect(currentLiquidityIndex.toString()).to.be.equal('1001620648000000000000000000');
  });

  it('Takes WBCH flashloan, does not return the funds with mode = 0. (revert expected)', async () => {
    const { pool, wbch, users } = testEnv;
    const caller = users[1];
    await _mockFlashLoanReceiver.setFailExecutionTransfer(true);

    await expect(
      pool
        .connect(caller.signer)
        .flashLoan(
          _mockFlashLoanReceiver.address,
          [wbch.address],
          [ethers.utils.parseEther('0.8')],
          [0],
          caller.address,
          '0x10',
          '0'
        )
    ).to.be.revertedWith(SAFEERC20_LOWLEVEL_CALL);
  });

  it('Takes WBCH flashloan, simulating a receiver as EOA (revert expected)', async () => {
    const { pool, wbch, users } = testEnv;
    const caller = users[1];
    await _mockFlashLoanReceiver.setFailExecutionTransfer(true);
    await _mockFlashLoanReceiver.setSimulateEOA(true);

    await expect(
      pool
        .connect(caller.signer)
        .flashLoan(
          _mockFlashLoanReceiver.address,
          [wbch.address],
          [ethers.utils.parseEther('0.8')],
          [0],
          caller.address,
          '0x10',
          '0'
        )
    ).to.be.revertedWith(LP_INVALID_FLASH_LOAN_EXECUTOR_RETURN);
  });

  it('Takes a WBCH flashloan with an invalid mode. (revert expected)', async () => {
    const { pool, wbch, users } = testEnv;
    const caller = users[1];
    await _mockFlashLoanReceiver.setSimulateEOA(false);
    await _mockFlashLoanReceiver.setFailExecutionTransfer(true);

    await expect(
      pool
        .connect(caller.signer)
        .flashLoan(
          _mockFlashLoanReceiver.address,
          [wbch.address],
          [ethers.utils.parseEther('0.8')],
          [4],
          caller.address,
          '0x10',
          '0'
        )
    ).to.be.reverted;
  });

  it('Caller deposits 1000 FLEXUSD as collateral, Takes WBCH flashloan with mode = 2, does not return the funds. A variable loan for caller is created', async () => {
    const { flexUsd, pool, wbch, users, helpersContract } = testEnv;

    const caller = users[1];

    await flexUsd.connect(caller.signer).mint(await convertToCurrencyDecimals(flexUsd.address, '1000'));

    await flexUsd.connect(caller.signer).approve(pool.address, APPROVAL_AMOUNT_LENDING_POOL);

    const amountToDeposit = await convertToCurrencyDecimals(flexUsd.address, '1000');

    await pool.connect(caller.signer).deposit(flexUsd.address, amountToDeposit, caller.address, '0');

    await _mockFlashLoanReceiver.setFailExecutionTransfer(true);

    await pool
      .connect(caller.signer)
      .flashLoan(
        _mockFlashLoanReceiver.address,
        [wbch.address],
        [ethers.utils.parseEther('0.8')],
        [2],
        caller.address,
        '0x10',
        '0'
      );
    const { variableDebtTokenAddress } = await helpersContract.getReserveTokensAddresses(
      wbch.address
    );

    const wbchDebtToken = await getVariableDebtToken(variableDebtTokenAddress);

    const callerDebt = await wbchDebtToken.balanceOf(caller.address);

    expect(callerDebt.toString()).to.be.equal('800000000000000000', 'Invalid user debt');
  });

  it('tries to take a flashloan that is bigger than the available liquidity (revert expected)', async () => {
    const { pool, wbch, users } = testEnv;
    const caller = users[1];

    await expect(
      pool.connect(caller.signer).flashLoan(
        _mockFlashLoanReceiver.address,
        [wbch.address],
        ['1004415000000000000'], //slightly higher than the available liquidity
        [2],
        caller.address,
        '0x10',
        '0'
      ),
      TRANSFER_AMOUNT_EXCEEDS_BALANCE
    ).to.be.revertedWith(SAFEERC20_LOWLEVEL_CALL);
  });

  it('tries to take a flashloan using a non contract address as receiver (revert expected)', async () => {
    const { pool, deployer, wbch, users } = testEnv;
    const caller = users[1];

    await expect(
      pool.flashLoan(
        deployer.address,
        [wbch.address],
        ['1000000000000000000'],
        [2],
        caller.address,
        '0x10',
        '0'
      )
    ).to.be.reverted;
  });

  it('Deposits FLEXUSD into the reserve', async () => {
    const { flexUsd, pool } = testEnv;
    const userAddress = await pool.signer.getAddress();

    await flexUsd.mint(await convertToCurrencyDecimals(flexUsd.address, '1000'));

    await flexUsd.approve(pool.address, APPROVAL_AMOUNT_LENDING_POOL);

    const amountToDeposit = await convertToCurrencyDecimals(flexUsd.address, '1000');

    await pool.deposit(flexUsd.address, amountToDeposit, userAddress, '0');
  });

  // USDC before
  it('Takes out a 500 FLEXUSD flashloan, returns the funds correctly', async () => {
    const { flexUsd, pool, helpersContract, deployer: depositor } = testEnv;

    await _mockFlashLoanReceiver.setFailExecutionTransfer(false);

    const reserveDataBefore = await helpersContract.getReserveData(flexUsd.address);

    const flashloanAmount = await convertToCurrencyDecimals(flexUsd.address, '500');

    await pool.flashLoan(
      _mockFlashLoanReceiver.address,
      [flexUsd.address],
      [flashloanAmount],
      [0],
      _mockFlashLoanReceiver.address,
      '0x10',
      '0'
    );

    const reserveDataAfter = helpersContract.getReserveData(flexUsd.address);

    const reserveData = await helpersContract.getReserveData(flexUsd.address);
    const userData = await helpersContract.getUserReserveData(flexUsd.address, depositor.address);

    const totalLiquidity = reserveData.availableLiquidity
      .add(reserveData.totalStableDebt)
      .add(reserveData.totalVariableDebt)
      .toString();
    const currentLiqudityRate = reserveData.liquidityRate.toString();
    const currentLiquidityIndex = reserveData.liquidityIndex.toString();
    const currentUserBalance = userData.currentATokenBalance.toString();

    const expectedLiquidity = await convertToCurrencyDecimals(flexUsd.address, '1000.450');

    expect(totalLiquidity).to.be.equal(expectedLiquidity, 'Invalid total liquidity');
    expect(currentLiqudityRate).to.be.equal('0', 'Invalid liquidity rate');
    expect(currentLiquidityIndex).to.be.equal(
      new BigNumber('1.00045').multipliedBy(oneRay).toFixed(),
      'Invalid liquidity index'
    );
    expect(currentUserBalance.toString()).to.be.equal(expectedLiquidity, 'Invalid user balance');
  });

  // USDC before
  it('Takes out a 500 FLEXUSD flashloan with mode = 0, does not return the funds. (revert expected)', async () => {
    const { flexUsd, pool, users } = testEnv;
    const caller = users[2];

    const flashloanAmount = await convertToCurrencyDecimals(flexUsd.address, '500');

    await _mockFlashLoanReceiver.setFailExecutionTransfer(true);

    await expect(
      pool
        .connect(caller.signer)
        .flashLoan(
          _mockFlashLoanReceiver.address,
          [flexUsd.address],
          [flashloanAmount],
          [2],
          caller.address,
          '0x10',
          '0'
        )
    ).to.be.revertedWith(VL_COLLATERAL_BALANCE_IS_0);
  });

  // USDC before
  it('Caller deposits 5 WBCH as collateral, Takes a FLEXUSD flashloan with mode = 2, does not return the funds. A loan for caller is created', async () => {
    const { flexUsd, pool, wbch, users, helpersContract } = testEnv;

    const caller = users[2];

    await wbch.connect(caller.signer).mint(await convertToCurrencyDecimals(wbch.address, '5'));

    await wbch.connect(caller.signer).approve(pool.address, APPROVAL_AMOUNT_LENDING_POOL);

    const amountToDeposit = await convertToCurrencyDecimals(wbch.address, '5');

    await pool.connect(caller.signer).deposit(wbch.address, amountToDeposit, caller.address, '0');

    await _mockFlashLoanReceiver.setFailExecutionTransfer(true);

    const flashloanAmount = await convertToCurrencyDecimals(flexUsd.address, '500');

    await pool
      .connect(caller.signer)
      .flashLoan(
        _mockFlashLoanReceiver.address,
        [flexUsd.address],
        [flashloanAmount],
        [2],
        caller.address,
        '0x10',
        '0'
      );
    const { variableDebtTokenAddress } = await helpersContract.getReserveTokensAddresses(
      flexUsd.address
    );

    const flexUsdDebtToken = await getVariableDebtToken(variableDebtTokenAddress);

    const callerDebt = await flexUsdDebtToken.balanceOf(caller.address);

    expect(callerDebt.toString()).to.be.equal('500000000', 'Invalid user debt');
  });

  it('Caller deposits 1000 FLEXUSD as collateral, Takes a WBCH flashloan with mode = 0, does not approve the transfer of the funds', async () => {
    const { flexUsd, pool, wbch, users } = testEnv;
    const caller = users[3];

    await flexUsd.connect(caller.signer).mint(await convertToCurrencyDecimals(flexUsd.address, '1000'));

    await flexUsd.connect(caller.signer).approve(pool.address, APPROVAL_AMOUNT_LENDING_POOL);

    const amountToDeposit = await convertToCurrencyDecimals(flexUsd.address, '1000');

    await pool.connect(caller.signer).deposit(flexUsd.address, amountToDeposit, caller.address, '0');

    const flashAmount = ethers.utils.parseEther('0.8');

    await _mockFlashLoanReceiver.setFailExecutionTransfer(false);
    await _mockFlashLoanReceiver.setAmountToApprove(flashAmount.div(2));

    await expect(
      pool
        .connect(caller.signer)
        .flashLoan(
          _mockFlashLoanReceiver.address,
          [wbch.address],
          [flashAmount],
          [0],
          caller.address,
          '0x10',
          '0'
        )
    ).to.be.revertedWith(SAFEERC20_LOWLEVEL_CALL);
  });

  it('Caller takes a WBCH flashloan with mode = 1, should revert since stable borrowing is disabled', async () => {
    const { flexUsd, pool, wbch, users, helpersContract } = testEnv;

    const caller = users[3];

    const flashAmount = ethers.utils.parseEther('0.8');

    await _mockFlashLoanReceiver.setFailExecutionTransfer(true);

    await expect(pool
      .connect(caller.signer)
      .flashLoan(
        _mockFlashLoanReceiver.address,
        [wbch.address],
        [flashAmount],
        [1],
        caller.address,
        '0x10',
        '0'
      )).to.be.revertedWith(VL_STABLE_BORROWING_NOT_ENABLED);

    const { stableDebtTokenAddress } = await helpersContract.getReserveTokensAddresses(
      wbch.address
    );

    const wbchDebtToken = await getStableDebtToken(stableDebtTokenAddress);

    const callerDebt = await wbchDebtToken.balanceOf(caller.address);

    expect(callerDebt.toString()).to.be.equal('0', 'Invalid user debt');
  });

  it('Caller takes a WBCH flashloan with mode = 2', async () => {
    const { flexUsd, pool, wbch, users, helpersContract } = testEnv;

    const caller = users[3];

    const flashAmount = ethers.utils.parseEther('0.8');

    await _mockFlashLoanReceiver.setFailExecutionTransfer(true);

    await pool
      .connect(caller.signer)
      .flashLoan(
        _mockFlashLoanReceiver.address,
        [wbch.address],
        [flashAmount],
        [2],
        caller.address,
        '0x10',
        '0'
      );

    const { variableDebtTokenAddress } = await helpersContract.getReserveTokensAddresses(
      wbch.address
    );

    const wbchDebtToken = await getStableDebtToken(variableDebtTokenAddress);

    const callerDebt = await wbchDebtToken.balanceOf(caller.address);

    expect(callerDebt.toString()).to.be.equal(ethers.utils.parseEther('0.8'), 'Invalid user debt');
  });

  it('Caller takes a WBCH flashloan with mode = 1 onBehalfOf user without allowance, should revert since stable borrowing is disabled', async () => {
    const { flexUsd, pool, wbch, users, helpersContract } = testEnv;

    const caller = users[5];
    const onBehalfOf = users[4];

    // Deposit 1000 flexUsd for onBehalfOf user
    await flexUsd.connect(onBehalfOf.signer).mint(await convertToCurrencyDecimals(flexUsd.address, '1000'));

    await flexUsd.connect(onBehalfOf.signer).approve(pool.address, APPROVAL_AMOUNT_LENDING_POOL);

    const amountToDeposit = await convertToCurrencyDecimals(flexUsd.address, '1000');

    await pool
      .connect(onBehalfOf.signer)
      .deposit(flexUsd.address, amountToDeposit, onBehalfOf.address, '0');

    const flashAmount = ethers.utils.parseEther('0.8');

    await _mockFlashLoanReceiver.setFailExecutionTransfer(true);

    await expect(
      pool
        .connect(caller.signer)
        .flashLoan(
          _mockFlashLoanReceiver.address,
          [wbch.address],
          [flashAmount],
          [1],
          onBehalfOf.address,
          '0x10',
          '0'
        )
    ).to.be.revertedWith(VL_STABLE_BORROWING_NOT_ENABLED);
  });

  it('Caller takes a WBCH flashloan with mode = 2 onBehalfOf user without allowance, should revert since allowance is 0', async () => {
    const { flexUsd, pool, wbch, users, helpersContract } = testEnv;

    const caller = users[5];
    const onBehalfOf = users[4];

    // Deposit 1000 flexUsd for onBehalfOf user
    await flexUsd.connect(onBehalfOf.signer).mint(await convertToCurrencyDecimals(flexUsd.address, '1000'));

    await flexUsd.connect(onBehalfOf.signer).approve(pool.address, APPROVAL_AMOUNT_LENDING_POOL);

    const amountToDeposit = await convertToCurrencyDecimals(flexUsd.address, '1000');

    await pool
      .connect(onBehalfOf.signer)
      .deposit(flexUsd.address, amountToDeposit, onBehalfOf.address, '0');

    const flashAmount = ethers.utils.parseEther('0.8');

    await _mockFlashLoanReceiver.setFailExecutionTransfer(true);

    await expect(
      pool
        .connect(caller.signer)
        .flashLoan(
          _mockFlashLoanReceiver.address,
          [wbch.address],
          [flashAmount],
          [2],
          onBehalfOf.address,
          '0x10',
          '0'
        )
    ).to.be.revertedWith(LP_BORROW_ALLOWANCE_NOT_ENOUGH);
  });

  it('Caller takes a WBCH flashloan with mode = 1 onBehalfOf user with allowance. Should revert since stable borrowing is disabled.', async () => {
    const { flexUsd, pool, wbch, users, helpersContract } = testEnv;

    const caller = users[5];
    const onBehalfOf = users[4];

    const flashAmount = ethers.utils.parseEther('0.8');

    const reserveData = await pool.getReserveData(wbch.address);

    const stableDebtToken = await getStableDebtToken(reserveData.stableDebtTokenAddress);

    // Deposited for onBehalfOf user already, delegate borrow allowance
    await stableDebtToken.connect(onBehalfOf.signer).approveDelegation(caller.address, flashAmount);

    await _mockFlashLoanReceiver.setFailExecutionTransfer(true);

    await expect(pool
      .connect(caller.signer)
      .flashLoan(
        _mockFlashLoanReceiver.address,
        [wbch.address],
        [flashAmount],
        [1],
        onBehalfOf.address,
        '0x10',
        '0'
      )).to.be.revertedWith(VL_STABLE_BORROWING_NOT_ENABLED);

    const { stableDebtTokenAddress } = await helpersContract.getReserveTokensAddresses(
      wbch.address
    );

    const wbchDebtToken = await getStableDebtToken(stableDebtTokenAddress);

    const onBehalfOfDebt = await wbchDebtToken.balanceOf(onBehalfOf.address);

    expect(onBehalfOfDebt.toString()).to.be.equal(
      '0',
      'Invalid onBehalfOf user debt'
    );
  });

  it('Caller takes a WBCH flashloan with mode = 2 onBehalfOf user with allowance. A loan for onBehalfOf is created.', async () => {
    const { flexUsd, pool, wbch, users, helpersContract } = testEnv;

    const caller = users[5];
    const onBehalfOf = users[4];

    const flashAmount = ethers.utils.parseEther('0.8');

    const reserveData = await pool.getReserveData(wbch.address);

    const variableDebtToken = await getVariableDebtToken(reserveData.variableDebtTokenAddress);

    // Deposited for onBehalfOf user already, delegate borrow allowance
    await variableDebtToken.connect(onBehalfOf.signer).approveDelegation(caller.address, flashAmount);

    await _mockFlashLoanReceiver.setFailExecutionTransfer(true);

    await expect(pool
      .connect(caller.signer)
      .flashLoan(
        _mockFlashLoanReceiver.address,
        [wbch.address],
        [flashAmount],
        [2],
        onBehalfOf.address,
        '0x10',
        '0'
      )).to.not.be.reverted;

    const { variableDebtTokenAddress } = await helpersContract.getReserveTokensAddresses(
      wbch.address
    );

    const wbchDebtToken = await getVariableDebtToken(variableDebtTokenAddress);

    const onBehalfOfDebt = await wbchDebtToken.balanceOf(onBehalfOf.address);

    expect(onBehalfOfDebt.toString()).to.be.equal(
      ethers.utils.parseEther('0.8'),
      'Invalid onBehalfOf user debt'
    );
  });
});
