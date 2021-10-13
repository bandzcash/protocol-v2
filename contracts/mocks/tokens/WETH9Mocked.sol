// SPDX-License-Identifier: agpl-3.0
pragma solidity >=0.4.22 <=0.6.12;

import {WBCH9} from '../dependencies/weth/WBCH9.sol';

contract WBCH9Mocked is WBCH9 {
  // Mint not backed by Ether: only for testing purposes
  function mint(uint256 value) public returns (bool) {
    balanceOf[msg.sender] += value;
    emit Transfer(address(0), msg.sender, value);
  }
}
