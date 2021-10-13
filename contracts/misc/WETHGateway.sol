// SPDX-License-Identifier: agpl-3.0
pragma solidity 0.6.12;
pragma experimental ABIEncoderV2;

import {Ownable} from '../dependencies/openzeppelin/contracts/Ownable.sol';
import {IERC20} from '../dependencies/openzeppelin/contracts/IERC20.sol';
import {IWBCH} from './interfaces/IWBCH.sol';
import {IWBCHGateway} from './interfaces/IWBCHGateway.sol';
import {ILendingPool} from '../interfaces/ILendingPool.sol';
import {IAToken} from '../interfaces/IAToken.sol';
import {ReserveConfiguration} from '../protocol/libraries/configuration/ReserveConfiguration.sol';
import {UserConfiguration} from '../protocol/libraries/configuration/UserConfiguration.sol';
import {Helpers} from '../protocol/libraries/helpers/Helpers.sol';
import {DataTypes} from '../protocol/libraries/types/DataTypes.sol';

contract WBCHGateway is IWBCHGateway, Ownable {
  using ReserveConfiguration for DataTypes.ReserveConfigurationMap;
  using UserConfiguration for DataTypes.UserConfigurationMap;

  IWBCH internal immutable WBCH;

  /**
   * @dev Sets the WBCH address and the LendingPoolAddressesProvider address. Infinite approves lending pool.
   * @param weth Address of the Wrapped Ether contract
   **/
  constructor(address weth) public {
    WBCH = IWBCH(weth);
  }

  function authorizeLendingPool(address lendingPool) external onlyOwner {
    WBCH.approve(lendingPool, uint256(-1));
  }

  /**
   * @dev deposits WBCH into the reserve, using native ETH. A corresponding amount of the overlying asset (aTokens)
   * is minted.
   * @param lendingPool address of the targeted underlying lending pool
   * @param onBehalfOf address of the user who will receive the aTokens representing the deposit
   * @param referralCode integrators are assigned a referral code and can potentially receive rewards.
   **/
  function depositETH(
    address lendingPool,
    address onBehalfOf,
    uint16 referralCode
  ) external payable override {
    WBCH.deposit{value: msg.value}();
    ILendingPool(lendingPool).deposit(address(WBCH), msg.value, onBehalfOf, referralCode);
  }

  /**
   * @dev withdraws the WBCH _reserves of msg.sender.
   * @param lendingPool address of the targeted underlying lending pool
   * @param amount amount of aWBCH to withdraw and receive native ETH
   * @param to address of the user who will receive native ETH
   */
  function withdrawETH(
    address lendingPool,
    uint256 amount,
    address to
  ) external override {
    IAToken aWBCH = IAToken(ILendingPool(lendingPool).getReserveData(address(WBCH)).aTokenAddress);
    uint256 userBalance = aWBCH.balanceOf(msg.sender);
    uint256 amountToWithdraw = amount;

    // if amount is equal to uint(-1), the user wants to redeem everything
    if (amount == type(uint256).max) {
      amountToWithdraw = userBalance;
    }
    aWBCH.transferFrom(msg.sender, address(this), amountToWithdraw);
    ILendingPool(lendingPool).withdraw(address(WBCH), amountToWithdraw, address(this));
    WBCH.withdraw(amountToWithdraw);
    _safeTransferETH(to, amountToWithdraw);
  }

  /**
   * @dev repays a borrow on the WBCH reserve, for the specified amount (or for the whole amount, if uint256(-1) is specified).
   * @param lendingPool address of the targeted underlying lending pool
   * @param amount the amount to repay, or uint256(-1) if the user wants to repay everything
   * @param rateMode the rate mode to repay
   * @param onBehalfOf the address for which msg.sender is repaying
   */
  function repayETH(
    address lendingPool,
    uint256 amount,
    uint256 rateMode,
    address onBehalfOf
  ) external payable override {
    (uint256 stableDebt, uint256 variableDebt) =
      Helpers.getUserCurrentDebtMemory(
        onBehalfOf,
        ILendingPool(lendingPool).getReserveData(address(WBCH))
      );

    uint256 paybackAmount =
      DataTypes.InterestRateMode(rateMode) == DataTypes.InterestRateMode.STABLE
        ? stableDebt
        : variableDebt;

    if (amount < paybackAmount) {
      paybackAmount = amount;
    }
    require(msg.value >= paybackAmount, 'msg.value is less than repayment amount');
    WBCH.deposit{value: paybackAmount}();
    ILendingPool(lendingPool).repay(address(WBCH), msg.value, rateMode, onBehalfOf);

    // refund remaining dust eth
    if (msg.value > paybackAmount) _safeTransferETH(msg.sender, msg.value - paybackAmount);
  }

  /**
   * @dev borrow WBCH, unwraps to ETH and send both the ETH and DebtTokens to msg.sender, via `approveDelegation` and onBehalf argument in `LendingPool.borrow`.
   * @param lendingPool address of the targeted underlying lending pool
   * @param amount the amount of ETH to borrow
   * @param interesRateMode the interest rate mode
   * @param referralCode integrators are assigned a referral code and can potentially receive rewards
   */
  function borrowETH(
    address lendingPool,
    uint256 amount,
    uint256 interesRateMode,
    uint16 referralCode
  ) external override {
    ILendingPool(lendingPool).borrow(
      address(WBCH),
      amount,
      interesRateMode,
      referralCode,
      msg.sender
    );
    WBCH.withdraw(amount);
    _safeTransferETH(msg.sender, amount);
  }

  /**
   * @dev transfer ETH to an address, revert if it fails.
   * @param to recipient of the transfer
   * @param value the amount to send
   */
  function _safeTransferETH(address to, uint256 value) internal {
    (bool success, ) = to.call{value: value}(new bytes(0));
    require(success, 'ETH_TRANSFER_FAILED');
  }

  /**
   * @dev transfer ERC20 from the utility contract, for ERC20 recovery in case of stuck tokens due
   * direct transfers to the contract address.
   * @param token token to transfer
   * @param to recipient of the transfer
   * @param amount amount to send
   */
  function emergencyTokenTransfer(
    address token,
    address to,
    uint256 amount
  ) external onlyOwner {
    IERC20(token).transfer(to, amount);
  }

  /**
   * @dev transfer native Ether from the utility contract, for native Ether recovery in case of stuck Ether
   * due selfdestructs or transfer ether to pre-computated contract address before deployment.
   * @param to recipient of the transfer
   * @param amount amount to send
   */
  function emergencyEtherTransfer(address to, uint256 amount) external onlyOwner {
    _safeTransferETH(to, amount);
  }

  /**
   * @dev Get WBCH address used by WBCHGateway
   */
  function getWBCHAddress() external view returns (address) {
    return address(WBCH);
  }

  /**
   * @dev Only WBCH contract is allowed to transfer ETH here. Prevent other addresses to send Ether to this contract.
   */
  receive() external payable {
    require(msg.sender == address(WBCH), 'Receive not allowed');
  }

  /**
   * @dev Revert fallback calls
   */
  fallback() external payable {
    revert('Fallback not allowed');
  }
}
